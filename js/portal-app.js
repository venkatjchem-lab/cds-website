/* ============================================================
   CDS Research Portal — App logic (prototype, front-end only)
   ============================================================ */
const M = window.MODEL;

const FAC_CLASS = {
  'Engineering & Technology': 'f-eng',
  'Pharmaceutical Sciences': 'f-sci',
  'Medicine': 'f-med',
  'Allied & Health Sciences': 'f-ahs',
  'Management': 'f-mgmt',
  'Dentistry': 'f-dent'
};
const facClass = f => FAC_CLASS[f] || 'f-sci';
const initials = n => n.replace(/Dr\.?\s*/i, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* "July 2025" -> "Jul 2025", "January 2026" -> "Jan 2026" */
const batchShort = b => String(b).replace(/^([A-Za-z]+)/, m => m.slice(0, 3));

/* ---- coursework status helpers (Passed/Failed/Absent/Pending + legacy Completed) ---- */
const CW_DONE = st => st === 'Passed' || st === 'Completed';
const cwBadge = st => CW_DONE(st) ? 'b-ok' : st === 'Failed' ? 'b-risk' : st === 'Absent' ? 'b-warn' : 'b-info';

const ROLES = {
  scholar:   { name: 'Scholar', kind: 'scholar' },
  supervisor:{ name: 'Supervisor', kind: 'supervisor' },
  cds:       { name: 'CDS Office', kind: 'cds' },
  dean:      { name: 'Dean', kind: 'cds', scopeFaculty: true },
  director:  { name: 'Director of Research', kind: 'cds', research: true },
  registrar: { name: 'Registrar (view only)', kind: 'cds', readOnly: true }
};

/* ---- persistent prototype state ---- */
const LS = 'cdsportal.v1';
function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
function save(s) { localStorage.setItem(LS, JSON.stringify(s)); }
let store = load();
store.submissions = store.submissions || {};   // scholarId -> [ {month, summary, date} ]
store.approvals = store.approvals || {};        // scholarId -> 'approved'
store.comments = store.comments || {};          // scholarId -> [ {text, date} ]
store.uploads = store.uploads || {};            // scholarId -> [ filenames ]

const HAS_DATA = M.scholars.length > 0;
const savedRole = (window.sessionStorage && sessionStorage.getItem('cdsRole')) || 'cds';

const state = {
  role: ROLES[savedRole] ? savedRole : 'cds',
  scholarId: HAS_DATA ? pickRichScholar().id : null,
  supervisor: HAS_DATA ? pickBusySupervisor() : null,
  deanFaculty: HAS_DATA ? M.faculties[0].name : null,
  batchFilter: 'all',
  scholarYear: 'all',
  scholarFaculty: 'all',
  tab: 'overview'
};

/* scholars matching the dashboard's Year + Faculty filters */
function scholarPool() {
  let list = M.scholars;
  if (state.scholarYear !== 'all') list = list.filter(s => s.batch === state.scholarYear);
  if (state.scholarFaculty !== 'all') list = list.filter(s => s.faculty === state.scholarFaculty);
  return list;
}

function pickRichScholar() {
  return M.scholars.slice().sort((a, b) =>
    (b.publications + b.stage) - (a.publications + a.stage))[3] || M.scholars[0];
}
function pickBusySupervisor() {
  return M.supervisors.slice().sort((a, b) => b.count - a.count)[0].name;
}

/* ---- toast ---- */
function toast(msg) {
  let w = document.querySelector('.toast-wrap');
  if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<span class="ic">✓</span>' + esc(msg);
  w.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 2600);
}

