/*
 * Data + Auth layer (Supabase PostgreSQL + Realtime).
 * Drop-in replacement for Firestore preserving full public Store API compatibility.
 */

const Store = (() => {
  // Supabase Project Credentials (Update with your project credentials)
  const SUPABASE_URL = window.SUPABASE_URL || 'https://mvp-bloorush.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo';

  const ADMIN_EMAIL = 'admin@bloorush.app';

  // Initialize Supabase Client
  const client = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const cache = {
    jobs: [],
    partners: [],
    attendance: [],
    coupons: [],
    slots: [],
    zoneStatus: [],
    myProfile: null
  };

  function today() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- Realtime Channels ---------------- */
  let activeChannel = null;

  function stopListeners() {
    if (activeChannel && client) {
      client.removeChannel(activeChannel);
      activeChannel = null;
    }
    cache.jobs = [];
    cache.partners = [];
  }

  let _repaintQueued = false;
  function repaint() {
    if (typeof window.render !== 'function') return;
    if (_repaintQueued) return;
    _repaintQueued = true;
    const run = () => {
      _repaintQueued = false;
      try { window.render(); } catch (e) { console.error('Render error:', e); }
    };
    (window.requestAnimationFrame || window.setTimeout)(run, 0);
  }

  async function fetchAllAdminData() {
    if (!client) return;
    try {
      const [jobsRes, partnersRes, attRes, couponsRes, slotsRes, zonesRes, asgRes] = await Promise.all([
        client.from('jobs').select('*').order('created_at', { ascending: false }),
        client.from('partners').select('*').order('created_at', { ascending: true }),
        client.from('attendance').select('*'),
        client.from('coupons').select('*'),
        client.from('slots').select('*'),
        client.from('zones').select('*'),
        client.from('job_assignments').select('*')
      ]);

      const asgByJob = {};
      (asgRes.data || []).forEach(a => {
        if (!asgByJob[a.job_id]) asgByJob[a.job_id] = [];
        asgByJob[a.job_id].push({
          partnerId: a.partner_id,
          name: a.partner_name,
          status: a.status,
          incentive: a.incentive,
          arrivedAt: a.arrived_at,
          startedAt: a.started_at,
          endedAt: a.ended_at
        });
      });

      cache.jobs = (jobsRes.data || []).map(j => ({
        jobId: j.job_id,
        bookingId: j.booking_id || j.job_id,
        status: j.status,
        date: j.service_date,
        slotWindow: j.slot_window,
        timeSlot: j.slot_window,
        service: j.service_summary,
        customerName: j.customer_name,
        customerPhone: j.customer_phone,
        customerAddress: j.customer_address,
        address: j.customer_address,
        mapsLink: j.maps_link,
        zone: j.zone,
        flat: j.flat,
        items: j.items || [],
        totalMins: j.total_mins,
        base: j.base_amount,
        bonus: j.bonus_amount,
        penalty: j.penalty_amount,
        customerPrice: j.customer_price,
        paymentStatus: j.payment_status,
        instructions: j.instructions,
        partnerIds: (asgByJob[j.job_id] || []).map(a => a.partnerId),
        assignments: asgByJob[j.job_id] || []
      }));

      cache.partners = (partnersRes.data || []).map(p => ({
        uid: p.id,
        partnerId: p.partner_id,
        name: p.name,
        phone: p.phone,
        hub: p.hub,
        status: p.status,
        photo: p.photo_url,
        language: p.language,
        attendanceDate: p.attendance_date || ''
      }));

      cache.attendance = (attRes.data || []).map(a => ({
        id: a.id,
        partnerId: a.partner_id,
        date: a.attendance_date,
        inTime: a.in_time,
        outTime: a.out_time,
        present: a.is_present,
        lateMins: a.late_mins,
        notes: a.notes
      }));

      cache.coupons = (couponsRes.data || []).map(c => ({
        id: c.code,
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.min_order,
        maxDiscount: c.max_discount,
        expiry: c.expiry_date,
        usageLimit: c.usage_limit,
        active: c.is_active
      }));

      cache.slots = (slotsRes.data || []).map(s => ({
        id: s.id,
        date: s.slot_date,
        window: s.slot_window,
        zone: s.zone,
        total: s.total_capacity,
        confirmed: s.confirmed_count,
        reserved: s.reserved_count
      }));

      cache.zoneStatus = (zonesRes.data || []).map(z => ({
        zone: z.id,
        open: z.is_open
      }));

      repaint();
    } catch (e) {
      console.error('Failed fetching admin data:', e);
    }
  }

  function startAdminListeners() {
    if (!client) return;
    fetchAllAdminData();

    if (!activeChannel) {
      activeChannel = client.channel('admin-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchAllAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'job_assignments' }, () => fetchAllAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => fetchAllAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => fetchAllAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchAllAdminData())
        .subscribe();
    }
  }

  async function fetchPartnerJobs(partnerId) {
    if (!client) return;
    try {
      const { data: asgs } = await client
        .from('job_assignments')
        .select('*, jobs(*)')
        .eq('partner_id', partnerId);

      cache.jobs = (asgs || []).map(a => {
        const j = a.jobs || {};
        return {
          jobId: j.job_id,
          bookingId: j.booking_id || j.job_id,
          status: a.status || j.status,
          date: j.service_date,
          slotWindow: j.slot_window,
          timeSlot: j.slot_window,
          service: j.service_summary,
          customerName: j.customer_name,
          customerPhone: j.customer_phone,
          customerAddress: j.customer_address,
          address: j.customer_address,
          mapsLink: j.maps_link,
          zone: j.zone,
          flat: j.flat,
          items: j.items || [],
          totalMins: j.total_mins,
          base: j.base_amount,
          instructions: j.instructions,
          assignments: [{
            partnerId: a.partner_id,
            name: a.partner_name,
            status: a.status,
            incentive: a.incentive,
            arrivedAt: a.arrived_at,
            startedAt: a.started_at,
            endedAt: a.ended_at
          }]
        };
      });
      repaint();
    } catch (e) {
      console.error('Failed fetching partner jobs:', e);
    }
  }

  function startPartnerListeners(partnerId) {
    if (!client) return;
    fetchPartnerJobs(partnerId);

    if (!activeChannel) {
      activeChannel = client.channel(`partner-${partnerId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
          filter: `partner_id=eq.${partnerId}`
        }, () => fetchPartnerJobs(partnerId))
        .subscribe();
    }
  }

  /* ---------------- Authentication ---------------- */
  function onAuth(cb) {
    if (!client) {
      // Offline / Local Demo fallback
      const saved = localStorage.getItem('bloorush_session');
      if (saved) {
        try {
          const sess = JSON.parse(saved);
          if (sess.role === 'partner') {
            cache.myProfile = sess.profile;
            cb('partner', sess.profile);
            return;
          }
        } catch (_) {}
      }
      cb('none');
      return;
    }

    client.auth.onAuthStateChange(async (event, session) => {
      stopListeners();
      cache.myProfile = null;

      if (!session || !session.user) {
        const localPartner = localStorage.getItem('bloorush_partner_session');
        if (localPartner) {
          try {
            const p = JSON.parse(localPartner);
            cache.myProfile = p;
            startPartnerListeners(p.partnerId);
            cb('partner', p);
            return;
          } catch (_) {}
        }
        cb('none');
        return;
      }

      const email = session.user.email;
      if (email === ADMIN_EMAIL) {
        startAdminListeners();
        cb('admin');
        return;
      }

      cb('none');
    });
  }

  async function adminSignIn(email, password) {
    if (!client) throw new Error('Supabase client not initialized');
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  }

  async function partnerSignIn(phone, pin) {
    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();

    if (!client) {
      // Local demo auth simulation if Supabase is not yet populated
      const profile = {
        partnerId: 'BRP001',
        name: 'Partner User',
        phone: cleanPhone,
        hub: 'Dharampeth Hub',
        status: 'Active',
        language: 'en'
      };
      cache.myProfile = profile;
      localStorage.setItem('bloorush_partner_session', JSON.stringify(profile));
      if (typeof window.showApp === 'function') window.showApp();
      return profile;
    }

    const { data, error } = await client
      .from('partners')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('pin_hash', cleanPin)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Invalid phone number or PIN');
    }
    if (data.status !== 'Active') {
      throw new Error('Account disabled. Contact your hub manager.');
    }

    const profile = {
      uid: data.id,
      partnerId: data.partner_id,
      name: data.name,
      phone: data.phone,
      hub: data.hub,
      status: data.status,
      photo: data.photo_url,
      language: data.language || 'en'
    };

    cache.myProfile = profile;
    localStorage.setItem('bloorush_partner_session', JSON.stringify(profile));
    startPartnerListeners(profile.partnerId);
    return profile;
  }

  async function signOutUser() {
    localStorage.removeItem('bloorush_partner_session');
    if (client) await client.auth.signOut();
    stopListeners();
    location.reload();
  }

  async function changePin(newPin) {
    if (!cache.myProfile) throw new Error('Not logged in');
    if (!client) {
      alert('PIN updated locally.');
      return;
    }
    const { error } = await client
      .from('partners')
      .update({ pin_hash: String(newPin).trim() })
      .eq('partner_id', cache.myProfile.partnerId);
    if (error) throw error;
  }

  /* ---------------- Partners (Admin) ---------------- */
  function nextBrp() {
    let max = 0;
    cache.partners.forEach((p) => {
      const n = parseInt(String(p.partnerId || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'BRP' + String(max + 1).padStart(3, '0');
  }

  async function addPartner({ name, phone, pin, hub, photo, language }) {
    const brp = nextBrp();
    if (client) {
      const { error } = await client.from('partners').insert({
        partner_id: brp,
        name: name.trim(),
        phone: String(phone).trim(),
        pin_hash: String(pin).trim(),
        hub: hub.trim(),
        photo_url: photo || null,
        language: language || 'en',
        status: 'Active'
      });
      if (error) throw error;
      fetchAllAdminData();
    }
    return brp;
  }

  async function updatePartner(uid, changes) {
    if (client) {
      const { error } = await client.from('partners').update({
        name: changes.name,
        phone: changes.phone,
        hub: changes.hub,
        language: changes.language,
        status: changes.status
      }).eq('id', uid);
      if (error) throw error;
      fetchAllAdminData();
    }
  }

  function setPartnerStatus(uid, status) {
    return updatePartner(uid, { status });
  }

  async function setAttendance(uid, present) {
    if (client) {
      await client.from('partners').update({
        attendance_date: present ? today() : null
      }).eq('id', uid);
      fetchAllAdminData();
    }
  }

  function getAttendance(partnerId, date) {
    return cache.attendance.find((a) => a.id === partnerId + '_' + date) || null;
  }

  function getAttendanceForDate(date) {
    return cache.attendance.filter((a) => a.date === date);
  }

  async function setAttendanceRecord(partnerId, date, changes) {
    const id = `${partnerId}_${date}`;
    if (client) {
      await client.from('attendance').upsert({
        id,
        partner_id: partnerId,
        attendance_date: date,
        in_time: changes.inTime,
        out_time: changes.outTime,
        late_mins: changes.lateMins || 0,
        notes: changes.notes || '',
        updated_at: new Date().toISOString()
      });
      fetchAllAdminData();
    }
  }

  /* ---------------- Coupons ---------------- */
  function getCoupons() { return cache.coupons; }
  async function saveCoupon(c) {
    const code = String(c.code).toUpperCase().trim();
    if (client) {
      await client.from('coupons').upsert({
        code,
        type: c.type,
        value: +c.value || 0,
        min_order: +c.minOrder || 0,
        max_discount: +c.maxDiscount || 0,
        expiry_date: c.expiry || null,
        usage_limit: c.usageLimit ? +c.usageLimit : null,
        is_active: !!c.active
      });
      fetchAllAdminData();
    }
  }

  async function deleteCoupon(id) {
    if (client) {
      await client.from('coupons').delete().eq('code', id);
      fetchAllAdminData();
    }
  }

  /* ---------------- Slots & Areas ---------------- */
  function getSlots() { return cache.slots; }
  function getZoneStatus() { return cache.zoneStatus; }
  function isZoneOpen(zone) {
    const z = cache.zoneStatus.find(x => x.zone === zone);
    return z ? z.open !== false : true;
  }

  async function setZoneOpen(zone, open) {
    if (client) {
      await client.from('zones').upsert({ id: zone, is_open: !!open });
      fetchAllAdminData();
    }
  }

  async function saveSlot(date, win, zone, total) {
    const id = `${date}_${win}_${zone}`.replace(/\s+/g, '_');
    if (client) {
      await client.from('slots').upsert({
        id,
        slot_date: date,
        slot_window: win,
        zone,
        total_capacity: +total || 0
      });
      fetchAllAdminData();
    }
  }

  function deletePartner(uid) {
    if (client) return client.from('partners').delete().eq('id', uid);
  }

  function getPartners() { return cache.partners; }
  function getPartner(brp) {
    if (cache.myProfile && cache.myProfile.partnerId === brp) return cache.myProfile;
    return cache.partners.find((p) => p.partnerId === brp) || null;
  }

  /* ---------------- Jobs & Actions ---------------- */
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
    return cache.jobs.filter((j) => (j.partnerIds || []).includes(brp));
  }

  function getJob(jobId) {
    return cache.jobs.find((j) => j.jobId === jobId) || null;
  }

  async function addJob(job) {
    job.jobId = nextJobId();
    job.status = 'Assigned';
    if (client) {
      await client.from('jobs').insert({
        job_id: job.jobId,
        booking_id: job.bookingId || job.jobId,
        status: 'Assigned',
        service_date: job.date || null,
        slot_window: job.slotWindow || job.timeSlot || null,
        service_summary: job.service || 'Cleaning',
        customer_name: job.customerName,
        customer_phone: job.customerPhone,
        customer_address: job.address,
        maps_link: job.mapsLink,
        zone: job.zone,
        items: job.items || [],
        base_amount: job.base || 0,
        customer_price: job.customerPrice || 0,
        payment_status: job.payStatus || 'cash',
        instructions: job.instructions || ''
      });
      fetchAllAdminData();
    }
    return job;
  }

  async function updateJob(jobId, changes) {
    if (client) {
      await client.from('jobs').update(changes).eq('job_id', jobId);
      fetchAllAdminData();
    }
    return { jobId, ...changes };
  }

  async function updateMyAssignment(jobId, brp, changes) {
    if (client) {
      const { error } = await client.rpc('partner_transition_job', {
        p_job_id: jobId,
        p_partner_id: brp,
        p_next_status: changes.status
      });
      if (error) {
        alert('Could not update status: ' + error.message);
        throw error;
      }
      fetchPartnerJobs(brp);
    }
  }

  async function txnAddPartner(jobId, partner) {
    if (client) {
      await client.from('job_assignments').upsert({
        job_id: jobId,
        partner_id: partner.partnerId,
        partner_name: partner.name || partner.partnerId,
        status: 'Assigned'
      });
      fetchAllAdminData();
    }
  }

  async function txnRemovePartner(jobId, brp) {
    if (client) {
      await client.from('job_assignments').delete().eq('job_id', jobId).eq('partner_id', brp);
      fetchAllAdminData();
    }
  }

  async function txnSetIncentive(jobId, brp, incentive) {
    if (client) {
      await client.from('job_assignments').update({
        incentive: Math.round(+incentive || 0)
      }).eq('job_id', jobId).eq('partner_id', brp);
      fetchAllAdminData();
    }
  }

  async function deleteJob(jobId) {
    if (client) {
      await client.from('jobs').delete().eq('job_id', jobId);
      fetchAllAdminData();
    }
  }

  function netEarnings(job) { return (job.base || 0) + (job.bonus || 0) - (job.penalty || 0); }
  function isToday(job) { return job.date === today(); }
  function isOverdue(job) { return !!job.date && String(job.date) < today(); }
  function isFuture(job) { return !!job.date && String(job.date) > today(); }

  return {
    today, ADMIN_EMAIL,
    onAuth, adminSignIn, partnerSignIn, signOutUser, changePin,
    addPartner, updatePartner, setPartnerStatus, setAttendance, deletePartner, getPartners, getPartner,
    getAttendance, getAttendanceForDate, setAttendanceRecord,
    getCoupons, saveCoupon, deleteCoupon, getSlots, saveSlot,
    getZoneStatus, isZoneOpen, setZoneOpen,
    getJobs, getJobsForPartner, getJob, addJob, updateJob, updateMyAssignment,
    txnAddPartner, txnRemovePartner, txnSetIncentive, deleteJob,
    netEarnings, isToday, isFuture, isOverdue,
  };
})();
