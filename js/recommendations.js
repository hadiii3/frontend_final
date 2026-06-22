import { requireAuth } from './api.js';
/* recommendations.js
 * Frontend for the Galala University Hybrid Course Recommendation Engine.
 * API base: http://127.0.0.1:8055 (local Python server)
 *
 * Storage:
 *   localStorage key 'rec_profile' — student profile form (persists across sessions)
 *   Recommendations are NOT cached — always fresh from API
 *
 * Tabs: profile | results | ask
 */

if (!requireAuth()) { /* redirects to login if no token */ }

const REC_API = 'http://127.0.0.1:8055';
const PROFILE_KEY = 'rec_profile';

/* ── State ───────────────────────────────────────────────────────── */
let completedCourses = [];  // [{ course_code, grade }]
let interests        = [];  // [string]
let skills           = [];  // [string]

/* ── Escape helper ───────────────────────────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initTagInputs();
  initProfileForm();
  loadSavedProfile();
  initRecButton();
  initAskForm();

  /* Check if local server is alive */
  await checkServerHealth();
});

/* ══════════════════════════════════════════════════════════════════
   SERVER HEALTH CHECK
══════════════════════════════════════════════════════════════════ */
async function checkServerHealth() {
  try {
    const res = await fetch(`${REC_API}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('not ok');
    document.getElementById('rec-offline-banner').style.display = 'none';
  } catch {
    document.getElementById('rec-offline-banner').style.display = 'flex';
  }
}

/* ══════════════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.rec-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.rec-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.rec-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`panel-${target}`).classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   TAG INPUTS — Interests & Skills
══════════════════════════════════════════════════════════════════ */
function initTagInputs() {
  initSimpleTagInput('interest-input', 'interests-pills', interests, 'interest-pill');
  initSimpleTagInput('skill-input',    'skills-pills',    skills,    'skill-pill');

  /* Completed courses: code + grade add button */
  document.getElementById('add-course-btn').addEventListener('click', addCourse);
  document.getElementById('course-code-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCourse(); }
  });
}

function initSimpleTagInput(inputId, pillsContainerId, arr, pillClass) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '').trim();
      if (val && !arr.includes(val)) {
        arr.push(val);
        renderSimplePills(pillsContainerId, arr, pillClass);
      }
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value && arr.length) {
      arr.pop();
      renderSimplePills(pillsContainerId, arr, pillClass);
    }
  });
}

function renderSimplePills(containerId, arr, pillClass) {
  const container = document.getElementById(containerId);
  if (!container) return;

  /* Remove all existing pills (not the input field) */
  container.querySelectorAll('.tag-pill').forEach(p => p.remove());

  arr.forEach((val, i) => {
    const pill = document.createElement('span');
    pill.className = `tag-pill ${pillClass}`;
    pill.innerHTML = `${esc(val)}<button class="tag-pill-remove" type="button" data-i="${i}" aria-label="Remove ${esc(val)}">×</button>`;
    pill.querySelector('.tag-pill-remove').addEventListener('click', () => {
      arr.splice(i, 1);
      renderSimplePills(containerId, arr, pillClass);
    });
    container.insertBefore(pill, container.firstChild);
  });
}

function addCourse() {
  const codeEl  = document.getElementById('course-code-input');
  const gradeEl = document.getElementById('course-grade-input');
  const code = codeEl.value.trim().toUpperCase();
  const grade = gradeEl.value || null;

  if (!code) return;
  /* Prevent duplicate codes */
  if (completedCourses.find(c => c.course_code === code)) {
    codeEl.value = '';
    return;
  }
  completedCourses.push({ course_code: code, grade });
  renderCoursePills();
  codeEl.value = '';
  gradeEl.value = '';
  codeEl.focus();
}

function renderCoursePills() {
  const container = document.getElementById('courses-pills');
  if (!container) return;
  container.innerHTML = '';
  completedCourses.forEach((c, i) => {
    const label = c.grade ? `${c.course_code} · ${c.grade}` : c.course_code;
    const pill = document.createElement('span');
    pill.className = 'tag-pill course-pill';
    pill.innerHTML = `${esc(label)}<button class="tag-pill-remove" type="button" aria-label="Remove ${esc(c.course_code)}">×</button>`;
    pill.querySelector('.tag-pill-remove').addEventListener('click', () => {
      completedCourses.splice(i, 1);
      renderCoursePills();
    });
    container.appendChild(pill);
  });
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE SAVE / LOAD / CLEAR
══════════════════════════════════════════════════════════════════ */
function initProfileForm() {
  const form = document.getElementById('profile-form');
  const clearBtn = document.getElementById('clear-profile-btn');
  if (form) form.addEventListener('submit', saveProfile);
  if (clearBtn) clearBtn.addEventListener('click', clearProfile);
}

function readFormValues() {
  return {
    program:     document.getElementById('p-program').value.trim(),
    track:       document.getElementById('p-track').value.trim(),
    semester:    parseInt(document.getElementById('p-semester').value) || null,
    credits:     parseInt(document.getElementById('p-credits').value) || 18,
    difficulty:  document.getElementById('p-difficulty').value,
    career_goal: document.getElementById('p-career').value.trim(),
    completed_courses: [...completedCourses],
    interests:   [...interests],
    skills:      [...skills],
  };
}

function saveProfile(e) {
  if (e) e.preventDefault();
  const data = readFormValues();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));

  const msg = document.getElementById('profile-saved-msg');
  if (msg) {
    msg.style.display = 'flex';
    setTimeout(() => msg.style.display = 'none', 2500);
  }
}

function loadSavedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.program)    document.getElementById('p-program').value    = data.program;
    if (data.track)      document.getElementById('p-track').value      = data.track;
    if (data.semester)   document.getElementById('p-semester').value   = data.semester;
    if (data.credits)    document.getElementById('p-credits').value    = data.credits;
    if (data.difficulty) document.getElementById('p-difficulty').value = data.difficulty;
    if (data.career_goal) document.getElementById('p-career').value   = data.career_goal;

    if (Array.isArray(data.completed_courses)) {
      completedCourses.push(...data.completed_courses);
      renderCoursePills();
    }
    if (Array.isArray(data.interests)) {
      interests.push(...data.interests);
      renderSimplePills('interests-pills', interests, 'interest-pill');
    }
    if (Array.isArray(data.skills)) {
      skills.push(...data.skills);
      renderSimplePills('skills-pills', skills, 'skill-pill');
    }
  } catch { /* corrupted localStorage — ignore */ }
}

function clearProfile() {
  if (!confirm('Clear your saved profile? This cannot be undone.')) return;
  localStorage.removeItem(PROFILE_KEY);
  document.getElementById('p-program').value    = '';
  document.getElementById('p-track').value      = '';
  document.getElementById('p-semester').value   = '';
  document.getElementById('p-credits').value    = '18';
  document.getElementById('p-difficulty').value = 'balanced';
  document.getElementById('p-career').value     = '';
  completedCourses.length = 0;
  interests.length        = 0;
  skills.length           = 0;
  renderCoursePills();
  renderSimplePills('interests-pills', interests, 'interest-pill');
  renderSimplePills('skills-pills',    skills,    'skill-pill');
}

/* ══════════════════════════════════════════════════════════════════
   RECOMMENDATIONS
══════════════════════════════════════════════════════════════════ */
function initRecButton() {
  document.getElementById('get-rec-btn')?.addEventListener('click', getRecommendations);
}

async function getRecommendations() {
  const btn       = document.getElementById('get-rec-btn');
  const container = document.getElementById('rec-results-container');
  const maxRec    = parseInt(document.getElementById('rec-max').value) || 5;

  const profile = readFormValues();

  /* Build API payload */
  const payload = {
    student_profile: {
      student_id:            sessionStorage.getItem('student_id') || 'portal-student',
      program:               profile.program  || undefined,
      track:                 profile.track    || undefined,
      current_semester:      profile.semester || undefined,
      completed_courses:     profile.completed_courses,
      interests:             profile.interests,
      skills:                profile.skills,
      career_goal:           profile.career_goal || undefined,
      max_credit_hours:      profile.credits,
      preferred_difficulty:  profile.difficulty,
    },
    max_recommendations: maxRec,
    include_blocked:     false,
    use_rag_context:     false,
  };

  /* Loading state */
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner-ring" style="width:16px;height:16px;border-width:2px;margin-right:6px;"></div>Analysing…`;
  container.innerHTML = `<div class="rec-spinner"><div class="spinner-ring"></div>Scoring ${188 - profile.completed_courses.length} eligible courses…</div>`;

  try {
    const res = await fetch(`${REC_API}/api/v1/recommend`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderRecommendations(data, container);

    /* Switch to results tab */
    document.getElementById('tab-results').click();

  } catch (err) {
    container.innerHTML = `
      <div class="rec-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3>Could not get recommendations</h3>
        <p>${esc(err.message || 'Is your local Python server running?')}</p>
        <p style="margin-top:8px;font-size:.8125rem;"><code>python -m app.main</code></p>
      </div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>Get Recommendations`;
  }
}

function renderRecommendations(data, container) {
  container.innerHTML = '';

  if (!data.recommendations || data.recommendations.length === 0) {
    container.innerHTML = `
      <div class="rec-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
        <h3>No recommendations found</h3>
        <p>Try adding more completed courses or adjusting your profile.</p>
      </div>`;
    return;
  }

  /* Engine explanation */
  if (data.explanation) {
    const noteBox = document.createElement('div');
    noteBox.style.cssText = 'padding:14px 18px;background:linear-gradient(135deg,#f0f4ff,#f8faff);border:1.5px solid #c7d2fe;border-radius:12px;font-size:.875rem;line-height:1.7;color:var(--col-on-surface);margin-bottom:var(--space-5);';
    noteBox.innerHTML = `<strong style="color:#4338ca;">Engine note:</strong> ${esc(data.explanation)}`;
    container.appendChild(noteBox);
  }

  data.recommendations.forEach((rec, i) => {
    const card = buildRecCard(rec, i + 1);
    container.appendChild(card);
  });
}

function buildRecCard(rec, rank) {
  const score = typeof rec.score === 'number' ? rec.score.toFixed(1) : '—';
  const rankClass = rank === 1 ? 'rec-rank-1' : rank === 2 ? 'rec-rank-2' : rank === 3 ? 'rec-rank-3' : '';

  const card = document.createElement('div');
  card.className = 'rec-card';

  /* Header */
  card.innerHTML = `
    <div class="rec-card-header">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span class="rec-rank ${rankClass}">#${rank}</span>
        <div>
          <div class="rec-card-code">${esc(rec.course_code)}</div>
          <div class="rec-card-name">${esc(rec.course_name)}</div>
        </div>
      </div>
      <div class="rec-score-badge">
        <span class="rec-score-num">${score}</span>
        <span class="rec-score-label">SCORE</span>
      </div>
    </div>
    <div class="rec-card-body">
      <div class="rec-reasons" id="reasons-${rank}"></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button class="rec-expand-btn" id="btn-breakdown-${rank}" data-target="breakdown-${rank}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
          Score Breakdown
        </button>
        ${rec.ml_explanation ? `<button class="rec-expand-btn" id="btn-ml-${rank}" data-target="ml-${rank}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
          Explanation
        </button>` : ''}
      </div>
      <div class="rec-breakdown" id="breakdown-${rank}" style="display:none;"></div>
      ${rec.ml_explanation ? `<div class="rec-ml" id="ml-${rank}" style="display:none;"></div>` : ''}
    </div>
  `;

  /* Reasons */
  const reasonsEl = card.querySelector(`#reasons-${rank}`);
  if (Array.isArray(rec.reasons) && rec.reasons.length) {
    rec.reasons.slice(0, 4).forEach(r => {
      const div = document.createElement('div');
      div.className = 'rec-reason';
      div.textContent = r;
      reasonsEl.appendChild(div);
    });
  }

  /* Score breakdown content */
  const bd = rec.score_breakdown;
  if (bd) {
    const bdEl = card.querySelector(`#breakdown-${rank}`);
    const maxes = { rule_score: 100, content_based_score: 25, svd_latent_score: 15, cluster_affinity_score: 10, rag_context_relevance: 5 };
    const labels = {
      rule_score: 'Rule Score',
      content_based_score: 'Content Similarity',
      svd_latent_score: 'SVD Latent',
      cluster_affinity_score: 'Cluster Affinity',
      rag_context_relevance: 'RAG Evidence',
    };
    let html = '<div style="display:flex;flex-direction:column;gap:4px;">';
    for (const [key, label] of Object.entries(labels)) {
      const val = typeof bd[key] === 'number' ? bd[key] : 0;
      const max = maxes[key];
      const pct = Math.min((val / max) * 100, 100);
      html += `
        <div class="rec-breakdown-row" style="display:grid;grid-template-columns:130px 1fr 50px;gap:8px;align-items:center;border:none;padding:4px 0;">
          <span class="rec-breakdown-key" style="font-size:.78rem;">${label}</span>
          <div class="rec-bar-track"><div class="rec-bar-fill" style="width:${pct.toFixed(1)}%;"></div></div>
          <span class="rec-breakdown-val" style="font-size:.78rem;text-align:right;">${val.toFixed(1)}</span>
        </div>`;
    }
    html += `<div style="padding-top:6px;border-top:1px dashed var(--col-outline);margin-top:4px;display:flex;justify-content:space-between;font-weight:800;font-size:.8125rem;">
      <span>Final Score</span><span style="color:var(--col-primary);">${typeof bd.final_score === 'number' ? bd.final_score.toFixed(2) : score}</span>
    </div></div>`;
    bdEl.innerHTML = html;
  }

  /* ML Explanation */
  if (rec.ml_explanation) {
    const mlEl = card.querySelector(`#ml-${rank}`);
    if (mlEl) mlEl.textContent = rec.ml_explanation;
  }

  /* Expand button wiring */
  card.querySelectorAll('.rec-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const panel  = card.querySelector(`#${target}`);
      if (!panel) return;
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      btn.classList.toggle('open', !isOpen);
    });
  });

  return card;
}

