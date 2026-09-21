# Changelog

## v3.0.0 — GitHub Pages edition

- Dedicated public GitHub Pages app: no Python, installation or local backend.
- Node.js collector runs on GitHub Actions every six hours and on manual request.
- Six maritime sources publish compact advert digests with original links, timestamps and failure status.
- Browser matching, CV extraction, cover-letter drafts and applications stay local by default.
- Embedded job snapshot allows downloaded HTML to work without a server.
- Failed refreshes may retain explicitly labelled data up to 72 hours; older data is excluded.
- Search requests are bounded; offline fallback and Stop retain previous results.
- README, privacy/security policies, tests, deployment workflow and automated release ZIP.

### Known limitations

Searching uses a published snapshot, not a live scrape on every click. GitHub schedules may be delayed or disabled for inactivity. Websites may block collection or change markup. Digests can omit important requirement context. Scanned-image PDFs need OCR. Optional AI depends on a user-configured provider, availability and CORS support.

The short excerpts and factual signals in job snapshots belong to or derive from their original sources; the software licence does not relicense third-party adverts.
