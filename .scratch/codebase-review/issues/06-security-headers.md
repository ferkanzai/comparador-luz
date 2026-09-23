# 06 — Add a Content-Security-Policy and missing security headers

**What to build:** Add a Content-Security-Policy, a Permissions-Policy, and HSTS for custom domains to the headers in `next.config.ts`.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

**Implementation:** complete

## Why

`next.config.ts` sets only `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`. There's no CSP, so an injected script (for example from a compromised dependency) could send workspace data anywhere. The app has a small surface: same-origin API calls, no third-party scripts, and outbound links only. That makes a strict policy practical.

## Checklist

- [x] Read the Next 16 CSP guide in `node_modules/next/dist/docs/` first. Decide between nonce-based scripts (needs the proxy/middleware and dynamic rendering) and a hash- or `'self'`-based policy. Note the interaction with ticket 12 (static shell).
- [x] Start as `Content-Security-Policy-Report-Only`, check the browser console across all flows (comparison, PVPC, account, email-code sign-in), then enforce it.
- [x] Target: `default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (only if needed); `frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- [x] Add `Permissions-Policy` disabling camera, microphone, geolocation and similar.
- [x] Add `Strict-Transport-Security` if the app will run on a custom domain. Vercel adds it on `*.vercel.app`.
- [x] The browser suite passes with the policy enforced.

## Comments

Implemented in `next.config.ts` without nonces. A nonce policy would force dynamic rendering of every page and rule out ticket 12's static shell. It also wouldn't stop the main threat, because a compromised dependency is bundled and loads as `'self'`. The protection comes from `connect-src 'self'`, `img-src 'self' data: blob:`, `form-action 'self'`, `frame-ancestors 'none'`, `base-uri 'self'` and `object-src 'none'`. `script-src` keeps `'unsafe-inline'` for Next's inline hydration payload, and `style-src` keeps it for React `style` attributes. Development adds `'unsafe-eval'`; production adds `upgrade-insecure-requests` and `Strict-Transport-Security: max-age=63072000`, without `includeSubDomains` so other subdomains of a custom domain aren't affected.

The policy went straight to enforced, with violations checked instead of a report-only phase:

- `tests/browser/strict-test.ts` is an automatic fixture that fails any browser test whose page logs a CSP violation. Both specs use it.
- A new browser test checks the headers on `/cuenta`.
- Separately, PVPC and the code-by-email request ran clean in development. The guest flows, PVPC and `/cuenta` ran clean on a production build (`next start`).
- A deliberately injected image beacon and cross-origin `fetch` were blocked and caught by the listener.

Validation: 28 browser tests pass.
