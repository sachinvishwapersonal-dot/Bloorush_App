/* BlooRush Partner Mobile App Portal. Dedicated Partner Logic. */

const I18N = {
  en: {
    myJobs: 'My Jobs', earnings: 'Earnings', profile: 'Profile', logout: 'Log out', changePin: 'Change PIN',
    welcome: 'Welcome back', todaysEarnings: "Today's Earnings", todaysOrders: "Today's Tasks", totalEarnings: 'Total Earnings', pendingJobs: 'Active Jobs', completedJobs: 'Completed Jobs',
    yourJobsToday: 'Your jobs today', noJobs: 'No jobs assigned yet. New jobs will show up here.',
    todaysTasks: "Today's Tasks", tasks: 'Tasks', totalTime: 'Total time', upcoming: 'Upcoming Bookings', noToday: 'No active tasks for today.',
    serviceDate: 'Service date', overdue: 'Overdue — contact manager', overdueNote: 'Overdue — contact your manager to reschedule or reassign.',
    scheduledNote: 'Scheduled — actions unlock on the service date.',
    address: 'Address', timeSlot: 'Time slot', expected: 'Expected', notes: 'Instructions', base: 'Base', bonus: 'Bonus',
    penalty: 'Penalty', netEarnings: 'Your Earning', call: 'Call Customer', navigate: 'Navigate', startService: 'Start Service',
    completeService: 'Complete Service', started: 'Started', ended: 'Ended', totalDuration: 'Total duration',
    arriveService: "I've Arrived at Location", Arrived: 'Arrived',
    tapToOpen: 'Tap for details', name: 'Name', partnerId: 'Partner ID', phone: 'Phone', hub: 'Assigned Hub', status: 'Account Status',
    Assigned: 'Assigned', Started: 'In Progress', Completed: 'Completed', min: 'min', timeReached: "Service time reached", minLeft: "min left",
    paymentSummary: "Payment Status", collectCash: "Collect Cash", paidOnline: "Paid Online (Collect ₹0)"
  },
  hi: {
    myJobs: 'मेरे काम', earnings: 'कमाई', profile: 'प्रोफ़ाइल', logout: 'लॉग आउट', changePin: 'पिन बदलें',
    welcome: 'नमस्ते', todaysEarnings: 'आज की कमाई', todaysOrders: 'आज के काम', totalEarnings: 'कुल कमाई', pendingJobs: 'सक्रिय काम', completedJobs: 'पूरे काम',
    yourJobsToday: 'आज के आपके काम', noJobs: 'अभी कोई काम नहीं। नए काम यहाँ दिखेंगे।',
    todaysTasks: "आज के काम", tasks: 'सेवाएं', totalTime: 'कुल समय', upcoming: 'आगामी बुकिंग', noToday: 'आज के लिए कोई काम नहीं।',
    serviceDate: 'तारीख', overdue: 'देरी — मैनेजर से संपर्क करें', overdueNote: 'देरी हुई है — अपने हब मैनेजर से संपर्क करें।',
    scheduledNote: 'अनुसूचित — काम की तारीख पर शुरू होगा।',
    address: 'पता', timeSlot: 'समय', expected: 'अनुमानित समय', notes: 'निर्देश', base: 'मूल राशि', bonus: 'बोनस',
    penalty: 'जुर्माना', netEarnings: 'आपकी कमाई', call: 'कॉल करें', navigate: 'रास्ता देखें', startService: 'काम शुरू करें',
    completeService: 'काम पूरा करें', started: 'शुरू', ended: 'समाप्त', totalDuration: 'कुल समय',
    arriveService: 'मैं लोकेशन पहुँच गया', Arrived: 'पहुँच गया',
    tapToOpen: 'विवरण के लिए टैप करें', name: 'नाम', partnerId: 'पार्टनर आईडी', phone: 'फ़ोन', hub: 'हब', status: 'स्थिति',
    Assigned: 'सौंपा गया', Started: 'चालू है', Completed: 'पूरा हुआ', min: 'मिनट', timeReached: 'सेवा का समय पूरा हुआ', minLeft: 'मिनट बाकी',
    paymentSummary: "भुगतान स्थिति", collectCash: "नकद लें", paidOnline: "ऑनलाइन भुगतान (₹0 लें)"
  },
  mr: {
    myJobs: 'माझी कामे', earnings: 'कमाई', profile: 'प्रोफाइल', logout: 'लॉग आउट', changePin: 'पिन बदला',
    welcome: 'नमस्कार', todaysEarnings: 'आजची कमाई', todaysOrders: 'आजची कामे', totalEarnings: 'एकूण कमाई', pendingJobs: 'सक्रिय कामे', completedJobs: 'पूर्ण कामे',
    yourJobsToday: 'आजची तुमची कामे', noJobs: 'अजून कोणतेही काम नाही. नवीन कामे इथे दिसतील.',
    todaysTasks: "आजची कामे", tasks: 'सेवा', totalTime: 'एकूण वेळ', upcoming: 'आगामी बुकिंग', noToday: 'आज कोणतेही काम नाही.',
    serviceDate: 'तारीख', overdue: 'उशीर — व्यवस्थापकाशी संपर्क साधा', overdueNote: 'उशीर झाला आहे — हब व्यवस्थापकाशी संपर्क साधा.',
    scheduledNote: 'नियोजित — सेवेच्या दिवशी कृती उपलब्ध होईल.',
    address: 'पत्ता', timeSlot: 'वेळ', expected: 'अपेक्षित वेळ', notes: 'सूचना', base: 'मूळ रक्कम', bonus: 'बोनस',
    penalty: 'दंड', netEarnings: 'तुमची कमाई', call: 'कॉल करा', navigate: 'मार्ग पहा', startService: 'काम सुरू करा',
    completeService: 'काम पूर्ण करा', started: 'सुरू', ended: 'संपले', totalDuration: 'एकूण वेळ',
    arriveService: 'मी पोहोचलो', Arrived: 'पोहोचले',
    tapToOpen: 'तपशिलांसाठी टॅप करा', name: 'नाव', partnerId: 'पार्टनर आयडी', phone: 'फोन', hub: 'हब', status: 'स्थिती',
    Assigned: 'नियुक्त', Started: 'सुरू आहे', Completed: 'पूर्ण', min: 'मिनिटे', timeReached: 'सेवेची वेळ संपली', minLeft: 'मिनिटे बाकी',
    paymentSummary: "पेमेंट स्थिती", collectCash: "रोख रक्कम घ्या", paidOnline: "ऑनलाइन पेमेंट (₹0 घ्या)"
  },
};