/* ══════════════════════════════════════════════════════════════════
   ASK A QUESTION
══════════════════════════════════════════════════════════════════ */
function initAskForm() {
  const form = document.getElementById('ask-form');
  if (form) form.addEventListener('submit', handleAsk);

  /* Quick question chips */
  document.querySelectorAll('.qa-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('ask-input');
      if (input) input.value = chip.dataset.q || chip.textContent.trim();
      handleAsk(null);
    });
  });
}

async function handleAsk(e) {
  if (e) e.preventDefault();

  const input   = document.getElementById('ask-input');
  const question = input?.value.trim();
  if (!question || question.length < 3) return;

  const resultArea = document.getElementById('ask-result-area');
  const loading    = document.getElementById('ask-loading');
  const errEl      = document.getElementById('ask-error');
  const answerEl   = document.getElementById('qa-answer');
  const sourcesEl  = document.getElementById('qa-sources');
  const btn        = document.getElementById('ask-btn');

  resultArea.style.display = 'none';
  errEl.style.display      = 'none';
  loading.style.display    = 'flex';
  btn.disabled             = true;

  try {
    const res = await fetch(`${REC_API}/api/v1/ask-course`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ question, top_k: 5 }),
      signal:  AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();

    answerEl.textContent = data.answer || 'No answer returned.';

    /* Sources */
    sourcesEl.innerHTML = '';
    if (Array.isArray(data.sources) && data.sources.length) {
      const label = document.createElement('div');
      label.className = 'rec-section-label';
      label.style.marginBottom = '6px';
      label.textContent = 'Sources';
      sourcesEl.appendChild(label);

      data.sources.slice(0, 3).forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'qa-source-chip';
        const src = s.source || 'catalog';
        const page = s.page ? ` · p.${s.page}` : '';
        chip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>${esc(src)}${esc(page)}`;
        sourcesEl.appendChild(chip);
      });
    }

    loading.style.display    = 'none';
    resultArea.style.display = 'block';

  } catch (err) {
    loading.style.display = 'none';
    errEl.textContent     = err.message || 'Could not reach the recommendation engine. Is the server running?';
    errEl.style.display   = 'block';
  } finally {
    btn.disabled = false;
  }
}
