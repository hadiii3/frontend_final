import APP_CONFIG from "./config.js";
/* vehicle.js
 * Fixes applied:
 *   RT-02 : ALL API data escaped with escapeHtml() before innerHTML injection
 *           historyList.innerHTML += replaced with DocumentFragment
 *   RT-07 : !response.ok guard (not just 401)
 *   RT-10 : inline onsubmit/oninput removed from HTML; listeners attached here
 *   RT-13 : client-side input validation added before form submit
 *   RT-15 : console.error removed
 *
 * Visibility rules for request-vehicle-card (submission form):
 *   none     → show form (no existing request)
 *   pending  → HIDE form (cannot submit while under review)
 *   approved → show form (student can register an additional/replacement plate)
 *   rejected → show form (student can resubmit)
 */

/* ── HTML escape helper (RT-02) ──────────────────────────────────── */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Shared SVG for vehicle icon ─────────────────────────────────── */
const VEH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>`;

async function loadVehicleState() {
  const token = sessionStorage.getItem('student_token');
  if (!token) { window.location.replace('login.html'); return; }

  try {
    const response = await fetch(
      `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_VEHICLE}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );

    /* RT-07 FIX */
    if (!response.ok) {
      sessionStorage.removeItem('student_token');
      sessionStorage.removeItem('student_name');
      window.location.replace('login.html');
      return;
    }

    const result     = await response.json();
    const activeCard = document.getElementById('active-vehicle-card');
    const formCard   = document.getElementById('request-vehicle-card');

    activeCard.innerHTML = '';

    if (result.status === 'none') {
      /* No request yet — only show the form */
      activeCard.style.display = 'none';
      formCard.style.display   = 'block';

    } else if (result.status === 'pending') {
      /* Under review — show status card, HIDE form */
      activeCard.style.display = 'block';
      formCard.style.display   = 'none';
      activeCard.innerHTML = `
        <div class="section-card-header">
          <div class="section-card-title">${VEH_SVG} Vehicle Request</div>
          <span class="badge" style="background:#fef08a;color:#854d0e;">Pending</span>
        </div>
        <p style="font-size:.875rem;color:var(--col-on-muted);margin-bottom:var(--space-5);">Your request is under review by Campus Security. Vehicle details will be visible once a decision has been made.</p>`;

    } else if (result.status === 'approved') {
      /* Approved — show permit details AND the form so they can add another plate */
      activeCard.style.display = 'block';
      formCard.style.display   = 'block';
      activeCard.innerHTML = `
        <div class="section-card-header">
          <div class="section-card-title">${VEH_SVG} Active Vehicle Access</div>
          <span class="badge badge-green">Approved Permit</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5);">
          <div class="veh-detail-row">
            <span class="veh-detail-label">License Plate</span>
            <span class="veh-detail-value" style="font-family:monospace;letter-spacing:1px;font-size:1.0625rem;color:var(--col-primary);font-weight:700;">${escapeHtml(result.data.plate_number)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Make &amp; Model</span>
            <span class="veh-detail-value">${escapeHtml(result.data.vehicle_type)} ${escapeHtml(result.data.vehicle_model)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Color</span>
            <span class="veh-detail-value">${escapeHtml(result.data.vehicle_color)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Valid From</span>
            <span class="veh-detail-value">${escapeHtml(result.data.valid_from)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Valid Until</span>
            <span class="veh-detail-value">${escapeHtml(result.data.valid_until)}</span>
          </div>
        </div>`;

    } else if (result.status === 'rejected') {
      /* Rejected — show rejected details AND the form so they can resubmit */
      activeCard.style.display = 'block';
      formCard.style.display   = 'block';
      activeCard.innerHTML = `
        <div class="section-card-header">
          <div class="section-card-title">${VEH_SVG} Vehicle Request</div>
          <span class="badge" style="background:#fee2e2;color:#991b1b;">Rejected</span>
        </div>
        <p style="font-size:.875rem;color:var(--col-on-muted);margin-bottom:var(--space-5);">Your previous request was rejected. You may submit a new request below.</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5);">
          <div class="veh-detail-row">
            <span class="veh-detail-label">License Plate</span>
            <span class="veh-detail-value" style="font-family:monospace;letter-spacing:1px;font-size:1.0625rem;color:#991b1b;font-weight:700;">${escapeHtml(result.data.plate_number)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Make &amp; Model</span>
            <span class="veh-detail-value">${escapeHtml(result.data.vehicle_type)} ${escapeHtml(result.data.vehicle_model)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Color</span>
            <span class="veh-detail-value">${escapeHtml(result.data.vehicle_color)}</span>
          </div>
          <div class="veh-detail-row">
            <span class="veh-detail-label">Rejection Reason</span>
            <span class="veh-detail-value" style="color:#991b1b;">${escapeHtml(result.data.rejection_reason || 'No reason provided')}</span>
          </div>
        </div>`;
    }

    loadVehicleHistory(token);

  } catch { /* RT-15: silent */ }
}

