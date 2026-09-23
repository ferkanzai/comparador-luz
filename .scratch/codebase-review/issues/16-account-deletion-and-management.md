# 16 — Account deletion and account management

**What to build:** Let signed-in users delete their account and all data, and manage their credentials from inside the app.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete (privacy text awaiting the owner's review)

## Why

A signed-in user can only sign out. There is no way to:

- Delete the account and its data. The database already cascades on user deletion (`001-relational-workspaces.sql:3`, `docs/DATABASE.md`), but nothing in the UI triggers it. GDPR's right to erasure applies to a Spanish consumer app. Today erasure needs a manual database operation.
- Change the password while signed in, or change the email address.
- See or revoke other sessions.

The account page also promises "Tus datos solo están disponibles en tu cuenta", but there's no privacy notice explaining what's stored, where (Neon, EU region per `docs/SETUP.md`), and which email provider is used (Resend).

## Open questions

- Should deletion be in scope now, and should it require a fresh code-by-email confirmation?
- Is a privacy notice page wanted, and who writes its text?

## Checklist (after the decision)

- [x] "Mi cuenta" section with: delete account (Better Auth `deleteUser`, with `sendDeleteAccountVerification` or re-authentication), change password, and optionally change email and a list of sessions.
- [x] Offer "Exportar" before deletion.
- [x] Also remove local browser drafts for that user on deletion.
- [x] Account tests: deletion removes every workspace row (the existing cascade test covers the database side).

## Comments

Decision (user, 2026-09-23): in scope are account deletion with all data, changing the password while signed in, and a privacy notice page. Changing the email address and the session list are out of scope for now. The agent drafts the privacy notice from what the code actually stores (account, workspace tables, sessions, rate-limit rows, Neon EU region, Resend for email); the user reviews the text before release.

**What was done**

- **`/mi-cuenta`** (`src/app/mi-cuenta/page.tsx`, `src/components/account-settings.tsx`) is reached from "Hola, …" in the header. Signed-out visitors are sent to `/cuenta`. It has three sections:
  - **Contraseña.** With a password: current and new password through `changePassword` with `revokeOtherSessions: true`. Accounts that only use codes get a link to create a password instead, through the existing reset flow, which creates the credential when none exists.
  - **Tus datos.** "Descargar mis datos" downloads the saved workspace as the same JSON as the dashboard's "Exportar". Both now use `src/lib/workspace-export.ts`.
  - **Eliminar cuenta.** A confirmation dialog, which suggests downloading first, then Better Auth's `deleteUser` with `sendDeleteAccountVerification`. A new "delete" email variant carries the link, which lasts one hour. Better Auth deletes only when the link is opened with that account's session. The page shows that nothing is deleted until then.
- **Local drafts:** requesting deletion stores the account id in `localStorage`. When `/cuenta?eliminada=1` loads after the deletion, it removes that account's drafts (local and legacy session storage) and says the account was deleted. Without the marker, the URL alone removes nothing.
- **Privacy notice** at `/privacidad`, linked from every footer and from the sign-in card ("Cómo los tratamos"). It's written from what the code stores:
  - account fields, workspace tables, sessions (IP and user agent, 30 days), codes and links, rate-limit counters;
  - the three cookies;
  - Vercel, Neon (EU) and Resend;
  - PVPC fetched on the server without user data;
  - no analytics;
  - rights, with a link to `/mi-cuenta` and a mention of the AEPD.

  A visible banner marks it as a draft. The operator's name and contact are `[placeholders]`.
- Emails: `accountLinkEmail` takes a kind ("verification", "reset" or "delete") instead of a `reset` boolean. The copy is one exhaustive switch, and `pnpm email:preview` now writes a `delete-account` preview.

**Decisions**

- Confirmation by email link, not by password. It works the same for accounts that use codes and accounts with a password, and it proves both control of the mailbox and a live session. The cost is that the link has to be opened in the browser that has the session. The email and the page both say so.
- Changing email and the session list stay out of scope, as decided.

**For the owner**

- Fill in the operator and contact placeholders in `src/app/privacidad/page.tsx`, review the text, then remove the draft banner.

**Validation**

- `tests/accounts.test.ts`: a deletion request sends the email. The link opened without the session doesn't delete. With the session, it redirects to `/cuenta?eliminada=1`, and the user, every workspace table row, sessions and credentials are gone.
- `tests/drafts.test.ts`: only the marked account's drafts are removed, and nothing is removed without a marker.
- `tests/email.test.ts` covers the delete variant.
- New `tests/browser/account-settings.spec.ts`:
  - reaching the page from the header;
  - no axe violations on `/mi-cuenta` or `/privacidad`;
  - wrong and right current password;
  - JSON download;
  - the deletion dialog and the "check your email" state, with the account still there;
  - signed-out redirect;
  - privacy links from the sign-in card and the footer.
- The browser sign-up helper now uses one client IP per test account, so the larger suite stays under the per-IP sign-up limit.
- Desktop and phone screenshots checked.
- `pnpm typecheck`, `pnpm lint`, 106 unit tests and 38 browser tests pass.
