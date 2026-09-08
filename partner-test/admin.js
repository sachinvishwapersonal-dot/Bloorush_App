/* Admin portal. Sectioned navigation + date filter + collapsible cards. */

let editingJobId = null;
let editingRating = null;
let editingPartnerUid = null;
let partnerPhoto = null;
let selectedDate = null;
let selectedServices = new Set();

/* ---------- auth gate ---------- */
Store.onAuth((role) => {
  if (role === 'admin') showApp();
  else showLogin(role);
});
function showLogin(role) {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'block';
  if (role === 'partner') document.getElementById('loginErr').textContent = 'That is a partner account. Use the Partner portal.';
}
function doLogin() {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;
  document.getElementById('loginErr').textContent = '';
  Store.adminSignIn(email, pass).catch(() => { document.getElementById('loginErr').textContent = 'Wrong email or password.'; });
}
function logout() { Store.signOutUser(); }

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  selectedDate = Store.today();
  document.getElementById('opsDate').value = selectedDate;
  document.getElementById('f_date').value = Store.today();
  resetServicePicker();
  resetSlotPicker();
  renderIncentive();
  showSection('dashboard');
  render();
}

/* ---------- navigation ---------- */
function toggleMenu() {
  const m = document.getElementById('menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}
function showSection(name) {
  ['dashboard', 'attendance', 'create', 'jobs', 'partners', 'slots', 'coupons'].forEach((s) => {
    const el = document.getElementById('sec-' + s);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });
  const titles = { dashboard: 'Dashboard', attendance: 'Attendance', create: 'Create Job', jobs: 'All Jobs', partners: 'Partners', slots: 'Slots', coupons: 'Coupons' };
  document.getElementById('sectionTitle').textContent = titles[name] || '';
  document.getElementById('menu').style.display = 'none';
  window.scrollTo(0, 0);
}

function money(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

/* ---------- incentive engine ---------- */
const WAGE_BASELINE = 85.6;                       // ≈ ₹85.60 per task
const TIER_PAY = { premium: 35, standard: 25, quick: 15 };
const SERVICE_TIER = {
  kitchen: 'premium', deeptoilet: 'premium',
  toiletbath: 'standard', mopsweep: 'standard', window: 'standard', ironing: 'standard', balcony: 'standard',
  utensils: 'quick', dusting: 'quick', fan: 'quick', fridge: 'quick', packing: 'quick',
};
function tierOf(serviceId) { return SERVICE_TIER[serviceId] || 'quick'; }
function incentiveTierOf(s) {
  if (s.id === 'toiletbath') {
    const l = (s.tierLabel || '').toLowerCase();
    if (l.startsWith('2 ') || l.startsWith('3 ')) return 'premium';   // 2+ combined
    if (l.includes('combined')) return 'standard';                     // combined
    return 'quick';                                                    // single toilet/bathroom
  }
  return SERVICE_TIER[s.id] || 'quick';
}
function tierIncentive(services) {
  return (services || []).reduce((sum, s) => sum + (TIER_PAY[incentiveTierOf(s)] || 0), 0);
}
function ratingFactor(r) {
  if (r == null || r === '') return 1;            // not rated yet → full (pending)
  r = Number(r);
  if (r >= 4) return 1;
  if (r === 3) return 0.7;
  if (r === 2) return 0.4;
  return 0;                                        // 1 star → no incentive
}
// returns the final bonus (incentive) after rating gate + break-even cap
function computeIncentive(services, customerPrice, base, rating) {
  const raw = tierIncentive(services) * ratingFactor(rating);
  const maxByBreakEven = Math.max(0, (customerPrice || 0) - (base || 0));
  return Math.floor(Math.min(raw, maxByBreakEven));  // floor keeps break-even ≥ 0
}
function baseVal() { return WAGE_BASELINE; }
function renderIncentive() {
  const el = document.getElementById('incentiveBox'); if (!el) return;
  const services = selectedServiceObjects();
  if (services.length === 0) { el.innerHTML = '<div class="muted">Incentive appears once services are added.</div>'; return; }
  const price = num('f_customerPrice');
  const base = WAGE_BASELINE;
  const raw = tierIncentive(services);
  const afterRating = Math.floor(raw * ratingFactor(editingRating));
  const bonus = computeIncentive(services, price, base, editingRating);
  const capped = bonus < afterRating;
  el.innerHTML =
    `<div class="line"><span class="k">Tier incentive</span><span class="v">${money(raw)}</span></div>` +
    (editingRating ? `<div class="line"><span class="k">After rating (${editingRating}★)</span><span class="v">${money(afterRating)}</span></div>` : '') +
    (capped ? `<div class="line" style="color:var(--red)"><span class="k">Break-even cap</span><span class="v">${money(bonus)}</span></div>` : '') +
    `<div class="svc-total"><span>Partner incentive (auto)</span><span>${money(bonus)}</span></div>` +
    `<div class="muted" style="margin-top:6px">Earnings = wage ${money(base)} + incentive ${money(bonus)}${num('f_penalty') ? ' − penalty ' + money(num('f_penalty')) : ''}</div>`;
}
function setRating(jobId, r) {
  const j = Store.getJob(jobId); if (!j) return;
  const rating = r === '' ? null : Number(r);
  const base = (j.base != null) ? j.base : WAGE_BASELINE;
  const bonus = computeIncentive(j.services, j.customerPrice, base, rating);
  Store.updateJob(jobId, { rating, bonus });
}

/* ---------- start/end time-slot picker (15-min steps, 6 AM–10 PM) ---------- */
function buildSlotLabels() {
  const out = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      const ampm = h < 12 ? 'AM' : 'PM';
      let hr = h % 12; if (hr === 0) hr = 12;
      out.push(`${hr}:${String(m).padStart(2, '0')} ${ampm}`);
    }
  }
  return out;
}
const SLOT_LABELS = buildSlotLabels();
let slotStart = null, slotEnd = null;
function renderSlotPicker() {
  const s = document.getElementById('slotStart');
  const e = document.getElementById('slotEnd');
  if (!s || !e) return;
  s.innerHTML = '<div class="time-head">Start</div>' + SLOT_LABELS.map((l) => `<div class="time-opt ${slotStart === l ? 'sel' : ''}" onclick="selectStart('${l}')">${l}</div>`).join('');
  e.innerHTML = '<div class="time-head">End</div>' + SLOT_LABELS.map((l) => `<div class="time-opt ${slotEnd === l ? 'sel' : ''}" onclick="selectEnd('${l}')">${l}</div>`).join('');
  renderSlotSummary();
}
function selectStart(l) { slotStart = l; renderSlotPicker(); }
function selectEnd(l) { slotEnd = l; renderSlotPicker(); }
function slotString() { return (slotStart && slotEnd) ? `${slotStart} - ${slotEnd}` : ''; }
function renderSlotSummary() {
  const el = document.getElementById('slotSummary');
  if (!el) return;
  if (!slotStart || !slotEnd) { el.innerHTML = '<div class="muted">Pick a start and end time.</div>'; return; }
  const bad = SLOT_LABELS.indexOf(slotEnd) <= SLOT_LABELS.indexOf(slotStart);
  el.innerHTML = `<div class="svc-total" ${bad ? 'style="color:var(--red)"' : ''}><span>Time slot</span><span>${bad ? 'End must be after start' : slotString()}</span></div>`;
}
function resetSlotPicker() { slotStart = null; slotEnd = null; renderSlotPicker(); }

/* ---------- services with per-service size/quantity tier (exact price + time) ---------- */
let svcTier = {};                // id -> chosen tier index
let priceOverridden = false;     // true once admin edits the price field
function serviceById(id) { return bloorushServiceList().find((s) => s.id === id) || null; }
function selectedServiceObjects() {
  return [...selectedServices].map((id) => {
    const s = serviceById(id); if (!s) return null;
    const i = svcTier[id] || 0;
    const t = s.tiers[i] || s.tiers[0] || { label: '', price: 0, minutes: 0 };
    return { id, name: s.name, tierIndex: i, tierLabel: t.label, price: t.price, minutes: t.minutes };
  }).filter(Boolean);
}
function totalMinutes(list) { return (list || selectedServiceObjects()).reduce((a, s) => a + (s.minutes || 0), 0); }
function catalogPrice(list) { return (list || selectedServiceObjects()).reduce((a, s) => a + (s.price || 0), 0); }

function renderServiceOptions() {
  const term = (document.getElementById('svcSearch').value || '').toLowerCase();
  const list = bloorushServiceList().filter((s) => s.name.toLowerCase().includes(term));
  const el = document.getElementById('svcList');
  el.innerHTML = list.length
    ? list.map((s) => {
      const on = selectedServices.has(s.id);
      const i = svcTier[s.id] || 0;
      let right;
      if (on && s.tiers.length > 1) {
        right = `<select class="tiersel" onchange="setTier('${s.id}', this.value)" onclick="event.stopPropagation()">`
          + s.tiers.map((t, idx) => `<option value="${idx}" ${idx === i ? 'selected' : ''}>${t.label} — ₹${t.price} · ${t.minutes}m</option>`).join('')
          + `</select>`;
      } else {
        const t = s.tiers[on ? i : 0] || s.tiers[0] || { price: 0, minutes: 0 };
        right = `<span class="mn">₹${t.price} · ${t.minutes}m</span>`;
      }
      return `<label class="svc-row">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="toggleService('${s.id}')" />
        <span class="nm">${s.name}</span>
        ${right}
      </label>`;
    }).join('')
    : '<div class="muted" style="padding:10px">No services match.</div>';
}
function toggleService(id) {
  if (selectedServices.has(id)) { selectedServices.delete(id); delete svcTier[id]; }
  else { selectedServices.add(id); svcTier[id] = 0; }
  afterServiceChange();
}
function setTier(id, idx) { svcTier[id] = Number(idx); afterServiceChange(); }
function afterServiceChange() { autofillPrice(); renderServiceOptions(); renderSvcSummary(); renderIncentive(); }
function autofillPrice() {
  if (priceOverridden) return;
  const el = document.getElementById('f_customerPrice');
  const p = catalogPrice();
  el.value = p ? p : '';
}
function onPriceEdit() { priceOverridden = document.getElementById('f_customerPrice').value !== ''; renderIncentive(); }
function renderSvcSummary() {
  const chosen = selectedServiceObjects();
  const el = document.getElementById('svcSummary');
  if (chosen.length === 0) { el.innerHTML = '<div class="muted">Tap services above to add them.</div>'; return; }
  el.innerHTML =
    chosen.map((s) => `<div class="line"><span class="k">${s.name}${s.tierLabel ? ' · ' + s.tierLabel : ''}</span><span class="v">${s.minutes} min · ${money(s.price)}</span></div>`).join('')
    + `<div class="svc-total"><span>Estimated Time</span><span>${totalMinutes()} min</span></div>`;
}
function resetServicePicker() {
  selectedServices = new Set(); svcTier = {}; priceOverridden = false;
  const search = document.getElementById('svcSearch'); if (search) search.value = '';
  renderServiceOptions(); renderSvcSummary();
}

/* ---------- render ---------- */
function __safe(fn){ try{ fn(); }catch(e){ console.error('render section failed:', e); } }
function render() { [fillPartnerDropdown,renderInbox,renderOps,renderDayJobs,renderAllJobs,renderPartners,renderAttendance,renderSlots,renderCoupons].forEach(__safe); }

/* ================= SLOTS ================= */
const ADMIN_ZONES = ['Narendra Nagar', 'Besa', 'Manish Nagar', 'Dharampeth', 'Ramdaspeth', 'Civil Lines', 'MIHAN', 'Ram Nagar'];
const ADMIN_WINDOWS = (() => { const w = []; for (let h = 8; h < 20; h++) for (const m of [0]) { const hh = h < 10 ? '0' + h : '' + h; const mm = m < 10 ? '0' + m : '' + m; w.push(hh + ':' + mm); } return w; })();
function win12(id) { const [h, m] = id.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 || 12; return `${h12}:${m < 10 ? '0' + m : m} ${ap}`; }
let slotSelDate = '', slotSelWin = '';
function toggleZone(zone, open) { Store.setZoneOpen(zone, open); }
function renderZoneToggles() {
  const el = document.getElementById('zoneToggles'); if (!el) return;
  el.innerHTML = ADMIN_ZONES.map((z) => {
    const open = Store.isZoneOpen(z);
    return `<div class="line"><span class="k">${z}</span><span class="v"><span class="badge ${open ? 'green' : 'gray'}">${open ? 'Open' : 'Closed'}</span>
      <label style="display:inline-flex;align-items:center;gap:6px;margin-left:8px"><input type="checkbox" ${open ? 'checked' : ''} onchange="toggleZone('${z}', this.checked)" /> on</label></span></div>`;
  }).join('');
}
function generateWeek() {
  const cap = +document.getElementById('slotDefaultCap').value || 0;
  const start = new Date();
  const dates = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); dates.push(ymdLocal(d)); }
  const existing = new Set(Store.getSlots().map((s) => s.id));
  let n = 0;
  dates.forEach((date) => ADMIN_WINDOWS.forEach((w) => ADMIN_ZONES.forEach((z) => {
    const id = `${date}_${w}_${z}`.replace(/\s+/g, '_');
    if (!existing.has(id)) { Store.saveSlot(date, w, z, cap); n++; }
  })));
  renderSlotZoneRows();
  alert('Seeded ' + n + ' missing slots at capacity ' + cap + ' for the next 7 days.');
}

