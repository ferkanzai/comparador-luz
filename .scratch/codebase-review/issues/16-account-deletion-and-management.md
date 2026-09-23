# 16 — Account deletion and account management

**What to build:** Let signed-in users delete their account and all data, and manage their credentials from inside the app.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

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

- [ ] "Mi cuenta" section with: delete account (Better Auth `deleteUser`, with `sendDeleteAccountVerification` or re-authentication), change password, and optionally change email and a list of sessions.
- [ ] Offer "Exportar" before deletion.
- [ ] Also remove local browser drafts for that user on deletion.
- [ ] Account tests: deletion removes every workspace row (the existing cascade test covers the database side).

## Comments

Decision (user, 2026-09-23): in scope are account deletion with all data, changing the password while signed in, and a privacy notice page. Changing the email address and the session list are out of scope for now. The agent drafts the privacy notice from what the code actually stores (account, workspace tables, sessions, rate-limit rows, Neon EU region, Resend for email); the user reviews the text before release.
