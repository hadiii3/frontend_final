import APP_CONFIG from './config.js';

/**
 * api.js — Central API utility module (backend v9305432)
 *
 * Exports:
 *   apiFetch(endpoint, options)  — Authenticated fetch with global 409 interceptor.
 *   publicFetch(endpoint, body)  — Unauthenticated POST for public endpoints.
 *   requireAuth()                — Redirects to login if no token in sessionStorage.
 *   requirePasswordChanged()     — Redirects to change-password if must_change_password=1.
 *
 * Global 409 PASSWORD_CHANGE_REQUIRED interceptor:
 *   If any authenticated API call returns 409 with code="PASSWORD_CHANGE_REQUIRED",
 *   the student is redirected to change-password.html WITHOUT logging them out.
 *   The token is kept. must_change_password is set to '1' in sessionStorage.
 */

/* ── Auth guards ─────────────────────────────────────────────────── */

export function requireAuth() {
  if (!sessionStorage.getItem('student_token')) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

export function requirePasswordChanged() {
  if (sessionStorage.getItem('must_change_password') === '1') {
    window.location.replace('change-password.html');
    return false;
  }
  return true;
}

/* ── Authenticated fetch with global interceptors ────────────────── */

export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem('student_token');
  const url = `${APP_CONFIG.API_BASE_URL}${endpoint}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  /* ── Global 409 PASSWORD_CHANGE_REQUIRED interceptor ─────────── */
  if (response.status === 409) {
    try {
      const clone = response.clone();
      const body = await clone.json();
      if (body.code === 'PASSWORD_CHANGE_REQUIRED') {
        sessionStorage.setItem('must_change_password', '1');
        window.location.replace('change-password.html');
        /* Return a sentinel so callers can safely bail without crashing */
        return { _intercepted: true, ok: false, status: 409 };
      }
    } catch { /* body parse failed — fall through to normal handling */ }
  }

  /* ── Global 401 handler — clear token and redirect to login ───── */
  if (response.status === 401) {
    sessionStorage.removeItem('student_token');
    sessionStorage.removeItem('student_name');
    sessionStorage.removeItem('student_id');
    sessionStorage.removeItem('must_change_password');
    window.location.replace('login.html');
    return { _intercepted: true, ok: false, status: 401 };
  }

  return response;
}

/* ── Public (unauthenticated) POST ───────────────────────────────── */

export async function publicFetch(endpoint, body) {
  const url = `${APP_CONFIG.API_BASE_URL}${endpoint}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