const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function ymdLocal(d) {
  const x = new Date(d);
  return x.getFullYear() + "-" +
    String(x.getMonth()+1).padStart(2,"0") + "-" +
    String(x.getDate()).padStart(2,"0");
}
function buildSlotDates() {
  const el = document.getElementById('slotDateStrip'); if (!el) return;
  const now = new Date(); let html = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(now.getDate() + i); const id = ymdLocal(d);
    if (!slotSelDate && i === 0) slotSelDate = id;
    const wd = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : DOW3[d.getDay()]);
    html += `<button onclick="selSlotDate('${id}')" style="flex-shrink:0;border:1.5px solid ${id === slotSelDate ? 'var(--blue,#38B6FF)' : 'var(--line)'};background:${id === slotSelDate ? 'var(--blue,#38B6FF)' : '#fff'};color:${id === slotSelDate ? '#fff' : 'var(--ink)'};border-radius:12px;padding:8px 12px;text-align:center;cursor:pointer"><div style="font-size:11px">${wd}</div><div style="font-weight:800">${d.getDate()} ${MON3[d.getMonth()]}</div></button>`;
  }
  el.innerHTML = html;
}
function selSlotDate(id) { slotSelDate = id; buildSlotDates(); renderSlotZoneRows(); }
function buildSlotWindows() {
  const el = document.getElementById('slotWinTabs'); if (!el) return;
  if (!slotSelWin) slotSelWin = ADMIN_WINDOWS[0];
  el.innerHTML = ADMIN_WINDOWS.map((w) => `<button onclick="selSlotWin('${w}')" style="flex-shrink:0;white-space:nowrap;border:1.5px solid ${w === slotSelWin ? 'var(--blue,#38B6FF)' : 'var(--line)'};background:${w === slotSelWin ? 'var(--blue,#38B6FF)' : '#fff'};color:${w === slotSelWin ? '#fff' : 'var(--ink)'};border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer">${win12(w)}</button>`).join('');
}
function selSlotWin(w) { slotSelWin = w; buildSlotWindows(); renderSlotZoneRows(); }
function renderSlotZoneRows() {
  const el = document.getElementById('slotZoneRows'); if (!el) return;
  if (!slotSelDate || !slotSelWin) { el.innerHTML = ''; return; }
  const slots = Store.getSlots();
  el.innerHTML = ADMIN_ZONES.map((zone) => {
    const id = `${slotSelDate}_${slotSelWin}_${zone}`.replace(/\s+/g, '_');
    const s = slots.find((x) => x.id === id) || { total: 2, reserved: 0, confirmed: 0 };
    const total = s.total || 0, reserved = s.reserved || 0, confirmed = s.confirmed || 0;
    const avail = Math.max(0, total - reserved - confirmed);
    const zid = zone.replace(/\s+/g, '_');
    return `<div class="card">
      <div class="flex" style="justify-content:space-between;margin-bottom:8px"><b>${zone}</b><span class="badge ${avail > 0 ? 'green' : 'gray'}">${avail} available</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><label style="font-size:11px">Total</label><input type="number" min="0" id="st-${zid}" value="${total}" /></div>
        <div><label style="font-size:11px">Reserved</label><input type="number" min="0" id="sr-${zid}" value="${reserved}" /></div>
        <div><label style="font-size:11px">Confirmed</label><input type="number" min="0" id="sc-${zid}" value="${confirmed}" /></div>
      </div>
      <button class="btn" style="margin-top:8px" onclick="saveZoneSlot('${zone.replace(/'/g, "\\'")}')">Save ${zone}</button>
    </div>`;
  }).join('');
}
function saveZoneSlot(zone) {
  const zid = zone.replace(/\s+/g, '_');
  const total = document.getElementById('st-' + zid).value;
  const reserved = document.getElementById('sr-' + zid).value;
  const confirmed = document.getElementById('sc-' + zid).value;
  Store.saveSlot(slotSelDate, slotSelWin, zone, total, reserved, confirmed);
  alert('Saved ' + zone + ' — ' + slotSelDate + ' · ' + win12(slotSelWin));
}
function renderSlots() { renderZoneToggles(); buildSlotDates(); buildSlotWindows(); renderSlotZoneRows(); }

