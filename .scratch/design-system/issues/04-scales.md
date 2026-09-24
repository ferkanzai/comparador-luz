# 04 — Type, spacing and radius scales

**What to build:** Snap the old CSS to one type scale, Tailwind's spacing scale and shadcn's radius scale.

**Blocked by:** 03

**Status:** completed

**Effort:** M

## Checklist

- [x] Type: about 8 steps from Tailwind's scale (`--text-xs` … `--text-4xl`), with display sizes kept as `clamp()`. Each of the 47 font sizes snaps to its nearest step.
- [x] Spacing: gaps, margins and padding snap to Tailwind's 4px scale (`--spacing`). This also fixes the missing gap under "Fin del período" in the bill form on a phone.
- [x] Radius: `--radius` with shadcn's `sm`/`md`/`lg`/`xl` derivatives, plus `full` for pills and dots.
- [x] Before/after screenshots for approval, then update the baselines.

## Comments

Implemented (2026-09-24), approved from before/after screenshots:

- **Type:** `@theme static` defines 12 steps: `3xs` 10, `2xs` 11, `xs` 12, `xs-plus` 13, `sm` 14, `sm-plus` 15, `base` 16, `lg` 18, `xl` 20, `2xl` 24, `3xl` 30, `4xl` 36px. The 47 sizes snap to the nearest step (ties round up). The hero and account headlines keep their `clamp()`. The 10px and 13px steps were added after a first pass wrapped the Mis tarifas actions and the phone eyebrows.
- **Spacing:** 652 margin, padding and gap values use `calc(var(--spacing) * n)` on Tailwind's grid: 2px steps to 16px, then 4px. 1px hairlines stay.
- **Radius:** `--radius-sm/md/lg/xl/2xl` = 4/8/12/16/24px, replacing shadcn's multiples of `--radius` (now 12px). 65 radii snap to it; circles stay `50%`.
- The scales live in `@theme static`, because `@theme inline` doesn't emit variables that the legacy CSS can use.
- **Phone bill form gap:** the dialog's spacing rules targeted its direct children, but the bill form wraps its fields in a `<fieldset>`. The rules now reach through it.
- Checks: 41 browser tests, typecheck, lint; baselines rewritten and matching in strict mode.
