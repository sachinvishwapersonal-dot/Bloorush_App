// Creates a Razorpay Order on the server and stores the pending booking in Firestore.
// The browser can no longer choose the amount freely: Razorpay binds the charge to
// this server-created order. The actual paid order is written by razorpay-webhook.js
// only after Razorpay confirms a real payment.

const Razorpay = require('razorpay');
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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let stage = 'parse';
  try {
    const body = JSON.parse(event.body || '{}');
    const { jobId, amount, payload } = body;
    // Basic sanity: amount is in paise, must be a positive integer of at least ₹1.
    if (!jobId || !Number.isFinite(amount) || amount < 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid order request' }) };
    }
    stage = 'razorpay';
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await rzp.orders.create({
      amount: Math.round(amount),
      currency: 'INR',
      receipt: jobId,
      notes: { jobId },
    });
    // Stash everything the webhook needs to write the real order after payment.
    stage = 'firestore';
    await db().collection('pendingOrders').doc(order.id).set({
      jobId,
      amount: Math.round(amount),
      payload: payload || {},
      status: 'created',
      createdAt: Date.now(),
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, key_id: process.env.RAZORPAY_KEY_ID }),
    };
  } catch (e) {
    // TEMP diagnostics: real cause without leaking any keys/secrets/customer data.
    // Only booleans for config presence, plus Razorpay's own error description if present.
    console.error('create-order failed at stage=' + stage, JSON.stringify({
      message: e && e.message,
      statusCode: e && e.statusCode,
      razorpayError: (e && e.error) ? { code: e.error.code, description: e.error.description, reason: e.error.reason, source: e.error.source, step: e.error.step, field: e.error.field } : undefined,
      config: {
        hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
        hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
        hasFbProjectId: !!process.env.FB_PROJECT_ID,
        hasFbClientEmail: !!process.env.FB_CLIENT_EMAIL,
        hasFbPrivateKey: !!process.env.FB_PRIVATE_KEY,
      },
    }));
    const msg = (e && (e.message || (e.error && e.error.description))) || 'order failed';
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
};