/* ================= COUPONS ================= */
function renderCoupons() {
  const el = document.getElementById('couponList'); if (!el) return;
  const list = Store.getCoupons();
  el.innerHTML = list.length ? list.map(couponCard).join('') : '<div class="empty">No coupons yet.</div>';
}
function couponCard(c) {
  const off = c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`;
  return `<details class="card"><summary><div class="flex" style="justify-content:space-between"><div><div class="job-title">${c.code}</div><div class="muted">${off}${c.minOrder ? ` · min ₹${c.minOrder}` : ''}${c.expiry ? ` · till ${c.expiry}` : ''}</div></div><span class="badge ${c.active ? 'green' : 'gray'}">${c.active ? 'Active' : 'Off'}</span></div></summary>
    <div class="body">
      <div class="line"><span class="k">Used</span><span class="v">${c.used || 0}${c.usageLimit != null ? ' / ' + c.usageLimit : ' (no limit)'}</span></div>
      <div class="line"><span class="k">Max discount</span><span class="v">${c.maxDiscount ? '₹' + c.maxDiscount : '—'}</span></div>
      <div class="row"><button class="btn secondary" onclick="editCoupon('${c.code}')">Edit</button><button class="btn secondary" style="color:var(--red)" onclick="removeCoupon('${c.code}')">Delete</button></div>
    </div></details>`;
}
function editCoupon(code) {
  const c = code ? (Store.getCoupons().find((x) => x.code === code) || {}) : { code: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, expiry: '', usageLimit: '', active: true };
  const f = document.getElementById('couponForm'); f.style.display = 'block';
  f.innerHTML = `
    <h3>${code ? 'Edit' : 'New'} coupon</h3>
    <label>Code</label><input id="cf-code" value="${c.code || ''}" ${code ? 'readonly' : ''} placeholder="WELCOME50" />
    <label>Type</label><select id="cf-type"><option value="percent" ${c.type === 'percent' ? 'selected' : ''}>Percentage (%)</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>Fixed (₹)</option></select>
    <label>Value</label><input id="cf-value" type="number" min="0" value="${c.value || 0}" />
    <label>Minimum order (₹)</label><input id="cf-minOrder" type="number" min="0" value="${c.minOrder || 0}" />
    <label>Max discount (₹, 0 = none)</label><input id="cf-maxDiscount" type="number" min="0" value="${c.maxDiscount || 0}" />
    <label>Expiry date</label><input id="cf-expiry" type="date" value="${c.expiry || ''}" />
    <label>Usage limit (blank = unlimited)</label><input id="cf-usageLimit" type="number" min="0" value="${c.usageLimit == null ? '' : c.usageLimit}" />
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="cf-active" type="checkbox" ${c.active ? 'checked' : ''} /> Active</label>
    <div class="row"><button class="btn" onclick="saveCouponForm()">Save</button><button class="btn secondary" onclick="document.getElementById('couponForm').style.display='none'">Cancel</button></div>`;
}
function saveCouponForm() {
  const g = (id) => document.getElementById('cf-' + id);
  const code = g('code').value.trim().toUpperCase().replace(/\s+/g, '');
  if (!code) { alert('Code is required.'); return; }
  const ul = g('usageLimit').value;
  Store.saveCoupon({ code, type: g('type').value, value: +g('value').value, minOrder: +g('minOrder').value, maxDiscount: +g('maxDiscount').value, expiry: g('expiry').value, usageLimit: ul === '' ? null : +ul, active: g('active').checked });
  document.getElementById('couponForm').style.display = 'none';
}
function removeCoupon(code) { if (confirm('Delete coupon ' + code + '?')) Store.deleteCoupon(code); }

// Incoming paid orders needing a partner — shown regardless of the date filter,
// so a new booking for any day is never hidden.
function isAssigned(j) { return (Array.isArray(j.partnerIds) && j.partnerIds.length > 0) || !!j.partnerId; }
function renderInbox() {
  const el = document.getElementById('inbox');
  if (!el) return;
  const orders = Store.getJobs()
    .filter((j) => !isAssigned(j) && jobDisplayStatus(j) !== 'Completed' && j.status !== 'Cancelled')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!orders.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h3 style="margin:0 0 8px">🆕 Incoming orders (${orders.length})</h3>` + orders.map(jobCard).join('');
}

