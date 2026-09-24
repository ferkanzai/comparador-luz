# 05 — Primitives and toasts

**What to build:** Replace the shared visual pieces with shadcn components in nova's style, and transient messages with `sonner` toasts.

**Blocked by:** 04

**Status:** ready-for-agent

**Effort:** M–L

## Checklist

- [ ] Add shadcn `button`, `input`, `label`, `field`, `select`, `checkbox`, `textarea`, `toggle-group`, `badge`, `alert`, `card`, `separator`, `empty`, `sonner`. Read each added file and keep the project's `lucide-react` icons.
- [ ] Buttons: `.button primary` → `Button`; `.button secondary` → `variant="outline"` or `"secondary"`; dark buttons → `variant` "inverse" (added to the Button variants, on `--inverse`); `.icon-button` → `size="icon"` (destructive ones `variant="ghost"` with destructive text); `.link-button`/`.text-link` → `variant="link"`. Icons use `data-icon`.
- [ ] Inputs: `ui.tsx`'s `Field` becomes a wrapper on `Field` + `FieldLabel` + `Input`/`InputGroup` (units such as "€/kWh" as `InputGroupAddon`), keeping its props, validation (`data-invalid`, `aria-invalid`) and decimal-comma behaviour. Selects, checkboxes, the textarea and segmented toggles (`ToggleGroup`) follow.
- [ ] Tags and chips (`comparison-tag`, finalist chips) → `Badge`. `Empty` → shadcn `Empty`.
- [ ] Toasts: `<Toaster position="bottom-center" />` in the layout. `FeedbackNotice` and the page's `message`/`error` become `toast.success` / `toast.error` (errors last longer). Save failures from `use-workspace` and "email/code sent" messages become toasts too.
- [ ] Alerts: the reload-required notice, load failures, the email-verification banner, `EstimateNotice` and other persistent `.notice` blocks → `Alert` (`variant="destructive"` for errors).
- [ ] Delete the legacy rules the replaced markup no longer uses.
- [ ] Update browser tests that relied on notice markup (toasts are `role="status"` in a region, not inline). Visual baselines refreshed; screenshots reviewed on the preview.
