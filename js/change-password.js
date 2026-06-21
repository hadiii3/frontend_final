import APP_CONFIG from "./config.js";
/* change-password.js
 * Forced password change after first login.
 * Student is redirected here immediately after OTP verification.
 * On success, redirected to dashboard.
 * RT-07 : auth guard redirects on 401/403
 * RT-10 : no inline event handlers
 * RT-13 : client-side validation before API call
 */

/* ── Auth guard ──────────────────────────────────────────────────── */
(function () {
  if (!sessionStorage.getItem('student_token')) {
    window.location.replace('login.html');
  }
})();

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
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.CHANGE_PASSWORD}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password:      current,
        new_password:          newPwd,
        new_password_confirmation: confirm,
      }),
    });

    /* Auth failures → back to login */
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem('student_token');
      sessionStorage.removeItem('student_name');
      window.location.replace('login.html');
      return;
    }

    const data = await res.json();

    if (data.success) {
      /* Mark this student as having changed their password — won't be forced again */
      const studentId = sessionStorage.getItem('student_id');
      if (studentId) localStorage.setItem('pwd_changed_' + studentId, '1');

      document.getElementById('change-pwd-form').reset();
      successEl.style.display = 'flex';
      btn.textContent = 'Redirecting…';
      btn.disabled    = true;
      /* Redirect to dashboard after short delay so student sees the success message */
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

/* ── Init ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('change-pwd-form');
  if (form) form.addEventListener('submit', handleChangePassword);

  makeToggle('current-password', 'eye-current');
  makeToggle('new-password',     'eye-new');
  makeToggle('confirm-password', 'eye-confirm');
});