/* ---- small builders ---- */
function kpi(label, num, sub, cls) {
  return `<div class="kpi ${cls || ''}"><div class="label">${label}</div>
    <div class="num">${num}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
function statusBadge(s) {
  if (s.completed) return '<span class="badge b-ok">Awarded</span>';
  if (s.atRisk) return '<span class="badge b-risk">At risk</span>';
  if (s.noUpdate) return '<span class="badge b-warn">No update</span>';
  return `<span class="badge b-info">${esc(s.stageName)}</span>`;
}
function minibar(pct) {
  return `<span class="minibar"><span class="track"><span style="width:${pct}%"></span></span><span class="pct">${pct}%</span></span>`;
}
function av(s) { return `<span class="av-fac ${facClass(s.faculty)}">${initials(s.name)}</span>`; }
/* compact coursework pass/fail summary for a scholar (admin tables) */
function cwResult(s) {
  const cw = window.scholarCoursework(s);
  const passed = cw.filter(c => CW_DONE(c.status)).length;
  const fails = cw.filter(c => c.status === 'Failed' || c.status === 'Absent').map(c => c.code || c.name);
  const cls = passed === cw.length ? 'b-ok' : fails.length ? 'b-risk' : 'b-info';
  return `<span class="badge ${cls}">${passed}/${cw.length}</span>` +
    (fails.length ? ` <span class="sm muted">✗ ${fails.map(esc).join(', ')}</span>` : '');
}

/* ============================================================ render router */
function render() {
  document.getElementById('user-chip').innerHTML = userChip();
  if (!HAS_DATA) {
    document.getElementById('page-head').innerHTML =
      '<div class="container"><h1>Research Portal</h1><p>Role-based scholar progress dashboards</p></div>';
    document.getElementById('view').innerHTML =
      '<div class="container"><div class="card card-pad"><div class="empty">Scholar data is not loaded in this environment.<br>The portal runs with the live CDS roster only inside the secured / local environment.</div></div></div>';
    return;
  }
  const kind = ROLES[state.role].kind;
  const head = document.getElementById('page-head');
  const view = document.getElementById('view');
  if (kind === 'scholar') { head.innerHTML = scholarHead(); view.innerHTML = scholarView(); wireScholar(); }
  else if (kind === 'supervisor') { head.innerHTML = supervisorHead(); view.innerHTML = supervisorView(); wireSupervisor(); }
  else { head.innerHTML = cdsHead(); view.innerHTML = cdsView(); }
}

function userChip() {
  const r = ROLES[state.role];
  let nm = r.name, ini = 'CDS';
  if (HAS_DATA && r.kind === 'scholar') { const s = scholar(); nm = s.name; ini = initials(s.name); }
  else if (HAS_DATA && r.kind === 'supervisor') { nm = state.supervisor; ini = initials(state.supervisor); }
  return `<div class="user-chip"><span class="av">${ini}</span>
    <span><span class="nm">${esc(nm)}</span><br><span class="rl">${esc(r.name)}</span></span></div>`;
}

const scholar = () => M.scholars.find(s => s.id === state.scholarId);

/* ============================================================ SCHOLAR */
function scholarHead() {
  const s = scholar();
  const years = allBatches();
  let facPool = M.scholars;
  if (state.scholarYear !== 'all') facPool = facPool.filter(x => x.batch === state.scholarYear);
  const faculties = [...new Set(facPool.map(x => x.faculty))].sort();
  const pool = scholarPool();
  const opt = (val, label, sel) => `<option value="${esc(val)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  return `<div class="container">
    <h1>Scholar dashboard</h1>
    <p>${esc(s.name)}${s.enroll ? ' · <strong>' + esc(s.enroll) + '</strong>' : ''} · ${esc(s.dept)} · ${esc(s.mode)} · enrolled ${s.enrolledYear}${s.batch ? ' · <strong style="color:var(--violet)">' + esc(s.batch) + ' batch</strong>' : ''}</p>
    <div class="scholar-search" style="margin-top:12px;position:relative;max-width:440px">
      <input type="text" id="scholar-search" autocomplete="off" placeholder="🔍  Search scholar by name, faculty or batch…">
      <div id="scholar-results" class="ss-results"></div>
    </div>
    <div class="scholar-filters">
      <label class="sf"><span>Year</span>
        <select id="scholar-year" autocomplete="off">${opt('all', 'All years', state.scholarYear === 'all')}${years.map(y => opt(y, batchShort(y), state.scholarYear === y)).join('')}</select></label>
      <label class="sf"><span>Faculty</span>
        <select id="scholar-faculty" autocomplete="off">${opt('all', 'All faculties', state.scholarFaculty === 'all')}${faculties.map(f => opt(f, f, state.scholarFaculty === f)).join('')}</select></label>
      <label class="sf"><span>Scholar</span>
        <select id="scholar-pick" autocomplete="off">${pool.map(x =>
          opt(x.id, x.name + ' — ' + x.faculty, x.id === s.id)).join('')}</select></label>
    </div></div>`;
}
function scholarView() {
  const s = scholar();
  const d = window.scholarDetail(s);
  const rdcDone = d.milestones.filter(m => m.status === 'done').length;
  const rdcCur = d.milestones.find(m => m.status === 'current');
  const cwDone = d.coursework.filter(c => CW_DONE(c.status)).length;
  const tabs = ['overview', 'submit', 'publications', 'coursework', 'attendance', 'meetings'];
  const labels = { overview: 'Overview', submit: 'Submit progress', publications: 'Publications', coursework: 'Coursework', attendance: 'Attendance', meetings: 'Meeting log' };
  return `<div class="container">
    <div class="kpi-grid" style="margin-bottom:24px">
      ${kpi('Overall progress', s.progressPct + '%', s.stageName)}
      ${kpi('RDC reviews', rdcDone + '/8', rdcCur ? rdcCur.name.split(' — ')[0] + ' due next' : (rdcDone === 8 ? 'all complete' : 'in progress'))}
      ${kpi('Publications', s.publications, s.publications ? 'recorded' : 'none yet')}
      ${kpi('Coursework', cwDone + '/' + d.coursework.length, 'courses passed', cwDone === d.coursework.length ? 'ok' : '')}
      ${kpi('Last update', s.daysSinceUpdate + 'd', 'ago', s.noUpdate ? 'danger' : 'ok')}
    </div>
    <div class="tabs">${tabs.map(t => `<button class="tab ${state.tab === t ? 'active' : ''}" data-tab="${t}">${labels[t]}</button>`).join('')}</div>
    <div id="tabview">${scholarTab(s)}</div>
  </div>`;
}
function scholarTab(s) {
  const d = window.scholarDetail(s);
  if (state.tab === 'submit') return submitTab(s);
  if (state.tab === 'publications') return pubTab(s, d);
  if (state.tab === 'coursework') return cwTab(d);
  if (state.tab === 'attendance') return attTab(s, d);
  if (state.tab === 'meetings') return meetTab(d);
  // overview
  const subs = store.submissions[s.id] || [];
  return `${s.topic ? `<div class="card card-pad" style="margin-bottom:18px">
    <div class="block-title">PhD research title <span class="pill">${esc(s.dept)}</span></div>
    <p class="research-title">${esc(s.topic)}</p>
    <div class="sm muted">Supervisor: ${esc(s.supervisor)}</div>
  </div>` : ''}
  <div class="grid-3">
    <div class="card card-pad">
      <div class="block-title">RDC milestones <span class="pill">${d.milestones.filter(m => m.status === 'done').length} of 8 completed</span></div>
      <div class="steps">${d.milestones.map((m, i) => `
        <div class="mstep"><span class="mdot ${m.status}">${m.status === 'done' ? '✓' : i + 1}</span>
          <div class="grow"><div class="mname">${esc(m.name)}</div><div class="mdate">${esc(m.date)}</div></div>
          ${m.status === 'current' ? '<span class="badge b-violet">Now</span>' : ''}</div>`).join('')}</div>
    </div>
    <div>
      <div class="card card-pad" style="margin-bottom:18px">
        <div class="block-title">Upcoming deadlines</div>
        ${d.deadlines.length ? d.deadlines.map(dl => `<div class="list-row">
          <div class="grow"><div class="nm">${esc(dl.label)}</div><div class="sm muted">${esc(dl.due)}</div></div>
          ${dl.urgent ? '<span class="badge b-warn">Due soon</span>' : ''}</div>`).join('') : '<div class="empty">Nothing pending.</div>'}
      </div>
      <div class="card card-pad">
        <div class="block-title">Recent submissions</div>
        ${subs.length ? subs.slice(0, 4).map(x => `<div class="list-row"><div class="grow"><div class="nm">${esc(x.month)}</div><div class="sm muted">${esc(x.date)}</div></div><span class="badge b-ok">Submitted</span></div>`).join('')
          : '<div class="empty">No submissions yet — use “Submit progress”.</div>'}
      </div>
    </div>
  </div>`;
}
function submitTab(s) {
  return `<div class="grid-2">
    <div class="card card-pad">
      <div class="block-title">Submit monthly progress</div>
      <form id="progress-form">
        <div class="field"><label>Reporting month</label>
          <select name="month"><option>June 2026</option><option>May 2026</option><option>April 2026</option></select></div>
        <div class="field"><label>Work completed this month</label>
          <textarea name="summary" placeholder="Experiments, drafts, data analysis, literature…" required></textarea></div>
        <div class="field-row">
          <div class="field"><label>Milestone status</label>
            <select name="ms">${window.MILESTONES.map((m, i) => `<option ${i === s.stage ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="field"><label>Self-rated progress (%)</label>
            <input type="number" name="pct" min="0" max="100" value="${s.progressPct}"></div>
        </div>
        <button class="btn btn-primary" type="submit">Submit for review</button>
      </form>
    </div>
    <div class="card card-pad">
      <div class="block-title">Upload reports</div>
      <div class="dropzone" id="dz">Drag a PDF here, or<br><label style="color:var(--violet);font-weight:700;cursor:pointer"> browse files<input type="file" id="fileinput" hidden></label></div>
      <div id="uploads" style="margin-top:14px">${(store.uploads[s.id] || []).map(f => `<div class="list-row"><div class="grow"><div class="nm">${esc(f)}</div></div><span class="badge b-ok">Uploaded</span></div>`).join('')}</div>
    </div>
  </div>`;
}
function pubTab(s, d) {
  return `<div class="card card-pad"><div class="block-title">Publications <span class="pill">${d.pubs.length}</span></div>
    ${d.pubs.length ? `<table><thead><tr><th>Title</th><th>Venue</th><th>Type</th><th>Year</th><th>Status</th></tr></thead><tbody>
      ${d.pubs.map(p => `<tr><td class="nm">${esc(p.title)}</td><td>${esc(p.journal)}</td><td>${esc(p.type)}</td><td>${p.year}</td>
        <td><span class="badge ${p.status === 'Published' ? 'b-ok' : 'b-warn'}">${esc(p.status)}</span></td></tr>`).join('')}
      </tbody></table>` : '<div class="empty">No publications recorded yet.</div>'}
    <div style="margin-top:16px"><button class="btn btn-ghost btn-sm" id="add-pub">+ Add publication</button></div></div>`;
}
function cwTab(d) {
  const items = d.coursework;
  const done = items.filter(c => CW_DONE(c.status)).length;
  const hasCode = items.some(c => c.code);
  const hasCredits = items.some(c => c.credits != null);
  const hasGrade = items.some(c => c.grade);
  const creditStr = hasCredits ? ' · ' + items.filter(c => CW_DONE(c.status)).reduce((a, c) => a + (c.credits || 0), 0) + ' credits earned' : '';
  return `<div class="card card-pad"><div class="block-title">Pre-Ph.D. coursework <span class="pill">${done}/${items.length} passed${creditStr}</span></div>
    <table><thead><tr>${hasCode ? '<th>Code</th>' : ''}<th>Course</th>${hasCredits ? '<th>Credits</th>' : ''}${hasGrade ? '<th>Grade</th>' : ''}<th>Status</th></tr></thead><tbody>
      ${items.map(c => `<tr>${hasCode ? `<td><span class="badge b-violet">${esc(c.code || '—')}</span></td>` : ''}<td class="nm">${esc(c.name)}</td>${hasCredits ? `<td>${c.credits == null ? '—' : c.credits}</td>` : ''}${hasGrade ? `<td>${esc(c.grade || '—')}</td>` : ''}
        <td><span class="badge ${cwBadge(c.status)}">${esc(c.status)}</span></td></tr>`).join('')}
    </tbody></table></div>`;
}
function attTab(s, d) {
  return `<div class="grid-2">
    <div class="card card-pad"><div class="block-title">Attendance</div>
      <div class="bar-row"><div class="bar-head"><span class="n">Coursework & seminars</span><span class="v">${s.attendance}%</span></div>
        <div class="bar"><span style="width:${s.attendance}%"></span></div></div>
      <p class="muted" style="margin-top:12px;font-size:0.85rem">${s.attendance >= 80 ? 'Meets the 80% minimum attendance requirement.' : 'Below the 80% requirement — shortfall flagged to supervisor.'}</p>
    </div>
    <div class="card card-pad"><div class="block-title">Meeting log <span class="pill">${d.meetings.length}</span></div>
      ${d.meetings.map(m => `<div class="list-row"><div class="dot-date">${esc(m.date.split(' ')[0])}<br>${esc(m.date.split(' ')[1])}</div><div class="grow"><div class="nm">${esc(m.note)}</div><div class="sm muted">with ${esc(s.supervisor)}</div></div></div>`).join('')}
    </div></div>`;
}
function meetTab(d) {
  const s = scholar();
  return `<div class="card card-pad"><div class="block-title">Meeting log with ${esc(s.supervisor)}</div>
    ${d.meetings.map(m => `<div class="list-row"><div class="dot-date">${esc(m.date.split(' ')[0])}<br>${esc(m.date.split(' ')[1])}</div>
      <div class="grow"><div class="nm">${esc(m.note)}</div><div class="sm muted">${esc(m.date)}</div></div></div>`).join('')}
  </div>`;
}
function wireScholar() {
  const sp = document.getElementById('scholar-pick');
  if (sp) sp.onchange = e => { state.scholarId = e.target.value; state.tab = 'overview'; render(); };
  // keep selected scholar inside the current Year + Faculty filter; jump to first if not
  const syncScholarToPool = () => {
    const pool = scholarPool();
    if (!pool.some(x => x.id === state.scholarId)) state.scholarId = (pool[0] || M.scholars[0]).id;
    state.tab = 'overview'; render();
  };
  const yr = document.getElementById('scholar-year');
  if (yr) yr.onchange = e => { state.scholarYear = e.target.value; state.scholarFaculty = 'all'; syncScholarToPool(); };
  const fac = document.getElementById('scholar-faculty');
  if (fac) fac.onchange = e => { state.scholarFaculty = e.target.value; syncScholarToPool(); };
  const si = document.getElementById('scholar-search');
  const sr = document.getElementById('scholar-results');
  if (si && sr) {
    const renderResults = q => {
      q = q.trim().toLowerCase();
      let list = M.scholars;
      if (q) list = list.filter(x => (x.name + ' ' + x.faculty + ' ' + x.dept + ' ' + (x.batch || '')).toLowerCase().includes(q));
      sr.innerHTML = list.length
        ? list.slice(0, 50).map(x => `<div class="ss-item${x.id === state.scholarId ? ' active' : ''}" data-id="${x.id}"><div class="nm">${esc(x.name)}</div><div class="meta">${esc(x.faculty)}${x.batch ? ' · ' + esc(x.batch) : ''}</div></div>`).join('')
        : '<div class="ss-empty">No scholars match.</div>';
      sr.classList.add('open');
    };
    si.onfocus = () => renderResults(si.value);
    si.oninput = () => renderResults(si.value);
    sr.onmousedown = e => { const it = e.target.closest('.ss-item'); if (!it) return; e.preventDefault(); state.scholarId = it.dataset.id; state.scholarYear = 'all'; state.scholarFaculty = 'all'; state.tab = 'overview'; render(); };
  }
  if (!window.__ssOutsideWired) {
    window.__ssOutsideWired = true;
    document.addEventListener('click', e => { if (!e.target.closest('.scholar-search')) { const r = document.getElementById('scholar-results'); if (r) r.classList.remove('open'); } });
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); });
  const f = document.getElementById('progress-form');
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const s = scholar();
    const fd = new FormData(f);
    (store.submissions[s.id] = store.submissions[s.id] || []).unshift(
      { month: fd.get('month'), summary: fd.get('summary'), date: window.fmtDate(new Date('2026-06-29')) });
    save(store);
    toast('Monthly progress submitted to ' + s.supervisor);
    state.tab = 'overview'; render();
  };
  const fi = document.getElementById('fileinput');
  if (fi) fi.onchange = e => {
    const s = scholar(); const name = (e.target.files[0] || {}).name || 'report.pdf';
    (store.uploads[s.id] = store.uploads[s.id] || []).unshift(name); save(store);
    toast('Report uploaded: ' + name); render();
  };
  const ap = document.getElementById('add-pub');
  if (ap) ap.onclick = () => toast('Prototype: publication form would open here.');
}

