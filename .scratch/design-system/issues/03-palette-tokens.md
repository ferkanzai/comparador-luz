# 03 — The current palette as shadcn tokens

**What to build:** Map the app's colours to shadcn's semantic tokens, and make the old CSS use only those tokens.

**Blocked by:** 02

**Status:** completed

**Effort:** M

## Checklist

- [x] Group the 166 raw hex colours by use and by near-identity (for example `#a3342b` and `#a02d28`). Map them to shadcn tokens (`--background` from the paper tone, `--primary` from the green, `--destructive`, `--muted-foreground`, `--border`, `--ring`…), the cost categories to `--chart-1…4`, and anything shadcn has no slot for (lime highlight, success, warning) to a few extra tokens exposed through `@theme inline`.
- [x] Replace every raw colour in the old CSS with a token.
- [x] Before/after screenshots of each changed screen for approval, then update the baselines.

## Comments

Implemented (2026-09-23):

- The 157 raw colours in the legacy CSS map to 42 tokens: shadcn's (`--background` paper, `--foreground` ink, `--primary` green, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1…5`), plus the roles shadcn has no slot for: `--primary-hover`, `--muted-strong`, `--border-soft`, `--border-accent`, `--destructive-hover/-muted/-border`, `--success(-muted/-border)`, `--warning(-strong/-muted/-border)`, `--caution`, `--lime`, `--brand-leaf`, `--inverse(-hover/-foreground/-muted)` for dark panels, `--chart-5-soft`, `--chart-credit`, and `--period-1…3` for the energy periods. All are exposed to Tailwind through `@theme inline`. Alpha colours use `color-mix()` on the token.
- The mapping was by role, with perceptual distance (OKLab) as a guide. Where the nearest colour crossed roles (a muted label landing on "success"), the role won.
- **Visible changes** (approved by the user): every screen changes in under 1% of its pixels. The energy-period dots in the profile now use the consumption chart's colours, with P3 darkened (`#a9c25a`) so it's visible; form labels are slightly darker; some tints and hovers merged. The hero accent keeps its original green (`--brand-leaf: #65823a`), and the logo dot darkens slightly to match.
- `VISUAL_STRICT=1 pnpm test:visual` compares pixel for pixel. The default comparison ignores small colour shifts, so colour work must be reviewed in strict mode, and baselines rewritten with `--update-snapshots=all`.
- Checks: strict visual (25 identical after the update), 41 browser tests including the axe contrast audits, typecheck, lint.
