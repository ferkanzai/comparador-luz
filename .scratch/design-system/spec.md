# Design system: shadcn tokens and components

Replace the hand-written stylesheet with shadcn/ui (Tailwind v4, the `radix-nova` preset), themed so the app keeps its current look. Supersedes codebase-review ticket 22 (design tokens).

## Decisions (user, 2026-09-23)

- **shadcn as the design system:** its semantic tokens (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, `--chart-1…5`, `--radius`) and its components. Tailwind v4, Radix primitives, `lucide-react` icons.
- **The current look is the theme.** The palette, typefaces (Manrope for display, DM Sans for text) and tone stay. The cost-category colours become chart tokens.
- **In stages, each shippable.** For a while the old stylesheet and Tailwind coexist. The old CSS shrinks as screens move over, and is gone at the end.
- **Visual changes are approved with screenshots.** Every step is compared, before and after, on every screen: desktop (1440×1000) and phone (390×844), as a guest and signed in.

## How the two systems coexist

- `globals.css` declares `@layer theme, base, legacy, components, utilities;`. The existing CSS moves into `@layer legacy`: above Tailwind's reset, below its utilities. Old rules still style old markup, and shadcn components aren't overridden by old element rules (`button`, `input`, `h2`…).
- The shadcn tokens are the only colour source. The old CSS uses them through `var(--…)` as soon as stage 1 lands.
- Visual regression: a separate Playwright config (`playwright.visual.config.ts`) with `toHaveScreenshot` baselines of every screen. A step meant to change nothing must pass unchanged. A step that changes the look updates its baselines, and the before/after images go to the user.

## Stages

| #   | Ticket                                                                               | Effort | Status          | Blocked by |
| --- | ------------------------------------------------------------------------------------ | ------ | --------------- | ---------- |
| 01  | [Screenshot baselines of every screen](issues/01-visual-baselines.md)                | S      | completed       |            |
| 02  | [Tailwind v4 and shadcn, with no visible change](issues/02-tailwind-shadcn-init.md)  | M      | completed       | 01         |
| 03  | [The current palette as shadcn tokens](issues/03-palette-tokens.md)                  | M      | completed       | 02         |
| 04  | [Type, spacing and radius scales](issues/04-scales.md)                               | M      | completed       | 03         |
| 05  | [Primitives: Button, inputs, Card, Badge, Alert…](issues/05-primitives.md)            | M–L    | needs-triage    | 04         |
| 06  | [Dialogs on shadcn](issues/06-dialogs.md)                                             | M      | needs-triage    | 05         |
| 07  | [Screens one by one, starting with the comparison](issues/07-screens.md)              | L      | needs-triage    | 06         |

Stages 05–07 get their own design pass when 04 is done. The primitives' look and the screen order can change after seeing the tokens in place.
