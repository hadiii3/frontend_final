import APP_CONFIG from "./config.js";
/* dashboard.js
 * Fixes applied:
 *   RT-02 : faculty.name and student_id now escaped before innerHTML injection
 *   RT-07 : checks !response.ok (not just 401) for robust auth guard
 *   RT-15 : console.error removed
 *   RT-20 : null-safe guards on full_name, gpa, faculty, credits (crash prevention)
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

async function loadDashboard() {
  const token = sessionStorage.getItem('student_token');

  if (!token) {
    window.location.replace('login.html');
    return;
  }

  try {
    const response = await fetch(
      `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_PROFILE}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );

    /* Only redirect to login on actual auth failures (401 / 403).
       For other errors (network down, 500, etc.) stay on the page
       to avoid an infinite login ↔ dashboard loop. */
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem('student_token');
      sessionStorage.removeItem('student_name');
      window.location.replace('login.html');
      return;
    }

    if (!response.ok) {
      /* Server error — show a visible message, don't redirect */
      const errBanner = document.getElementById('dash-error-banner');
      if (errBanner) errBanner.style.display = 'flex';
      return;
    }

    const { data } = await response.json();

    if (data) {
      /* ── RT-20: Null-safe name handling ───────────────────────── */
      const fullName       = (typeof data.full_name === 'string' && data.full_name.trim()) ? data.full_name.trim() : 'Student';
      const firstName      = fullName.split(' ')[0] || fullName;
      const avatarInitials = fullName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || '?';

      document.querySelectorAll('.dash-welcome strong')
        .forEach(el => el.textContent = firstName);

      document.querySelectorAll('.identity-name, .info-value.full-name')
        .forEach(el => el.textContent = fullName);

      document.querySelectorAll('.identity-avatar')
        .forEach(el => el.textContent = avatarInitials);

      /* RT-02 FIX: escapeHtml() on API data before innerHTML interpolation */
      /* RT-20 FIX: null-safe faculty — data.faculty may be null if unassigned */
      document.querySelectorAll('.identity-meta-item.faculty').forEach(el => {
        const facultyName = (data.faculty && data.faculty.name) ? data.faculty.name : 'Not assigned';
        el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"/></svg> ${escapeHtml(facultyName)}`;
      });

      document.querySelectorAll('.identity-meta-item.student-id').forEach(el => {
        el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg> Student ID: ${escapeHtml(data.student_id)}`;
      });

      /* ── RT-20: Null-safe GPA (.toFixed() throws on null/undefined) ── */
      const gpa    = (typeof data.gpa === 'number' && isFinite(data.gpa)) ? data.gpa : 0;
      const gpaStr = gpa.toFixed(2);

      const identityBadge = document.querySelector('.identity-badge');
      if (identityBadge) identityBadge.textContent = `GPA: ${gpaStr} / 4.00`;

      const emailEl = document.querySelector('.info-value.email');
      if (emailEl) emailEl.textContent = data.email || '—';

      /* RT-19: Populate DOB from API — no longer hardcoded in HTML */
      const dobEl = document.querySelector('.info-value.dob');
      if (dobEl) dobEl.textContent = data.date_of_birth || '—';

      const gpaValue = document.querySelector('.gpa-value');
      if (gpaValue) gpaValue.textContent = gpaStr;

      const gpaRingFill = document.querySelector('.gpa-ring-fill');
      if (gpaRingFill) {
        const pct = gpa / 4.0;
        gpaRingFill.style.strokeDashoffset = 238.76 * (1 - pct);
      }

      /* ── RT-20: Null-safe credits — guard division by zero ────── */
      const completed = (typeof data.credits_completed === 'number') ? data.credits_completed : 0;
      const required  = (typeof data.credits_required  === 'number' && data.credits_required > 0) ? data.credits_required : 1;
      const creditPct = Math.min((completed / required) * 100, 100); // clamp to 100%

      const creditText = document.querySelector('.credit-bar-wrap span:nth-child(2)');
      if (creditText) creditText.textContent = `${completed} / ${data.credits_required ?? '—'}`;

      const creditBarFill = document.querySelector('.credit-bar-fill');
      if (creditBarFill) creditBarFill.style.width = `${creditPct}%`;

      const creditLabel = document.querySelector('.credit-bar-labels span');
      if (creditLabel) creditLabel.textContent = `${Math.round(creditPct)}% complete`;
    }
  } catch { /* RT-15: silent — no stack traces exposed */ }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
