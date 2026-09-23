# Codebase review — September 2026

Review of performance, architecture, composition, design, security, account and email flows, SQL migrations, and a browser pass (guest mode, desktop 1440×1000 and phone 390×844). Written against the working tree on top of `d18a33e`.

**Effort:** S = under 2 hours · M = half a day to 2 days · L = several days.

## Baseline

- `pnpm typecheck` and `pnpm lint` pass.
- `pnpm test`: 79 passed, 2 skipped (the skipped ones need a disposable local database).
- Browser pass, guest: axe (WCAG 2.1 AA) reported no stable violations on the landing, comparison and sign-in pages. Visible focus rings work.
- Browser pass, signed in (throwaway local Postgres, migrated from scratch with `pnpm db:migrate`): password sign-up, code-by-email request, Mis tarifas, Mis facturas, the bill form and a two-device save conflict. Axe reported no violations on Mis tarifas or Mis facturas. Development emails rendered correctly (verification link valid for 1 hour, code in the subject).
- Screenshots and the throwaway review scripts are in `output/review/` (ignored by git).



## Tickets


| #   | Ticket                                                                                                       | Area                      | Effort | Status          | Blocked by |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------- | ------ | --------------- | ---------- |
| 01  | [Reuse number and date formatters](issues/01-reuse-intl-formatters.md)                                       | Performance               | S      | completed       |            |
| 02  | [Load fonts with next/font](issues/02-load-fonts-with-next-font.md)                                          | Performance               | S      | completed       |            |
| 03  | [Validate the workspace once per save and align size limits](issues/03-validate-once-and-align-limits.md)    | Performance               | S      | completed       |            |
| 04  | [Exhaustive sync status and an actionable "invalid" message](issues/04-exhaustive-sync-status.md)            | Architecture, Design      | S      | completed       |            |
| 05  | [Centralize regulated rates](issues/05-centralize-regulated-rates.md)                                        | Architecture              | S–M    | completed       |            |
| 06  | [Add a Content-Security-Policy and missing security headers](issues/06-security-headers.md)                  | Security                  | S–M    | completed       |            |
| 07  | [Move workspace changes into tested actions (fixes the 101st-tariff bug)](issues/07-workspace-actions.md)    | Architecture              | M      | completed       |            |
| 08  | [One confirmation dialog for destructive actions](issues/08-confirm-dialog.md)                               | Composition, Design       | S–M    | completed       | 07         |
| 09  | [Extract shared tariff display components](issues/09-shared-tariff-display.md)                               | Composition               | S      | completed       |            |
| 10  | [Numeric placeholders that don't look like values](issues/10-numeric-placeholders.md)                        | Design                    | S      | completed       |            |
| 11  | [Split the Dashboard component](issues/11-split-dashboard.md)                                                | Composition               | M      | completed       | 04         |
| 12  | [Server-render the static shell](issues/12-server-render-static-shell.md)                                    | Performance               | M      | completed       | 11         |
| 13  | [Give TariffForm explicit modes and sections](issues/13-tariff-form-modes.md)                                | Composition               | M      | completed       | 09         |
| 14  | [Cache sessions in a signed cookie](issues/14-session-cookie-cache.md)                                       | Performance, Security     | S      | completed       |            |
| 15  | [Protect accounts created before email ownership is proven](issues/15-unproven-account-access.md)            | Security, Accounts        | S–M    | completed       |            |
| 16  | [Account deletion and account management](issues/16-account-deletion-and-management.md)                      | Accounts, Privacy         | M      | completed       |            |
| 17  | [Rate-limit workspace saves](issues/17-rate-limit-workspace-saves.md)                                        | Security                  | S      | completed       |            |
| 18  | [Replace the hand-written migration runner](issues/18-migration-runner.md)                                   | Migrations                | M      | completed       |            |
| 19  | [Write a migration compatibility policy](issues/19-migration-compatibility-policy.md)                        | Migrations                | S      | completed       |            |
| 20  | [One field registry for tariff, bill and profile storage](issues/20-field-registry.md)                       | Architecture, Migrations  | M      | completed       | 18         |
| 21  | [Cut per-keystroke work in the sync layer](issues/21-sync-per-keystroke-cost.md)                             | Performance               | S–M    | ready-for-agent |            |
| 22  | [Design tokens and a type scale in the stylesheet](issues/22-design-tokens.md)                               | Design                    | M–L    | ready-for-agent |            |
| 23  | [Comparison table scrolling on desktop and phone](issues/23-comparison-table-scrolling.md)                   | Design                    | M      | ready-for-agent |            |
| 24  | [Zero-value lines in cost breakdowns](issues/24-zero-value-breakdown-lines.md)                               | Design                    | S      | ready-for-agent |            |
| 25  | [Guest first-run screen](issues/25-guest-first-run.md)                                                       | Design                    | S      | needs-triage    |            |
| 26  | [Avoid stacked dialogs](issues/26-stacked-dialogs.md)                                                        | Design                    | M      | needs-triage    | 07         |
| 27  | [Record why the current contract lives in the offers list (ADR-0001)](issues/27-current-contract-storage.md) | Architecture              | S      | ready-for-agent |            |
| 28  | [Send only changes instead of the whole workspace on each save](issues/28-delta-sync.md)                     | Performance, Architecture | L      | needs-triage    | 03, 07     |
| 29  | [Keep hints out of form labels in the account form](issues/29-account-form-label-hints.md)                   | Accounts, Accessibility   | S      | completed       |            |




## Suggested order

1. Quick, independent wins: 01, 02, 03, 04, 05, 06, 09, 10, 17, 29. All implemented, one commit each.
2. 07 (fixes a real bug and unblocks 08 and 26), then 08. Both implemented.
3. 11, then 12. Then 13. All implemented.
4. Migrations: 19 (policy), 18, then 20. All implemented. The owner approved the policy for 19 in `docs/DATABASE.md`.
5. Security and accounts: 15 first (it's the only security finding with a realistic abuse path), then 14 and 16. All implemented, including the owner-approved privacy notice for 16.
6. Design follow-ups: 23, 24, 27. Then a design session and an ADR for 28 before any code.



## Considered and rejected

- **Memoizing the comparison rows.** Calculating 100 tariffs takes about 0.35 ms.
- **A React context for the workspace.** Props only pass down two levels.
- **PVPC upstream payload size.** Each ESIOS day is about 2.6 KB, so the 31 cached fetches are cheap. The CDN also caches the route for an hour.
- **Email bombing through the code-by-email endpoint.** Limited to 3 per minute per IP by the database-backed rate limiter. That's acceptable for this app.
- **Code-by-email sign-in taking over an unverified account.** Better Auth 1.7.5 already strips pre-existing passwords and sessions on this path (`revokeUnprovenAccountAccess`). Ticket 15 covers the email-link path, which doesn't.
- **SQL injection in** `workspace-records.ts`**.** Identifiers come from fixed allowlists and values are always parameters.
- **A mobile colour-contrast failure on the landing page.** It appeared once and didn't reproduce, so it was probably captured mid-animation.

