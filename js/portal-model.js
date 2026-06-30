/* ============================================================
   CDS Research Portal — Data model
   Prototype: real scholar roster (window.RAW_SCHOLARS) + deterministic,
   seeded synthetic progress so dashboards look realistic and stay stable
   across reloads. No backend — this is demo data only.
   ============================================================ */

const NOW = new Date('2026-06-29');

const MILESTONES = [
  'Coursework',
  'Comprehensive exam',
  'Research proposal (DRC)',
  'Progress seminar I',
  'Progress seminar II',
  'Pre-submission seminar',
  'Thesis submission',
  'Awarded'
];

const JOURNALS = [
  'Journal of Materials Chemistry', 'IEEE Transactions', 'Clinical Therapeutics',
  'Bioorganic & Medicinal Chemistry', 'Indian Journal of Pharmaceutical Sciences',
  'Sensors and Actuators', 'Journal of Clinical Medicine', 'Heliyon',
  'Materials Today', 'Frontiers in Pharmacology'
];

// Official Pre-Ph.D. coursework (CDS / CAMU ERP): [name, code, credits]
const COURSES = [
  ['Research & Publication Ethics', 'RPE', 2],
  ['Research Methodology and Biostatistics', 'RMB', 4],
  ['Theoretical Foundation & Core Subject', 'TFCS', 4],
  ['Literature Review and Research Proposal', 'LRRP', 4]
];

/* ---- seeded pseudo-random ---- */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function daysAgo(n) { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; }
function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
// expected milestone stage (0..7) given pace-adjusted months since batch commencement
function stageForMonths(mo) {
  const reach = [6, 12, 16, 22, 28, 38, 41]; // months to reach stage 1..7 (per RDC schedule)
  let st = 0; for (const t of reach) if (mo >= t) st++;
  return st;
}

/* ---- build one scholar's synthetic record ---- */
function buildScholar(raw, idx) {
  const rnd = mulberry32(hashStr(raw.n + raw.g));
  const fullTime = raw.m === 'Full-Time';

  const pace = fullTime ? 1.45 : 1.0;
  const start = raw.batch && COMMENCEMENT[raw.batch];
  let years, enrolledYear, expectedStage, stage;
  if (start) {
    // real cohort — derive enrolment and expected progress from batch commencement
    const monthsIn = Math.max(0, (NOW.getFullYear() - start.getFullYear()) * 12 + (NOW.getMonth() - start.getMonth()));
    enrolledYear = start.getFullYear();
    years = Math.max(1, Math.round(monthsIn / 12));
    expectedStage = stageForMonths(monthsIn * pace);
    const lag = Math.max(0, Math.round(rnd() * 1.8 - 0.4));   // mostly on-track, some 1–2 stages behind
    stage = Math.max(0, Math.min(7, expectedStage - lag));
  } else {
    // no batch on record — fall back to seeded synthetic history
    years = 1 + Math.floor(rnd() * 5);
    enrolledYear = 2026 - years;
    expectedStage = Math.min(7, years * pace);
    const jitter = rnd() * 2.6 - 0.7;
    stage = Math.max(0, Math.min(7, Math.round(expectedStage - jitter)));
  }

  const completed = stage === 7;
  let progressPct = completed ? 100
    : Math.min(98, Math.round((stage / 7) * 100 + rnd() * 9));

  // update recency — ~16% have gone quiet (>90 days)
  let dAgo;
  if (rnd() < 0.16) dAgo = 95 + Math.floor(rnd() * 140);
  else dAgo = Math.floor(Math.pow(rnd(), 1.8) * 75);
  const lastUpdate = daysAgo(dAgo);
  const noUpdate = dAgo > 90 && !completed;

  const publications = 0;
  const attendance = 72 + Math.floor(rnd() * 28);

  const delayed = !completed && (expectedStage - stage) >= 1.3;
  const atRisk = !completed && (delayed || (noUpdate && progressPct < 75) || (years >= 4 && stage < 4));

  const subSpan = fullTime ? 3 + Math.round(rnd()) : 5 + Math.round(rnd());
  const expectedSubmission = enrolledYear + subSpan;

  return {
    id: 'S' + String(idx + 1).padStart(3, '0'),
    name: raw.n, faculty: raw.f, dept: raw.d, supervisor: raw.g,
    mode: raw.m, topic: raw.t,
    enrolledYear, years, stage, stageName: MILESTONES[stage],
    progressPct, publications, attendance,
    lastUpdate, lastUpdateStr: fmtDate(lastUpdate), daysSinceUpdate: dAgo,
    noUpdate, delayed, atRisk, completed,
    expectedSubmission,
    batch: raw.batch || null,
    enroll: raw.en || null,
    cw: raw.cw || null,
    status: raw.status || 'Active',
    discontinued: raw.status === 'Discontinued',
    discontinuedOn: raw.discontinuedOn || null,
    reason: raw.reason || null,
    _rnd: hashStr(raw.n + raw.g)
  };
}

