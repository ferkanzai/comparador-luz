# 02 — Load fonts with next/font

**What to build:** Replace the six `@fontsource` CSS imports in `src/app/layout.tsx` with `next/font` (either `next/font/google` or `next/font/local` pointing to the same files), and wire the fonts into the `--display` and `--body` CSS variables.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

`@fontsource` imports load six font files through CSS, with no preload and no size-matched fallback font. Text paints late, and the layout shifts when the fonts arrive. `next/font` self-hosts the fonts, preloads the ones in use and generates a fallback with matching metrics.

## Checklist

- [x] Read `node_modules/next/dist/docs/` for the `next/font` API in Next 16 before changing anything.
- [x] Keep the same families and weights: DM Sans 400/500/600 and Manrope 400/600/700.
- [x] Expose them as CSS variables and set `--display` and `--body` in `globals.css` from those variables.
- [x] Remove `@fontsource/dm-sans` and `@fontsource/manrope` from `package.json` if they're no longer used.
- [x] Check the landing, comparison and account pages visually on desktop and phone: no change in appearance.

## Comments

Implemented with `next/font/google`: the files are downloaded at build time and served from the app's own domain, so the browser never contacts Google. The build machine needs network access to Google Fonts, which Vercel has. In the browser, all six weights load, and Next adds the "DM Sans Fallback" and "Manrope Fallback" metric-matched faces. Desktop and phone screenshots match the review baseline.