function isPresent(p) { return p.attendanceDate === Store.today(); }

let selectedAttDate = '';
function onAttDateChange() { selectedAttDate = document.getElementById('attDate').value || Store.today(); renderAttendance(); }
function attTimeNow() { return new Date().toTimeString().slice(0, 5); } // HH:MM

function markIn(pid) { const d = selectedAttDate || Store.today(); Store.setAttendanceRecord(pid, d, { present: true, inTime: attTimeNow() }); }
function markOut(pid) { const d = selectedAttDate || Store.today(); Store.setAttendanceRecord(pid, d, { outTime: attTimeNow() }); }
function markAbsent(pid) { const d = selectedAttDate || Store.today(); Store.setAttendanceRecord(pid, d, { present: false, inTime: '', outTime: '', late: false }); }
function toggleLate(pid, val) { const d = selectedAttDate || Store.today(); Store.setAttendanceRecord(pid, d, { late: !!val }); }
function saveAttNote(pid) { const d = selectedAttDate || Store.today(); const el = document.getElementById('attnote-' + pid); Store.setAttendanceRecord(pid, d, { notes: el ? el.value : '' }); alert('Note saved.'); }

function renderAttendance() {
  const el = document.getElementById('attendanceList');
  const sum = document.getElementById('attendanceSummary');
  if (!selectedAttDate) { selectedAttDate = Store.today(); const di = document.getElementById('attDate'); if (di && !di.value) di.value = selectedAttDate; }
  const d = selectedAttDate;
  const active = Store.getPartners().filter((p) => p.status === 'Active');
  const rec = (pid) => Store.getAttendance(pid, d) || {};
  const present = active.filter((p) => rec(p.partnerId).present).length;
  const late = active.filter((p) => rec(p.partnerId).late).length;
  const absent = active.length - present;
  sum.innerHTML = `
    <div class="card">
      <div class="line"><span class="k">📅 Date</span><span class="v">${d}</span></div>
      <div class="line"><span class="k">🟢 Present</span><span class="v">${present}</span></div>
      <div class="line"><span class="k">⚪ Absent</span><span class="v">${absent}</span></div>
      <div class="line"><span class="k">⏰ Late</span><span class="v">${late}</span></div>
    </div>`;
  if (active.length === 0) { el.innerHTML = '<div class="empty">No active partners.</div>'; return; }
  el.innerHTML = active.map((p) => {
    const r = rec(p.partnerId);
    const here = !!r.present;
    const avatar = p.photo
      ? `<img src="${p.photo}" alt="" style="width:44px;height:44px;border-radius:999px;object-fit:cover" />`
      : `<div class="avatar">${p.name.charAt(0).toUpperCase()}</div>`;
    const badge = here ? (r.late ? '<span class="badge amber">Present · Late</span>' : '<span class="badge green">Present</span>') : '<span class="badge gray">Absent</span>';
    return `
    <details class="card">
      <summary>
        <div class="flex">
          ${avatar}
          <div style="flex:1"><div class="job-title">${p.name} <span class="muted">(${p.partnerId})</span></div>
          <div class="muted">In ${r.inTime || '—'} · Out ${r.outTime || '—'} <span class="chev">· tap to open</span></div></div>
          ${badge}
        </div>
      </summary>
      <div class="body">
        <div class="line"><span class="k">In time</span><span class="v">${r.inTime || '—'}</span></div>
        <div class="line"><span class="k">Out time</span><span class="v">${r.outTime || '—'}</span></div>
        <div class="row">
          <button class="btn" onclick="markIn('${p.partnerId}')">Mark In (${attTimeNow()})</button>
          <button class="btn secondary" onclick="markOut('${p.partnerId}')">Mark Out</button>
        </div>
        <div class="row">
          <button class="btn secondary" onclick="markAbsent('${p.partnerId}')" style="color:var(--red)">Mark Absent</button>
          <label style="display:flex;align-items:center;gap:8px;margin:0"><input type="checkbox" ${r.late ? 'checked' : ''} onchange="toggleLate('${p.partnerId}', this.checked)" /> Late</label>
        </div>
        <label>Notes</label>
        <textarea id="attnote-${p.partnerId}" rows="2" placeholder="e.g. Came 20 min late, informed in advance">${(r.notes || '').replace(/</g, '&lt;')}</textarea>
        <button class="btn secondary" style="margin-top:6px" onclick="saveAttNote('${p.partnerId}')">Save note</button>
      </div>
    </details>`;
  }).join('');
}
function toggleAttendance(uid, present) { Store.setAttendance(uid, present); }

