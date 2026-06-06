/* chatbot.js
 * Fixes applied:
 *   RT-01 : user input no longer reaches innerHTML — textContent used for user bubbles
 *           fallback AI response HTML-escapes the reflected text
 *   RT-09 : sanitizeInput() strips null bytes / angle brackets / caps length
 *   RT-10 : inline onclick="sendQuick" replaced with addEventListener
 * AI Integration: POST https://ai.galalabot.app/api/chat (no chat history)
 */

import APP_CONFIG from './config.js';

const AI_CHAT_URL = `${APP_CONFIG.AI_BASE_URL}/chat`;

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

  /* RT-10: Replace inline onclick="sendQuick(this)" on chip buttons (chatbot.html) */
  document.querySelectorAll('.chip[data-quick]').forEach(chip => {
    chip.addEventListener('click', () => sendQuick(chip));
  });

  /* RT-10/RT-11: Replace inline onclick="askFAQ(...)" on FAQ chips (chatbot-public.html) */
  document.querySelectorAll('.faq-chip[data-question]').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.question;
      chatInput.dispatchEvent(new Event('input'));
      send();
    });
  });
}

/* ── sendQuick used by chatbot.html chip buttons ─────────────────── */
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

  appendMsg('user', text);
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
    appendMsg('ai', formatAIResponse(data));
  } catch (err) {
    removeTyping();
    appendMsg('ai', `<span style="color:var(--error,#f87171)">Sorry, I couldn't reach the AI right now. Please try again in a moment.</span>`);
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
function appendMsg(role, htmlOrText) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = time;

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
document.addEventListener('DOMContentLoaded', initChatInput);
