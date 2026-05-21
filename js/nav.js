/* nav.js
 * Fixes applied:
 *   RT-10 : inline onclick="handleLogout" removed from HTML; listener attached here
 *   RT-14 : logout uses keepalive:true + window.location.replace (no Back button)
 *   RT-04 : removed window.handleLogout global exposure
 */

(function () {
  /* ── Mobile menu toggle ───────────────────────────────────── */
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => menu.classList.toggle('open'));
  }

  /* ── Highlight active nav link ────────────────────────────── */
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
  });

  /* ── Hydrate student name + avatar from localStorage ─────── */
  const rawName = localStorage.getItem('student_name');
  /* RT-17: validate student_name — must be a plain string, max 100 chars,
     letters/spaces only. Prevents a tampered localStorage value from being
     used (though textContent already prevents XSS, this adds defence-in-depth) */
  const studentName = (typeof rawName === 'string' && /^[\p{L}\s\-'.]{1,100}$/u.test(rawName.trim()))
    ? rawName.trim()
    : null;

  if (studentName) {
    const initials = studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.querySelectorAll('.nav-student-name').forEach(el => el.textContent = studentName);
    document.querySelectorAll('.nav-student-avatar').forEach(el => el.textContent = initials);
  }

  /* ── RT-10: Attach logout listeners (replaces inline onclick) ── */
  document.querySelectorAll('.logout-btn').forEach(el => {
    el.addEventListener('click', handleLogout);
  });
})();

/* ── RT-14: Secure logout ────────────────────────────────────────── */
async function handleLogout(e) {
  if (e) e.preventDefault();

  const token = localStorage.getItem('student_token');

  /* Clear local state FIRST regardless of API result */
  localStorage.removeItem('student_token');
  localStorage.removeItem('student_name');

  /* Best-effort server-side invalidation using keepalive so the
     request completes even after navigation begins */
  if (token) {
    try {
      fetch(`${window.APP_CONFIG.API_BASE_URL}${window.APP_CONFIG.ENDPOINTS.STUDENT_LOGOUT}`, {
        method:    'POST',
        keepalive: true,
        headers:   { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
    } catch { /* fire-and-forget — local state already cleared */ }
  }

  /* replace() prevents Back button from returning to authenticated page */
  window.location.replace('/');
}
