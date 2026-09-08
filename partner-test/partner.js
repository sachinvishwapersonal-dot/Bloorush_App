/* Partner portal. Real Firebase login. Sectioned nav + collapsible cards + language. */

const I18N = {
  en: { myJobs: 'My Jobs', profile: 'Profile', logout: 'Log out', changePin: 'Change PIN',
    welcome: 'Welcome', todaysEarnings: "Today's Earnings", todaysOrders: "Today's Orders", totalEarnings: 'Total Earnings', pendingJobs: 'Pending Jobs', completedJobs: 'Completed Jobs',
    yourJobsToday: 'Your jobs today', noJobs: 'No jobs assigned yet. New jobs will show up here.',
    todaysTasks: "Today's Tasks", tasks: 'Tasks', totalTime: 'Total time', upcoming: 'Upcoming / Scheduled', noToday: 'No tasks for today.', serviceDate: 'Service date', overdue: 'Overdue — contact manager', overdueNote: 'Overdue — contact your manager to reschedule or reassign.', scheduledNote: 'Scheduled — actions unlock on the service date.',
    address: 'Address', timeSlot: 'Time slot', expected: 'Expected', notes: 'Notes', base: 'Base', bonus: 'Bonus',
    penalty: 'Penalty', netEarnings: 'Net earnings', call: 'Call', navigate: 'Navigate', startService: 'Start service',
    completeService: 'Complete service', started: 'Started', ended: 'Ended', totalDuration: 'Total duration',
    arriveService: "I've arrived", Arrived: 'Arrived',
    tapToOpen: 'tap to open', name: 'Name', partnerId: 'Partner ID', phone: 'Phone', hub: 'Hub', status: 'Status',
    Assigned: 'Assigned', Started: 'Started', Completed: 'Completed', min: 'min', timeReached: "Service time reached", minLeft: "min left", collectCash: "Collect cash", paidOnline: "Paid online — collect nothing" },
  hi: { myJobs: 'मेरे काम', profile: 'प्रोफ़ाइल', logout: 'लॉग आउट', changePin: 'पिन बदलें',
    welcome: 'नमस्ते', todaysEarnings: 'आज की कमाई', todaysOrders: 'आज के ऑर्डर', totalEarnings: 'कुल कमाई', pendingJobs: 'बाकी काम', completedJobs: 'पूरे काम',
    yourJobsToday: 'आज के आपके काम', noJobs: 'अभी कोई काम नहीं। नए काम यहाँ दिखेंगे।',
    address: 'पता', timeSlot: 'समय', expected: 'अनुमानित समय', notes: 'सूचना', base: 'मूल राशि', bonus: 'बोनस',
    penalty: 'जुर्माना', netEarnings: 'कुल कमाई', call: 'कॉल करें', navigate: 'रास्ता', startService: 'काम शुरू करें',
    completeService: 'काम पूरा करें', started: 'शुरू', ended: 'समाप्त', totalDuration: 'कुल समय',
    arriveService: 'मैं पहुँच गया', Arrived: 'पहुँच गया',
    tapToOpen: 'खोलने के लिए टैप करें', name: 'नाम', partnerId: 'पार्टनर आईडी', phone: 'फ़ोन', hub: 'हब', status: 'स्थिति',
    Assigned: 'सौंपा गया', Started: 'शुरू', Completed: 'पूरा', min: 'मिनट', timeReached: 'सेवा का समय पूरा हुआ', minLeft: 'मिनट बाकी', collectCash: 'नकद लें', paidOnline: 'ऑनलाइन भुगतान हो चुका' },
  mr: { myJobs: 'माझी कामे', profile: 'प्रोफाइल', logout: 'लॉग आउट', changePin: 'पिन बदला',
    welcome: 'नमस्कार', todaysEarnings: 'आजची कमाई', todaysOrders: 'आजचे ऑर्डर', totalEarnings: 'एकूण कमाई', pendingJobs: 'बाकी कामे', completedJobs: 'पूर्ण कामे',
    yourJobsToday: 'आजची तुमची कामे', noJobs: 'अजून कोणतेही काम नाही. नवीन कामे इथे दिसतील.',
    address: 'पत्ता', timeSlot: 'वेळ', expected: 'अपेक्षित वेळ', notes: 'सूचना', base: 'मूळ रक्कम', bonus: 'बोनस',
    penalty: 'दंड', netEarnings: 'एकूण कमाई', call: 'कॉल करा', navigate: 'मार्ग', startService: 'काम सुरू करा',
    completeService: 'काम पूर्ण करा', started: 'सुरू', ended: 'संपले', totalDuration: 'एकूण वेळ',
    arriveService: 'मी पोहोचलो', Arrived: 'पोहोचले',
    tapToOpen: 'उघडण्यासाठी टॅप करा', name: 'नाव', partnerId: 'पार्टनर आयडी', phone: 'फोन', hub: 'हब', status: 'स्थिती',
    Assigned: 'नियुक्त', Started: 'सुरू', Completed: 'पूर्ण', min: 'मिनिटे', timeReached: 'सेवेची वेळ संपली', minLeft: 'मिनिटे बाकी', collectCash: 'रोख घ्या', paidOnline: 'ऑनलाइन पेमेंट झाले' },
};
function lang() { return (myProfile && I18N[myProfile.language]) ? myProfile.language : 'en'; }
function t(key) { return I18N[lang()][key] || I18N.en[key] || key; }

