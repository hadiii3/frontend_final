/* chatbot.js — Interactive chat demo */
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

/* Auto-grow textarea */
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px';
});

/* Send on Enter (Shift+Enter = newline) */
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
sendBtn.addEventListener('click', send);

function sendQuick(el) {
  chatInput.value = el.textContent;
  send();
}

function send() {
  const text = chatInput.value.trim();
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

function appendMsg(role, text) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${role}`;

  if (role === 'ai') {
    wrap.innerHTML = `
      <div class="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
      </div>
      <div>
        <div class="msg-bubble">${text}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div>
        <div class="msg-bubble">${text}</div>
        <div class="msg-time">${time}</div>
      </div>`;
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

/* Simple response logic */
const responses = {
  deadline: 'Application deadlines vary by program. For <strong>Spring 2026</strong>, the Early Decision deadline is <strong>November 15th</strong>. The regular round closes <strong>January 15, 2026</strong>. International applicants should apply 2 weeks earlier to allow for document processing.',
  scholarship: 'Galala Uni offers three scholarship tiers: <strong>Academic Excellence</strong> (GPA 3.8+), <strong>Merit Award</strong> (GPA 3.5–3.79), and <strong>Financial Aid Grants</strong> based on need. International students may also apply to the <strong>Global Scholar Fund</strong>.',
  visa: 'For international students, Galala Uni provides a <strong>DS-2019 / I-20 form</strong> upon enrollment confirmation. You\'ll then apply for a J-1 or F-1 visa at your local US consulate. Our International Office can guide you through every step.',
  housing: 'On-campus housing is available for all enrolled students. We offer <strong>single rooms, shared apartments, and graduate suites</strong>. Applications open March 1st for the following academic year. Off-campus options are also available in the surrounding area.',
  tuition: 'Tuition for the 2025–2026 academic year is <strong>$18,500 per semester</strong> for domestic students and <strong>$22,000 per semester</strong> for international students. This includes campus facilities, library access, and health services.',
};

function getResponse(text) {
  const lower = text.toLowerCase();
  if (lower.includes('deadline') || lower.includes('when'))
    return responses.deadline;
  if (lower.includes('scholarship') || lower.includes('aid') || lower.includes('financial'))
    return responses.scholarship;
  if (lower.includes('visa') || lower.includes('international'))
    return responses.visa;
  if (lower.includes('housing') || lower.includes('dorm') || lower.includes('accommodation'))
    return responses.housing;
  if (lower.includes('tuition') || lower.includes('fee') || lower.includes('cost'))
    return responses.tuition;

  return `Thank you for your question about "<em>${text}</em>". Our admission team processes this type of inquiry. For the most accurate information, I\'d recommend contacting the <strong>Galala Uni Admissions Office</strong> directly at <strong>admissions@gu.edu.eg</strong> or visiting our campus during office hours.`;
}
