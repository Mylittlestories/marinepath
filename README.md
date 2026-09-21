<p align="center"><img src="assets/logo.svg" width="88" alt="MarinePath compass and waves logo"></p>
<h1 align="center">MarinePath</h1>
<p align="center"><strong>Your next chapter, sea or shore.</strong><br>Private career matching for Chief Engineers & Technical Superintendents.</p>
<p align="center"><a href="https://mylittlestories.github.io/marinepath/"><strong>OPEN THE APP →</strong></a> · <a href="https://github.com/Mylittlestories/marinepath/releases">Download a release</a> · <a href="https://github.com/Mylittlestories/marinepath/actions/workflows/pages.yml">Data update status</a></p>

[![Publish site and job data](https://github.com/Mylittlestories/marinepath/actions/workflows/pages.yml/badge.svg)](https://github.com/Mylittlestories/marinepath/actions/workflows/pages.yml)

## No installation. No Python. No local server.

**Open [MarinePath](https://mylittlestories.github.io/marinepath/), import your CV, review the search brief and find your matches.**

The frontend is hosted on **GitHub Pages**. A **Node.js backend job on GitHub Actions** collects public maritime advert data on a schedule. It publishes a compact snapshot alongside the website. Your CV and search preferences stay in your browser during normal matching.

> **Important:** this is scheduled data collection, not a live scraping server. Clicking Search matches the latest published snapshot. It does not trigger a new scrape. The website displays the snapshot timestamp and per-source update status. GitHub may delay scheduled runs; source sites may block requests or change their format. No source is guaranteed to be available.

## What you get

- A calm Harbour theme, dark alternatives and an original compass-and-waves identity.
- CV paste and PDF/TXT import; supported PDF extraction runs locally.
- Chief Engineer and shore-based superintendent tracks, region filters and exclusions.
- Explainable matching: CV evidence, missing requirements and estimated fit—not just keyword counts.
- A–F scoring, with separate listing checks. Scores are not hiring probabilities or eligibility guarantees.
- CV-supported summary and cover-letter drafts; editable before copying or printing.
- Application stages, notes, backup and restore.
- No auto-applications, no required AI key and no GitHub token in the website.

## How the online backend works

```text
Public maritime sources
        ↓  scheduled Node.js collector, GitHub Actions
Compact advert digests + source timestamps/status
        ↓  official GitHub Pages deployment
GitHub Pages website + jobs.json
        ↓
Your browser: CV extraction → local matching → drafts → tracking
```

The collector is scheduled at **17 minutes past every sixth hour (UTC)** and can be run manually. Each source has a bounded time budget. Failed sources can retain their last successful snapshot for up to **72 hours**, clearly labelled; older data is not used. Your browser can fall back to the snapshot embedded in the HTML if its data request fails.

The workflow does **not** need the personal token used to create the repository. It uses GitHub's short-lived built-in workflow token with limited permissions. There is no additional backend hosting account to set up.

### Job sources

| Source | Collection method |
|---|---|
| [Faststream](https://www.faststream.com/jobs) | Public jobs API; separate engineering-title queries |
| [Spinnaker Global](https://spinnaker-global.com/) | Public WordPress job posts; engineering-title filtering |
| [CareerNet](https://www.careernet.gr/aggelies/naftilia) | Superintendent / chief engineer / technical manager searches; up to 3 pages each |
| [Sea Career](https://www.seacareer.com/chief-engineer-jobs/) | Up to 4 chief-engineer category pages plus the superintendent category |
| [MARPRO](https://careers.marpro-group.com/jobs) | First 3 public listing pages and structured advert details |
| [Navis Consulting](https://navis-consulting.com/jobs) | Public listings and the anonymous search form, plus advert details |

We publish a **short advert excerpt and automatically extracted factual signals**, not a full mirror of these websites. Signals can miss qualification alternatives or context. Open the original advert before applying. Original text, company names and marks belong to their respective owners and are not relicensed by this project.

BSM, V.Group and Columbia career pages are also linked in the app as **manual routes**, not extra automated integrations. Coverage is bounded and not exhaustive. No login, CAPTCHA or access restriction is bypassed.

## First search

1. Open the website; no terminal or account is needed to search.
2. Import your CV or paste its text. Inspect extracted PDF text for layout errors.
3. Set target roles, regions and exclusions. Check the visible Search brief.
4. Click **Find my job matches**.
5. Review the evidence and gaps. Save useful jobs, then visit the original listing.

**Try a demo CV** uses a clearly fictional profile. Job data still comes from the published source snapshot; demo results are not invented.

### Preferences are rules, not general language understanding

Examples supported by the local matcher:

- `Greece only` — strict location restriction.
- `Prefer Greece` — soft preference.
- `Shore only` / `Sea-going only` — career-track restriction.
- `Avoid: yachts, LNG` — supported vessel exclusions.

Use **Always exclude** for comma-separated exclusions. Region chips are enforced. `Worldwide / unspecified` deliberately allows unknown locations; turn it off if that is not acceptable. Complex salary, rotation, language, certification and work-right requirements need human review.

## Keep the data current

Repository owners can go to **Actions → Publish site and job data → Run workflow**. Once deployment succeeds, refresh the website. Searching in the app does not run a workflow, and visitors never need a GitHub token.

GitHub scheduled workflows can be delayed and can be disabled after 60 days without repository activity in public repositories. If updates stop, inspect the workflow and re-enable it. See the [official schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). The app flags old source data instead of pretending it is current.

## Downloadable version

The [release ZIP](https://github.com/Mylittlestories/marinepath/releases) includes `index.html` with its release-time snapshot embedded. **Double-click it to use the local tools and match against that snapshot.** No server is required. To get fresh data, use the hosted website or download a newer release. Local-file snapshots do not update themselves. Leads older than 72 hours are excluded, so use the hosted site for current results rather than an old release snapshot.

## Privacy and optional AI

In ordinary operation, the CV, prompts, scoring, drafts and tracking stay in browser storage. GitHub receives normal website requests; collectors receive no personal CV or search input. See [PRIVACY.md](PRIVACY.md).

The default is **not an LLM**. Optional AI in Settings is only for explicitly requested individual re-scoring or cover-letter generation. If used, it sends CV, preferences and job text to your selected OpenAI-compatible provider. Model availability, fees, CORS support and free quotas depend on that provider. An AI key is session-only and excluded from backups. **Never enter a GitHub token in the app.**

Backups contain your CV and application details. Store them privately. Browser storage belongs to the current origin; data from an older local preview does not transfer to GitHub Pages automatically. Use Backup in the old app, then Restore here.

Image-only/scanned PDFs need OCR first. Review extracted text and all generated drafts. Embedded PDF.js has dynamic evaluation disabled; licences are retained in the source and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Development (optional; not required to use the app)

Requires Node.js 22 or newer:

```bash
npm ci
npm run collect    # online public-source refresh
npm run build      # produces index.html and _site/
npm test           # offline unit/structure checks
npx playwright install chromium
npm run test:browser
```

`src/index.template.html` contains the base UI and embedded PDF library. `src/engine.js`, `src/ui.js` and `src/ui.css` are inserted by the build. `scripts/collect.mjs` is the backend. `src/pages-scan.js` is a reference copy of the snapshot-search implementation; the build uses the version embedded in `src/engine.js`.

### Publishing and releases

- Push to `main` → update job data, build and deploy Pages.
- Scheduled/manual workflow → refresh published data without rewriting source history.
- Pull request → unit and browser checks without deployment credentials.
- Push a `v*` tag → create a GitHub release with a downloadable static-app ZIP.
- Pages publishes only `_site/`, not the repository, tests, scripts or credentials.

No long-lived credentials are needed in repository secrets. Do not put tokens, CVs, backups or personal test files into Git history. Read [SECURITY.md](SECURITY.md) before reporting vulnerabilities.

## Credits

Inspired by the [santifer/career-ops](https://github.com/santifer/career-ops) job-search workflow concept. This is a separate browser-based implementation, not the original CLI. Embedded PDF.js is by the Mozilla Foundation and contributors.

**© 2026-DRVsoft** · Application code: MIT · Third-party content/licences remain with their respective owners.