let currentLanguage = 'en';
function lang() {
  if (currentLanguage && I18N[currentLanguage]) return currentLanguage;
  if (myProfile && I18N[myProfile.language]) return myProfile.language;
  return 'en';
}

function t(key) {
  return (I18N[lang()] && I18N[lang()][key]) || I18N.en[key] || key;
}

let currentPartnerId = null;
let myProfile = null;
let ticker = null;
let activeTab = 'jobs';

/* ---------- Auth Gate ---------- */
Store.onAuth((role, profile) => {
  if (role === 'partner') {
    myProfile = profile;
    currentPartnerId = profile.partnerId;
    if (profile.language) currentLanguage = profile.language;
    showApp();
  } else {
    showLogin(role);
  }
});

function showLogin(role) {
  if (ticker) { clearInterval(ticker); ticker = null; }
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  const err = document.getElementById('loginErr');
  if (role === 'disabled') err.textContent = 'Your account is disabled. Contact your hub manager.';
  else if (role === 'noprofile') err.textContent = 'Signed in, but no partner profile exists. Contact manager.';
  else if (role === 'error') err.textContent = 'Could not load your profile. Check your connection.';
  else err.textContent = '';
}

function doLogin() {
  const phone = document.getElementById('phone').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const err = document.getElementById('loginErr');
  err.textContent = '';

  if (!phone || phone.length < 10) {
    err.textContent = 'Please enter a valid 10-digit mobile number.';
    return;
  }
  if (!pin) {
    err.textContent = 'Please enter your 4-6 digit security PIN.';
    return;
  }

  Store.partnerSignIn(phone, pin).catch(() => {
    err.textContent = 'Incorrect phone number or PIN. Please retry.';
  });
}

function logout() {
  Store.signOutUser();
}

function changePin() {
  const pin = prompt('Enter a new 4 to 6 digit PIN:');
  if (!pin) return;
  if (pin.trim().length < 4) {
    alert('PIN must be at least 4 digits.');
    return;
  }
  Store.changePin(pin.trim())
    .then(() => alert('Your PIN has been successfully updated.'))
    .catch((e) => alert('Could not change PIN: ' + e.message));
}

function onLanguageChange(val) {
  currentLanguage = val;
  applyStaticLabels();
  render();
  if (myProfile && Store.updatePartnerProfile) {
    Store.updatePartnerProfile(myProfile.partnerId, { language: val }).catch(() => {});
  }
}

