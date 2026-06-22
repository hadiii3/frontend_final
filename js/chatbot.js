/* chatbot.js
 * Integration with Galala IAAS Laravel Backend
 * v9305432: handles 409 PASSWORD_CHANGE_REQUIRED via api.js interceptor
 */

import APP_CONFIG from './config.js';
import { apiFetch } from './api.js';

/* ── HTML escape helper ──────────────────────────────────────────── */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Sanitize user input ─────────────────────────────────────────── */
function sanitizeInput(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\0/g, '')           
    .replace(/[<>]/g, '')         
    .substring(0, 3000) // Backend max length is 3000
    .trim();
}

/* ── DOM refs ────────────────────────────────────────────────────── */
let chatBody, chatInput, sendBtn;

/* ── State ───────────────────────────────────────────────────────── */
let isLoggedIn = false;
let token = null;
let guestToken = null;
let allSessions = [];      
let activeSessionId = null; 
let isPolling = false;

/* ── API Helpers ─────────────────────────────────────────────────── */
function getHeaders(isGuest = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (isGuest) {
    if (guestToken) {
      headers['X-Guest-Token'] = guestToken;
    }
  } else {
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/* ── History & Sidebar Management (Students Only) ────────────────── */

async function fetchHistory() {
  if (!isLoggedIn) return;
  try {
    const res = await apiFetch(APP_CONFIG.ENDPOINTS.STUDENT_CHATS);
    if (res._intercepted) return;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data && json.data.conversations) {
      allSessions = json.data.conversations.map(c => ({
        id: c.uuid,
        title: c.title,
        createdAt: c.last_message_at,
        messages: []
      }));
    }
  } catch (err) { /* silent per RT-15 */ }
}

async function renderSidebar(filter = '') {
  if (!isLoggedIn) return;
  const list = document.getElementById('chs-list');
  const empty = document.getElementById('chs-empty');
  if (!list) return;

  const lowerFilter = filter.toLowerCase().trim();
  const visible = lowerFilter
    ? allSessions.filter(s => s.title.toLowerCase().includes(lowerFilter))
    : allSessions;

  list.innerHTML = '';

  if (visible.length === 0) {
    if(empty) empty.hidden = false;
    return;
  }
  if(empty) empty.hidden = true;

  visible.forEach(session => {
    const item = document.createElement('div');
    item.className = 'chs-item' + (session.id === activeSessionId ? ' chs-item-active' : '');
    item.setAttribute('role', 'listitem');
    item.dataset.id = session.id;

    const dateLabel = formatSessionDate(session.createdAt);

    item.innerHTML = `
      <div class="chs-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
        </svg>
      </div>
      <div class="chs-item-body">
        <div class="chs-item-title">${escapeHtml(session.title)}</div>
        <div class="chs-item-meta"><span>${dateLabel}</span></div>
      </div>
      <button class="chs-item-del" data-id="${escapeHtml(session.id)}" title="Delete conversation" aria-label="Delete conversation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.chs-item-del')) return;
      if (isPolling) return; // Prevent switching while polling
      loadSession(session.id);
    });

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

/* ── Session Loading & Deletion ──────────────────────────────────── */

async function loadSession(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;

  activeSessionId = sessionId;
  chatBody.innerHTML = '';
  
  const chips = document.getElementById('chat-chips');
  if (chips) chips.hidden = true;
  
  updateSessionLabel(session);
  renderSidebar(document.getElementById('chs-search')?.value || '');
  closeMobileSidebar();

  try {
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_CHATS}/${sessionId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    
    if (json.success && json.data && json.data.messages) {
      json.data.messages.forEach(m => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (m.role === 'user') {
           appendMsg('user', m.content, time);
        } else {
           if (m.status === 'completed') {
             let htmlContent = escapeHtml(m.content);
             try {
               const parsed = JSON.parse(m.content);
               htmlContent = formatAIResponse(parsed);
             } catch(e) {
               htmlContent = `<p>${htmlContent}</p>`;
             }
             appendMsgFromHistory('ai', htmlContent, time);
           } else if (m.status === 'queued' || m.status === 'processing') {
             showTyping();
             isPolling = true;
             disableInput(true);
             pollStudentStatus(sessionId, m.uuid);
           } else if (m.status === 'failed') {
             const errHtml = `<span style="color:var(--error,#f87171)">AI Request Failed. Please try again.</span>`;
             appendMsg('ai', errHtml, time);
           }
        }
      });
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  } catch (err) {
    console.error('[chatbot] Failed to load session messages:', err);
    appendMsg('ai', `<span style="color:var(--error,#f87171)">Failed to load messages.</span>`);
  }
}

async function deleteSession(sessionId) {
  try {
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_CHATS}/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    allSessions = allSessions.filter(s => s.id !== sessionId);
    
    if (activeSessionId === sessionId) {
      activeSessionId = null;
      startFreshChat();
    } else {
      renderSidebar(document.getElementById('chs-search')?.value || '');
    }
  } catch (err) {
    console.error('[chatbot] Failed to delete session:', err);
    alert('Failed to delete chat. Please try again.');
  }
}

function startFreshChat() {
  if (isPolling) return; // don't start fresh if currently waiting for AI
  activeSessionId = null;
  chatBody.innerHTML = '';
  appendGreeting();

  const chips = document.getElementById('chat-chips');
  if (chips) chips.hidden = false;

  const label = document.getElementById('chat-session-label');
  if (label) label.textContent = '';

  chatBody.scrollTop = chatBody.scrollHeight;
  if(isLoggedIn) renderSidebar(document.getElementById('chs-search')?.value || '');
}

/* ── Sending & Polling ───────────────────────────────────────────── */

async function send() {
  if (isPolling) return;

  const raw = chatInput.value.trim();
  if (!raw) return;

  const text = sanitizeInput(raw);
  if (!text) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  appendMsg('user', text, time);

  chatInput.value = '';
  chatInput.style.height = 'auto';

  const chips = document.getElementById('chat-chips');
  if (chips) chips.hidden = true;

  showTyping();
  isPolling = true;
  disableInput(true);

  if (isLoggedIn) {
    await sendStudentMessage(text);
  } else {
    await sendGuestMessage(text);
  }
}

async function sendStudentMessage(text) {
  const clientMsgId = crypto.randomUUID();
  let endpoint = `${APP_CONFIG.ENDPOINTS.STUDENT_CHATS}`;
  if (activeSessionId) {
    endpoint += `/${activeSessionId}/messages`;
  }

  try {
    const res = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        client_message_id: clientMsgId
      })
    });

    if (res._intercepted) {
      removeTyping(); isPolling = false; disableInput(false);
      return;
    }

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      const chatUuid = json.data.chat.uuid;
      const assistantMsgUuid = json.data.assistant_message.uuid;
      
      if (!activeSessionId) {
        activeSessionId = chatUuid;
        await fetchHistory();
        updateSessionLabel(allSessions.find(s => s.id === chatUuid));
        renderSidebar(document.getElementById('chs-search')?.value || '');
      }

      pollStudentStatus(chatUuid, assistantMsgUuid);
    } else {
        throw new Error('Invalid response from server');
    }
  } catch (err) {
    handleSendError(err);
  }
}

async function sendGuestMessage(text) {
  const url = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.GUEST_CHAT_MESSAGES}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
        if (res.status === 409) throw new Error('Conflict: A response is already being processed.');
        throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.guest_token) {
        guestToken = json.data.guest_token;
        sessionStorage.setItem('guest_token', guestToken);
      }
      const requestId = json.data.request_id;
      pollGuestStatus(requestId);
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (err) {
    handleSendError(err);
  }
}

function handleSendError(err) {
  removeTyping();
  isPolling = false;
  disableInput(false);
  const errHtml = `<span style="color:var(--error,#f87171)">Sorry, I couldn't reach the AI right now. Please try again.</span>`;
  appendMsg('ai', errHtml);
  console.error('[chatbot] AI API error:', err);
}

async function pollStudentStatus(chatUuid, messageUuid) {
  const pollInterval = 3000;
  const url = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.STUDENT_CHATS}/${chatUuid}/messages/${messageUuid}/status`;

  try {
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.success && json.data && json.data.assistant_message) {
      const status = json.data.assistant_message.status;
      
      if (status === 'completed') {
        handleCompletedPoll(json.data.assistant_message.content);
        await fetchHistory();
        renderSidebar(document.getElementById('chs-search')?.value || '');
      } else if (status === 'failed') {
        handleFailedPoll(json.data.ai_request?.error_code);
      } else {
        setTimeout(() => pollStudentStatus(chatUuid, messageUuid), pollInterval);
      }
    }
  } catch (err) {
    console.error('[chatbot] Polling error:', err);
    setTimeout(() => pollStudentStatus(chatUuid, messageUuid), pollInterval);
  }
}

async function pollGuestStatus(requestId) {
  const pollInterval = 3000;
  const url = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.GUEST_CHAT_MESSAGES}/${requestId}/status`;

  try {
    const res = await fetch(url, { headers: getHeaders(true) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.success && json.data) {
      const status = json.data.status;
      
      if (status === 'completed') {
        handleCompletedPoll(json.data.content);
      } else if (status === 'failed') {
        handleFailedPoll(json.data.error_code);
      } else {
        setTimeout(() => pollGuestStatus(requestId), pollInterval);
      }
    }
  } catch (err) {
    console.error('[chatbot] Polling error:', err);
    setTimeout(() => pollGuestStatus(requestId), pollInterval);
  }
}

function handleCompletedPoll(content) {
    removeTyping();
    isPolling = false;
    disableInput(false);
    
    let htmlContent = escapeHtml(content);
    try {
      const parsed = JSON.parse(content);
      htmlContent = formatAIResponse(parsed);
    } catch(e) {
       htmlContent = `<p>${htmlContent}</p>`;
    }
    
    const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMsgFromHistory('ai', htmlContent, aiTime);
}

function handleFailedPoll(errorCode) {
    removeTyping();
    isPolling = false;
    disableInput(false);
    const code = errorCode || 'UNKNOWN_ERROR';
    const errHtml = `<span style="color:var(--error,#f87171)">AI Request Failed (${code}). Please try again later.</span>`;
    appendMsg('ai', errHtml);
}

function disableInput(disabled) {
    chatInput.disabled = disabled;
    sendBtn.disabled = disabled;
    if (disabled) {
        chatInput.style.opacity = '0.5';
        sendBtn.style.opacity = '0.5';
    } else {
        chatInput.style.opacity = '1';
        sendBtn.style.opacity = '1';
        chatInput.focus();
    }
}

/* ── Init sidebar for logged-in users ───────────────────────────── */
async function initHistorySidebar() {
  token = sessionStorage.getItem('student_token');
  isLoggedIn = !!token;
  
  if (!isLoggedIn) {
     guestToken = sessionStorage.getItem('guest_token');
     return;
  }

  const sidebar = document.getElementById('chat-history-sidebar');
  if (sidebar) sidebar.hidden = false;

  const layout = document.getElementById('chatbot-app-layout');
  if (layout) layout.classList.add('chatbot-app-layout--with-sidebar');

  const mobileToggle = document.getElementById('chs-mobile-toggle');
  if (mobileToggle) mobileToggle.hidden = false;

  await fetchHistory();
  renderSidebar();

  document.getElementById('new-chat-btn')?.addEventListener('click', startFreshChat);
  document.getElementById('chs-search')?.addEventListener('input', (e) => {
    renderSidebar(e.target.value);
  });
  document.getElementById('chs-mobile-toggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('chs-mobile-open');
  });
}

/* ── DOM & Render Utilities ──────────────────────────────────────── */

function closeMobileSidebar() {
  document.getElementById('chat-history-sidebar')?.classList.remove('chs-mobile-open');
}

function updateSessionLabel(session) {
  const label = document.getElementById('chat-session-label');
  if (!label) return;
  if (session && session.createdAt) {
    const d = new Date(session.createdAt);
    label.textContent = `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    label.textContent = '';
  }
}

function appendGreeting() {
  // Removed as per user request
}

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
    bubbleEl.textContent = htmlOrText;
    const inner = document.createElement('div');
    inner.appendChild(bubbleEl);
    inner.appendChild(timeEl);
    wrap.appendChild(inner);
  }

  chatBody.appendChild(wrap);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function appendMsgFromHistory(role, html, time) {
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.innerHTML = html; 

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

function formatAIResponse(data) {
  let html = '';
  if (data.your_case) html += `<p><strong>${escapeHtml(data.your_case)}</strong></p>`;
  if (data.what_this_means) html += `<p>${escapeHtml(data.what_this_means)}</p>`;
  if (Array.isArray(data.what_you_need) && data.what_you_need.length) {
    html += `<p><strong>What you need:</strong></p><ul>`;
    data.what_you_need.forEach(item => html += `<li>${escapeHtml(item)}</li>`);
    html += `</ul>`;
  }
  if (Array.isArray(data.what_to_do_now) && data.what_to_do_now.length) {
    html += `<p><strong>What to do now:</strong></p><ul>`;
    data.what_to_do_now.forEach(step => html += `<li>${escapeHtml(step)}</li>`);
    html += `</ul>`;
  }
  if (Array.isArray(data.when_to_contact_admission_office) && data.when_to_contact_admission_office.length) {
    html += `<p><strong>Contact admissions if:</strong></p><ul>`;
    data.when_to_contact_admission_office.forEach(cond => html += `<li>${escapeHtml(cond)}</li>`);
    html += `</ul>`;
  }
  if (!html) {
    // Try to handle unexpected object shapes
    html = `<p>${escapeHtml(JSON.stringify(data))}</p>`;
  }
  return html;
}

/* ── Init ────────────────────────────────────────────────────────── */
function initChatInput() {
  chatBody  = document.getElementById('chat-body');
  chatInput = document.getElementById('chat-input');
  sendBtn   = document.getElementById('send-btn');

  if (!chatInput || !sendBtn || !chatBody) return;

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px';
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  sendBtn.addEventListener('click', send);

  document.querySelectorAll('.chip[data-quick]').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.quick || chip.textContent.trim();
      send();
    });
  });
  
  document.querySelectorAll('.faq-chip[data-question]').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.question || chip.textContent.trim();
      send();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initChatInput();
  await initHistorySidebar();
});
