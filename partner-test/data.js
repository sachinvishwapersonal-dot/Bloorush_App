/*
 * Data + Auth layer (Firebase). Real logins + secure Firestore.
 * Public API is stable so the screens keep working. Partners now live in
 * Firestore. Admin is identified by a fixed admin email; partners sign in with
 * phone + PIN (mapped to a Firebase email/password behind the scenes).
 */
const Store = (() => {
  const firebaseConfig = {
    apiKey: 'AIzaSyCzhn9fyTTfKgraMlzouvniNYTrbIx8F9E',
    authDomain: 'mvp-bloorush.firebaseapp.com',
    projectId: 'mvp-bloorush',
    storageBucket: 'mvp-bloorush.firebasestorage.app',
    messagingSenderId: '546639018338',
    appId: '1:546639018338:web:99f7f587157e912b1a143b',
  };

  // The one admin account. Create this user once in the Firebase console.
  const ADMIN_EMAIL = 'admin@bloorush.app';

  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  // Separate app instance used ONLY to create partner logins without logging
  // the admin out.
  const creatorApp = firebase.initializeApp(firebaseConfig, 'creator');
  const creatorAuth = creatorApp.auth();

  const cache = { jobs: [], partners: [], attendance: [], coupons: [], slots: [], zoneStatus: [], myProfile: null };

  function today() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth()+1).padStart(2,"0") + "-" +
      String(d.getDate()).padStart(2,"0");
  }

  // phone + PIN -> Firebase email/password (kept consistent everywhere)
  function emailFor(phone) { return String(phone).trim() + '@bloorush.app'; }
  function passwordFor(pin) { return 'brp_' + String(pin).trim() + '_x'; }

  /* ---------------- live listeners ---------------- */
  let jobsUnsub = null, partnersUnsub = null, attendanceUnsub = null, couponsUnsub = null, slotsUnsub = null, zoneStatusUnsub = null;
  function stopListeners() {
    if (jobsUnsub) { jobsUnsub(); jobsUnsub = null; }
    if (partnersUnsub) { partnersUnsub(); partnersUnsub = null; }
    if (attendanceUnsub) { attendanceUnsub(); attendanceUnsub = null; }
    if (couponsUnsub) { couponsUnsub(); couponsUnsub = null; }
    if (slotsUnsub) { slotsUnsub(); slotsUnsub = null; }
    if (zoneStatusUnsub) { zoneStatusUnsub(); zoneStatusUnsub = null; }
    cache.jobs = []; cache.partners = [];
  }
  // Coalesce bursts of snapshot updates into a single render on the next frame.
  // Multiple listeners firing together now cause ONE repaint, not six.
  let _repaintQueued = false;
  function repaint() {
    if (typeof window.render !== 'function') return;
    if (_repaintQueued) return;
    _repaintQueued = true;
    const run = () => {
      _repaintQueued = false;
      try { window.render(); }
      catch (e) { console.error('render error (kept last good screen):', e); }
    };
    (window.requestAnimationFrame || window.setTimeout)(run, 0);
  }

  function startAdminListeners() {
    if (!jobsUnsub) {
      jobsUnsub = db.collection('jobs').onSnapshot((s) => {
        const byId = {};
        s.docs.forEach((d) => { const j = d.data(); byId[j.jobId || d.id] = j; }); // dedupe by jobId
        cache.jobs = Object.values(byId);
        repaint();
      });
    }
    if (!partnersUnsub) {
      partnersUnsub = db.collection('partners').onSnapshot((s) => {
        cache.partners = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
        repaint();
      });
    }
    if (!attendanceUnsub) {
      attendanceUnsub = db.collection('attendance').onSnapshot((s) => {
        cache.attendance = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        repaint();
      }, (e) => console.error('attendance listener:', e));
    }
    if (!couponsUnsub) {
      couponsUnsub = db.collection('coupons').onSnapshot((s) => {
        cache.coupons = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        repaint();
      }, (e) => console.error('coupons listener:', e));
    }
    if (!slotsUnsub) {
      slotsUnsub = db.collection('slots').onSnapshot((s) => {
        cache.slots = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        repaint();
      }, (e) => console.error('slots listener:', e));
    }
    if (!zoneStatusUnsub) {
      zoneStatusUnsub = db.collection('zoneStatus').onSnapshot((s) => {
        cache.zoneStatus = s.docs.map((d) => ({ zone: d.id, ...d.data() }));
        repaint();
      }, (e) => console.error('zoneStatus listener:', e));
    }
  }
  function startPartnerListeners(brp) {
    if (jobsUnsub) return;
    cache.jobsA = []; cache.jobsB = [];
    const merge = () => {
      const map = {};
      (cache.jobsA || []).forEach((j) => { map[j.jobId] = j; });
      (cache.jobsB || []).forEach((j) => { map[j.jobId] = j; });
      cache.jobs = Object.values(map);
      repaint();
    };
    const u1 = db.collection('jobs').where('partnerIds', 'array-contains', brp)
      .onSnapshot((s) => { cache.jobsA = s.docs.map((d) => d.data()); merge(); }, (e) => console.error('partner jobs listener (partnerIds):', e));
    const u2 = db.collection('jobs').where('partnerId', '==', brp)
      .onSnapshot((s) => { cache.jobsB = s.docs.map((d) => d.data()); merge(); }, (e) => console.error('partner jobs listener (partnerId):', e));
    jobsUnsub = () => { u1(); u2(); };
  }

  /* ---------------- auth ---------------- */
  function onAuth(cb) {
    auth.onAuthStateChanged(async (user) => {
      stopListeners();
      cache.myProfile = null;
      if (!user) { cb('none'); return; }
      if (user.email === ADMIN_EMAIL) { startAdminListeners(); cb('admin'); return; }
      try {
        const snap = await db.collection('partners').doc(user.uid).get();
        if (!snap.exists) { await auth.signOut(); cb('noprofile'); return; }
        const profile = { uid: user.uid, ...snap.data() };
        if (profile.status !== 'Active') { await auth.signOut(); cb('disabled'); return; }
        cache.myProfile = profile;
        startPartnerListeners(profile.partnerId);
        cb('partner', profile);
      } catch (e) { console.error(e); await auth.signOut(); cb('error'); }
    });
  }
  function adminSignIn(email, password) { return auth.signInWithEmailAndPassword(email.trim(), password); }
  function partnerSignIn(phone, pin) { return auth.signInWithEmailAndPassword(emailFor(phone), passwordFor(pin)); }
  function signOutUser() { return auth.signOut(); }
  function changePin(newPin) {
    const u = auth.currentUser;
    if (!u) return Promise.reject(new Error('Not signed in.'));
    return u.updatePassword(passwordFor(newPin));
  }

  /* ---------------- partners (admin) ---------------- */
  function nextBrp() {
    let max = 0;
    cache.partners.forEach((p) => {
      const n = parseInt(String(p.partnerId || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'BRP' + String(max + 1).padStart(3, '0');
  }
  async function addPartner({ name, phone, pin, hub, photo, language }) {
    let uid;
    try {
      // Normal case: brand-new partner.
      const cred = await creatorAuth.createUserWithEmailAndPassword(emailFor(phone), passwordFor(pin));
      uid = cred.user.uid;
    } catch (e) {
      if (e && e.code === 'auth/email-already-in-use') {
        // This phone was used before (deleted profile, but Auth account remains).
        // Reclaim it: sign into the existing account with the given PIN and rebuild the profile.
        try {
          const cred = await creatorAuth.signInWithEmailAndPassword(emailFor(phone), passwordFor(pin));
          uid = cred.user.uid;
        } catch (e2) {
          try { await creatorAuth.signOut(); } catch (_) {}
          if (e2 && (e2.code === 'auth/wrong-password' || e2.code === 'auth/invalid-credential')) {
            throw new Error('This phone already has an account with a DIFFERENT PIN. Re-add using that partner\'s original PIN (the PIN cannot be changed from here).');
          }
          throw e2;
        }
      } else {
        throw e;
      }
    }
    const brp = nextBrp();
    await db.collection('partners').doc(uid).set({
      partnerId: brp, name: name.trim(), phone: String(phone).trim(),
      hub: hub.trim(), status: 'Active', photo: photo || null,
      language: language || 'en', attendanceDate: '', createdAt: Date.now(),
    });
    await creatorAuth.signOut();
    return brp;
  }
  function updatePartner(uid, changes) { return db.collection('partners').doc(uid).update(changes); }
  function setPartnerStatus(uid, status) { return db.collection('partners').doc(uid).update({ status }); }
  function setAttendance(uid, present) { return db.collection('partners').doc(uid).update({ attendanceDate: present ? today() : '' }); }
  // Per-day, per-partner attendance record: attendance/{partnerId}_{date}
  function getAttendance(partnerId, date) { return cache.attendance.find((a) => a.id === partnerId + '_' + date) || null; }
  function getAttendanceForDate(date) { return cache.attendance.filter((a) => a.date === date); }
  function setAttendanceRecord(partnerId, date, changes) {
    return db.collection('attendance').doc(partnerId + '_' + date)
      .set({ partnerId, date, ...changes, updatedAt: Date.now() }, { merge: true })
      .catch((e) => alert('Could not save attendance: ' + e.message));
  }

  // ---- Coupons (shared 'coupons' collection with the customer app) ----
  function getCoupons() { return cache.coupons; }
  function saveCoupon(c) {
    const id = String(c.code).toUpperCase().replace(/\s+/g, '');
    return db.collection('coupons').doc(id).set({
      code: String(c.code).toUpperCase().replace(/\s+/g, ''), type: c.type, value: +c.value || 0, minOrder: +c.minOrder || 0,
      maxDiscount: +c.maxDiscount || 0, expiry: c.expiry || '',
      usageLimit: (c.usageLimit === '' || c.usageLimit == null ? null : +c.usageLimit),
      active: !!c.active,
    }, { merge: true }).catch((e) => alert('Could not save coupon: ' + e.message));
  }
  function deleteCoupon(id) { return db.collection('coupons').doc(id).delete().catch((e) => alert('Could not delete: ' + e.message)); }

  // ---- Slots (shared 'slots' collection; only total capacity is set here) ----
  function getSlots() { return cache.slots; }
  function getZoneStatus() { return cache.zoneStatus || []; }
  function isZoneOpen(zone) { const z = (cache.zoneStatus || []).find((x) => x.zone === zone); return z ? z.open !== false : true; }
  function setZoneOpen(zone, open) { return db.collection('zoneStatus').doc(zone).set({ open: !!open, updatedAt: Date.now() }, { merge: true }).catch((e) => alert('Could not update zone: ' + e.message)); }
  function saveSlot(date, win, zone, total, reserved, confirmed) {
    const id = `${date}_${win}_${zone}`.replace(/\s+/g, '_');   // matches customer app's slotDocId
    const payload = { date, window: win, zone, total: +total || 0 };
    if (reserved !== undefined) payload.reserved = +reserved || 0;
    if (confirmed !== undefined) payload.confirmed = +confirmed || 0;
    return db.collection('slots').doc(id).set(payload, { merge: true }).catch((e) => alert('Could not save slot: ' + e.message));
  }
  function deletePartner(uid) { return db.collection('partners').doc(uid).delete(); }

  function getPartners() { return cache.partners; }
  function getPartner(brp) {
    if (cache.myProfile && cache.myProfile.partnerId === brp) return cache.myProfile;
    return cache.partners.find((p) => p.partnerId === brp) || null;
  }

  /* ---------------- jobs ---------------- */
  function nextJobId() {
    let max = 100;
    cache.jobs.forEach((j) => {
      const n = parseInt(String(j.jobId || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'JOB' + (max + 1);
  }
  function getJobs() { return cache.jobs.slice(); }
  function getJobsForPartner(brp) {
    return cache.jobs.filter((j) => Array.isArray(j.partnerIds) ? j.partnerIds.includes(brp) : j.partnerId === brp);
  }
  // Update one partner's own assignment entry inside a job, then write the array.
  // Atomic read-modify-write of a job's assignments array, so concurrent edits
  // (admin adding a partner while a partner taps a status) never clobber each other.
  function txnAssignments(jobId, mutate) {
    const ref = db.collection('jobs').doc(jobId);
    return db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('Job not found');
      const j = snap.data();
      const assignments = Array.isArray(j.assignments) ? j.assignments.map((a) => ({ ...a })) : [];
      const next = mutate(assignments, j) || assignments;
      t.update(ref, {
        assignments: next,
        partnerIds: next.map((a) => a.partnerId),
        partnerName: next.map((a) => a.name || a.partnerId).join(', '),
        partnerId: next[0] ? next[0].partnerId : '',
      });
    }).catch((e) => alert('Update failed, please retry: ' + e.message));
  }
  function updateMyAssignment(jobId, brp, changes) {
    return txnAssignments(jobId, (assignments, job) => {
      let mine = assignments.find((a) => a.partnerId === brp);

      // Gated field-actions get the full guard set (data layer — can't be bypassed by UI).
      if (changes && GATED_STATUSES.indexOf(changes.status) !== -1) {
        const d = job && job.date ? String(job.date) : '';
        const tdy = today();
        // (1) Future: cannot act before the service date.
        if (d && d > tdy) {
          throw new Error('This job is scheduled for ' + d + '. You can start it on that date.');
        }
        // (1b) Overdue: after the service date, the partner can no longer act.
        // Route to admin to reschedule / reassign / cancel.
        if (d && d < tdy) {
          throw new Error('This job was scheduled for ' + d + ' and is overdue. Please contact your manager to reschedule.');
        }
        // (4) Ownership: a partner can only act on an assignment that already exists
        // for them (no self-insert via an action call).
        if (!mine) {
          throw new Error('You are not assigned to this job.');
        }
        // (2)/(3) Enforce the state machine: Assigned → Arrived → Started → Completed.
        // Blocks skipping steps and re-opening/re-completing a finished job.
        const cur = mine.status || 'Assigned';
        const allowed = {
          Arrived: ['Assigned'],
          Started: ['Arrived'],
          Completed: ['Started'],
        }[changes.status] || [];
        if (allowed.indexOf(cur) === -1) {
          throw new Error('Cannot move this job from "' + cur + '" to "' + changes.status + '".');
        }
      }

      if (!mine) { mine = { partnerId: brp, status: 'Assigned' }; assignments.push(mine); }
      Object.assign(mine, changes);
      return assignments;
    });
  }
  function txnAddPartner(jobId, partner) {
    return txnAssignments(jobId, (assignments) => {
      const existing = assignments.find((a) => a.partnerId === partner.partnerId);
      if (existing) { Object.assign(existing, partner); return assignments; } // idempotent: re-assign updates
      assignments.push(partner);
      return assignments;
    });
  }
  function txnRemovePartner(jobId, brp) {
    return txnAssignments(jobId, (assignments) => assignments.filter((a) => a.partnerId !== brp));
  }
  function txnSetIncentive(jobId, brp, incentive) {
    return txnAssignments(jobId, (assignments) => assignments.map((a) => (a.partnerId === brp ? { ...a, incentive: Math.round(+incentive || 0) } : a)));
  }
  function getJob(jobId) { return cache.jobs.find((j) => j.jobId === jobId) || null; }
  function addJob(job) {
    job.jobId = nextJobId();
    job.status = 'Assigned'; job.startedAt = null; job.endedAt = null; job.createdAt = Date.now();
    db.collection('jobs').doc(job.jobId).set(job).catch((e) => alert('Could not save job: ' + e.message));
    return job;
  }
  function updateJob(jobId, changes) {
    db.collection('jobs').doc(jobId).update(changes).catch((e) => alert('Could not update job: ' + e.message));
    return { jobId, ...changes };
  }
  function deleteJob(jobId) { db.collection('jobs').doc(jobId).delete().catch((e) => alert('Could not delete job: ' + e.message)); }

  function netEarnings(job) { return (job.base || 0) + (job.bonus || 0) - (job.penalty || 0); }
  function isToday(job) { return job.date === today(); }
  // Past the service date and still not completed → overdue (admin must resolve).
  function isOverdue(job) { return !!job.date && String(job.date) < today(); }
  // A job scheduled for a later calendar day than today's India date.
  function isFuture(job) { return !!job.date && String(job.date) > today(); }
  // The three field-actions that must never run before the service date.
  const GATED_STATUSES = ['Arrived', 'Started', 'Completed'];

  return {
    today, ADMIN_EMAIL,
    onAuth, adminSignIn, partnerSignIn, signOutUser, changePin,
    addPartner, updatePartner, setPartnerStatus, setAttendance, deletePartner, getPartners, getPartner,
    getAttendance, getAttendanceForDate, setAttendanceRecord,
    getCoupons, saveCoupon, deleteCoupon, getSlots, saveSlot,
    getZoneStatus, isZoneOpen, setZoneOpen,
    getJobs, getJobsForPartner, getJob, addJob, updateJob, updateMyAssignment, txnAddPartner, txnRemovePartner, txnSetIncentive, deleteJob,
    netEarnings, isToday, isFuture, isOverdue,
  };
})();
