# 12 — Server-render the static shell

**What to build:** Render the header, hero, footer and method text as server components, and keep only the interactive workspace as client code. Then evaluate a static, cacheable shell for guests.

**Blocked by:** 11

**Status:** ready-for-agent

**Effort:** M

## Why

`src/app/page.tsx` is `force-dynamic` and renders the whole page through the client `Dashboard`. Guests get a fully dynamic response even though the page is the same for all of them, and static copy ships as JavaScript.

## Checklist

- [ ] Read the Next 16 docs in `node_modules/next/dist/docs/` on server/client composition and Cache Components (partial prerendering) before designing this.
- [ ] Server components: header shell, hero, footer, method text. Client islands: sign-out button, tabs and workspace.
- [ ] Move the session read and initial workspace read inside a Suspense boundary, so the static shell can be prerendered.
- [ ] Coordinate with ticket 06 if CSP nonces require dynamic rendering.
- [ ] Measure before and after (JavaScript size for `/`, and TTFB for a guest) and record the numbers under Comments.
