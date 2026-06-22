import APP_CONFIG from "./config.js";
import { publicFetch } from "./api.js";
/* reset-password.js — v9305432
 * Public page. Calls POST /student/forgot-password/reset.
 * On success: stores token, sets must_change_password=false, redirects to dashboard.
 * Old tokens are revoked by backend — new token must replace any existing one.
 */

/* ── Pre-fill email from URL ?email= param ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get('email');
  const emailInput = document.getElementById('reset-email');
  if (emailInput && emailParam) {
    emailInput.value = decodeURIComponent(emailParam);
  }

  /* ── Toggle password visibility ────────────────────────────── */
  makeToggle('reset-new-password', 'eye-reset-new');
  makeToggle('reset-confirm-password', 'eye-reset-confirm');

  /* ── Form submit ────────────────────────────────────────────── */
  const form = document.getElementById('reset-form');
  if (form) form.addEventListener('submit', handleReset);
});

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

/* ── Client-side validation ─────────────────────────────────────── */
function validateReset(email, otp, pwd, confirm) {
  if (!email)           return 'Please enter your email address.';
  if (!otp)             return 'Please enter the verification code.';
  if (pwd.length < 8)   return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character.';
  if (pwd !== confirm)  return 'Passwords do not match.';
  return null;
}

async function handleReset(e) {
  e.preventDefault();

  const btn     = document.getElementById('reset-btn');
  const errEl   = document.getElementById('reset-error');
  const success = document.getElementById('reset-success');
  const form    = document.getElementById('reset-form');

  const email   = document.getElementById('reset-email').value.trim();
  const otp     = document.getElementById('reset-otp').value.trim();
  const pwd     = document.getElementById('reset-new-password').value;
  const confirm = document.getElementById('reset-confirm-password').value;

  errEl.style.display = 'none';

  const validErr = validateReset(email, otp, pwd, confirm);
  if (validErr) {
    errEl.textContent   = validErr;
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Resetting…';
  btn.disabled    = true;

  try {
    const res = await publicFetch(APP_CONFIG.ENDPOINTS.FORGOT_PASSWORD_RESET, {
      email,
      otp_code:              otp,
      password:              pwd,
      password_confirmation: confirm,
    });
    const data = await res.json();

    if (res.status === 429) {
      errEl.textContent = data.message || 'Too many attempts. Please request a new reset code.';
      errEl.style.display = 'block';
      btn.textContent = 'Reset Password';
      btn.disabled = false;
      return;
    }

    if (data.success) {
      /*
       * Store the new token — backend has revoked any old tokens.
       * Set must_change_password=false per the response.
       */
      sessionStorage.setItem('student_token', data.data.token);
      sessionStorage.setItem('student_name',  data.data.student.full_name);
      sessionStorage.setItem('student_id',    data.data.student.student_id || '');
      sessionStorage.setItem('must_change_password', '0');

      form.style.display = 'none';
      success.style.display = 'flex';

      setTimeout(() => window.location.replace('dashboard.html'), 1500);
    } else {
      /* 422: invalid OTP, weak password, or confirmation mismatch */
      errEl.textContent   = data.message || 'Could not reset password. Please check your code and try again.';
      errEl.style.display = 'block';
      btn.textContent = 'Reset Password';
      btn.disabled    = false;
    }
  } catch {
    errEl.textContent   = 'A network error occurred. Please check your connection and try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Reset Password';
    btn.disabled    = false;
  }
}
