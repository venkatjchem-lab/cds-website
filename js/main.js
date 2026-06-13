/* ============================================================
   Centre for Doctoral Studies — Main JS
   ============================================================ */

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const nav    = document.querySelector('.main-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
}

// Active nav link
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.main-nav a, .dropdown-menu a').forEach(link => {
  if (link.getAttribute('href') === currentPage) {
    link.classList.add('active');
    // Also highlight parent dropdown trigger
    const parent = link.closest('.dropdown-menu');
    if (parent) {
      const trigger = parent.previousElementSibling;
      if (trigger) trigger.classList.add('active');
    }
  }
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-question').forEach(b => {
      b.classList.remove('open');
      if (b.nextElementSibling) b.nextElementSibling.classList.remove('open');
    });
    // Toggle clicked
    if (!isOpen) {
      btn.classList.add('open');
      if (answer) answer.classList.add('open');
    }
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Search (basic client-side filter for notifications/forms pages)
const searchInput = document.querySelector('[data-search-input]');
const searchItems = document.querySelectorAll('[data-search-item]');
if (searchInput && searchItems.length) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    searchItems.forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// Site-wide search (header)
const SITE_INDEX = [
  { t: 'Home', u: 'index.html', d: 'Centre for Doctoral Studies — overview', k: 'home main start' },
  { t: 'About the Centre', u: 'about.html', d: 'Vision, mission, governance & office bearers', k: 'about cds directorate research vision mission governance office bearers venkatesan kranti' },
  { t: 'Ph.D. Programs', u: 'programs.html', d: 'Doctoral programs across 8 faculties', k: 'programs faculties departments engineering pharmacy medicine dentistry public health digital management' },
  { t: 'Research Areas', u: 'research-areas.html', d: 'Active research themes & centres', k: 'research areas themes cancer antimicrobial drug delivery ai digital health biomaterials cardiovascular nutrition oral crds mrrc' },
  { t: 'Admission Process', u: 'admissions.html', d: 'How to apply for the Ph.D. programme', k: 'admission apply entrance test interview selection' },
  { t: 'Eligibility Criteria', u: 'eligibility.html', d: 'Who can apply — qualifications & relaxations', k: 'eligibility qualification masters 55 75 percent relaxation' },
  { t: 'Ph.D. Regulations', u: 'regulations.html', d: 'UGC 2022 & MRV 2025 regulations, compliance', k: 'regulations rules ugc mrv duration coursework supervisor thesis viva plagiarism compliance publications' },
  { t: 'Supervisors / Faculty', u: 'supervisors.html', d: 'Approved research supervisors by faculty', k: 'supervisors guides faculty professors' },
  { t: 'Co-Supervisors', u: 'co-supervisors.html', d: 'Co-supervisors from MRV & partner institutions', k: 'co-supervisor co-guide coguide external guide partner institution' },
  { t: 'Research Scholars', u: 'scholars.html', d: '2025 & 2026 batch doctoral scholars', k: 'scholars students phd candidates batch 2025 2026' },
  { t: 'Progress Tracker', u: 'progress.html', d: 'RDC milestone progress per scholar (2026 batch)', k: 'progress tracker rdc milestone review committee timeline status' },
  { t: 'Coursework & Methodology', u: 'coursework.html', d: 'Pre-Ph.D. coursework, courses & exams', k: 'coursework methodology courses credits research ethics biostatistics exam' },
  { t: 'Research Funding', u: 'funding.html', d: 'Funding agencies, grants & fellowships', k: 'funding grants fellowship dbt icmr dst serb csir ugc net jrf wellcome scholarship money' },
  { t: 'Forms & Downloads', u: 'forms.html', d: 'All Ph.D. forms and reference documents', k: 'forms downloads documents noc proposal thesis' },
  { t: 'Academic Calendar', u: 'calendar.html', d: 'Important dates and academic schedule', k: 'calendar dates schedule batch january july' },
  { t: 'Events & Workshops', u: 'events.html', d: 'Workshops, seminars and events', k: 'events workshops seminars conferences' },
  { t: 'Publications', u: 'publications.html', d: 'Scholar publications and achievements', k: 'publications papers journals achievements' },
  { t: 'Notifications', u: 'notifications.html', d: 'Circulars and announcements', k: 'notifications circulars announcements news' },
  { t: 'FAQs', u: 'faq.html', d: 'Frequently asked questions', k: 'faq questions answers help' },
  { t: 'Contact', u: 'contact.html', d: 'Reach the CDS office & office bearers', k: 'contact email phone address office bearers' }
];

const siteSearchInput = document.getElementById('siteSearchInput');
const searchResults = document.getElementById('searchResults');
if (siteSearchInput && searchResults) {
  let matches = [];
  const render = () => {
    const q = siteSearchInput.value.toLowerCase().trim();
    if (!q) { searchResults.classList.remove('open'); searchResults.innerHTML = ''; return; }
    matches = SITE_INDEX.filter(e =>
      (e.t + ' ' + e.d + ' ' + e.k).toLowerCase().includes(q)
    ).slice(0, 8);
    if (!matches.length) {
      searchResults.innerHTML = '<div class="sr-empty">No matches found</div>';
    } else {
      searchResults.innerHTML = matches.map((e, i) =>
        '<a href="' + e.u + '"' + (i === 0 ? ' class="active"' : '') +
        '><div class="sr-title">' + e.t + '</div><div class="sr-desc">' + e.d + '</div></a>'
      ).join('');
    }
    searchResults.classList.add('open');
  };
  siteSearchInput.addEventListener('input', render);
  siteSearchInput.addEventListener('focus', render);
  siteSearchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && matches.length) {
      e.preventDefault();
      window.location.href = matches[0].u;
    } else if (e.key === 'Escape') {
      searchResults.classList.remove('open');
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) searchResults.classList.remove('open');
  });
  const sb = siteSearchInput.closest('.search-box');
  if (sb) { const btn = sb.querySelector('button'); if (btn) btn.addEventListener('click', () => { if (matches.length) window.location.href = matches[0].u; }); }
}

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('[type=submit]');
    btn.textContent = 'Message Sent ✓';
    btn.disabled = true;
    btn.style.background = '#1a7a40';
    setTimeout(() => {
      btn.textContent = 'Send Message';
      btn.disabled = false;
      btn.style.background = '';
      contactForm.reset();
    }, 3000);
  });
}

// Animate numbers in stats bar
function animateNumbers() {
  document.querySelectorAll('.stat-number[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString() + suffix;
      if (current >= target) clearInterval(timer);
    }, 25);
  });
}
const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateNumbers(); observer.disconnect(); }
  }, { threshold: 0.3 });
  observer.observe(statsBar);
}
