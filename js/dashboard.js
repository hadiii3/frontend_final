/* dashboard.js
 * Fixes applied:
 *   RT-02 : faculty.name and student_id now escaped before innerHTML injection
 *   RT-07 : checks !response.ok (not just 401) for robust auth guard
 *   RT-15 : console.error removed
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
  const token = localStorage.getItem('student_token');

  if (!token) {
    window.location.replace('login.html');
    return;
  }

  try {
    const response = await fetch(
      `${window.APP_CONFIG.API_BASE_URL}${window.APP_CONFIG.ENDPOINTS.STUDENT_PROFILE}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );

    /* RT-07 FIX: catch any non-OK response, not just 401 */
    if (!response.ok) {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_name');
      window.location.replace('login.html');
      return;
    }

    const { data } = await response.json();

    if (data) {
      const firstName      = data.full_name.split(' ')[0] || '';
      const avatarInitials = data.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      document.querySelectorAll('.dash-welcome strong')
        .forEach(el => el.textContent = firstName);

      document.querySelectorAll('.identity-name, .info-value.full-name')
        .forEach(el => el.textContent = data.full_name);

      document.querySelectorAll('.identity-avatar')
        .forEach(el => el.textContent = avatarInitials);

      /* RT-02 FIX: escapeHtml() on API data before innerHTML interpolation */
      document.querySelectorAll('.identity-meta-item.faculty').forEach(el => {
        el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"/></svg> ${escapeHtml(data.faculty.name)}`;
      });

      document.querySelectorAll('.identity-meta-item.student-id').forEach(el => {
        el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg> Student ID: ${escapeHtml(data.student_id)}`;
      });

      const identityBadge = document.querySelector('.identity-badge');
      if (identityBadge) identityBadge.textContent = `GPA: ${data.gpa.toFixed(2)} / 4.00`;

      const emailEl = document.querySelector('.info-value.email');
      if (emailEl) emailEl.textContent = data.email;

      const gpaValue = document.querySelector('.gpa-value');
      if (gpaValue) gpaValue.textContent = data.gpa.toFixed(2);

      const gpaRingFill = document.querySelector('.gpa-ring-fill');
      if (gpaRingFill) {
        const pct = data.gpa / 4.0;
        gpaRingFill.style.strokeDashoffset = 238.76 * (1 - pct);
      }

      const creditText = document.querySelector('.credit-bar-wrap span:nth-child(2)');
      if (creditText) creditText.textContent = `${data.credits_completed} / ${data.credits_required}`;

      const creditBarFill = document.querySelector('.credit-bar-fill');
      const creditPct = (data.credits_completed / data.credits_required) * 100;
      if (creditBarFill) creditBarFill.style.width = `${creditPct}%`;

      const creditLabel = document.querySelector('.credit-bar-labels span');
      if (creditLabel) creditLabel.textContent = `${Math.round(creditPct)}% complete`;
    }
  } catch { /* RT-15: silent — no stack traces exposed */ }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
