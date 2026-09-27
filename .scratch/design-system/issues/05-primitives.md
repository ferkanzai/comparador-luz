# 05 — Primitives and toasts

**What to build:** Replace the shared visual pieces with shadcn components in nova's style, and transient messages with `sonner` toasts.

**Blocked by:** 04

**Status:** completed

**Effort:** M–L

## Checklist

- [x] Add shadcn `button`, `input`, `label`, `field`, `select`, `checkbox`, `textarea`, `toggle-group`, `badge`, `alert`, `card`, `separator`, `empty`, `sonner`. Read each added file and keep the project's `lucide-react` icons.
- [x] Buttons: `.button primary` → `Button`; `.button secondary` → `variant="outline"` or `"secondary"`; dark buttons → `variant` "inverse" (added to the Button variants, on `--inverse`); `.icon-button` → `size="icon"` (destructive ones `variant="ghost"` with destructive text); `.link-button`/`.text-link` → `variant="link"`. Icons use `data-icon`.
- [x] Inputs: `ui.tsx`'s `Field` becomes a wrapper on `Field` + `FieldLabel` + `Input`/`InputGroup` (units such as "€/kWh" as `InputGroupAddon`), keeping its props, validation (`data-invalid`, `aria-invalid`) and decimal-comma behaviour. Selects, checkboxes, the textarea and segmented toggles (`ToggleGroup`) follow.
- [x] Tags and chips (`comparison-tag`, finalist chips) → `Badge`. `Empty` → shadcn `Empty`.
- [x] Toasts: `<Toaster position="bottom-center" />` in the layout. `FeedbackNotice` and the page's `message`/`error` become `toast.success` / `toast.error` (errors last longer). Save failures from `use-workspace` and "email/code sent" messages become toasts too.
- [x] Alerts: the reload-required notice, load failures, the email-verification banner, `EstimateNotice` and other persistent `.notice` blocks → `Alert` (`variant="destructive"` for errors).
- [x] Delete the legacy rules the replaced markup no longer uses.
- [x] Update browser tests that relied on notice markup (toasts are `role="status"` in a region, not inline). Visual baselines refreshed; screenshots reviewed on the preview.

## Comments

Implemented (2026-09-24):

- shadcn components added: button, input, label, field, native-select, checkbox, textarea, toggle-group, badge, alert, card, separator, empty, sonner, input-group. The CLI imported `cn` from an unrelated npm package again and wired Sonner to `next-themes`; both fixed (`@/lib/utils`, light-only Toaster), and both packages removed.
- **Buttons** (62, converted by a JSX-aware script): primary → default, secondary → `outline`, dark → new `inverse` variant, danger → `destructive`, `small-button` → `sm`, icon buttons → `ghost`/`icon` (delete icons turn red on hover only), text buttons and links → `link` with a new `inline` size. Links styled as buttons use `asChild`.
- **Controls:** `Field` (24 uses) is rebuilt on shadcn `Field` + `InputGroup` with the same props, keeping the `field` class as a layout hook. Selects use `NativeSelect`, not the Radix `Select`, so phones keep the native picker and tests keep `selectOption`. Checkboxes (10) use Radix `Checkbox` inside their labels. The segmented controls are `ToggleGroup`s: a muted track with the chosen option raised on a card. They're radios now, so three tests look for `radio` instead of `button`.
- **Messages:** `notify()` and `useFeedback()` show `sonner` toasts at the bottom centre (`containerAriaLabel="Avisos"`, close button, errors 12 s). The page context's `setMessage`/`setError` and account save failures use them. Sign-in errors stay inline as an `Alert`. Persistent notices (reload, load failure, verification, reconciliation, rule messages, estimate warnings) are `Alert`s; ones without a role get `role="note"` rather than shadcn's default `alert`.
- Tags → `Badge` (lime "Menor coste", warning "Cargos estimados"). `Empty` → shadcn `Empty`, title still an `h3`.
- **Legacy CSS:** 184 rules for classes no longer in the source were deleted, plus the element rules that fought converted controls (`.auth-label input`, `.segmented button`).
- Known: in `VISUAL_STRICT` mode the phone profile dialog varies by a few anti-aliased pixels between runs; the default comparison is stable. The dialog is replaced in 06.
- Checks: 91 unit tests, 41 browser tests (CSP-clean with sonner), typecheck, lint, baselines refreshed.
