import APP_CONFIG from "./config.js";
/* login.js — RT-08: brute-force lockout | RT-10: no inline handlers */

let _failCount = 0;
const MAX_FAILS = 5;
let _lockedOut = false;

function togglePwd() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  if (_lockedOut) return;

  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const sid   = document.getElementById('student-id').value.trim();
  const pwd   = document.getElementById('password').value;

  errEl.style.display = 'none';
  btn.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    const res  = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ student_id: sid, password: pwd }),
    });
    const data = await res.json();

    if (data.success) {
      _failCount = 0;
      if (data.requires_otp) {
        sessionStorage.setItem('temp_otp_token', data.otp_token);
        
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('otp-form').style.display = 'block';
        
        btn.textContent = 'Sign In to Portal';
        btn.disabled = false;
      } else {
        sessionStorage.setItem('student_token', data.data.token);
        sessionStorage.setItem('student_name',  data.data.student.full_name);
        window.location.href = 'dashboard.html';
      }
    } else {
      _failCount++;
      if (_failCount >= MAX_FAILS) {
        _lockedOut = true;
        btn.textContent = 'Locked (60s)';
        errEl.textContent = 'Too many failed attempts. Wait 60 seconds.';
        errEl.style.display = 'flex';
        let t = 60;
        const iv = setInterval(() => {
          t--;
          btn.textContent = `Locked (${t}s)`;
          if (t <= 0) {
            clearInterval(iv);
            _lockedOut = false; _failCount = 0;
            btn.disabled = false; btn.textContent = 'Sign In to Portal';
            errEl.style.display = 'none';
          }
        }, 1000);
      } else {
        errEl.textContent = data.message || 'Invalid student ID or password.';
        errEl.style.display = 'flex';
        btn.textContent = 'Sign In to Portal';
        btn.disabled = false;
      }
    }
  } catch {
    errEl.textContent = 'An error occurred during login. Please try again.';
    errEl.style.display = 'flex';
    btn.textContent = 'Sign In to Portal';
    btn.disabled = false;
  }
}

async function handleVerifyOtp(e) {
  e.preventDefault();

  const btn   = document.getElementById('verify-btn');
  const errEl = document.getElementById('otp-error');
  const otpCode = document.getElementById('otp-code').value.trim();
  const otpToken = sessionStorage.getItem('temp_otp_token');

  if (!otpToken) {
    showLoginForm();
    return;
  }

  errEl.style.display = 'none';
  btn.textContent = 'Verifying…';
  btn.disabled = true;

  try {
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.VERIFY_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ otp_token: otpToken, otp_code: otpCode }),
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.removeItem('temp_otp_token');
      sessionStorage.setItem('student_token', data.data.token);
      sessionStorage.setItem('student_name',  data.data.student.full_name);

      /* Store student_id for use by change-password.js */
      const studentId = data.data.student.student_id || '';
      if (studentId) sessionStorage.setItem('student_id', studentId);

      window.location.href = 'dashboard.html';
    } else {
      errEl.textContent = data.message || 'Invalid or expired verification code.';
      errEl.style.display = 'block';
      btn.textContent = 'Verify Code';
      btn.disabled = false;

      if (data.message && data.message.toLowerCase().includes('too many attempts')) {
        setTimeout(showLoginForm, 2000);
      }
    }
  } catch {
    errEl.textContent = 'An error occurred during verification. Please try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Verify Code';
    btn.disabled = false;
  }
}

function showLoginForm() {
  document.getElementById('otp-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('otp-code').value = '';
  document.getElementById('otp-error').style.display = 'none';
  sessionStorage.removeItem('temp_otp_token');
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const otpForm   = document.getElementById('otp-form');
  const tog       = document.getElementById('pwd-toggle');
  const backBtn   = document.getElementById('back-to-login');
  
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (otpForm)   otpForm.addEventListener('submit', handleVerifyOtp);
  if (tog)       tog.addEventListener('click', togglePwd);
  if (backBtn)   backBtn.addEventListener('click', showLoginForm);
});
