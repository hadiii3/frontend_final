/* login.js — Password toggle and simulated login */
function togglePwd() {
  const input = document.getElementById('password');
  const icon = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
  }
}

function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const studentId = document.getElementById('student-id').value.trim();
  const pwd = document.getElementById('password').value;

  errEl.style.display = 'none';
  btn.textContent = 'Signing in…';
  btn.disabled = true;

  setTimeout(() => {
    /* Demo: any non-empty ID (at least 5 chars) succeeds */
    if (studentId.length >= 5 && pwd) {
      window.location.href = 'dashboard.html';
    } else {
      errEl.textContent = 'Please enter a valid student ID and password.';
      errEl.style.display = 'flex';
      btn.textContent = 'Sign In to Portal';
      btn.disabled = false;
    }
  }, 900);
}
