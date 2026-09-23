# 15 — Protect accounts created before email ownership is proven

**What to build:** Make sure that when someone proves they own an email address through the verification link, they don't inherit a password or sessions that someone else set up before that proof.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

**Implementation:** complete

## Why

The configuration in `src/lib/auth.ts:40-59` is:

- `requireEmailVerification: false` and `autoSignIn: true`: password sign-up creates a session immediately, without proving the email address.
- `emailVerification.sendOnSignUp` and `autoSignInAfterVerification: true`.

Possible scenario (account pre-registration):

1. An attacker signs up with the victim's email and a password they choose. They get a 30-day session straight away.
2. The victim receives "confirma tu correo", clicks it, and is signed in to that account.
3. The victim records tariffs and bills. The attacker can read them with their session or their password.

Better Auth 1.7.5 protects the **code-by-email** path: `revokeUnprovenAccountAccess` deletes pre-existing credentials and sessions when a code proves ownership of an unverified account. The **email-link** verification route (`api/routes/email-verification.mjs`) doesn't call it. The email copy does say "Si no has solicitado este correo, puedes ignorarlo", which lowers the risk. The data is household electricity use, not financial credentials.

## Options (decision needed)

1. **Verify before any session:** `requireEmailVerification: true`. Password sign-up sends the link, and nobody can sign in with a password until it's clicked. This stops the attacker's head start. The victim's click would still "confirm" an attacker-chosen password, so combine it with 2.
2. **On link verification, revoke other sessions and ask the verified user to set their password**, for example with an `afterEmailVerification` hook that deletes other sessions and sends a password-reset link.
3. **Accept the risk** and document it.

## Checklist (after the decision)

- [x] Implement the chosen option, with an account test reproducing the scenario above.
- [x] Update `docs/SETUP.md` (the "Configure authentication and email" section).

## Comments

Decision (user, 2026-09-23): options 1 and 2 together.

- Set `requireEmailVerification: true`. Password sign-up no longer creates a session until the link is clicked. Update the sign-up copy in `account-form.tsx` ("Ya estás dentro…" in the dashboard banner no longer applies to new password accounts) and the "Reenviar correo" flow.
- When the verification link is clicked for an account that wasn't verified, revoke every other session, for example in `emailVerification.afterEmailVerification`.
- Remaining exposure: the attacker's password still works after the owner verifies. Close it by also sending a "confirma o cambia tu contraseña" reset link after verification, or by clearing the credential when the verifying browser isn't the one that signed up. Pick the simpler one and document it.
- Account test: sign up as A with B's email → B clicks the link → A's session is gone.

**What was done**

- `src/lib/auth.ts`: `requireEmailVerification: true`, and `autoSignIn` is removed. Password sign-up creates no session, and a sign-up with an address that's already registered gets the same answer as a new one. A password sign-in before verification is refused with `EMAIL_NOT_VERIFIED` and sends a fresh link (`sendOnSignIn`).
- To close the remaining exposure (the attacker's password), I chose to bind the password to the browser that proved it. The reset-link option doesn't close it: the attacker's password keeps working until the owner acts on that email.
  - An after-hook sets a `luz_signup_proof` cookie on a password sign-up, and on a sign-in that fails only with `EMAIL_NOT_VERIFIED`, which is raised after the password has been checked. The cookie is HttpOnly, SameSite=Lax, scoped to `/api/auth`, and lasts one hour, the same as the link (`expiresIn` is now explicit). Its value is the user id plus an HMAC made with `BETTER_AUTH_SECRET` (`src/lib/signup-proof.ts`).
  - `emailVerification.beforeEmailVerification` runs only for accounts that aren't verified yet. It deletes every session of the account. Unless the request carries a valid proof for that user, it also deletes the account's linked credentials, following Better Auth's own `revokeUnprovenAccountAccess` (used on the code path). `autoSignInAfterVerification` then signs in the person who clicked.
  - Opening `/verify-email` clears the cookie.
- If the owner opens the link on another device, they're signed in there. Their password is gone, so they sign in with a code, or set a new password with "He olvidado mi contraseña". Better Auth's reset creates the credential when none exists.
- Copy:
  - After a password sign-up, the form stays on `/cuenta` and says where the link went, and to open it in this browser.
  - The `EMAIL_NOT_VERIFIED` message asks the same.
  - The verification banner no longer says "Ya estás dentro". It only shows now for older sessions that are still unverified.

**Decisions**

- Browser binding over a reset email: it removes the attacker's access with no action from the owner. The cost is that a real user who opens the link on another device has to sign in with a code or set a new password once.
- Sessions of accounts that were still unverified before this change keep working until they expire or the link is clicked. Clicking the link revokes them.

**Validation**

- `tests/accounts.test.ts`:
  - Sign-up returns no session but does return the proof cookie. A sign-in before verification gets 403 `EMAIL_NOT_VERIFIED`. Verifying in the sign-up browser keeps the password.
  - New scenario: someone signs up with the victim's address, and an earlier session is planted. When the victim opens the link without the proof, that session is deleted, the attacker's password gets 401, and the victim's new session works.
- A throwaway script ran the same attack with the new hook removed from the configuration. The attacker's password sign-in got 200 without the hook and 401 with it.
- Browser specs now sign up through a shared `tests/browser/sign-up.ts`. It marks the address verified in the disposable database, then signs in, because the console mailer prints links only on the server.
- A throwaway browser check against the dev server confirmed three things: the sign-up message, no session cookie, and the proof cookie's attributes.
- `pnpm typecheck`, `pnpm lint`, 105 unit tests and 36 browser tests pass.
