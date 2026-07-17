# mockups

Password-gated design mockups served at https://mockups.jonsims.net via GitHub Pages.

| Path | Mockup |
|---|---|
| `/doug/` | SARIMA website redesign concept (dynamic single-page mockup) |
| `/generator/` | The Generator (Babson AI lab) full-site redesign mock-up, 13 pages |

Static only — no backend. Each mockup carries a lightweight client-side password gate
(SHA-256 hash check; content is not secret, the gate just keeps casual traffic out).

## Infrastructure notes

- `mockups.jonsims.net` is a **Cloudflare-proxied** (orange cloud) CNAME to `jonsims.github.io`.
  HTTPS is terminated by Cloudflare's edge cert; GitHub Pages never issued its own cert for this
  domain (issuance stalled 2026-07-10, and while proxied it never will — GitHub can't see the CNAME).
  **Do not switch the record to DNS-only** without re-provisioning the GitHub Pages certificate first,
  or HTTPS breaks.
- The gate requires a secure context (`crypto.subtle`), so `app.js` self-redirects http → https.