async function loadVehicleHistory(token) {
  try {
    const response = await fetch(
      `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_VEHICLE_HISTORY}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );

    /* RT-07: guard non-OK responses (e.g. expired token) */
    if (!response.ok) return;

    const result      = await response.json();
    const historyCard = document.getElementById('vehicle-history-card');
    const historyList = document.getElementById('vehicle-history-list');

    if (result.data) {
      historyCard.style.display = 'block';
      historyList.innerHTML     = '';

      if (result.data.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:.875rem;color:var(--col-on-muted);text-align:center;padding:var(--space-4) 0;';
        p.textContent = 'No vehicle requests found.';
        historyList.appendChild(p);
        return;
      }

      /* RT-02 FIX: DocumentFragment — no innerHTML += */
      const frag = document.createDocumentFragment();

      result.data.forEach(item => {
        let badgeHtml = '';
        if      (item.status === 'approved') badgeHtml = '<span class="badge badge-green">Approved</span>';
        else if (item.status === 'pending')  badgeHtml = '<span class="badge" style="background:#fef08a;color:#854d0e;">Pending</span>';
        else if (item.status === 'rejected') badgeHtml = '<span class="badge" style="background:#fee2e2;color:#991b1b;">Rejected</span>';

        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

        /* RT-02 FIX: all item.* fields escaped */
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'border:1px solid var(--col-outline);border-radius:var(--radius-md);padding:var(--space-3);';
        wrapper.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
            <span style="font-weight:600;font-family:monospace;">${escapeHtml(item.plate_number)}</span>
            ${badgeHtml}
          </div>
          <div style="font-size:.8125rem;color:var(--col-on-muted);display:flex;justify-content:space-between;">
            <span>${escapeHtml(item.vehicle_type)} ${escapeHtml(item.vehicle_model)}</span>
            <span>${escapeHtml(dateStr)}</span>
          </div>
          ${item.status === 'rejected' && item.rejection_reason
            ? `<div style="margin-top:var(--space-2);font-size:.8125rem;color:#991b1b;">Reason: ${escapeHtml(item.rejection_reason)}</div>`
            : ''}`;
        frag.appendChild(wrapper);
      });

      historyList.appendChild(frag);
    }
  } catch { /* RT-15: silent */ }
}

/* ── RT-13: Input validation ─────────────────────────────────────── */
const PLATE_RE = /^[A-Za-z0-9 \-]{2,15}$/;
const ALPHA_RE = /^[A-Za-z\s]{1,50}$/;

function validateVehicle(type, model, color, plate) {
  if (!PLATE_RE.test(plate)) return 'Invalid plate number (2–15 alphanumeric characters only).';
  if (!ALPHA_RE.test(type))  return 'Invalid vehicle make (letters only, max 50 chars).';
  if (!ALPHA_RE.test(model)) return 'Invalid vehicle model (letters only, max 50 chars).';
  if (!ALPHA_RE.test(color)) return 'Invalid vehicle color (letters only, max 50 chars).';
  return null;
}

/* ── Live plate preview ──────────────────────────────────────────── */
function updatePlate(val) {
  const display = document.getElementById('plate-display');
  const clean   = val.trim().toUpperCase();
  if (clean.length > 0) {
    display.textContent = clean;
    display.classList.remove('empty');
  } else {
    display.textContent = 'ABC · 1234';
    display.classList.add('empty');
  }
}

/* ── Form submit ─────────────────────────────────────────────────── */
async function submitVehicle(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('student_token');
  if (!token) return;

  const btn     = document.getElementById('submit-btn');
  const success = document.getElementById('vehicle-success');
  const errEl   = document.getElementById('vehicle-error');

  const type  = document.getElementById('make').value.trim();
  const model = document.getElementById('model').value.trim();
  const color = document.getElementById('color').value.trim();
  const plate = document.getElementById('plate').value.trim();

  /* RT-13 FIX: validate before sending */
  const validErr = validateVehicle(type, model, color, plate);
  if (validErr) {
    if (errEl) { errEl.textContent = validErr; errEl.style.display = 'block'; }
    return;
  }

  btn.textContent  = 'Submitting…';
  btn.disabled     = true;
  success.style.display = 'none';
  if (errEl) errEl.style.display = 'none';

  try {
    const response = await fetch(
      `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_VEHICLE_REQUESTS}`,
      {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ vehicle_type: type, vehicle_model: model, vehicle_color: color, plate_number: plate }),
      }
    );
    const result = await response.json();

    if (result.success) {
      success.style.display = 'block';
      btn.textContent = 'Submit Access Request';
      btn.disabled    = false;
      document.getElementById('vehicle-form').reset();
      document.getElementById('plate-display').textContent = 'ABC · 1234';
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => loadVehicleState(), 1000);
    } else {
      if (errEl) {
        /* Safe: textContent only */
        errEl.textContent   = result.message || 'An error occurred';
        errEl.style.display = 'block';
      }
      btn.textContent = 'Submit Access Request';
      btn.disabled    = false;
    }
  } catch {
    btn.textContent = 'Submit Access Request';
    btn.disabled    = false;
  }
}

function resetForm() {
  document.getElementById('plate-display').textContent = 'ABC · 1234';
  document.getElementById('vehicle-success').style.display = 'none';
}

/* ── RT-10: Attach event listeners (replaces inline onsubmit/oninput) ── */
document.addEventListener('DOMContentLoaded', () => {
  loadVehicleState();

  const form  = document.getElementById('vehicle-form');
  const plate = document.getElementById('plate');
  if (form)  form.addEventListener('submit', submitVehicle);
  if (plate) plate.addEventListener('input', (e) => updatePlate(e.target.value));
});