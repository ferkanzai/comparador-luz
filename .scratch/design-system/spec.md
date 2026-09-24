# Design system: shadcn tokens and components

Replace the hand-written stylesheet with shadcn/ui (Tailwind v4, the `radix-nova` preset), themed so the app keeps its current look. Supersedes codebase-review ticket 22 (design tokens).

## Decisions (user, 2026-09-23)

- **shadcn as the design system:** its semantic tokens (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, `--chart-1…5`, `--radius`) and its components. Tailwind v4, Radix primitives, `lucide-react` icons.
- **The current look is the theme.** The palette, typefaces (Manrope for display, DM Sans for text) and tone stay. The cost-category colours become chart tokens.
- **In stages, each shippable.** For a while the old stylesheet and Tailwind coexist. The old CSS shrinks as screens move over, and is gone at the end.
- **Visual changes are approved with screenshots.** Every step is compared, before and after, on every screen: desktop (1440×1000) and phone (390×844), as a guest and signed in.

## Decisions for stages 05–07 (user, 2026-09-24)

- **Look: shadcn's nova defaults.** Components keep nova's shapes, sizes, spacing and shadows, in the app's palette. This changes the look noticeably; the screenshot baselines are refreshed per stage and the user reviews the result on the branch's preview. It replaces "the current look is the theme" for everything except colours and fonts.
- **Fonts stay:** Manrope for headings, DM Sans for text (`--font-heading`, `--font-sans`), not nova's Geist.
- **Messages:** `sonner` toasts at the bottom centre for transient messages: confirmations ("Tarifa aplicada…", "Factura añadida…"), save failures, and emails or codes sent. Error toasts stay longer; toasts are announced to screen readers. States that need attention stay on screen as `Alert`: reload required, data failed to load, email verification, estimate warnings. Field errors stay next to their fields.
- **Dialogs: responsive.** From `md` (768px) up, shadcn `Dialog` (and `AlertDialog` for confirmations), centred. Below it, shadcn `Drawer` (bottom sheet, `vaul`) for forms and confirmations alike. Drawers are dismissed by swiping only from the handle; the body scrolls normally; the X, "Cancelar" and the backdrop also close them. Forms open at about 90% of the screen height and scroll inside; confirmations take their natural height, with actions at the bottom. One content component serves both.
- **Stacked dialogs (codebase-review ticket 26) are fixed in stage 06:** creating a tariff from a bill becomes a step inside the bill dialog or drawer, with "Volver a la factura". Closing an edit form opened from a tariff's details returns to the details.
- **Charts stay as they are** (custom SVG, styled through tokens). Moving them to shadcn Chart is a separate future ticket (08), to be tested on its own.
- **Screens are rebuilt as they are** in stage 07: comparison → Mis tarifas → Mis facturas → account and sign-in → header and footer. The first-run redesign (codebase-review ticket 25) comes after, on its own.
- **One branch:** all stages stay on `design-system` and are reviewed on its preview before merging.

## How the two systems coexist

- `globals.css` declares `@layer theme, base, legacy, components, utilities;`. The existing CSS moves into `@layer legacy`: above Tailwind's reset, below its utilities. Old rules still style old markup, and shadcn components aren't overridden by old element rules (`button`, `input`, `h2`…).
- The shadcn tokens are the only colour source. The old CSS uses them through `var(--…)` as soon as stage 1 lands.
- Visual regression: a separate Playwright config (`playwright.visual.config.ts`) with `toHaveScreenshot` baselines of every screen. A step meant to change nothing must pass unchanged. A step that changes the look updates its baselines, and the before/after images go to the user.

## Stages

| #   | Ticket                                                                              | Effort | Status          | Blocked by |
| --- | ----------------------------------------------------------------------------------- | ------ | --------------- | ---------- |
| 01  | [Screenshot baselines of every screen](issues/01-visual-baselines.md)               | S      | completed       |            |
| 02  | [Tailwind v4 and shadcn, with no visible change](issues/02-tailwind-shadcn-init.md) | M      | completed       | 01         |
| 03  | [The current palette as shadcn tokens](issues/03-palette-tokens.md)                 | M      | completed       | 02         |
| 04  | [Type, spacing and radius scales](issues/04-scales.md)                              | M      | completed       | 03         |
| 05  | [Primitives and toasts](issues/05-primitives.md)                                    | M–L    | completed       | 04         |
| 06  | [Responsive dialogs and drawers, without stacking](issues/06-dialogs.md)            | M–L    | completed       | 05         |
| 07  | [Screens one by one, starting with the comparison](issues/07-screens.md)            | L      | completed       | 06         |
| 08  | [Charts on shadcn Chart](issues/08-charts.md)                                       | M      | needs-info      | 07         |
