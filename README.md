# Kisip JobPilot

Kisip JobPilot is a dark, responsive job-search command center for discovering, ranking, tracking, and reviewing early-career DevOps opportunities. It targets DevOps, Linux/system administration, and SRE roles while keeping the person applying firmly in control.

> **Kisip JobPilot automates job discovery and tracking, not unauthorized login or automatic application submission.**

## Safe automation model

JobPilot reads only sources you explicitly configure as permitted: official company career feeds, public RSS/JSON feeds, and documented public APIs. LinkedIn, Indeed, and Naukri links can be added manually. It does not log in to job sites, bypass CAPTCHA, scrape protected pages, store job-site credentials, or submit an application. **Every final application is reviewed and submitted manually.**

The initial frontend stores job status, notes, resume metadata, and user settings in the browser's `localStorage`. Discovery data comes through `src/data/jobs.json` and a small data-access layer, making a future Supabase/backend adapter straightforward.

## Features

- Dashboard counters for total, new, saved, applied, interviews, rejected, and offers
- Today/week, high-match, and remote insights plus pipeline charts
- Search, status/work-mode filters, and match/date sorting
- Manual URL entry for company, LinkedIn, Indeed, and Naukri postings
- Save, applied, interview, rejected, offer, edit, delete, and safe external-view actions
- Duplicate detection using normalized company, title, location, and URL
- Resume names, versions, private links, skill tags, and application association
- In-app new/high-match/remote notification summary
- Responsive, accessible dark UI with GitHub Pages-safe hash routing

## Matching

The candidate baseline is **1 year of professional DevOps / Linux / Server Administration experience**, targeting junior and entry-level roles in the 0–2 year range. `src/lib/jobs.js` returns a 0–100 score using role (25), skills (30), experience (20), location (15), remote (5), and job type (5). Preferred 1-year ranges receive full experience credit. Two-year and 2+ year roles remain eligible when skills match strongly. Senior, Lead, Principal, Manager, Architect, Staff Engineer, and 3+ year roles are suppressed. Adjust the editable profile in `src/config/jobPreferences.js`; never put credentials there.

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

Edit `src/data/sources.json`. A source is fetched only when both `enabled` and `permitted` are `true`. The included examples are disabled. JSON feeds must return either an array of normalized-ish jobs or `{ "jobs": [] }`. Each item can provide `title`, `company`, `location`, `experience`, `skills`, `jobType`, `workMode`, `url`, and `notes`.

```json
{
  "name": "Acme public careers API",
  "type": "json",
  "url": "https://careers.acme.example/api/jobs",
  "enabled": true,
  "permitted": true,
  "apiKeyEnv": "JOB_API_KEY"
}
```

Confirm the source's terms and API documentation before enabling it. RSS entries are represented in the configuration UI but require a reviewed feed-specific adapter before the runner will ingest them. This prevents silently mis-parsing or scraping an HTML page.

Run a local scan with `npm run discover`. The pipeline is:

```text
permitted source → fetch → normalize → deduplicate → match score → src/data/jobs.json
```

## Scheduled GitHub Actions

`.github/workflows/discover-jobs.yml` runs at minute 17 every six hours and on manual dispatch. It installs locked dependencies, fetches only enabled/permitted feeds, normalizes jobs, removes duplicates, calculates scores, tests the project, scans for credential-shaped values, and commits only a changed jobs JSON file. Secrets are passed as environment variables and are never printed by the runner.

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