function onDateChange() {
  selectedDate = document.getElementById('opsDate').value || Store.today();
  renderOps(); renderDayJobs();
}

function fillPartnerDropdown(selectedId) {
  const sel = document.getElementById('f_partner');
  const prev = selectedId || sel.value;
  sel.innerHTML = Store.getPartners().map((p) => `<option value="${p.partnerId}">${p.name} (${p.partnerId})</option>`).join('');
  if (prev) sel.value = prev;
}

function jobsOnDate(d) { return Store.getJobs().filter((j) => j.date === d); }

// Operational metrics for a SERVICE date (jobs.date), derived from the canonical
// jobs collection cache. Deliberately separate concepts — never mixed:
//   scheduled  = jobs whose service date is d and not cancelled
//   completed  = of those, status Completed
//   cancelled  = jobs whose service date is d and status Cancelled
//   createdToday = jobs CREATED (createdAt) on today's date — a different metric
function dayMetrics(d) {
  const all = jobsOnDate(d);
  const cancelled = all.filter((j) => j.status === 'Cancelled').length;
  const scheduled = all.filter((j) => j.status !== 'Cancelled').length;
  const completed = all.filter((j) => j.status === 'Completed').length;
  return { scheduled, completed, cancelled, total: all.length };
}

function renderOps() {
  const partners = Store.getPartners();
  const jobs = jobsOnDate(selectedDate);
  const busyIds = new Set();
  jobs.forEach((j) => (Array.isArray(j.assignments) ? j.assignments : []).forEach((a) => { if (a.status === 'Started') busyIds.add(a.partnerId); }));
  const active = partners.filter((p) => p.status === 'Active');
  const busy = active.filter((p) => busyIds.has(p.partnerId)).length;
  const present = active.filter((p) => p.attendanceDate === Store.today()).length;
  const absent = active.length - present;
  const newOrders = jobs.filter((j) => !isAssigned(j) && j.status !== 'Cancelled' && jobDisplayStatus(j) !== 'Completed').length;
  const pending = jobs.filter((j) => isAssigned(j) && ['Assigned', 'Arrived'].includes(jobDisplayStatus(j))).length;
  const inProgress = jobs.filter((j) => jobDisplayStatus(j) === 'Started').length;
  const completed = jobs.filter((j) => jobDisplayStatus(j) === 'Completed').length;
  const done = jobs.filter((j) => jobDisplayStatus(j) === 'Completed');
  const revenue = done.reduce((s, j) => s + (j.customerPrice || (j.base || 0) + (j.bonus || 0)), 0);
  const cashToCollect = jobs.filter((j) => (j.paymentStatus || 'cash') === 'cash').reduce((s, j) => s + (j.customerPrice || 0), 0);
  const payout = done.reduce((s, j) => s + Store.netEarnings(j), 0);
  const label = selectedDate === Store.today() ? "Today's Operations" : 'Operations';
  const rows = [
    ['🟢 Present Partners', present], ['⚪ Absent Partners', absent], ['🟡 Busy Partners', busy],
    ['🆕 New orders', newOrders], ['📋 Pending Jobs', pending], ['🚗 In Progress', inProgress], ['✅ Completed', completed],
    ['💰 Revenue', money(revenue)], ['💵 Cash to Collect', money(cashToCollect)], ['👷 Partner Payout', money(payout)],
  ];
  document.getElementById('ops').innerHTML = `
    <div class="card">
      <div class="job-title" style="margin-bottom:2px;">${label}</div>
      <div class="muted" style="margin-bottom:10px;">${selectedDate}</div>
      ${rows.map(([k, v]) => `<div class="line"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
    </div>`;
}

function statusBadgeAdmin(s) {
  if (s === 'Completed') return '<span class="badge green">Completed</span>';
  if (s === 'Started') return '<span class="badge amber">Started</span>';
  if (s === 'Arrived') return '<span class="badge amber">Arrived</span>';
  if (s === 'Paid' || s === 'New') return '<span class="badge gray">New order</span>';
  return '<span class="badge blue">Assigned</span>';
}
function statusOptions(current) {
  return ['Assigned', 'Arrived', 'Started', 'Completed'].map((s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('');
}
function assignPartner(jobId, brp, incentive) {
  if (!brp) { alert('Pick a partner first.'); return; }
  const p = Store.getPartners().find((x) => x.partnerId === brp);
  Store.txnAddPartner(jobId, { partnerId: brp, name: p ? p.name : brp, phone: p ? p.phone : '', incentive: Math.round(+incentive || 0), status: 'Assigned', arrivedAt: null, startedAt: null, endedAt: null });
}
function setIncentive(jobId, brp, val) { Store.txnSetIncentive(jobId, brp, val); }
function removeAssignment(jobId, brp) { Store.txnRemovePartner(jobId, brp); }
function pushDelayNote(jobId) {
  const el = document.getElementById('delay-' + jobId);
  const note = el ? el.value.trim() : '';
  Store.updateJob(jobId, { delayNote: note });
  if (note) alert('Delay note sent to the customer.'); else alert('Delay note cleared.');
}
function fmtElapsed(startISO, endISO) {
  if (!startISO) return '00:00:00';
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  let s = Math.max(0, Math.floor((end - new Date(startISO).getTime()) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0'); s %= 3600;
  const m = String(Math.floor(s / 60)).padStart(2, '0'); const ss = String(s % 60).padStart(2, '0');
  return h + ':' + m + ':' + ss;
}
function jobDisplayStatus(j) {
  const as = Array.isArray(j.assignments) ? j.assignments : [];
  if (!as.length) return j.partnerId ? (j.status || 'Assigned') : (j.status || 'Paid');
  const order = ['Assigned', 'Arrived', 'Started', 'Completed']; let min = 3;
  as.forEach((a) => { const i = order.indexOf(a.status || 'Assigned'); if (i >= 0 && i < min) min = i; });
  return order[min];
}

function itemLabel(it) {
  const q = it.option && it.option !== 'per unit' ? it.option : (it.qty > 1 ? ('x' + it.qty) : '');
  const time = it.time ? ` (${it.time})` : (it.mins ? ` (${it.mins} min)` : '');
  return `${it.name}${q ? ' ' + q : ''}${time}`;
}
function jobTotalMins(j) {
  if (typeof j.totalMins === 'number' && j.totalMins > 0) return j.totalMins;
  return (Array.isArray(j.items) ? j.items : []).reduce((a, i) => a + (i.mins || 0), 0);
}
// ADMIN: full detail — each service with qualifier, time and price, then total time | amount.
function itemsBreakdownAdmin(j) {
  const items = Array.isArray(j.items) ? j.items : [];
  if (!items.length) {
    return `<div class="line"><span class="k">Customer price</span><span class="v">${money(j.customerPrice)}</span></div>`;
  }
  const lines = items.map((it, n) =>
    `<div class="line"><span class="k">${n + 1}. ${itemLabel(it)}</span><span class="v">${money(it.price)}</span></div>`
  ).join('');
  const tot = jobTotalMins(j);
  return `<div class="itemwrap">${lines}`
    + `<div class="line" style="border-top:1px solid var(--line,#e5e7eb);margin-top:4px;padding-top:6px;font-weight:800">`
    + `<span class="k">${tot ? tot + ' min total' : 'Total'}</span><span class="v">${money(j.customerPrice)}</span></div></div>`;
}
// PARTNER breakdown lives in partner.js (separate bundle).

function jobCard(j) {
  const as = Array.isArray(j.assignments) ? j.assignments : [];
  const unassigned = as.length === 0 && !j.partnerId;
  const disp = jobDisplayStatus(j);
  const rows = as.map((a) => {
    const st = a.status || 'Assigned';
    const timer = st === 'Started'
      ? `<span class="badge amber" data-atimer data-start="${a.startedAt || ''}">${fmtElapsed(a.startedAt)}</span>`
      : (st === 'Completed' ? `<span class="badge green">${fmtElapsed(a.startedAt, a.endedAt)}</span>` : '');
    const arr = a.arrivedAt ? ` · arrived ${new Date(a.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    return `<div class="line"><span class="k">${a.name || a.partnerId} <span class="badge gray">${st}</span></span><span class="v">${timer} <button class="btn secondary" style="padding:2px 8px" onclick="removeAssignment('${j.jobId}','${a.partnerId}')">✕</button></span></div>`
      + `<div class="line"><span class="k" style="font-size:12px;color:var(--muted)">↳ Incentive (partner-only)</span><span class="v"><input type="number" min="0" value="${a.incentive || 0}" style="width:90px;text-align:right" onchange="setIncentive('${j.jobId}','${a.partnerId}',this.value)" /></span></div>`
      + (arr ? `<div class="muted" style="font-size:11px;margin:-4px 0 6px">${a.name || a.partnerId}${arr}</div>` : '');
  }).join('');
  const options = Store.getPartners().filter((p) => p.status === 'Active' && !as.find((x) => x.partnerId === p.partnerId)).map((p) => `<option value="${p.partnerId}">${p.name} (${p.partnerId})</option>`).join('');
  return `
  <details class="card" ${unassigned ? 'open' : ''}>
    <summary>
      <div class="flex" style="justify-content:space-between">
        <div><div class="job-title">${j.customerName || '—'}</div><div class="muted">${j.service || '—'}</div></div>
        ${j.slotStatus === 'slot_full_reschedule' ? '<span class="badge" style="background:#C2543B;color:#fff">SLOT FULL — reschedule</span>' : ''}
        ${statusBadgeAdmin(disp)}
      </div>
      <div class="muted" style="margin-top:6px"><span class="badge gray">${j.jobId}</span> · ${as.length ? as.map((a) => a.name || a.partnerId).join(', ') : 'Unassigned'} <span class="chev">· tap to open</span></div>
    </summary>
    <div class="body">
      <div class="line"><span class="k">Date / slot</span><span class="v">${j.date} · ${j.timeSlot || j.slotWindow || '—'}</span></div>
      <div class="line"><span class="k">Customer phone</span><span class="v">${j.customerPhone || '—'}</span></div>
      <div class="line"><span class="k">Address</span><span class="v" style="max-width:60%;text-align:right">${j.customerAddress || j.address || '—'}</span></div>
      ${itemsBreakdownAdmin(j)}
      <div class="line"><span class="k">Payment</span><span class="v">${(j.paymentStatus || 'cash') === 'paid' ? '✅ Paid online' : '💵 ' + money(j.customerPrice)}</span></div>
      <div class="spacer"></div>
      ${as.length ? `<label>Assigned partners (live)</label>${rows}<div class="spacer"></div>` : ''}
      <label>Add a partner</label>
      <select id="assign-${j.jobId}"><option value="">— choose partner —</option>${options}</select>
      <input id="inc-${j.jobId}" type="number" min="0" placeholder="Incentive for this partner (₹)" style="margin-top:6px" />
      <button class="btn" style="margin-top:8px" onclick="assignPartner('${j.jobId}', document.getElementById('assign-${j.jobId}').value, document.getElementById('inc-${j.jobId}').value)">Add partner</button>
      <div class="spacer"></div>
      <label>Delay note to customer</label>
      <input id="delay-${j.jobId}" value="${(j.delayNote || '').replace(/"/g, '&quot;')}" placeholder="e.g. Running 15 min late" />
      <button class="btn secondary" style="margin-top:6px" onclick="pushDelayNote('${j.jobId}')">Send note</button>
      <div class="spacer"></div>
      <div class="row">
        <button class="btn secondary" style="color:var(--red)" onclick="removeJob('${j.jobId}')">Delete order</button>
      </div>
    </div>
  </details>`;
}
// Live per-second timers for admin (updates any started-partner timer chips).
setInterval(() => { document.querySelectorAll('[data-atimer]').forEach((el) => { const s = el.getAttribute('data-start'); if (s) el.textContent = fmtElapsed(s); }); }, 1000);

