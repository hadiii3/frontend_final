import APP_CONFIG from "./config.js";
import { publicFetch } from "./api.js";
/* forgot-password.js — v9305432
 * Public page. Calls POST /student/forgot-password.
 * ALWAYS shows generic success message — never reveals whether email exists.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('forgot-form');
  const btn     = document.getElementById('forgot-btn');
  const errEl   = document.getElementById('forgot-error');
  const success = document.getElementById('forgot-success');
  const resetLink = document.getElementById('goto-reset-link');

  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value.trim();
    errEl.style.display = 'none';
    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const res = await publicFetch(APP_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email });
      const data = await res.json();

      if (res.status === 429) {
        errEl.textContent = data.message || 'Too many requests. Please wait before trying again.';
        errEl.style.display = 'block';
        btn.textContent = 'Send Reset Code';
        btn.disabled = false;
        return;
      }

      if (res.status === 422) {
        errEl.textContent = data.message || 'Please enter a valid email address.';
        errEl.style.display = 'block';
        btn.textContent = 'Send Reset Code';
        btn.disabled = false;
        return;
      }

      /* Always show generic success per spec — do not reveal if email exists */
      form.style.display = 'none';
      success.style.display = 'block';

      /* Pre-fill the email on the reset page URL */
      if (resetLink) {
        resetLink.href = `reset-password.html?email=${encodeURIComponent(email)}`;
      }

    } catch {
      errEl.textContent = 'A network error occurred. Please check your connection and try again.';
      errEl.style.display = 'block';
      btn.textContent = 'Send Reset Code';
      btn.disabled = false;
    }
  });
});
