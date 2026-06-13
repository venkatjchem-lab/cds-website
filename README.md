# Centre for Doctoral Studies — Website

The official website of the **Centre for Doctoral Studies (CDS)**, Malla Reddy
Vishwavidyapeeth — advancing research excellence across Engineering, Sciences,
Management, Pharmacy, Allied Health Sciences, and Humanities.

It is a static website (plain HTML, CSS, and JavaScript — no build step required).

## Running locally

A small helper script serves the site on a local web server:

```bash
python serve.py
```

Then open <http://localhost:3344> in your browser.

> Serving over HTTP (rather than opening the `.html` files directly) ensures
> that relative links, the stylesheet, and the JavaScript search all work the
> same way they do in production.

## Project structure

```
cds-website/
├── index.html              # Home page
├── about.html              # About the Centre
├── programs.html           # Research programs
├── research-areas.html     # Research areas
├── admissions.html         # Admission process
├── eligibility.html        # Eligibility criteria
├── regulations.html        # Ph.D. regulations
├── coursework.html         # Pre-Ph.D. coursework
├── supervisors.html        # Supervisors / guides
├── co-supervisors.html     # Co-supervisors
├── scholars.html           # Research scholars
├── progress.html           # Scholar progress tracker
├── publications.html       # Publications
├── funding.html            # Funding & fellowships
├── forms.html              # Downloadable forms
├── calendar.html           # Academic calendar
├── events.html             # Events
├── notifications.html      # Notifications
├── faq.html                # Frequently asked questions
├── contact.html            # Contact information
├── css/                    # Stylesheets
├── js/                     # Client-side JavaScript (navigation, site search)
├── images/                 # Logos and imagery
├── docs/                   # Regulations, policies, and syllabus PDFs
└── serve.py                # Local development server (port 3344)
```

## Editing

Each page is a self-contained HTML file that shares the common stylesheet in
`css/` and the scripts in `js/`. Edit the relevant `.html` file, then refresh
the local server to see your changes.