/* ---------- Navigation ---------- */
function showSection(name) {
  activeTab = name;
  ['jobs', 'earnings', 'profile'].forEach((s) => {
    const el = document.getElementById('sec-' + s);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });

  // Update bottom nav active classes
  ['jobs', 'earnings', 'profile'].forEach((s) => {
    const tabEl = document.getElementById('tab' + s.charAt(0).toUpperCase() + s.slice(1));
    if (tabEl) {
      if (s === name) tabEl.classList.add('active');
      else tabEl.classList.remove('active');
    }
  });

  window.scrollTo(0, 0);
}

function money(n) {
  return '₹' + (n || 0).toLocaleString('en-IN');
}

function applyStaticLabels() {
  const l = lang();
  const langSel = document.getElementById('langSelect');
  if (langSel) langSel.value = l;

  if (document.getElementById('navTextJobs')) document.getElementById('navTextJobs').textContent = t('myJobs');
  if (document.getElementById('navTextEarnings')) document.getElementById('navTextEarnings').textContent = t('earnings');
  if (document.getElementById('navTextProfile')) document.getElementById('navTextProfile').textContent = t('profile');

  if (document.getElementById('jobsHeading')) document.getElementById('jobsHeading').textContent = t('yourJobsToday');
  if (document.getElementById('earningsHeading')) document.getElementById('earningsHeading').textContent = t('earnings');
  if (document.getElementById('profileHeading')) document.getElementById('profileHeading').textContent = t('profile');

  if (document.getElementById('lblHeroEarnings')) document.getElementById('lblHeroEarnings').textContent = t('todaysEarnings');
  if (document.getElementById('lblHeroOrders')) document.getElementById('lblHeroOrders').textContent = t('completedJobs');
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  applyStaticLabels();

  const name = myProfile.name || 'Partner';
  const initial = name.charAt(0).toUpperCase() || 'P';
  const hub = myProfile.hub || 'Nagpur Hub';

  document.getElementById('avatarLetter').textContent = initial;
  document.getElementById('topbarHub').textContent = hub;
  document.getElementById('heroGreeting').textContent = t('welcome') + ' 👋';
  document.getElementById('heroName').textContent = name;
  document.getElementById('heroHubName').textContent = hub;

  document.getElementById('profileBigAvatar').textContent = initial;
  document.getElementById('profileBigName').textContent = name;
  document.getElementById('profileBigId').textContent = 'Partner ID: ' + (myProfile.partnerId || '—');

  showSection('jobs');
  render();

  if (ticker) clearInterval(ticker);
  ticker = setInterval(updateTimers, 1000);
}

function todayJobs() {
  return Store.getJobsForPartner(currentPartnerId).filter(Store.isToday);
}

function myActiveJobs() {
  return Store.getJobsForPartner(currentPartnerId)
    .filter((j) => myAsg(j).status !== 'Completed')
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

function __safe(fn) {
  try { fn(); } catch (e) { console.error('render failed:', e); }
}

function render() {
  __safe(renderStats);
  __safe(renderJobs);
  __safe(renderEarnings);
  __safe(renderProfile);
}

function renderStats() {
  const all = Store.getJobsForPartner(currentPartnerId);
  const today = all.filter(Store.isToday);
  const todayEarn = today.filter((j) => myAsg(j).status === 'Completed').reduce((s, j) => s + myEarning(j), 0);
  const todayCompleted = today.filter((j) => myAsg(j).status === 'Completed').length;
  const totalEarn = all.filter((j) => myAsg(j).status === 'Completed').reduce((s, j) => s + myEarning(j), 0);
  const activeCount = myActiveJobs().length;

  document.getElementById('valHeroEarnings').textContent = money(todayEarn);
  document.getElementById('valHeroOrders').textContent = todayCompleted + ' / ' + today.length;

  const stats = [
    [t('pendingJobs'), activeCount],
    [t('totalEarnings'), money(totalEarn)]
  ];

  document.getElementById('stats').innerHTML = stats
    .map(([l, v]) => `
      <div class="stat-card">
        <div class="label">${l}</div>
        <div class="value">${v}</div>
      </div>
    `).join('');
}

function renderEarnings() {
  const all = Store.getJobsForPartner(currentPartnerId);
  const completed = all.filter((j) => myAsg(j).status === 'Completed');
  const totalBase = completed.reduce((s, j) => s + (j.base || 0), 0);
  const totalEarned = completed.reduce((s, j) => s + myEarning(j), 0);
  const today = all.filter(Store.isToday);
  const todayEarned = today.filter((j) => myAsg(j).status === 'Completed').reduce((s, j) => s + myEarning(j), 0);

  const el = document.getElementById('earningsDetailCard');
  if (!el) return;

  el.innerHTML = `
    <div class="line"><span class="k">${t('todaysEarnings')}</span><span class="v earning-highlight">${money(todayEarned)}</span></div>
    <div class="line"><span class="k">${t('completedJobs')}</span><span class="v">${completed.length}</span></div>
    <div class="line" style="border-top:2px solid var(--line);margin-top:6px;padding-top:10px;">
      <span class="k" style="font-weight:700;color:var(--ink);">${t('totalEarnings')}</span>
      <span class="v earning-highlight" style="font-size:22px;">${money(totalEarned)}</span>
    </div>
  `;
}

function renderProfile() {
  if (!myProfile) return;
  const p = myProfile;
  document.getElementById('profileCard').innerHTML = `
    <div class="line"><span class="k">${t('name')}</span><span class="v">${p.name}</span></div>
    <div class="line"><span class="k">${t('partnerId')}</span><span class="v">${p.partnerId}</span></div>
    <div class="line"><span class="k">${t('phone')}</span><span class="v">${p.phone}</span></div>
    <div class="line"><span class="k">${t('hub')}</span><span class="v">${p.hub}</span></div>
    <div class="line"><span class="k">${t('status')}</span><span class="v"><span class="badge green">${p.status || 'Active'}</span></span></div>
  `;
}

function fmtTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '—';
}

