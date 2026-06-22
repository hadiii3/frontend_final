import { apiFetch, requireAuth } from "./api.js";
/* change-password.js — v9305432 update
 * Supports two modes:
 *   FORCED   — must_change_password=1 in sessionStorage (arrived from login)
 *              Back link is hidden, forced-mode notice is shown.
 *              Student cannot skip.
 *   VOLUNTARY — must_change_password=0 or absent (arrived from profile/dashboard)
 *              Normal page with Back link visible.
 *
 * RT-07 : auth guard redirects on 401/403
 * RT-10 : no inline event handlers
 * RT-13 : client-side validation before API call
 * v9305432: reads data.must_change_password from success response
 */

/* ── Auth guard ──────────────────────────────────────────────────── */
if (!requireAuth()) { /* requireAuth redirects to login if no token */ }

/* ── Detect forced mode ──────────────────────────────────────────── */
const isForced = sessionStorage.getItem('must_change_password') === '1';

document.addEventListener('DOMContentLoaded', () => {
  /* Show/hide back link based on mode */
  const backLink    = document.getElementById('back-to-dashboard-link');
  const forcedNote  = document.getElementById('forced-mode-notice');

  if (backLink)   backLink.style.display   = isForced ? 'none' : 'inline-flex';
  if (forcedNote) forcedNote.style.display = isForced ? 'block' : 'none';

  const form = document.getElementById('change-pwd-form');
  if (form) form.addEventListener('submit', handleChangePassword);

  makeToggle('current-password', 'eye-current');
  makeToggle('new-password',     'eye-new');
  makeToggle('confirm-password', 'eye-confirm');
});

/* ── Password visibility toggle ─────────────────────────────────── */
function makeToggle(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  icon.parentElement.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerHTML = isHidden
      ? `<path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`
      : `<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
  });
}

/* ── Client-side validation ──────────────────────────────────────── */
function validatePasswords(current, newPwd, confirm) {
  if (!current) return 'Please enter your current password.';
  if (newPwd.length < 8) return 'New password must be at least 8 characters.';
  if (!/[A-Z]/.test(newPwd)) return 'New password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(newPwd)) return 'New password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(newPwd)) return 'New password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(newPwd)) return 'New password must contain at least one special character (e.g. ! @ # $).';
  if (newPwd !== confirm) return 'New password and confirmation do not match.';
  return null;
}

/* ── Form submit ─────────────────────────────────────────────────── */
async function handleChangePassword(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('student_token');
  if (!token) { window.location.replace('login.html'); return; }

  const btn       = document.getElementById('change-pwd-btn');
  const errEl     = document.getElementById('change-pwd-error');
  const successEl = document.getElementById('change-pwd-success');

  const current = document.getElementById('current-password').value;
  const newPwd  = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;

  /* Hide previous messages */
  errEl.style.display    = 'none';
  successEl.style.display = 'none';

  /* Client-side validation */
  const validErr = validatePasswords(current, newPwd, confirm);
  if (validErr) {
    errEl.textContent   = validErr;
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Updating…';
  btn.disabled    = true;

  try {
    const res = await apiFetch('/student/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password:          current,
        new_password:              newPwd,
        new_password_confirmation: confirm,
      }),
    });

    /* apiFetch handles 401 globally — check for its sentinel */
    if (res._intercepted) return;

    const data = await res.json();

    if (data.success) {
      /* v9305432: backend returns data.must_change_password=false on success */
      const nowForced = data.data?.must_change_password === true;
      sessionStorage.setItem('must_change_password', nowForced ? '1' : '0');

      document.getElementById('change-pwd-form').reset();
      successEl.style.display = 'flex';
      btn.textContent = 'Redirecting…';
      btn.disabled    = true;
      setTimeout(() => window.location.replace('dashboard.html'), 1500);
    } else {
      /* 422 or other backend error */
      errEl.textContent   = data.message || 'Could not update password. Please try again.';
      errEl.style.display = 'block';
      btn.textContent = 'Update Password';
      btn.disabled    = false;
    }
  } catch {
    errEl.textContent   = 'Network error — please check your connection and try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Update Password';
    btn.disabled    = false;
  }
}
