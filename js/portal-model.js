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

const COURSES = [
  ['Research Methodology', 4], ['Research & Publication Ethics', 2],
  ['Advanced Statistics', 3], ['Domain Elective I', 4], ['Domain Elective II', 4]
];
const GRADES = ['O', 'A+', 'A', 'B+'];

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

/* ---- build one scholar's synthetic record ---- */
function buildScholar(raw, idx) {
  const rnd = mulberry32(hashStr(raw.n + raw.g));
  const fullTime = raw.m === 'Full-Time';

  const years = 1 + Math.floor(rnd() * 5);            // 1..5 years enrolled
  const enrolledYear = 2026 - years;
  const pace = fullTime ? 1.45 : 1.0;
  const expectedStage = Math.min(7, years * pace);
  const jitter = rnd() * 2.6 - 0.7;                    // can be ahead or behind
  let stage = Math.round(expectedStage - jitter);
  stage = Math.max(0, Math.min(7, stage));

  const completed = stage === 7;
  let progressPct = completed ? 100
    : Math.min(98, Math.round((stage / 7) * 100 + rnd() * 9));

  // update recency — ~16% have gone quiet (>90 days)
  let dAgo;
  if (rnd() < 0.16) dAgo = 95 + Math.floor(rnd() * 140);
  else dAgo = Math.floor(Math.pow(rnd(), 1.8) * 75);
  const lastUpdate = daysAgo(dAgo);
  const noUpdate = dAgo > 90 && !completed;

  const publications = Math.max(0, Math.round((stage / 7) * (1 + rnd() * 4.5)));
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
    cw: raw.cw || null,
    _rnd: hashStr(raw.n + raw.g)
  };
}

/* ---- per-scholar detail (lazy, seeded) ---- */
function scholarDetail(s) {
  const rnd = mulberry32(s._rnd);
  const milestones = MILESTONES.map((m, i) => {
    let status = i < s.stage ? 'done' : i === s.stage ? 'current' : 'upcoming';
    if (s.completed) status = 'done';
    const offset = (s.stage - i) * (s.mode === 'Full-Time' ? 130 : 200);
    const date = status === 'done' ? fmtDate(daysAgo(offset + Math.floor(rnd() * 40)))
      : status === 'current' ? 'In progress'
      : 'Expected ' + (NOW.getFullYear() + Math.ceil((i - s.stage) / 2));
    return { name: m, status, date };
  });

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

  const coursework = s.cw
    ? s.cw.map(c => ({ name: c.n, status: c.s }))   // real status-only coursework (e.g. July 2025 batch)
    : COURSES.map((c, i) => {
        const done = i < Math.min(COURSES.length, s.stage + 2);
        return { name: c[0], credits: c[1], grade: done ? pick(rnd, GRADES) : '—',
          status: done ? 'Completed' : 'Pending' };
      });

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
  const scholars = (window.RAW_SCHOLARS || []).map(buildScholar);

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
    faculties: Object.values(faculties).sort((a, b) => b.count - a.count),
    supervisors: Object.values(supervisors),
    stats: {
      total: scholars.length,
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
window.fmtDate = fmtDate;
window.MODEL = buildModel();
