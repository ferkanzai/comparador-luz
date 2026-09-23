# 02 — Load fonts with next/font

**What to build:** Replace the six `@fontsource` CSS imports in `src/app/layout.tsx` with `next/font` (either `next/font/google` or `next/font/local` pointing to the same files), and wire the fonts into the `--display` and `--body` CSS variables.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

`@fontsource` imports load six font files through CSS, with no preload and no size-matched fallback font. Text paints late, and the layout shifts when the fonts arrive. `next/font` self-hosts the fonts, preloads the ones in use and generates a fallback with matching metrics.

## Checklist

- [ ] Read `node_modules/next/dist/docs/` for the `next/font` API in Next 16 before changing anything.
- [ ] Keep the same families and weights: DM Sans 400/500/600 and Manrope 400/600/700.
- [ ] Expose them as CSS variables and set `--display` and `--body` in `globals.css` from those variables.
- [ ] Remove `@fontsource/dm-sans` and `@fontsource/manrope` from `package.json` if they're no longer used.
- [ ] Check the landing, comparison and account pages visually on desktop and phone: no change in appearance.