function renderDayJobs() {
  const m = dayMetrics(selectedDate);
  const strip = document.getElementById('dayCounts');
  if (strip) {
    strip.innerHTML =
      `<span class="daycount"><b>${m.scheduled}</b> scheduled</span>` +
      `<span class="daycount"><b>${m.completed}</b> completed</span>` +
      `<span class="daycount"><b>${m.cancelled}</b> cancelled</span>` +
      `<span class="daycount daycount-note">service date ${selectedDate}</span>`;
  }
  const jobs = jobsOnDate(selectedDate).slice().reverse();
  const el = document.getElementById('dayJobs');
  el.innerHTML = jobs.length ? jobs.map(jobCard).join('') : '<div class="empty">No jobs on this day.</div>';
}
let allJobsDate = '';
function onJobsDateChange() { allJobsDate = document.getElementById('jobsDate').value || ''; renderAllJobs(); }
function clearJobsDate() { allJobsDate = ''; document.getElementById('jobsDate').value = ''; renderAllJobs(); }
function renderAllJobs() {
  let jobs = Store.getJobs().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (allJobsDate) jobs = jobs.filter((j) => j.date === allJobsDate);
  const el = document.getElementById('allJobs');
  el.innerHTML = jobs.length ? jobs.map(jobCard).join('') : '<div class="empty">No jobs for this filter.</div>';
}