/* ============================================================ SUPERVISOR */
function supScholars() { return M.scholars.filter(s => s.supervisor === state.supervisor); }
function supervisorHead() {
  const list = M.supervisors.slice().sort((a, b) => b.count - a.count);
  const g = M.supervisors.find(x => x.name === state.supervisor);
  return `<div class="container"><h1>Supervisor dashboard</h1>
    <p>${esc(state.supervisor)} · ${esc(g.faculty)} · ${g.count} scholar${g.count > 1 ? 's' : ''}</p>
    <div class="persona-pick" style="margin-top:12px;position:relative">
      <select id="sup-pick" autocomplete="off">${list.map(x => `<option ${x.name === state.supervisor ? 'selected' : ''}>${esc(x.name)} (${x.count})</option>`).join('')}</select>
    </div></div>`;
}
function supervisorView() {
  const sc = supScholars();
  const pending = sc.filter(s => (store.submissions[s.id] || []).length || (!s.noUpdate && !s.completed && !store.approvals[s.id]));
  const atRisk = sc.filter(s => s.atRisk).length;
  return `<div class="container">
    <div class="kpi-grid" style="margin-bottom:24px">
      ${kpi('My scholars', sc.length)}
      ${kpi('Pending reviews', pending.length, 'awaiting action', pending.length ? 'danger' : 'ok')}
      ${kpi('At risk', atRisk, 'need attention', atRisk ? 'danger' : 'ok')}
      ${kpi('Total publications', sc.reduce((a, s) => a + s.publications, 0))}
    </div>
    <div class="grid-3">
      <div class="card card-pad">
        <div class="block-title">Progress reviews <span class="pill">${pending.length} pending</span></div>
        <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Milestone</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>
          ${sc.map(s => `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div><div class="nm">${esc(s.name)}</div><div class="sm">${esc(s.dept)}</div></div></div></td>
            <td>${esc(s.stageName)}</td><td>${minibar(s.progressPct)}</td>
            <td>${store.approvals[s.id] ? '<span class="badge b-ok">Approved</span>' : statusBadge(s)}</td>
            <td style="white-space:nowrap;text-align:right">
              ${store.approvals[s.id] ? '' : `<button class="btn btn-ok btn-sm" data-approve="${s.id}">Approve</button>`}
              <button class="btn btn-ghost btn-sm" data-comment="${s.id}">Comment</button></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:18px">
          <div class="block-title">Schedule a meeting</div>
          <form id="meet-form">
            <div class="field"><label>Scholar</label><select name="who">${sc.map(s => `<option>${esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label>Date & time</label><input type="datetime-local" name="when"></div>
            <button class="btn btn-primary btn-sm" type="submit">Schedule</button>
          </form>
        </div>
        <div class="card card-pad">
          <div class="block-title">Recommend progression</div>
          <p class="muted" style="font-size:0.84rem;margin-bottom:12px">Scholars eligible for the next milestone.</p>
          ${sc.filter(s => s.stage >= 4 && !s.completed).slice(0, 5).map(s => `<div class="list-row">
            <div class="grow"><div class="nm">${esc(s.name)}</div><div class="sm muted">${esc(s.stageName)}</div></div>
            <button class="btn btn-ghost btn-sm" data-progress="${s.id}">Recommend</button></div>`).join('') || '<div class="empty">None eligible yet.</div>'}
        </div>
      </div>
    </div>
  </div>`;
}
function wireSupervisor() {
  const sp = document.getElementById('sup-pick');
  if (sp) sp.onchange = e => { state.supervisor = e.target.value.replace(/ \(\d+\)$/, ''); render(); };
  document.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
    store.approvals[b.dataset.approve] = 'approved'; save(store);
    const s = M.scholars.find(x => x.id === b.dataset.approve);
    toast('Approved progress report — ' + s.name); render();
  });
  document.querySelectorAll('[data-comment]').forEach(b => b.onclick = () => {
    const s = M.scholars.find(x => x.id === b.dataset.comment);
    const txt = prompt('Comment for ' + s.name + ':');
    if (txt) { (store.comments[s.id] = store.comments[s.id] || []).push({ text: txt }); save(store); toast('Comment added for ' + s.name); }
  });
  document.querySelectorAll('[data-progress]').forEach(b => b.onclick = () => {
    const s = M.scholars.find(x => x.id === b.dataset.progress);
    toast('Progression recommended to CDS — ' + s.name);
  });
  const mf = document.getElementById('meet-form');
  if (mf) mf.onsubmit = e => { e.preventDefault(); toast('Meeting scheduled with ' + new FormData(mf).get('who')); mf.reset(); };
}

