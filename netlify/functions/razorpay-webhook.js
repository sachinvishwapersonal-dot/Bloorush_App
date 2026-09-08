// Razorpay calls this URL directly when a payment truly succeeds, regardless of what
// the customer's browser does. We verify the signature, confirm the captured amount
// matches the order we created, then write the paid order + booking to Firestore.
// This is what makes real payments always register and fake "done" clicks do nothing.

const crypto = require('crypto');
const admin = require('firebase-admin');

function db() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: (process.env.FB_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin.firestore();
}

exports.handler = async (event) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'];
    const raw = event.body || '';
    // 1) Verify the signature so only Razorpay can trigger this.
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!signature || expected !== signature) {
      return { statusCode: 400, body: 'invalid signature' };
    }
    const data = JSON.parse(raw);
    if (data.event !== 'payment.captured' && data.event !== 'order.paid') {
      return { statusCode: 200, body: 'ignored' };
    }
    const payment = data.payload.payment.entity;
    const orderId = payment.order_id;
    const capturedAmount = payment.amount;

    const firestore = db();
    const pendRef = firestore.collection('pendingOrders').doc(orderId);
    const pendSnap = await pendRef.get();
    if (!pendSnap.exists) {
      // CRITICAL: verified payment but no booking payload to build a job from.
      // Never invent a job without the payload. Preserve everything for reconciliation.
      console.error('[webhook][CRITICAL] captured payment with NO pendingOrder', JSON.stringify({
        orderId, paymentId: payment.id, capturedAmount, event: data.event,
      }));
      try {
        await firestore.collection('paymentExceptions').doc(payment.id).set({
          type: 'missing_pending_order', orderId, paymentId: payment.id,
          capturedAmount, event: data.event, at: Date.now(),
        }, { merge: true });
      } catch (ex) { console.error('[webhook] could not record missing-pending exception', ex && ex.message); }
      // 200: retrying will never find a pending order that doesn't exist.
      return { statusCode: 200, body: 'no pending order (logged for reconciliation)' };
    }
    const pend = pendSnap.data();
    if (pend.status === 'paid') return { statusCode: 200, body: 'already processed' };

    const jobId = pend.jobId;
    // 2) Confirm the amount actually captured equals the order we created.
    if (capturedAmount !== pend.amount) {
      // Do NOT create a normal booking. Flag for admin reconciliation, keep all identifiers.
      console.error('[webhook][ERROR] amount mismatch — booking NOT created', JSON.stringify({
        jobId, orderId, paymentId: payment.id, capturedAmount, expectedAmount: pend.amount,
      }));
      try {
        await pendRef.update({
          status: 'reconciliation_required', reason: 'amount_mismatch',
          paymentId: payment.id, capturedAmount, expectedAmount: pend.amount, flaggedAt: Date.now(),
        });
        await firestore.collection('paymentExceptions').doc(payment.id).set({
          type: 'amount_mismatch', jobId, orderId, paymentId: payment.id,
          capturedAmount, expectedAmount: pend.amount, at: Date.now(),
        }, { merge: true });
      } catch (ex) { console.error('[webhook] could not flag amount mismatch', ex && ex.message); }
      // 200: the amount will never change, so retrying is pointless. Not silent — logged + flagged above.
      return { statusCode: 200, body: 'amount mismatch (flagged for reconciliation)' };
    }

    const p = pend.payload || {};
    const svcSummary = Array.isArray(p.items) ? p.items.map((i) => i.name + (i.qty > 1 ? (' x' + i.qty) : '')).join(', ') : 'Cleaning';
    const slotId = (p.slotDate && p.slotWindow && p.zone)
      ? (`${p.slotDate}_${p.slotWindow}_${p.zone}`).replace(/\s+/g, '_') : null;

    const jobRef = firestore.collection('jobs').doc(jobId);
    const slotRef = slotId ? firestore.collection('slots').doc(slotId) : null;

    // ONE atomic transaction does everything so nothing can race:
    //  (#1) never overwrite an existing partner assignment
    //  (#4) check slot capacity and reserve it in the same read-modify-write
    let slotOutcome = 'no-slot';
    await firestore.runTransaction(async (tx) => {
      const jobSnap = await jobRef.get();
      const already = jobSnap.exists ? jobSnap.data() : null;
      const isAssigned = already && ((Array.isArray(already.partnerIds) && already.partnerIds.length > 0) || already.partnerId);

      // (#4) Capacity check + reserve, atomically, BEFORE writing the job.
      let slotFull = false;
      if (slotRef && !(already && already.slotCounted)) {
        const s = await tx.get(slotRef);
        const d = s.exists ? s.data() : null;
        const total = d && Number.isFinite(d.total) ? d.total : 2;      // default capacity
        const confirmed = d && Number.isFinite(d.confirmed) ? d.confirmed : 0;
        if (confirmed >= total) {
          slotFull = true; slotOutcome = 'full';
        } else {
          if (s.exists) tx.update(slotRef, { confirmed: confirmed + 1 });
          else tx.set(slotRef, { date: p.slotDate, window: p.slotWindow, zone: p.zone, total, reserved: 0, confirmed: confirmed + 1 });
          slotOutcome = 'reserved';
        }
      } else if (already && already.slotCounted) {
        slotOutcome = 'already-counted';
      }

      if (isAssigned) {
        // (#1) Job already assigned by admin — only update payment fields, never
        // reset partner/status/assignments.
        tx.set(jobRef, {
          paymentId: payment.id, paymentStatus: 'paid',
          slotStatus: slotFull ? 'slot_full_reschedule' : (already.slotStatus || 'ok'),
          slotCounted: already.slotCounted || slotOutcome === 'reserved',
        }, { merge: true });
      } else {
        const order = {
          jobId, bookingId: jobId, status: 'Paid', partnerId: '',
          date: p.slotDate || null, slotWindow: p.slotWindow || null, timeSlot: p.slotWindow || null,
          service: svcSummary,
          customerUid: p.uid || null, customerName: p.name || null, customerPhone: p.phone || null,
          customerEmail: p.email || null, customerAddress: p.address || null, address: p.address || null,
          mapsLink: p.mapsLink || null, zone: p.zone || null, flat: p.flat || null,
          items: p.items || [], totalMins: Array.isArray(p.items) ? p.items.reduce((a, i) => a + (i.mins || 0), 0) : 0,
          base: pend.amount / 100, bonus: 0, penalty: 0, customerPrice: pend.amount / 100,
          paymentId: payment.id, paymentStatus: 'paid',
          partnerName: '', partnerPhone: '', assignments: [], partnerIds: [], delayNote: '',
          startedAt: null, arrivedAt: null, endedAt: null, rating: null, reviewTags: [], createdAt: Date.now(),
          // If the slot was full at payment time, flag for admin — money kept, needs reschedule.
          slotStatus: slotFull ? 'slot_full_reschedule' : 'ok',
          slotCounted: slotOutcome === 'reserved',
        };
        // If the client fast-path already wrote this job, don't clobber its real
        // values with nulls from a sparse payload. Only fill fields that are missing.
        let toWrite = order;
        if (already) {
          toWrite = {};
          for (const k of Object.keys(order)) {
            const v = order[k];
            const cur = already[k];
            const curEmpty = (cur === undefined || cur === null || cur === '' || (Array.isArray(cur) && cur.length === 0));
            const vEmpty = (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
            if (!vEmpty || curEmpty) toWrite[k] = v; // write real values; write empties only into empty slots
          }
          // payment/slot facts always win
          toWrite.paymentId = order.paymentId; toWrite.paymentStatus = 'paid';
          toWrite.slotStatus = order.slotStatus; toWrite.slotCounted = order.slotCounted;
        }
        tx.set(jobRef, toWrite, { merge: true });
      }
    });

    if (slotOutcome === 'full') {
      console.error('[webhook][slot-full] paid but slot was full — flagged for reschedule', JSON.stringify({ jobId, slotId }));
      try {
        await firestore.collection('paymentExceptions').doc(payment.id).set({
          type: 'slot_full', jobId, slotId, paymentId: payment.id, at: Date.now(),
        }, { merge: true });
      } catch (ex) { console.error('[webhook] could not record slot-full exception', ex && ex.message); }
    }

    // 4) Write the customer's booking record.
    await firestore.collection('bookings').doc(jobId).set({
      jobId, bookingId: jobId, uid: p.uid || null, userEmail: p.email || null,
      name: p.name || null, phone: p.phone || null, zone: p.zone || null, flat: p.flat || null,
      address: p.address || null, slotDate: p.slotDate || null, slotLabel: p.slotLabel || null,
      items: p.items || [], payable: pend.amount / 100, coupon: p.coupon || null,
      paymentId: payment.id, paymentStatus: 'paid', createdAt: Date.now(),
    }, { merge: true });

    await pendRef.update({ status: 'paid', paymentId: payment.id, paidAt: Date.now() });
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    // Real failure (Firestore/creds/etc). Log with identifiers, then 500 so Razorpay retries.
    console.error('[webhook][500] processing failed', JSON.stringify({ message: e && e.message }));
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