function renderPartners() {
  const el = document.getElementById('partners');
  const partners = Store.getPartners();
  if (partners.length === 0) { el.innerHTML = '<div class="empty">No partners yet. Add your first partner above.</div>'; return; }
  el.innerHTML = partners.map((p) => {
    const jobs = Store.getJobsForPartner(p.partnerId).filter((j) => j.date === Store.today());
    const earnings = jobs.filter((j) => j.status === 'Completed').reduce((s, j) => s + Store.netEarnings(j), 0);
    const avatar = p.photo
      ? `<img src="${p.photo}" alt="" style="width:44px;height:44px;border-radius:999px;object-fit:cover" />`
      : `<div class="avatar">${p.name.charAt(0).toUpperCase()}</div>`;
    const active = p.status === 'Active';
    return `
    <details class="card">
      <summary>
        <div class="flex">
          ${avatar}
          <div style="flex:1">
            <div class="job-title">${p.name} <span class="muted">(${p.partnerId})</span></div>
            <div class="muted">${p.phone} · ${p.hub} <span class="chev">· tap to open</span></div>
          </div>
          <span class="badge ${active ? 'green' : 'gray'}">${p.status}</span>
        </div>
      </summary>
      <div class="body">
        <div class="line"><span class="k">Today's jobs</span><span class="v">${jobs.length}</span></div>
        <div class="line"><span class="k">Today's earnings</span><span class="v">${money(earnings)}</span></div>
        <div class="spacer"></div>
        <div class="row">
          <button class="btn ghost" onclick="assignTo('${p.partnerId}')">Assign job</button>
          <button class="btn secondary" onclick="editPartner('${p.uid}')">Edit</button>
        </div>
        <div class="spacer"></div>
        <div class="row">
          <button class="btn secondary" onclick="toggleStatus('${p.uid}','${p.status}')">${active ? 'Disable' : 'Enable'}</button>
          <button class="btn secondary" style="color:var(--red)" onclick="removePartner('${p.uid}','${p.name}')">Delete</button>
        </div>
      </div>
    </details>`;
  }).join('');
}

/* ---------- job form ---------- */
function assignTo(brp) {
  showSection('create');
  fillPartnerDropdown(brp);
  document.getElementById('f_customerName').focus();
}
function num(id) { return Number(document.getElementById(id).value) || 0; }
function val(id) { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = v == null ? '' : v; }

