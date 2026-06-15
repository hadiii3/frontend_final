/* chatbot.js
 * Fixes applied:
 *   RT-01 : user input no longer reaches innerHTML — textContent used for user bubbles
 *           fallback AI response HTML-escapes the reflected text
 *   RT-09 : sanitizeInput() strips null bytes / angle brackets / caps length
 *   RT-10 : inline onclick="sendQuick" replaced with addEventListener
 * AI Integration: POST https://ai.galalabot.app/api/chat (no chat history)
 * Chat History: persisted per session in sessionStorage for logged-in users only.
 */

import APP_CONFIG from './config.js';

const AI_CHAT_URL = `${APP_CONFIG.AI_BASE_URL}${APP_CONFIG.AI_ENDPOINTS.CHAT}`;

/* ── HTML escape helper (RT-01) ──────────────────────────────────── */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── RT-09: Sanitize user input before any AI API call ───────────── */
function sanitizeInput(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\0/g, '')           // strip null bytes
    .replace(/[<>]/g, '')         // strip angle brackets (prompt injection / HTML)
    .substring(0, 500)            // hard length cap
    .trim();
}

/* ── DOM refs (set after DOMContentLoaded) ───────────────────────── */
let chatBody, chatInput, sendBtn;

/* ── Chat History State ──────────────────────────────────────────── */
const HISTORY_KEY = 'chatbot_history'; // sessionStorage key
let isLoggedIn = false;
let allSessions = [];      // array of session objects
let activeSessionId = null; // currently displayed session

/* A session object looks like:
  {
    id: string (timestamp),
    title: string (first user message, truncated),
    createdAt: ISO string,
    messages: [{ role: 'user'|'ai', html: string, time: string }]
  }
*/

/* ── Persistence helpers ─────────────────────────────────────────── */
function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory() {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(allSessions));
  } catch { /* storage full — silently ignore */ }
}

function generateId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ── Create a brand-new session ──────────────────────────────────── */
function createNewSession(firstMessage) {
  const id = generateId();
  const title = (firstMessage || 'New conversation').substring(0, 52) + (firstMessage && firstMessage.length > 52 ? '…' : '');
  const session = {
    id,
    title,
    createdAt: new Date().toISOString(),
    messages: []
  };
  allSessions.unshift(session); // newest first
  saveHistory();
  return session;
}

/* ── Get or create the active session ───────────────────────────── */
function getActiveSession() {
  if (!activeSessionId) return null;
  return allSessions.find(s => s.id === activeSessionId) || null;
}

/* ── Persist a message into the active session ───────────────────── */
function persistMessage(role, html, time) {
  const session = getActiveSession();
  if (!session) return;
  session.messages.push({ role, html, time });
  saveHistory();
}

