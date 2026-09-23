# 15 — Protect accounts created before email ownership is proven

**What to build:** Make sure that when someone proves they own an email address through the verification link, they don't inherit a password or sessions that someone else set up before that proof.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S–M

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

- [ ] Implement the chosen option, with an account test reproducing the scenario above.
- [ ] Update `docs/SETUP.md` (the "Configure authentication and email" section).

## Comments

Decision (user, 2026-09-23): options 1 and 2 together.

- Set `requireEmailVerification: true`. Password sign-up no longer creates a session until the link is clicked. Update the sign-up copy in `account-form.tsx` ("Ya estás dentro…" in the dashboard banner no longer applies to new password accounts) and the "Reenviar correo" flow.
- When the verification link is clicked for an account that wasn't verified, revoke every other session, for example in `emailVerification.afterEmailVerification`.
- Remaining exposure: the attacker's password still works after the owner verifies. Close it by also sending a "confirma o cambia tu contraseña" reset link after verification, or by clearing the credential when the verifying browser isn't the one that signed up. Pick the simpler one and document it.
- Account test: sign up as A with B's email → B clicks the link → A's session is gone.