let currentPartnerId = null;
let myProfile = null;
let ticker = null;

/* ---------- auth gate ---------- */
Store.onAuth((role, profile) => {
  if (role === 'partner') { myProfile = profile; currentPartnerId = profile.partnerId; showApp(); }
  else { showLogin(role); }
});
function showLogin(role) {
  if (ticker) { clearInterval(ticker); ticker = null; }
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'block';
  var err = document.getElementById('loginErr');
  if (role === 'disabled') err.textContent = 'Your account is disabled. Contact your admin.';
  else if (role === 'noprofile') err.textContent = 'Signed in, but no partner profile exists for this account on this project. Ask your admin to add you again here.';
  else if (role === 'error') err.textContent = 'Could not load your profile (check your connection / database rules).';
  else if (role === 'admin') err.textContent = 'This browser is signed in as Admin. Open the partner portal in a separate/incognito window to log in as a partner.';
  else err.textContent = '';
}
function doLogin() {
  const phone = document.getElementById('phone').value;
  const pin = document.getElementById('pin').value;
  document.getElementById('loginErr').textContent = '';
  Store.partnerSignIn(phone, pin).catch(() => { document.getElementById('loginErr').textContent = 'Wrong phone number or PIN.'; });
}
function logout() { Store.signOutUser(); }
function changePin() {
  const pin = prompt('Enter a new PIN (at least 4 digits):');
  if (!pin) return;
  if (pin.trim().length < 4) { alert('PIN must be at least 4 digits.'); return; }
  Store.changePin(pin.trim()).then(() => alert('PIN updated.')).catch((e) => alert('Could not change PIN: ' + e.message));
}

/* ---------- navigation ---------- */
function toggleMenu() { const m = document.getElementById('menu'); m.style.display = m.style.display === 'none' ? 'block' : 'none'; }
function showSection(name) {
  ['jobs', 'profile'].forEach((s) => { document.getElementById('sec-' + s).style.display = s === name ? 'block' : 'none'; });
  document.getElementById('sectionTitle').textContent = name === 'profile' ? t('profile') : t('myJobs');
  document.getElementById('menu').style.display = 'none';
  window.scrollTo(0, 0);
}

function money(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

/* ---------- service-time alerts (sound + vibrate) ---------- */
let audioCtx = null;
const alertState = {}; // jobId -> { warned, over }
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* audio unsupported */ }
}
function beep(times) {
  ensureAudio();
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  for (let i = 0; i < times; i++) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.start(t); o.stop(t + 0.3);
    t += 0.4;
  }
}
function vibrate(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} } }
function elapsedSecs(startIso, endIso) {
  if (!startIso) return 0;
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(startIso).getTime()) / 1000));
}
function thresholds(durationMins) {
  const total = (durationMins || 0) * 60;
  const warnAt = total > 360 ? total - 300 : Math.floor(total * 0.75); // 5 min before, or 75% for short jobs
  return { total, warnAt };
}

function applyStaticLabels() {
  document.getElementById('logoutBtn').textContent = t('logout');
  document.getElementById('navJobs').textContent = '📋 ' + t('myJobs');
  document.getElementById('navProfile').textContent = '👤 ' + t('profile');
  document.getElementById('jobsHeading').textContent = t('yourJobsToday');
  document.getElementById('profileHeading').textContent = t('profile');
  document.getElementById('changePinBtn').textContent = t('changePin');
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  applyStaticLabels();
  document.getElementById('hello').textContent = t('welcome') + ', ' + myProfile.name + ' (' + myProfile.partnerId + ')';
  document.getElementById('hubLabel').textContent = myProfile.hub;
  showSection('jobs');
  render();
  if (ticker) clearInterval(ticker);
  ticker = setInterval(updateTimers, 1000);
}

function todayJobs() { return Store.getJobsForPartner(currentPartnerId).filter(Store.isToday); }
// All of the partner's not-yet-completed jobs, any date, earliest first.
function myActiveJobs() {
  return Store.getJobsForPartner(currentPartnerId)
    .filter((j) => myAsg(j).status !== 'Completed')
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}
function __safe(fn){ try{ fn(); }catch(e){ console.error('render section failed:', e); } }
function render() { __safe(renderStats); __safe(renderJobs); __safe(renderProfile); }

