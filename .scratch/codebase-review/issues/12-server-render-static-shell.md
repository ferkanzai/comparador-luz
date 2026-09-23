# 12 — Server-render the static shell

**What to build:** Render the header, hero, footer and method text as server components, and keep only the interactive workspace as client code. Then evaluate a static, cacheable shell for guests.

**Blocked by:** 11

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

`src/app/page.tsx` is `force-dynamic` and renders the whole page through the client `Dashboard`. Guests get a fully dynamic response even though the page is the same for all of them, and static copy ships as JavaScript.

## Checklist

- [x] Read the Next 16 docs in `node_modules/next/dist/docs/` on server/client composition and Cache Components (partial prerendering) before designing this.
- [x] Server components: header shell, hero, footer, method text. Client islands: sign-out button, tabs and workspace.
- [x] Move the session read and initial workspace read inside a Suspense boundary, so the static shell can be prerendered.
- [x] Coordinate with ticket 06 if CSP nonces require dynamic rendering.
- [x] Measure before and after (JavaScript size for `/`, and TTFB for a guest) and record the numbers under Comments.

## Comments

`cacheComponents: true` is on, and `/` and `/cuenta` are now partial prerenders (◐ in the build output). The build writes a static shell for them. Everything that depends on the request streams in afterwards inside `<Suspense>`. The APIs stay dynamic (ƒ).

**Page structure.** `src/app/page.tsx` is a server component that renders the skip link, `SiteHeader`, `<main>` and `SiteFooter`, all without `"use client"`. Two parts read the request, each inside its own `<Suspense>`:

- **`HeaderActions`** (server): the greeting and `SignOutButton`, or the guest links.
- **`Workspace`** (server): the `?error=` redirect, the session, and the initial workspace read. It renders the client `Dashboard`, with a loading panel as the fallback.

**Shared session read.** `currentUser()` in `src/lib/current-user.ts` is wrapped in React `cache`, so both boundaries share one session read. It calls `headers()` before checking `authConfigured()`. Without that, a build without auth settings bakes the guest links into the static shell.

**What the static shell contains.** The brand, the tagline, the workspace loading panel and the footer. The hero is only shown to guests with no tariffs, so it arrives from `Workspace` as a server-rendered `hero` prop, as does the method text.

**Client context.** `PageProvider` (`page-context.tsx`) holds the feedback message, the error and the method modal. It lets the server-rendered footer (`MethodButton`), `SignOutButton` and `Dashboard` share them without prop drilling through server components.

**Route handlers.** Cache Components rejects the `runtime` and `dynamic` segment configs, so both API routes lost them. They read `request.headers` before checking `authConfigured()`, so a build without auth can't prerender a fixed 401 or 503 response. I used this instead of `connection()`, because `connection()` throws when `tests/accounts.test.ts` calls the handler directly.

**Bug found by the browser suite: lazy views need their own Suspense boundary.** `next/dynamic` without `loading` adds no boundary of its own. Opening a lazily loaded form therefore suspended up to the page's workspace boundary, and the click never committed: no dialog and no fallback. Four signed-in tests caught this. Every `dynamic()` view now has its own boundary: `null` for the dialogs, and a "Cargando tus tarifas…" panel for Mis tarifas, as Mis facturas already had.

**Behaviour changes:**

- `SignOutButton` is no longer disabled while the workspace is busy. It sits outside `Dashboard` now, and signing out mid-save only abandons that save, which also happens when the tab closes.
- The `?error=` redirect to `/cuenta` now happens inside the stream rather than before the first byte. The browser still ends up on `/cuenta?error=invalid-verification` with the explanation.
- `/cuenta` has an empty fallback, because the form needs the query parameters to choose its mode.

**CSP (ticket 06).** The policy has no nonces, so nothing forces dynamic rendering. Adding nonces later would make every page dynamic again and cancel this ticket's gains.

**Measurements.** Local production build (`next start`), guest `/`. JavaScript is the scripts a browser loads for the page. TTFB comes from 40 sequential `curl` requests:

| | JS files | JS raw | JS gzip | HTML raw / gzip | TTFB median / p90 |
| --- | --- | --- | --- | --- | --- |
| Before (after 11) | 10 | 641.6 KB | 193.4 KB | 17.5 / 5.3 KB | 3.1 / 3.6 ms |
| After | 10 | 641.2 KB | 193.4 KB | 23.5 / 6.6 KB | 1.5 / 1.8 ms |

- **JavaScript** is unchanged. Most of it is React, Next and the workspace itself. Ticket 11 had already moved the method copy to the server, so only small client pieces remained to take out.
- **HTML** is 1.3 KB larger gzipped. The streamed parts arrive as extra chunks, and the prerendered shell and the stream each carry some markup.
- **TTFB** halves locally, because the first byte is the static shell rather than a render. The local numbers understate the gain: in production the shell can come from the CDN instead of waiting for a function invocation, a session lookup and a database read.

**Validation.**

- Typecheck, lint, the unit tests (103) and the build pass.
- The browser suite (35) passes. It includes four new tests in `tests/browser/page-shell.spec.ts`:
  - the guest header links stream in, and the method modal opens from the footer;
  - the method modal opens from the comparator's tax settings;
  - `?error=` redirects to `/cuenta` with the explanation;
  - a signed-in user sees the greeting and can sign out.
- The production response carries `x-nextjs-prerender: 1` and `x-nextjs-postponed: 1`.
