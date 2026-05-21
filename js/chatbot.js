import APP_CONFIG from "./config.js";
/* chatbot.js
 * Fixes applied:
 *   RT-01 : user input no longer reaches innerHTML — textContent used for user bubbles
 *           fallback AI response HTML-escapes the reflected text
 *   RT-10 : inline onclick="sendQuick" replaced with addEventListener
 */

/* ── RT-09 FIX: Sanitize input for future AI integration ─────────── */
function sanitizeForAI(text) {
  return text
    .replace(/[<>]/g, '')           // strip angle brackets
    .substring(0, 500)              // length limit
    .trim();
}

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
  /* Use dataset if available, else textContent */
  chatInput.value = el.dataset.quick || el.textContent.trim();
  send();
}

/* ── Core send ───────────────────────────────────────────────────── */
function send() {
  const raw  = chatInput.value.trim();
  if (!raw) return;

  /* RT-09: sanitize before display AND before any future AI API call */
  const text = sanitizeInput(raw);
  if (!text) return;

  appendMsg('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  showTyping();
  setTimeout(() => {
    removeTyping();
    appendMsg('ai', getResponse(text));
  }, 1200 + Math.random() * 600);
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
    /* AI responses are hardcoded trusted HTML — safe to use innerHTML.
       The fallback path now HTML-escapes user text before returning it. */
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

/* ── Response logic ──────────────────────────────────────────────── */
const responses = {
  deadline:   'Application deadlines vary by program. For <strong>Spring 2026</strong>, the Early Decision deadline is <strong>November 15th</strong>. The regular round closes <strong>January 15, 2026</strong>. International applicants should apply 2 weeks earlier.',
  scholarship:'Galala Uni offers three scholarship tiers: <strong>Academic Excellence</strong> (GPA 3.8+), <strong>Merit Award</strong> (GPA 3.5–3.79), and <strong>Financial Aid Grants</strong> based on need.',
  visa:       'For international students, Galala Uni provides a <strong>DS-2019 / I-20 form</strong> upon enrollment confirmation. You\'ll then apply for a J-1 or F-1 visa at your local US consulate.',
  housing:    'On-campus housing is available for all enrolled students. We offer <strong>single rooms, shared apartments, and graduate suites</strong>. Applications open March 1st for the following academic year.',
  tuition:    'Tuition for the 2025–2026 academic year is <strong>$18,500 per semester</strong> for domestic students and <strong>$22,000 per semester</strong> for international students.',
};

function getResponse(text) {
  const safePrompt = sanitizeForAI(text);
  const lower = safePrompt.toLowerCase();
  if (lower.includes('deadline') || lower.includes('when'))        return responses.deadline;
  if (lower.includes('scholarship') || lower.includes('financial')) return responses.scholarship;
  if (lower.includes('visa') || lower.includes('international'))    return responses.visa;
  if (lower.includes('housing') || lower.includes('dorm'))          return responses.housing;
  if (lower.includes('tuition') || lower.includes('fee'))           return responses.tuition;

  /* RT-01 FIX: escapeHtml() prevents user text from being parsed as HTML */
  return `Thank you for your question about &ldquo;<em>${escapeHtml(safePrompt)}</em>&rdquo;. For the most accurate information, contact the <strong>Galala Uni Admissions Office</strong> at <strong>admissions@gu.edu.eg</strong>.`;
}

/* ── Init ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initChatInput);