function elapsed(startIso, endIso) {
  if (!startIso) return '00:00:00';
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  let s = Math.max(0, Math.floor((end - new Date(startIso).getTime()) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function statusBadge(s) {
  const label = t(s);
  if (s === 'Completed') return `<span class="badge green">✓ ${label}</span>`;
  if (s === 'Started') return `<span class="badge amber"><span class="pulse-dot"></span> ${label}</span>`;
  if (s === 'Arrived') return `<span class="badge blue">📍 ${label}</span>`;
  return `<span class="badge blue">${label}</span>`;
}

function myAsg(j) {
  const as = Array.isArray(j.assignments) ? j.assignments : [];
  return as.find((a) => a.partnerId === currentPartnerId) || {
    status: j.status, startedAt: j.startedAt, arrivedAt: j.arrivedAt, endedAt: j.endedAt, incentive: 0
  };
}

function myEarning(j) {
  return +(myAsg(j).incentive || 0);
}

function pItemLabel(it) {
  const q = it.option && it.option !== 'per unit' ? it.option : (it.qty > 1 ? ('x' + it.qty) : '');
  return `${it.name}${q ? ' ' + q : ''}`;
}

function pTotalMins(j) {
  if (typeof j.totalMins === 'number' && j.totalMins > 0) return j.totalMins;
  return (Array.isArray(j.items) ? j.items : []).reduce((a, i) => a + (i.mins || 0), 0);
}

function itemsBreakdownPartner(j) {
  const items = Array.isArray(j.items) ? j.items : [];
  if (!items.length) return '';
  const lines = items.map((it, n) => {
    const time = it.time ? it.time : (it.mins ? it.mins + ' min' : '');
    return `<div class="line"><span class="k">${n + 1}. ${pItemLabel(it)}</span><span class="v">${time}</span></div>`;
  }).join('');
  const tot = pTotalMins(j);
  return `
    <div class="tasklist">
      <div class="tasklist-h">${t('tasks')}</div>
      ${lines}
      ${tot ? `<div class="line" style="border-top:1px solid var(--line);margin-top:4px;padding-top:6px;font-weight:800"><span class="k">${t('totalTime')}</span><span class="v">${tot} min</span></div>` : ''}
    </div>
  `;
}

function renderJobs() {
  const active = myActiveJobs();
  const el = document.getElementById('jobs');
  if (active.length === 0) {
    el.innerHTML = `<div class="empty">🎉 ${t('noJobs')}</div>`;
    return;
  }

  const overdue   = active.filter((j) => Store.isOverdue(j));
  const todayList = active.filter((j) => !Store.isFuture(j) && !Store.isOverdue(j));
  const upcoming  = active.filter((j) => Store.isFuture(j));

  let html = '';
  if (overdue.length) {
    html += `<div class="jobs-group-title" style="color:var(--red)">⚠️ ${t('overdue')}</div>`;
    html += overdue.map((j) => jobCard(j, false)).join('');
  }

  html += `<div class="jobs-group-title" style="color:var(--blue)">⚡ ${t('todaysTasks')} (${todayList.length})</div>`;
  html += todayList.length
    ? todayList.map((j) => jobCard(j, true)).join('')
    : `<div class="empty">${t('noToday')}</div>`;

  if (upcoming.length) {
    html += `<div class="jobs-group-title" style="margin-top:18px">🗓️ ${t('upcoming')} (${upcoming.length})</div>`;
    html += upcoming.map((j) => jobCard(j, false)).join('');
  }

  el.innerHTML = html;
}

function jobCard(j, actionable) {
  const me = myAsg(j);
  const st = me.status || 'Assigned';

  const call = j.customerPhone
    ? `<a class="btn secondary" href="tel:${j.customerPhone}">📞 ${t('call')}</a>`
    : `<span class="btn secondary disabled">📞 ${t('call')}</span>`;

  const nav = j.mapsLink
    ? `<a class="btn secondary" href="${j.mapsLink}" target="_blank" rel="noopener">🗺️ ${t('navigate')}</a>`
    : `<span class="btn secondary disabled">🗺️ ${t('navigate')}</span>`;

  let action = '';
  if (!actionable) {
    const od = Store.isOverdue(j);
    action = `
      <div class="line"><span class="k">${t('serviceDate')}</span><span class="v">${j.date || '—'}</span></div>
      <div class="sub" style="margin-top:6px;font-size:12px;${od ? 'color:var(--red)' : ''}">
        ${od ? (t('overdueNote')) : t('scheduledNote')}
      </div>`;
  } else if (st === 'Assigned') {
    action = `<button class="btn" onclick="arriveJob('${j.jobId}')">📍 ${t('arriveService')}</button>`;
  } else if (st === 'Arrived') {
    action = `<button class="btn green" onclick="startJob('${j.jobId}')">▶️ ${t('startService')}</button>`;
  } else if (st === 'Started') {
    action = `
      <div class="timer-container">
        <div class="timer" id="timer-${j.jobId}">${elapsed(me.startedAt)}</div>
        <div class="alertmsg" id="alert-${j.jobId}"></div>
      </div>
      <button class="btn green" onclick="completeJob('${j.jobId}')">✅ ${t('completeService')}</button>`;
  } else {
    action = `
      <div class="line"><span class="k">${t('started')}</span><span class="v">${fmtTime(me.startedAt)}</span></div>
      <div class="line"><span class="k">${t('ended')}</span><span class="v">${fmtTime(me.endedAt)}</span></div>
      <div class="line"><span class="k">${t('totalDuration')}</span><span class="v">${elapsed(me.startedAt, me.endedAt)}</span></div>`;
  }

  const open = (actionable && (st === 'Started' || st === 'Arrived')) ? 'open' : '';
  const isStarted = st === 'Started';

  return `
    <details class="job-card ${isStarted ? 'active-job' : ''}" ${open}>
      <summary>
        <div class="job-header">
          <div>
            <div class="job-title">${j.customerName || 'Customer'}</div>
            <div class="job-service">${j.service || 'Cleaning Service'}</div>
          </div>
          ${actionable ? statusBadge(st) : `<span class="badge gray">${j.date || ''}</span>`}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <div>
            <span style="font-size:12px;color:var(--muted);">${t('netEarnings')}: </span>
            <span class="earning-highlight">${money(myEarning(j))}</span>
          </div>
          <div class="toggle-hint">
            <span>${t('tapToOpen')}</span>
            <span>▾</span>
          </div>
        </div>
      </summary>

      <div class="job-body">
        ${itemsBreakdownPartner(j)}
        
        <div class="line">
          <span class="k">${t('address')}</span>
          <span class="v" style="max-width:65%;">${j.address || '—'}</span>
        </div>
        <div class="line">
          <span class="k">${t('timeSlot')}</span>
          <span class="v">${j.timeSlot || '—'}</span>
        </div>
        ${j.instructions ? `<div class="line"><span class="k">${t('notes')}</span><span class="v" style="max-width:65%;">${j.instructions}</span></div>` : ''}
        
        <div class="btn-row">
          ${call}
          ${nav}
        </div>

        <div style="margin-top:12px;">
          ${action}
        </div>
      </div>
    </details>
  `;
}

function arriveJob(jobId) {
  Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Arrived', arrivedAt: new Date().toISOString() });
}

function startJob(jobId) {
  Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Started', startedAt: new Date().toISOString() });
}

function completeJob(jobId) {
  Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Completed', endedAt: new Date().toISOString() });
}

function updateTimers() {
  myActiveJobs().forEach((j) => {
    const me = myAsg(j);
    if (me.status !== 'Started') return;
    const el = document.getElementById('timer-' + j.jobId);
    if (!el) return;
    el.textContent = elapsed(me.startedAt);
  });
}