function saveJob() {
  const msg = document.getElementById('createMsg');
  const customerName = val('f_customerName');
  const partnerId = document.getElementById('f_partner').value;
  const services = selectedServiceObjects();
  if (!customerName || services.length === 0 || !partnerId) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Customer name, at least one service, and a partner are required.';
    return;
  }
  const data = {
    partnerId, customerName,
    customerPhone: val('f_customerPhone'), address: val('f_address'), mapsLink: val('f_mapsLink'),
    services, service: services.map((s) => `${s.name}${s.tierLabel ? ' (' + s.tierLabel + ')' : ''}`).join(', '),
    date: val('f_date') || Store.today(), timeSlot: slotString(), durationMins: totalMinutes(),
    base: WAGE_BASELINE, bonus: computeIncentive(services, num('f_customerPrice'), WAGE_BASELINE, editingRating),
    penalty: num('f_penalty'), rating: editingRating || null, instructions: val('f_instructions'),
    customerPrice: num('f_customerPrice'), paymentStatus: document.getElementById('f_payStatus').value, bookingId: val('f_bookingId'),
  };
  if (editingJobId) { Store.updateJob(editingJobId, data); cancelEdit(); flash(msg, 'Job updated.'); }
  else { Store.addJob(data); clearJobForm(); flash(msg, 'Job created and assigned.'); }
}
function editJob(jobId) {
  const j = Store.getJob(jobId); if (!j) return;
  showSection('create');
  editingJobId = jobId;
  setVal('f_customerName', j.customerName); setVal('f_customerPhone', j.customerPhone);
  setVal('f_address', j.address); setVal('f_mapsLink', j.mapsLink);
  setVal('f_date', j.date); { const parts = String(j.timeSlot || '').split(' - '); slotStart = parts[0] || null; slotEnd = parts[1] || null; renderSlotPicker(); }
  setVal('f_penalty', j.penalty); setVal('f_instructions', j.instructions);
  setVal('f_customerPrice', j.customerPrice); priceOverridden = j.customerPrice != null && j.customerPrice !== '';
  document.getElementById('f_payStatus').value = j.paymentStatus || 'cash'; setVal('f_bookingId', j.bookingId);
  editingRating = j.rating || null;
  selectedServices = new Set(); svcTier = {};
  if (Array.isArray(j.services)) j.services.forEach((s) => { if (s && s.id) { selectedServices.add(s.id); svcTier[s.id] = s.tierIndex || 0; } });
  else if (j.service) { const names = String(j.service).split(',').map((x) => x.trim().replace(/ \(.*\)$/, '')); bloorushServiceList().forEach((s) => { if (names.includes(s.name)) { selectedServices.add(s.id); svcTier[s.id] = 0; } }); }
  document.getElementById('svcSearch').value = '';
  renderServiceOptions(); renderSvcSummary(); renderIncentive();
  fillPartnerDropdown(j.partnerId);
  document.getElementById('formTitle').textContent = 'Edit job ' + j.jobId;
  document.getElementById('saveBtn').textContent = 'Update job';
  document.getElementById('cancelBtn').style.display = 'block';
}
function cancelEdit() {
  editingJobId = null; clearJobForm();
  document.getElementById('formTitle').textContent = 'Create a job';
  document.getElementById('saveBtn').textContent = 'Create & assign job';
  document.getElementById('cancelBtn').style.display = 'none';
}
function clearJobForm() {
  ['f_customerName', 'f_customerPhone', 'f_address', 'f_mapsLink', 'f_instructions'].forEach((id) => setVal(id, ''));
  setVal('f_penalty', '0'); setVal('f_date', Store.today());
  setVal('f_customerPrice', ''); setVal('f_bookingId', ''); resetSlotPicker();
  document.getElementById('f_payStatus').value = 'cash';
  editingRating = null;
  resetServicePicker();
  renderIncentive();
}
function removeJob(jobId) { if (confirm('Delete ' + jobId + '?')) { Store.deleteJob(jobId); if (editingJobId === jobId) cancelEdit(); } }
function changeStatus(jobId, status) {
  const changes = { status };
  const j = Store.getJob(jobId);
  if (status === 'Started' && j && !j.startedAt) changes.startedAt = new Date().toISOString();
  if (status === 'Completed' && j && !j.endedAt) changes.endedAt = new Date().toISOString();
  Store.updateJob(jobId, changes);
}

/* ---------- partner form ---------- */
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'p_photo') {
    const file = e.target.files[0];
    if (!file) { partnerPhoto = null; return; }
    const reader = new FileReader();
    reader.onload = () => resizePhoto(reader.result, (small) => { partnerPhoto = small; });
    reader.readAsDataURL(file);
  }
});
function resizePhoto(dataUrl, cb) {
  const img = new Image();
  img.onload = () => {
    const max = 256, scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = img.width * scale; c.height = img.height * scale;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    cb(c.toDataURL('image/jpeg', 0.8));
  };
  img.src = dataUrl;
}
function savePartner() {
  const msg = document.getElementById('partnerMsg');
  const name = val('p_name'), phone = val('p_phone'), pin = val('p_pin'), hub = val('p_hub');
  const language = document.getElementById('p_lang').value;
  if (editingPartnerUid) {
    if (!name || !phone || !hub) { msg.style.color = 'var(--red)'; msg.textContent = 'Name, phone and hub are required.'; return; }
    const changes = { name, phone, hub, language };
    if (partnerPhoto) changes.photo = partnerPhoto;
    Store.updatePartner(editingPartnerUid, changes)
      .then(() => { cancelPartnerEdit(); flash(msg, 'Partner updated.'); })
      .catch((e) => { msg.style.color = 'var(--red)'; msg.textContent = e.message; });
    return;
  }
  if (!name || !phone || !pin || !hub) { msg.style.color = 'var(--red)'; msg.textContent = 'Name, phone, PIN and hub are required.'; return; }
  if (pin.length < 4) { msg.style.color = 'var(--red)'; msg.textContent = 'PIN must be at least 4 digits.'; return; }
  document.getElementById('savePartnerBtn').disabled = true;
  Store.addPartner({ name, phone, pin, hub, photo: partnerPhoto, language })
    .then((brp) => { clearPartnerForm(); flash(msg, 'Partner added: ' + brp); })
    .catch((e) => { msg.style.color = 'var(--red)'; msg.textContent = e.message || 'Could not add partner.'; })
    .finally(() => { document.getElementById('savePartnerBtn').disabled = false; });
}
function editPartner(uid) {
  const p = Store.getPartners().find((x) => x.uid === uid); if (!p) return;
  editingPartnerUid = uid;
  setVal('p_name', p.name); setVal('p_phone', p.phone); setVal('p_hub', p.hub); setVal('p_pin', '');
  document.getElementById('p_lang').value = p.language || 'en';
  document.getElementById('pinField').style.display = 'none';
  document.getElementById('partnerFormTitle').textContent = 'Edit ' + p.partnerId;
  document.getElementById('savePartnerBtn').textContent = 'Update partner';
  document.getElementById('cancelPartnerBtn').style.display = 'block';
  showSection('partners');
  document.getElementById('partnerFormTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function cancelPartnerEdit() {
  editingPartnerUid = null; partnerPhoto = null; clearPartnerForm();
  document.getElementById('pinField').style.display = '';
  document.getElementById('partnerFormTitle').textContent = 'Add partner';
  document.getElementById('savePartnerBtn').textContent = 'Add partner';
  document.getElementById('cancelPartnerBtn').style.display = 'none';
}
function clearPartnerForm() {
  ['p_name', 'p_phone', 'p_pin', 'p_hub'].forEach((id) => setVal(id, ''));
  document.getElementById('p_lang').value = 'en';
  const f = document.getElementById('p_photo'); if (f) f.value = '';
  partnerPhoto = null;
}
function toggleStatus(uid, current) { Store.setPartnerStatus(uid, current === 'Active' ? 'Inactive' : 'Active'); }
function removePartner(uid, name) { if (confirm('Delete partner ' + name + '? They will lose all access.')) Store.deletePartner(uid); }

function flash(el, text) { el.style.color = 'var(--green)'; el.textContent = text; setTimeout(() => (el.textContent = ''), 3000); }
