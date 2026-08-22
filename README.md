# Kisip JobPilot

Kisip JobPilot is a dark, responsive job-search command center for discovering, ranking, tracking, and reviewing early-career DevOps opportunities. It targets DevOps, Linux/system administration, and SRE roles while keeping the person applying firmly in control.

> **Kisip JobPilot automates job discovery and tracking, not unauthorized login or automatic application submission.**

## Safe automation model

JobPilot reads only sources you explicitly configure as permitted: official company career feeds, public RSS/JSON feeds, and documented public APIs. LinkedIn, Indeed, and Naukri links can be added manually. It does not log in to job sites, bypass CAPTCHA, scrape protected pages, store job-site credentials, or submit an application. **Every final application is reviewed and submitted manually.**

The initial frontend stores job status, notes, resume metadata, and user settings in the browser's `localStorage`. Discovery data comes through `src/data/jobs.json` and a small data-access layer, making a future Supabase/backend adapter straightforward.

## Features

- Dashboard counters for total, new, saved, applied, interviews, rejected, and offers
- Today/week, high-match, and remote insights plus pipeline charts
- Immediate case-insensitive search across the indexed title, company, skills, and location fields; status/work-mode filters; and match/date sorting
- Manual URL entry for company, LinkedIn, Indeed, and Naukri postings
- Save, applied, interview, rejected, offer, edit, delete, and safe external-view actions
- Duplicate detection using normalized company, title, location, and URL
- Resume names, versions, private links, skill tags, and application association
- In-app new/high-match/remote notification summary
- Responsive, accessible dark UI with GitHub Pages-safe hash routing

## Matching

The candidate baseline is **1 year of professional DevOps / Linux / Server Administration experience**, targeting junior and entry-level roles in the 0–2 year range. `src/services/matchService.js` returns a 0–100 score using role (25), skills (30), experience (20), location (15), remote (5), and job type (5). Preferred 1-year ranges receive full experience credit. Two-year and 2+ year roles remain eligible when skills match strongly. Senior, Lead, Principal, Manager, Architect, Staff Engineer, and 3+ year roles are suppressed. Adjust the editable profile in `src/config/jobPreferences.js`; never put credentials there.

## Install and run

Requirements: Node.js 20+ and npm.

```bash
git clone <your-repository-url>
cd kisip-jobpilot
npm install
npm run dev
```

Validation and production build:

```bash
npm test
npm run check:secrets
npm run build
npm run preview
```

## Permitted discovery sources

The enabled sources are the documented **Remotive**, **Himalayas**, and **Jobicy** public job APIs. Himalayas uses its current keyword search endpoint (the browse endpoint is capped at 20 records), with DevOps and Cloud Engineer queries. Each result keeps its real source URL and attribution. None of the currently configured sources requires an API key. Remotive is polled at most four times per day, matching its documented usage guidance. The public feed may legitimately contain no currently eligible DevOps jobs; in that case JobPilot displays an empty state and never inserts demo records.

Sources are declared in `src/data/sources.json` and are fetched only when both `enabled` and `permitted` are true. Every adapter must be reviewed against the source documentation. Discovery requires title, company, location, source, and a real HTTPS URL; placeholder or malformed URLs are rejected before storage.

Run `npm run discover` locally. The pipeline is:

```text
permitted API → basic HTTPS validation → normalize → deduplicate → hard-reject only invalid, unrelated, senior, or mandatory 3+ year roles → CV score → rank → src/data/jobs.json
```

LinkedIn, Indeed, and Naukri are manual-link sources only. JobPilot never logs in, scrapes their sites, bypasses CAPTCHA, or submits an application.

## Scheduled GitHub Actions

`.github/workflows/discover-jobs.yml` runs at minute 17 every six hours and on manual dispatch. It installs locked dependencies, fetches only enabled/permitted feeds, normalizes jobs, removes duplicates, calculates scores, tests the project, scans for credential-shaped values, and commits only changed job-data and scan-status JSON files. Secrets are passed as environment variables and are never printed by the runner.

To add an API credential: repository **Settings → Secrets and variables → Actions → New repository secret**, name it `JOB_API_KEY`, and paste the value. Add other secret names only when a feed requires them; reference their environment-variable names in source configuration. Never add a real value to `.env.example`, source, JSON, workflow YAML, README, or a public issue.

## GitHub Pages deployment

The Vite production base is `/kisip-jobpilot/`. If the repository is renamed, update `base` in `vite.config.js`. Hash routing avoids direct-route 404 errors on static hosting.

1. Push the repository with its default branch named `main`.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. The deploy workflow tests, builds, uploads `dist`, and deploys it.

For a project site the result is normally `https://<username>.github.io/kisip-jobpilot/`.

## Security precautions

- `.env` and `.env.*` are ignored; only blank `.env.example` is tracked.
- Frontend environment variables are public after bundling. Never expose privileged API keys through `VITE_*` variables.
- Put server-side/API credentials in GitHub Actions secrets or a secure backend.
- Do not store passwords, session cookies, private resume files, or tokens in this project.
- Manual resume URLs and local state stay in your browser; use appropriately permissioned private links.
- Review feed permissions periodically and pin third-party Action revisions more strictly if your threat model requires it.
- Before release, run `npm run check:secrets` and optionally a dedicated history scanner such as Gitleaks. If a real secret was ever committed, revoke/rotate it immediately; deleting the current file is not sufficient.

## Future backend and notifications

The context/data layer can be replaced with a Supabase repository without changing page workflows. A safe notification worker can later send counts and job URLs through email or Telegram using backend-only secrets. It should remain a notification channel—not an application-submission bot.

## License

Use and adapt this personal dashboard responsibly and in compliance with every source's terms.

## Freshness filters and manual application workflow

The Jobs page calculates **Last 24 Hours** and **Last 7 Days** from the real source `postedAt` timestamp or, when a source has no posted timestamp, the exact `discoveredAt` scan timestamp. Time, role, match, work-mode, location, and source filters can be combined. Search filters only the indexed dataset; it does not query job sites from the browser.

Selecting **Apply** validates and opens the real source URL, records `Application Started`, the click time, and the active resume version in browser-local storage. When you return, JobPilot asks whether you submitted. Only **Yes, Mark Applied** records the application as Applied. JobPilot never logs in or presses a final submit button. The Applications page tracks status, dates, resume, source URL, notes, and follow-up date.
