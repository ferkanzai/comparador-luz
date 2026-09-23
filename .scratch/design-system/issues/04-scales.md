# 04 — Type, spacing and radius scales

**What to build:** Snap the old CSS to one type scale, Tailwind's spacing scale and shadcn's radius scale.

**Blocked by:** 03

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] Type: about 8 steps from Tailwind's scale (`--text-xs` … `--text-4xl`), with display sizes kept as `clamp()`. Each of the 47 font sizes snaps to its nearest step.
- [ ] Spacing: gaps, margins and padding snap to Tailwind's 4px scale (`--spacing`). This also fixes the missing gap under "Fin del período" in the bill form on a phone.
- [ ] Radius: `--radius` with shadcn's `sm`/`md`/`lg`/`xl` derivatives, plus `full` for pills and dots.
- [ ] Before/after screenshots for approval, then update the baselines.