/* ============================================================ CDS / DEAN / DIRECTOR / REGISTRAR */
function cdsScholars() {
  const r = ROLES[state.role];
  let list = r.scopeFaculty ? M.scholars.filter(s => s.faculty === state.deanFaculty) : M.scholars;
  if (state.batchFilter && state.batchFilter !== 'all') list = list.filter(s => s.batch === state.batchFilter);
  return list;
}
function allBatches() { return [...new Set(M.scholars.map(s => s.batch).filter(Boolean))].sort(); }

/* ---- CSV export ---- */
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function batchTag() { return state.batchFilter && state.batchFilter !== 'all' ? '-' + state.batchFilter.replace(/\s+/g, '') : ''; }
function statusLabel(s) { return s.completed ? 'Awarded' : s.atRisk ? 'At risk' : 'On track'; }

function exportRoster() {
  const sc = cdsScholars();
  const headers = ['Enrolment No', 'Name', 'Faculty', 'Department', 'Mode', 'Batch', 'Supervisor', 'Thesis Title', 'RPE', 'RMB', 'TFCS', 'LRRP', 'Coursework done', 'Status'];
  const rows = sc.map(s => {
    const cw = window.scholarCoursework(s); const by = {}; cw.forEach(c => by[c.code] = c.status);
    const done = cw.filter(c => CW_DONE(c.status)).length;
    return [s.enroll || '', s.name, s.faculty, s.dept, s.mode, s.batch || '', s.supervisor, s.topic || '',
      by.RPE || '', by.RMB || '', by.TFCS || '', by.LRRP || '', done + '/' + cw.length, statusLabel(s)];
  });
  downloadCSV('cds-roster' + batchTag() + '.csv', headers, rows);
}
function exportAtRisk() {
  const sc = cdsScholars();
  const rows = sc.filter(s => s.atRisk).map(s => [s.enroll || '', s.name, s.faculty, s.dept, s.supervisor, s.batch || '', s.progressPct + '%', s.delayed ? 'Delayed milestone' : (s.noUpdate ? 'No update' : 'Slow progress')]);
  downloadCSV('cds-at-risk' + batchTag() + '.csv', ['Enrolment No', 'Name', 'Faculty', 'Department', 'Supervisor', 'Batch', 'Progress', 'Reason'], rows);
}
function exportSupervisors() {
  const sc = cdsScholars(); const map = {};
  sc.forEach(s => { const g = map[s.supervisor] || (map[s.supervisor] = { name: s.supervisor, faculty: s.faculty, count: 0, ps: 0, atRisk: 0, completed: 0, pubs: 0 }); g.count++; g.ps += s.progressPct; if (s.atRisk) g.atRisk++; if (s.completed) g.completed++; g.pubs += s.publications; });
  const rows = Object.values(map).sort((a, b) => b.count - a.count).map(g => [g.name, g.faculty, g.count, Math.round(g.ps / g.count) + '%', g.atRisk, g.completed, g.pubs]);
  downloadCSV('cds-supervisor-performance' + batchTag() + '.csv', ['Supervisor', 'Faculty', 'Scholars', 'Avg progress', 'At risk', 'Awarded', 'Publications'], rows);
}
function exportCoursework() {
  const sc = cdsScholars(); const agg = {};
  sc.forEach(s => window.scholarCoursework(s).forEach(c => {
    const k = c.code || c.name; const a = agg[k] || (agg[k] = { code: c.code, name: c.name, passed: 0, failed: 0, absent: 0, pending: 0, total: 0 });
    a.total++;
    if (CW_DONE(c.status)) a.passed++; else if (c.status === 'Failed') a.failed++; else if (c.status === 'Absent') a.absent++; else a.pending++;
  }));
  const rows = Object.values(agg).map(c => [c.code, c.name, c.passed, c.failed, c.absent, c.pending, c.total, Math.round(c.passed / (c.total || 1) * 100) + '%']);
  downloadCSV('cds-coursework' + batchTag() + '.csv', ['Code', 'Course', 'Passed', 'Failed', 'Absent', 'Pending', 'Total', 'Pass %'], rows);
}
function cdsHead() {
  const r = ROLES[state.role];
  const title = r.scopeFaculty ? 'Dean dashboard' : r.research ? 'Director of Research dashboard' : 'CDS Office dashboard';
  const ro = r.readOnly ? '<div class="ro-banner">● View only — Registrar access</div>' : '';
  const scope = r.scopeFaculty
    ? `<div class="persona-pick" style="margin-top:12px;position:relative;display:inline-block"><select id="dean-pick" autocomplete="off">${M.faculties.map(f => `<option ${f.name === state.deanFaculty ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>`
    : '';
  const batches = allBatches();
  const batchSel = batches.length
    ? `<div class="persona-pick" style="margin-top:12px;position:relative;display:inline-block;margin-left:10px"><select id="cds-batch" autocomplete="off"><option value="all"${state.batchFilter === 'all' ? ' selected' : ''}>All batches</option>${batches.map(b => `<option ${state.batchFilter === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`
    : '';
  return `<div class="container"><h1>${title}</h1>
    <p>${r.scopeFaculty ? esc(state.deanFaculty) + ' — faculty-level view' : 'Centre-wide research scholar monitoring'}${state.batchFilter !== 'all' ? ' · ' + esc(state.batchFilter) + ' batch' : ''}</p>${ro}${scope}${batchSel}</div>`;
}
function cdsView() {
  const r = ROLES[state.role];
  const sc = cdsScholars();
  const st = aggregate(sc);
  const discList = (M.discontinued || []).filter(s =>
    (!r.scopeFaculty || s.faculty === state.deanFaculty) &&
    (state.batchFilter === 'all' || s.batch === state.batchFilter));
  const discCount = discList.length;
  const facMap = {};
  sc.forEach(s => { const f = facMap[s.faculty] || (facMap[s.faculty] = { name: s.faculty, count: 0, ps: 0 }); f.count++; f.ps += s.progressPct; });
  const facultyBars = Object.values(facMap).map(f => ({ name: f.name, count: f.count, avgProgress: Math.round(f.ps / f.count) })).sort((a, b) => b.count - a.count);
  const cwAgg = {};
  sc.forEach(s => window.scholarCoursework(s).forEach(c => {
    const k = c.code || c.name;
    const a = cwAgg[k] || (cwAgg[k] = { code: c.code, name: c.name, passed: 0, failed: 0, absent: 0, pending: 0, total: 0 });
    a.total++;
    if (CW_DONE(c.status)) a.passed++;
    else if (c.status === 'Failed') a.failed++;
    else if (c.status === 'Absent') a.absent++;
    else a.pending++;
  }));
  const cwBars = Object.values(cwAgg);

  return `<div class="container">
    <div class="kpi-grid" style="margin-bottom:24px">
      ${kpi('Registered scholars', st.total, st.facultyCount + ' faculties · ' + st.supervisorCount + ' supervisors')}
      ${kpi('Avg progress', st.avgProgress + '%', 'across active scholars')}
      ${kpi('At-risk scholars', st.atRisk, st.delayed + ' with delayed milestones', st.atRisk ? 'danger' : 'ok')}
      ${kpi('No recent update', st.noUpdate, '> 90 days', st.noUpdate ? 'danger' : 'ok')}
      ${kpi('Publications', st.totalPubs, st.scholarsWithPubs + ' scholars publishing')}
      ${kpi('Completion rate', st.completionRate + '%', st.completed + ' awarded', 'ok')}
      ${discCount ? kpi('Discontinued', discCount, 'excluded from active stats') : ''}
    </div>

    <div class="grid-2">
      <div class="card card-pad">
        <div class="block-title">Progress by faculty</div>
        ${facultyBars.map(f => `<div class="bar-row"><div class="bar-head"><span class="n">${esc(f.name)} <span class="muted">(${f.count})</span></span><span class="v">${f.avgProgress}%</span></div>
          <div class="bar"><span style="width:${f.avgProgress}%"></span></div></div>`).join('')}
      </div>
      <div class="card card-pad">
        <div class="block-title">Expected thesis submissions</div>
        ${submissionForecast(sc)}
      </div>
    </div>

    <div class="card card-pad section-gap">
      <div class="block-title">Pre-Ph.D. coursework — pass / fail <span class="pill">${sc.length} scholars${state.batchFilter !== 'all' ? ' · ' + esc(state.batchFilter) : ''}</span><button class="btn btn-ghost btn-sm" id="csv-coursework" style="margin-left:auto">⬇ CSV</button></div>
      ${cwBars.map(c => { const pct = Math.round(c.passed / (c.total || 1) * 100); return `<div class="bar-row"><div class="bar-head"><span class="n">${c.code ? '<strong>' + esc(c.code) + '</strong> · ' : ''}${esc(c.name)}</span><span class="v">${c.passed}/${c.total} passed <span class="muted">(${pct}%)</span></span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="cw-tags">${c.passed ? `<span class="badge b-ok">${c.passed} passed</span>` : ''}${c.failed ? `<span class="badge b-risk">${c.failed} failed</span>` : ''}${c.absent ? `<span class="badge b-warn">${c.absent} absent</span>` : ''}${c.pending ? `<span class="badge b-info">${c.pending} pending</span>` : ''}</div></div>`; }).join('')}
    </div>

    <div class="card card-pad section-gap">
      <div class="block-title">Scholar roster — titles & coursework <span class="pill">${sc.length} scholars${state.batchFilter !== 'all' ? ' · ' + esc(state.batchFilter) : ''}</span><button class="btn btn-primary btn-sm" id="csv-roster" style="margin-left:auto">⬇ Download CSV</button></div>
      <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Enroll. no</th><th>Faculty</th><th>Year</th><th>PhD research title</th><th>Coursework</th><th>Progress</th><th>Status</th></tr></thead><tbody>
        ${sc.map(s => `<tr>
          <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div><div class="nm">${esc(s.name)}</div><div class="sm">${esc(s.supervisor)}</div></div></div></td>
          <td class="sm mono">${s.enroll ? esc(s.enroll) : '—'}</td>
          <td class="sm">${esc(s.faculty)}</td>
          <td class="sm">${s.batch ? esc(batchShort(s.batch)) : '—'}</td>
          <td class="rt-cell">${esc(s.topic || '—')}</td>
          <td>${cwResult(s)}</td>
          <td>${minibar(s.progressPct)}</td>
          <td>${statusBadge(s)}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No scholars.</div></td></tr>'}
      </tbody></table></div>
    </div>

    <div class="grid-2 section-gap">
      <div class="card card-pad">
        <div class="block-title">At-risk scholars <span class="pill">${st.atRisk}</span><button class="btn btn-ghost btn-sm" id="csv-atrisk" style="margin-left:auto">⬇ CSV</button></div>
        <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Faculty</th><th>Progress</th><th>Reason</th></tr></thead><tbody>
          ${sc.filter(s => s.atRisk).slice(0, 40).map(s => `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div><div class="nm">${esc(s.name)}</div><div class="sm">${esc(s.supervisor)}</div></div></div></td>
            <td class="sm">${esc(s.faculty)}</td><td>${minibar(s.progressPct)}</td>
            <td>${s.delayed ? '<span class="badge b-risk">Delayed milestone</span>' : s.noUpdate ? '<span class="badge b-warn">No update</span>' : '<span class="badge b-warn">Slow progress</span>'}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">No at-risk scholars.</div></td></tr>'}
        </tbody></table></div>
      </div>
      <div class="card card-pad">
        <div class="block-title">No updates filed <span class="pill">${st.noUpdate}</span></div>
        <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Supervisor</th><th>Last update</th></tr></thead><tbody>
          ${sc.filter(s => s.noUpdate).slice(0, 40).map(s => `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div class="nm">${esc(s.name)}</div></div></td>
            <td class="sm">${esc(s.supervisor)}</td><td><span class="badge b-warn">${s.daysSinceUpdate}d ago</span></td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">Everyone is up to date.</div></td></tr>'}
        </tbody></table></div>
      </div>
    </div>

    <div class="card card-pad section-gap">
      <div class="block-title">Supervisor-wise performance<button class="btn btn-ghost btn-sm" id="csv-supervisors" style="margin-left:auto">⬇ CSV</button></div>
      <div class="table-scroll"><table><thead><tr><th>Supervisor</th><th>Faculty</th><th>Scholars</th><th>Avg progress</th><th>At risk</th><th>Awarded</th><th>Publications</th></tr></thead><tbody>
        ${supervisorRows(sc)}
      </tbody></table></div>
    </div>

    <div class="card card-pad section-gap">
      <div class="block-title">Delayed milestones <span class="pill">${st.delayed}</span></div>
      <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Faculty</th><th>Stuck at</th><th>Years enrolled</th><th>Progress</th></tr></thead><tbody>
        ${sc.filter(s => s.delayed).slice(0, 40).map(s => `<tr>
          <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div class="nm">${esc(s.name)}</div></div></td>
          <td class="sm">${esc(s.faculty)}</td><td><span class="badge b-warn">${esc(s.stageName)}</span></td>
          <td>${s.years} yr</td><td>${minibar(s.progressPct)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">No delayed milestones.</div></td></tr>'}
      </tbody></table></div>
    </div>
${discList.length ? `
    <div class="card card-pad section-gap">
      <div class="block-title">Discontinued scholars <span class="pill">${discList.length}</span></div>
      <div class="table-scroll"><table><thead><tr><th>Scholar</th><th>Faculty</th><th>Department</th><th>Supervisor</th><th>Year</th><th>Discontinued on</th><th>Reason</th></tr></thead><tbody>
        ${discList.map(s => `<tr>
          <td><div style="display:flex;align-items:center;gap:10px">${av(s)}<div class="nm">${esc(s.name)}</div></div></td>
          <td class="sm">${esc(s.faculty)}</td><td class="sm">${esc(s.dept || '—')}</td>
          <td class="sm">${esc(s.supervisor)}</td><td class="sm">${s.batch ? esc(batchShort(s.batch)) : '—'}</td>
          <td class="sm">${s.discontinuedOn ? esc(s.discontinuedOn) : '<span class="muted">Not recorded</span>'}</td>
          <td class="sm">${s.reason ? esc(s.reason) : '<span class="muted">Not recorded</span>'}</td></tr>`).join('')}
      </tbody></table></div>
    </div>` : ''}
  </div>`;
}
function aggregate(sc) {
  const completed = sc.filter(s => s.completed).length;
  return {
    total: sc.length,
    facultyCount: new Set(sc.map(s => s.faculty)).size,
    supervisorCount: new Set(sc.map(s => s.supervisor)).size,
    atRisk: sc.filter(s => s.atRisk).length,
    noUpdate: sc.filter(s => s.noUpdate).length,
    delayed: sc.filter(s => s.delayed).length,
    completed, completionRate: Math.round(completed / sc.length * 100),
    totalPubs: sc.reduce((a, s) => a + s.publications, 0),
    scholarsWithPubs: sc.filter(s => s.publications > 0).length,
    avgProgress: Math.round(sc.reduce((a, s) => a + s.progressPct, 0) / sc.length)
  };
}
function submissionForecast(sc) {
  const buckets = {};
  sc.filter(s => !s.completed).forEach(s => { buckets[s.expectedSubmission] = (buckets[s.expectedSubmission] || 0) + 1; });
  const years = Object.keys(buckets).map(Number).sort();
  const max = Math.max(1, ...Object.values(buckets));
  return years.map(y => `<div class="bar-row"><div class="bar-head"><span class="n">${y}${y <= 2026 ? ' (overdue)' : ''}</span><span class="v">${buckets[y]}</span></div>
    <div class="bar"><span style="width:${Math.round(buckets[y] / max * 100)}%"></span></div></div>`).join('');
}
function supervisorRows(sc) {
  const map = {};
  sc.forEach(s => {
    const g = map[s.supervisor] || (map[s.supervisor] = { name: s.supervisor, faculty: s.faculty, count: 0, ps: 0, atRisk: 0, completed: 0, pubs: 0 });
    g.count++; g.ps += s.progressPct; if (s.atRisk) g.atRisk++; if (s.completed) g.completed++; g.pubs += s.publications;
  });
  return Object.values(map).sort((a, b) => b.count - a.count || b.ps / b.count - a.ps / a.count).map(g => {
    const avg = Math.round(g.ps / g.count);
    return `<tr><td class="nm">${esc(g.name)}</td><td class="sm">${esc(g.faculty)}</td><td>${g.count}</td>
      <td>${minibar(avg)}</td><td>${g.atRisk ? `<span class="badge b-risk">${g.atRisk}</span>` : '0'}</td>
      <td>${g.completed || 0}</td><td>${g.pubs}</td></tr>`;
  }).join('');
}

/* ============================================================ init */
function wireGlobal() {
  const rp = document.getElementById('role-pick');
  if (rp) {
    rp.innerHTML = Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    rp.value = state.role;
    rp.onchange = e => {
      state.role = e.target.value; state.tab = 'overview';
      if (window.sessionStorage) sessionStorage.setItem('cdsRole', state.role);
      render();
    };
  }
  document.getElementById('page-head').addEventListener('change', e => {
    if (e.target.id === 'dean-pick') { state.deanFaculty = e.target.value; render(); }
    if (e.target.id === 'cds-batch') { state.batchFilter = e.target.value; render(); }
  });
  [['csv-roster', exportRoster], ['csv-atrisk', exportAtRisk], ['csv-supervisors', exportSupervisors], ['csv-coursework', exportCoursework]]
    .forEach(([id, fn]) => { const b = document.getElementById(id); if (b) b.onclick = fn; });
  const so = document.getElementById('signout');
  if (so) so.onclick = e => {
    e.preventDefault();
    if (window.sessionStorage) { sessionStorage.removeItem('cdsRole'); sessionStorage.removeItem('cdsUser'); }
    location.href = 'login.html';
  };
}
wireGlobal();
render();