/* ── Render the sidebar list ─────────────────────────────────────── */
function renderSidebar(filter = '') {
  const list = document.getElementById('chs-list');
  const empty = document.getElementById('chs-empty');
  if (!list) return;

  const lowerFilter = filter.toLowerCase().trim();
  const visible = lowerFilter
    ? allSessions.filter(s => s.title.toLowerCase().includes(lowerFilter))
    : allSessions;

  list.innerHTML = '';

  if (visible.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  visible.forEach(session => {
    const item = document.createElement('div');
    item.className = 'chs-item' + (session.id === activeSessionId ? ' chs-item-active' : '');
    item.setAttribute('role', 'listitem');
    item.dataset.id = session.id;

    const dateLabel = formatSessionDate(session.createdAt);
    const msgCount = session.messages.length;
    const countLabel = msgCount === 0 ? 'Empty' : `${msgCount} message${msgCount > 1 ? 's' : ''}`;

    item.innerHTML = `
      <div class="chs-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
        </svg>
      </div>
      <div class="chs-item-body">
        <div class="chs-item-title">${escapeHtml(session.title)}</div>
        <div class="chs-item-meta"><span>${dateLabel}</span><span>${countLabel}</span></div>
      </div>
      <button class="chs-item-del" data-id="${escapeHtml(session.id)}" title="Delete conversation" aria-label="Delete conversation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;

    // Click to load session
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chs-item-del')) return;
      loadSession(session.id);
    });

    // Delete button
    item.querySelector('.chs-item-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });

    list.appendChild(item);
  });
}

function formatSessionDate(isoString) {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

/* ── Load a session into the chat body ──────────────────────────── */
function loadSession(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;

  activeSessionId = sessionId;

  // Clear chat body (keep greeting hidden if we have messages)
  chatBody.innerHTML = '';

  if (session.messages.length === 0) {
    // Re-add greeting
    appendGreeting();
  } else {
    session.messages.forEach(m => {
      appendMsgFromHistory(m.role, m.html, m.time);
    });
  }

  // Update session label in header
  updateSessionLabel(session);

  // Show chips only for fresh sessions
  const chips = document.getElementById('chat-chips');
  if (chips) chips.hidden = session.messages.length > 0;

  chatBody.scrollTop = chatBody.scrollHeight;
  renderSidebar(document.getElementById('chs-search')?.value || '');

  // On mobile, close the sidebar after selecting
  closeMobileSidebar();
}

/* ── Delete a session ────────────────────────────────────────────── */
function deleteSession(sessionId) {
  allSessions = allSessions.filter(s => s.id !== sessionId);
  saveHistory();

  // If we deleted the active session, start fresh
  if (activeSessionId === sessionId) {
    activeSessionId = null;
    startFreshChat();
  } else {
    renderSidebar(document.getElementById('chs-search')?.value || '');
  }
}

/* ── Start a completely fresh (no-session) chat ─────────────────── */
function startFreshChat() {
  activeSessionId = null;
  chatBody.innerHTML = '';
  appendGreeting();

  const chips = document.getElementById('chat-chips');
  if (chips) chips.hidden = false;

  const label = document.getElementById('chat-session-label');
  if (label) label.textContent = '';

  chatBody.scrollTop = chatBody.scrollHeight;
  renderSidebar(document.getElementById('chs-search')?.value || '');
}

/* ── Append the default AI greeting ─────────────────────────────── */
function appendGreeting() {
  const rawName = sessionStorage.getItem('student_name');
  const studentName = (typeof rawName === 'string' && rawName.trim()) ? rawName.trim().split(' ')[0] : null;
  const greeting = studentName
    ? `Hello, ${escapeHtml(studentName)}! 👋 I'm the <strong>Galala University Intelligent Admission Assistant</strong>. I can guide you through <strong>admission requirements</strong>, <strong>application procedures</strong>, <strong>required documents</strong>, <strong>deadlines</strong>, and any other admission-related questions. How can I help you today?`
    : `Hello! 👋 I'm the <strong>Galala University Intelligent Admission Assistant</strong>. I can guide you through <strong>admission requirements</strong>, <strong>application procedures</strong>, <strong>required documents</strong>, <strong>deadlines</strong>, and any other admission-related questions. How can I help you today?`;

  const wrap = document.createElement('div');
  wrap.className = 'msg msg-ai';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = greeting; // controlled HTML — safe

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = 'Just now';

  const inner = document.createElement('div');
  inner.appendChild(bubble);
  inner.appendChild(timeEl);

  wrap.appendChild(avatar);
  wrap.appendChild(inner);
  chatBody.appendChild(wrap);
}

/* ── Update the header session label ────────────────────────────── */
function updateSessionLabel(session) {
  const label = document.getElementById('chat-session-label');
  if (!label) return;
  if (session) {
    const d = new Date(session.createdAt);
    label.textContent = `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    label.textContent = '';
  }
}

/* ── Init sidebar for logged-in users ───────────────────────────── */
function initHistorySidebar() {
  const token = sessionStorage.getItem('student_token');
  isLoggedIn = !!token;

  if (!isLoggedIn) return;

  // Show sidebar
  const sidebar = document.getElementById('chat-history-sidebar');
  if (sidebar) sidebar.hidden = false;

  // Switch layout to two-column
  const layout = document.getElementById('chatbot-app-layout');
  if (layout) layout.classList.add('chatbot-app-layout--with-sidebar');

  // Show mobile toggle
  const mobileToggle = document.getElementById('chs-mobile-toggle');
  if (mobileToggle) mobileToggle.hidden = false;

  // Load persisted sessions
  allSessions = loadHistory();
  renderSidebar();

  // New chat button
  document.getElementById('new-chat-btn')?.addEventListener('click', startFreshChat);

  // Search
  document.getElementById('chs-search')?.addEventListener('input', (e) => {
    renderSidebar(e.target.value);
  });

  // Mobile sidebar toggle
  document.getElementById('chs-mobile-toggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('chs-mobile-open');
  });
}

function closeMobileSidebar() {
  document.getElementById('chat-history-sidebar')?.classList.remove('chs-mobile-open');
}

/* ── Auto-grow textarea ──────────────────────────────────────────── */
function initChatInput() {
  chatBody  = document.getElementById('chat-body');
  chatInput = document.getElementById('chat-input');
  sendBtn   = document.getElementById('send-btn');

  if (!chatInput || !sendBtn || !chatBody) return;

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px';
  });

  /* Send on Enter (Shift+Enter = newline) */
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  sendBtn.addEventListener('click', send);

  /* RT-10: Replace inline onclick="sendQuick(this)" on chip buttons */
  document.querySelectorAll('.chip[data-quick]').forEach(chip => {
    chip.addEventListener('click', () => sendQuick(chip));
  });

  /* RT-10/RT-11: Replace inline onclick="askFAQ(...)" on FAQ chips */
  document.querySelectorAll('.faq-chip[data-question]').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.question;
      chatInput.dispatchEvent(new Event('input'));
      send();
    });
  });
}

/* ── sendQuick used by chip buttons ──────────────────────────────── */
function sendQuick(el) {
  chatInput.value = el.dataset.quick || el.textContent.trim();
  send();
}

/* ── Core send ───────────────────────────────────────────────────── */
async function send() {
  const raw = chatInput.value.trim();
  if (!raw) return;

  /* RT-09: sanitize before display AND before API call */
  const text = sanitizeInput(raw);
  if (!text) return;

  /* Create a session on first message (logged-in only) */
  if (isLoggedIn && !activeSessionId) {
    const session = createNewSession(text);
    activeSessionId = session.id;
    updateSessionLabel(session);
    renderSidebar(document.getElementById('chs-search')?.value || '');

    // Hide chips after first message
    const chips = document.getElementById('chat-chips');
    if (chips) chips.hidden = true;
  }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  appendMsg('user', text, time);
  if (isLoggedIn) persistMessage('user', escapeHtml(text), time);

  chatInput.value = '';
  chatInput.style.height = 'auto';

  showTyping();

  try {
    const res = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, chat_history: [] })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    removeTyping();
    const aiHtml = formatAIResponse(data);
    const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMsg('ai', aiHtml, aiTime);
    if (isLoggedIn) persistMessage('ai', aiHtml, aiTime);

    // Refresh sidebar to update message count
    if (isLoggedIn) renderSidebar(document.getElementById('chs-search')?.value || '');
  } catch (err) {
    removeTyping();
    const errHtml = `<span style="color:var(--error,#f87171)">Sorry, I couldn't reach the AI right now. Please try again in a moment.</span>`;
    appendMsg('ai', errHtml);
    console.error('[chatbot] AI API error:', err);
  }
}

/* ── Format the structured AI response into HTML ─────────────────── */
function formatAIResponse(data) {
  let html = '';

  if (data.your_case) {
    html += `<p><strong>${escapeHtml(data.your_case)}</strong></p>`;
  }

  if (data.what_this_means) {
    html += `<p>${escapeHtml(data.what_this_means)}</p>`;
  }

  if (Array.isArray(data.what_you_need) && data.what_you_need.length) {
    html += `<p><strong>What you need:</strong></p><ul>`;
    data.what_you_need.forEach(item => {
      html += `<li>${escapeHtml(item)}</li>`;
    });
    html += `</ul>`;
  }

  if (Array.isArray(data.what_to_do_now) && data.what_to_do_now.length) {
    html += `<p><strong>What to do now:</strong></p><ul>`;
    data.what_to_do_now.forEach(step => {
      html += `<li>${escapeHtml(step)}</li>`;
    });
    html += `</ul>`;
  }

  if (Array.isArray(data.when_to_contact_admission_office) && data.when_to_contact_admission_office.length) {
    html += `<p><strong>Contact admissions if:</strong></p><ul>`;
    data.when_to_contact_admission_office.forEach(cond => {
      html += `<li>${escapeHtml(cond)}</li>`;
    });
    html += `</ul>`;
  }

  /* Fallback if response has no recognisable fields */
  if (!html) {
    html = `<p>I received a response but couldn't parse it. Please try rephrasing your question.</p>`;
  }

  return html;
}

/* ── RT-01 FIX: appendMsg — user messages use textContent, never innerHTML ── */
function appendMsg(role, htmlOrText, time) {
  const msgTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = msgTime;

  if (role === 'ai') {
    /* AI responses are sanitized/escaped HTML — safe to use innerHTML */
    bubbleEl.innerHTML = htmlOrText;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>`;

    const inner = document.createElement('div');
    inner.appendChild(bubbleEl);
    inner.appendChild(timeEl);

    wrap.appendChild(avatar);
    wrap.appendChild(inner);
  } else {
    /* RT-01 FIX: User input — ALWAYS textContent, never innerHTML */
    bubbleEl.textContent = htmlOrText;

    const inner = document.createElement('div');
    inner.appendChild(bubbleEl);
    inner.appendChild(timeEl);
    wrap.appendChild(inner);
  }

  chatBody.appendChild(wrap);
  chatBody.scrollTop = chatBody.scrollHeight;
}

/* ── Append message when replaying history (both roles stored as HTML) ── */
function appendMsgFromHistory(role, html, time) {
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.innerHTML = html; // stored as escaped HTML

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = time || '';

  if (role === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>`;
    const inner = document.createElement('div');
    inner.appendChild(bubbleEl);
    inner.appendChild(timeEl);
    wrap.appendChild(avatar);
    wrap.appendChild(inner);
  } else {
    const inner = document.createElement('div');
    inner.appendChild(bubbleEl);
    inner.appendChild(timeEl);
    wrap.appendChild(inner);
  }

  chatBody.appendChild(wrap);
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'msg msg-ai msg-typing';
  el.id = 'typing-indicator';
  el.innerHTML = `
    <div class="msg-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813"/></svg>
    </div>
    <div class="msg-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

/* ── Init ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initChatInput();
  initHistorySidebar();
});