/* ---- RDC review schedule (official RDCRACDRC dates): months from batch commencement ---- */
const RDC_SCHEDULE = [
  ['RDC-I', 'Constitution of RDC Committee', 8],
  ['RDC-II', 'Research Proposal / Synopsis Review', 12],
  ['RDC-III', '1st Progress Report Review', 16],
  ['RDC-IV', '2nd Progress Report Review', 22],
  ['RDC-V', '3rd Progress Report Review', 28],
  ['RDC-VI', '4th Progress Report Review', 34],
  ['RDC-VII', 'Pre-Submission Review', 40],
  ['RDC-VIII', 'Final Thesis Submission Review', 41]
];
const COMMENCEMENT = { 'July 2025': new Date(2025, 7, 22), 'January 2026': new Date(2026, 1, 27) };
function addMonths(d, m) { const x = new Date(d.getTime()); x.setMonth(x.getMonth() + m); return x; }
function rdcMilestones(s) {
  const start = COMMENCEMENT[s.batch] || COMMENCEMENT['January 2026'];
  return RDC_SCHEDULE.map(([code, title, off]) => {
    const dt = addMonths(start, off);
    const status = dt < NOW ? 'done' : ((dt - NOW) / 86400000 <= 75 ? 'current' : 'upcoming');
    return { name: code + ' — ' + title, status, date: fmtDate(dt) };
  });
}

/* ---- per-scholar Pre-Ph.D. coursework (real cw, else synthetic from stage) ---- */
function scholarCoursework(s) {
  return s.cw
    ? s.cw.map(c => ({ name: c.n, code: c.code, credits: c.cr, status: c.s }))
    : COURSES.map((c, i) => {
        const done = i < Math.min(COURSES.length, s.stage + 1);
        return { name: c[0], code: c[1], credits: c[2], status: done ? 'Completed' : 'Pending' };
      });
}

/* ---- per-scholar detail (lazy, seeded) ---- */
function scholarDetail(s) {
  const rnd = mulberry32(s._rnd);
  const milestones = rdcMilestones(s);

  const pubs = [];
  for (let i = 0; i < s.publications; i++) {
    pubs.push({
      title: s.topic.split(/[ ,]/).slice(0, 5).join(' ') + ' — Part ' + (i + 1),
      journal: pick(rnd, JOURNALS),
      year: 2026 - Math.floor(rnd() * 3),
      type: rnd() > 0.4 ? 'Journal (SCI/Scopus)' : 'Conference',
      status: rnd() > 0.25 ? 'Published' : 'Under review'
    });
  }

  const coursework = scholarCoursework(s);

  const meetings = [];
  const mCount = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < mCount; i++) {
    meetings.push({
      date: fmtDate(daysAgo(20 + i * 35 + Math.floor(rnd() * 15))),
      note: pick(rnd, ['Reviewed experiment plan', 'Discussed draft chapter',
        'Data analysis review', 'Manuscript feedback', 'Milestone planning'])
    });
  }

  const deadlines = [];
  if (!s.completed) {
    deadlines.push({ label: 'Monthly progress report', due: fmtDate(daysAgo(-(7 - s.daysSinceUpdate % 7))), urgent: true });
    deadlines.push({ label: s.stageName + ' submission', due: 'Expected ' + (NOW.getFullYear()), urgent: false });
    if (s.stage >= 3) deadlines.push({ label: 'Annual progress seminar', due: 'Expected ' + (NOW.getFullYear()) + '-' + ((NOW.getMonth() + 4) % 12 + 1), urgent: false });
  }

  return { milestones, pubs, coursework, meetings, deadlines };
}

/* ---- aggregates ---- */
function buildModel() {
  const all = (window.RAW_SCHOLARS || []).map(buildScholar);
  const discontinued = all.filter(s => s.discontinued);
  const scholars = all.filter(s => !s.discontinued);   // active only — drives all dashboards

  const faculties = {};
  scholars.forEach(s => {
    const f = faculties[s.faculty] || (faculties[s.faculty] = {
      name: s.faculty, count: 0, progressSum: 0, atRisk: 0, completed: 0, pubs: 0 });
    f.count++; f.progressSum += s.progressPct;
    if (s.atRisk) f.atRisk++; if (s.completed) f.completed++; f.pubs += s.publications;
  });
  Object.values(faculties).forEach(f => f.avgProgress = Math.round(f.progressSum / f.count));

  const supervisors = {};
  scholars.forEach(s => {
    const g = supervisors[s.supervisor] || (supervisors[s.supervisor] = {
      name: s.supervisor, faculty: s.faculty, count: 0, progressSum: 0,
      atRisk: 0, completed: 0, pubs: 0 });
    g.count++; g.progressSum += s.progressPct;
    if (s.atRisk) g.atRisk++; if (s.completed) g.completed++; g.pubs += s.publications;
  });
  Object.values(supervisors).forEach(g => g.avgProgress = Math.round(g.progressSum / g.count));

  const totalPubs = scholars.reduce((a, s) => a + s.publications, 0);
  const completed = scholars.filter(s => s.completed).length;

  return {
    scholars,
    discontinued,
    faculties: Object.values(faculties).sort((a, b) => b.count - a.count),
    supervisors: Object.values(supervisors),
    stats: {
      total: scholars.length,
      discontinued: discontinued.length,
      facultyCount: Object.keys(faculties).length,
      supervisorCount: Object.keys(supervisors).length,
      atRisk: scholars.filter(s => s.atRisk).length,
      noUpdate: scholars.filter(s => s.noUpdate).length,
      delayed: scholars.filter(s => s.delayed).length,
      completed,
      completionRate: Math.round((completed / (scholars.length || 1)) * 100),
      totalPubs,
      avgProgress: Math.round(scholars.reduce((a, s) => a + s.progressPct, 0) / (scholars.length || 1)),
      scholarsWithPubs: scholars.filter(s => s.publications > 0).length,
      submittingSoon: scholars.filter(s => !s.completed && s.expectedSubmission <= 2027).length
    }
  };
}

window.MILESTONES = MILESTONES;
window.scholarDetail = scholarDetail;
window.scholarCoursework = scholarCoursework;
window.fmtDate = fmtDate;
window.MODEL = buildModel();