function renderStats() {
  const all = Store.getJobsForPartner(currentPartnerId);
  const today = all.filter(Store.isToday);
  const todayOrders = today.length;
  const todayEarn = today.filter((j) => myAsg(j).status === 'Completed').reduce((s, j) => s + myEarning(j), 0);
  const totalEarn = all.filter((j) => myAsg(j).status === 'Completed').reduce((s, j) => s + myEarning(j), 0);
  const pending = myActiveJobs().length;
  const stats = [
    [t('todaysEarnings'), money(todayEarn), true],
    [t('todaysOrders'), todayOrders, false],
    [t('totalEarnings'), money(totalEarn), true],
    [t('pendingJobs'), pending, false],
  ];
  document.getElementById('stats').innerHTML = stats
    .map(([l, v, a]) => `<div class="stat ${a ? 'accent' : ''}"><div class="label">${l}</div><div class="value">${v}</div></div>`)
    .join('');
}

function renderProfile() {
  if (!myProfile) return;
  const p = myProfile;
  document.getElementById('profileCard').innerHTML = `
    <div class="line"><span class="k">${t('name')}</span><span class="v">${p.name}</span></div>
    <div class="line"><span class="k">${t('partnerId')}</span><span class="v">${p.partnerId}</span></div>
    <div class="line"><span class="k">${t('phone')}</span><span class="v">${p.phone}</span></div>
    <div class="line"><span class="k">${t('hub')}</span><span class="v">${p.hub}</span></div>
    <div class="line"><span class="k">${t('status')}</span><span class="v">${p.status}</span></div>`;
}

function fmtTime(iso) { return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '—'; }
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
  if (s === 'Completed') return `<span class="badge green">${label}</span>`;
  if (s === 'Started') return `<span class="badge amber">${label}</span>`;
  return `<span class="badge blue">${label}</span>`;
}
// paymentLine removed: partners never see customer prices or cash-collect amounts.


function myAsg(j) {
  const as = Array.isArray(j.assignments) ? j.assignments : [];
  return as.find((a) => a.partnerId === currentPartnerId) || { status: j.status, startedAt: j.startedAt, arrivedAt: j.arrivedAt, endedAt: j.endedAt, incentive: 0 };
}
function myEarning(j) { return +(myAsg(j).incentive || 0); }
function renderJobs() {
  const active = myActiveJobs();
  const el = document.getElementById('jobs');
  if (active.length === 0) { el.innerHTML = `<div class="empty">${t('noJobs')}</div>`; return; }
  const overdue   = active.filter((j) => Store.isOverdue(j));                          // past date -> read-only
  const todayList = active.filter((j) => !Store.isFuture(j) && !Store.isOverdue(j));   // today -> actionable
  const upcoming  = active.filter((j) => Store.isFuture(j));                           // future -> read-only

  let html = '';
  if (overdue.length) {
    html += `<div class="jobs-group-title" style="color:#C2543B">${t('overdue') || 'Overdue — contact manager'}</div>`;
    html += overdue.map((j) => jobCard(j, false)).join('');
  }
  html += `<div class="jobs-group-title"${overdue.length ? ' style="margin-top:18px"' : ''}>${t('todaysTasks')}</div>`;
  html += todayList.length
    ? todayList.map((j) => jobCard(j, true)).join('')
    : `<div class="empty">${t('noToday')}</div>`;
  if (upcoming.length) {
    html += `<div class="jobs-group-title" style="margin-top:18px">${t('upcoming')}</div>`;
    html += upcoming.map((j) => jobCard(j, false)).join('');
  }
  el.innerHTML = html;
}

// actionable=true renders Arrive/Start/Complete; false renders read-only planning info.
// Task list for partners: name + qualifier, per-task time, and a total time. NO money.
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
  return `<div class="tasklist"><div class="tasklist-h">${t('tasks') || 'Tasks'}</div>${lines}`
    + (tot ? `<div class="line" style="border-top:1px solid var(--line,#e5e7eb);margin-top:4px;padding-top:6px;font-weight:800"><span class="k">${t('totalTime') || 'Total time'}</span><span class="v">${tot} min</span></div>` : '')
    + `</div>`;
}

