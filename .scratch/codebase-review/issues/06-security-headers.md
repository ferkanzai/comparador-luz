# 06 — Add a Content-Security-Policy and missing security headers

**What to build:** Add a Content-Security-Policy, a Permissions-Policy, and HSTS for custom domains to the headers in `next.config.ts`.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

## Why

`next.config.ts` sets only `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`. There's no CSP, so an injected script (for example from a compromised dependency) could send workspace data anywhere. The app has a small surface: same-origin API calls, no third-party scripts, and outbound links only. That makes a strict policy practical.

## Checklist

- [ ] Read the Next 16 CSP guide in `node_modules/next/dist/docs/` first. Decide between nonce-based scripts (needs the proxy/middleware and dynamic rendering) and a hash- or `'self'`-based policy. Note the interaction with ticket 12 (static shell).
- [ ] Start as `Content-Security-Policy-Report-Only`, check the browser console across all flows (comparison, PVPC, account, email-code sign-in), then enforce it.
- [ ] Target: `default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (only if needed); `frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- [ ] Add `Permissions-Policy` disabling camera, microphone, geolocation and similar.
- [ ] Add `Strict-Transport-Security` if the app will run on a custom domain. Vercel adds it on `*.vercel.app`.
- [ ] The browser suite passes with the policy enforced.