function jobCard(j, actionable) {
  const me = myAsg(j); const st = me.status || 'Assigned';
  const call = j.customerPhone ? `<a class="btn secondary" href="tel:${j.customerPhone}">${t('call')}</a>` : `<span class="btn secondary disabled">${t('call')}</span>`;
  const nav = j.mapsLink ? `<a class="btn secondary" href="${j.mapsLink}" target="_blank" rel="noopener">${t('navigate')}</a>` : `<span class="btn secondary disabled">${t('navigate')}</span>`;
  let action = '';
  if (!actionable) {
    // Read-only (future or overdue): no Arrive/Start/Complete controls.
    const od = Store.isOverdue(j);
    action = `<div class="line"><span class="k">${t('serviceDate')}</span><span class="v">${j.date || '—'}</span></div>`
           + `<div class="muted" style="margin-top:6px${od ? ';color:#C2543B' : ''}">${od ? (t('overdueNote') || 'Overdue — contact your manager to reschedule or reassign.') : t('scheduledNote')}</div>`;
  } else if (st === 'Assigned') action = `<button class="btn" onclick="arriveJob('${j.jobId}')">${t('arriveService')}</button>`;
  else if (st === 'Arrived') action = `<button class="btn" onclick="startJob('${j.jobId}')">${t('startService')}</button>`;
  else if (st === 'Started') action = `<div class="timer" id="timer-${j.jobId}">${elapsed(me.startedAt)}</div><div class="alertmsg" id="alert-${j.jobId}"></div><button class="btn green" onclick="completeJob('${j.jobId}')">${t('completeService')}</button>`;
  else action = `<div class="line"><span class="k">${t('started')}</span><span class="v">${fmtTime(me.startedAt)}</span></div><div class="line"><span class="k">${t('ended')}</span><span class="v">${fmtTime(me.endedAt)}</span></div><div class="line"><span class="k">${t('totalDuration')}</span><span class="v">${elapsed(me.startedAt, me.endedAt)}</span></div>`;
  const open = (actionable && st === 'Started') ? 'open' : '';
  return `
    <details class="card" ${open}>
      <summary>
        <div class="flex" style="justify-content:space-between">
          <div><div class="job-title">${j.customerName}</div><div class="muted">${j.service}</div></div>
          ${actionable ? statusBadge(st) : `<span class="badge">${j.date || ''}</span>`}
        </div>
        <div class="muted" style="margin-top:6px"><span class="net">${money(myEarning(j))}</span> <span class="chev">· ${t('tapToOpen')}</span></div>
      </summary>
      <div class="body">
        ${itemsBreakdownPartner(j)}
        <div class="line"><span class="k">${t('address')}</span><span class="v" style="max-width:60%;text-align:right">${j.address || '—'}</span></div>
        <div class="line"><span class="k">${t('timeSlot')}</span><span class="v">${j.timeSlot || '—'}</span></div>
        ${j.instructions ? `<div class="line"><span class="k">${t('notes')}</span><span class="v" style="max-width:60%;text-align:right">${j.instructions}</span></div>` : ''}
        <div class="line"><span class="k">${t('netEarnings')}</span><span class="net">${money(myEarning(j))}</span></div>
        <div class="spacer"></div>
        <div class="row">${call}${nav}</div>
        <div class="spacer"></div>
        ${action}
      </div>
    </details>`;
}

function arriveJob(jobId) { Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Arrived', arrivedAt: new Date().toISOString() }); }
function startJob(jobId) { ensureAudio(); Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Started', startedAt: new Date().toISOString() }); }
function completeJob(jobId) { delete alertState[jobId]; Store.updateMyAssignment(jobId, currentPartnerId, { status: 'Completed', endedAt: new Date().toISOString() }); }
function updateTimers() {
  myActiveJobs().forEach((j) => {
    const me = myAsg(j); if (me.status !== 'Started') return;
    const el = document.getElementById('timer-' + j.jobId);
    if (!el) return;
    el.textContent = elapsed(me.startedAt);
  });
}
function __oldUpdateTimers() {
  todayJobs().filter((j) => j.status === 'Started').forEach((j) => {
    const el = document.getElementById('timer-' + j.jobId);
    const msg = document.getElementById('alert-' + j.jobId);
    if (!el) return;
    const secs = elapsedSecs(j.startedAt);
    el.textContent = elapsed(j.startedAt);
    const { total, warnAt } = thresholds(j.durationMins);
    const st = alertState[j.jobId] || (alertState[j.jobId] = { warned: false, over: false });

    if (total > 0 && secs >= total) {
      el.className = 'timer over';
      if (msg) { msg.className = 'alertmsg over'; msg.textContent = '⏰ ' + t('timeReached'); }
      if (!st.over) { st.over = true; beep(3); vibrate([250, 120, 250, 120, 250]); }
    } else if (total > 0 && secs >= warnAt) {
      const leftMin = Math.max(1, Math.ceil((total - secs) / 60));
      el.className = 'timer warn';
      if (msg) { msg.className = 'alertmsg warn'; msg.textContent = '⚠️ ' + leftMin + ' ' + t('minLeft'); }
      if (!st.warned) { st.warned = true; beep(2); vibrate([150, 100, 150]); }
    } else {
      el.className = 'timer';
      if (msg) msg.textContent = '';
    }
  });
}
