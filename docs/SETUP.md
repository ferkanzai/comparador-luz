# Deploy Luz en claro on Vercel

The app now uses Next.js instead of Vite, with Better Auth and PostgreSQL. Anonymous comparisons work without a database. Accounts need a database, an auth secret and email delivery.

## 1. Connect the free database

1. Open your existing `comparador-luz` project in Vercel.
2. Open **Storage → Create Database / Browse Marketplace → Neon**. Choose the **Free** plan and an EU region near your Vercel Functions region (for example Frankfurt).
3. Connect the database to the project. Keep preview/development data in a separate Neon branch/database from production.
4. Confirm the integration created **`DATABASE_URL`**, using the pooled connection string. If it only created prefixed variables, add `DATABASE_URL` yourself with the pooled URL from Neon. Preserve the TLS options in that URL.

Vercel Postgres is now provisioned through Marketplace providers. Neon has a free plan suitable for this personal app; at the time of implementation the published allowance is 0.5 GB storage and 100 CU-hours per project per month. Confirm the Free plan in checkout; a paid plan is not required by this app. Sources: [Vercel Postgres](https://vercel.com/docs/postgres), [Neon integration](https://vercel.com/marketplace/neon), [Neon plan information](https://neon.com/blog/neon-backend-is-ga).

## 2. Configure authentication and email

In **Settings → Environment Variables**, set these for Production:

| Variable             | Value                                            |
| -------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | Pooled Neon connection string                    |
| `BETTER_AUTH_URL`    | `https://comparador-luz-gilt.vercel.app`         |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32`          |
| `RESEND_API_KEY`     | Sending API key from Resend                      |
| `EMAIL_FROM`         | `Luz en claro <cuenta@your-verified-domain.com>` |

Verify a domain you own in [Resend](https://resend.com/docs/send-with-nodejs), including its DNS records, before using it in `EMAIL_FROM`. Vercel's shared `vercel.app` domain is not a domain you can verify for email. Resend's test sender is restricted to your own approved recipient and is not appropriate for public registration. You can change `src/lib/email.ts` to another transactional email service if preferred.

Accounts support both a six-digit email code and email/password. A code verifies the mailbox and creates or signs into the account in one step. Password signup sends a verification link and creates no session: nobody can sign in with a password until the address is confirmed, and a password sign-in before that sends a fresh link. Because anyone can sign up with someone else's address, opening the link signs out every existing session of that account, and keeps the password only when the link opens in the browser that signed up (or that last signed in with the correct password). That browser holds a short-lived, HttpOnly `luz_signup_proof` cookie, signed with `BETTER_AUTH_SECRET`. Opened anywhere else, the link still signs the owner in, but the password is removed; they can sign in with a code or set a new password through "He olvidado mi contraseña". A code sign-in on an unverified account does the same cleanup (Better Auth's own protection). Sessions created before this rule, for accounts that are still unverified, keep working until they expire and show a verification reminder. Password recovery is included. Signed-in users manage their account at `/mi-cuenta`. There they can change the password (other sessions are signed out), request a link to create one if they only use codes, download their data, and delete the account. Deletion emails a confirmation link valid for one hour. It only works when opened in the browser that holds the account's session. Deleting the `user` row cascades to every workspace table, sessions and credentials. That browser's local drafts for the account are removed when it lands on `/cuenta?eliminada=1`. The privacy notice at `/privacidad` describes exactly this storage; update it whenever what the app stores, or who processes it, changes. Sessions are cached for five minutes in a signed cookie, so page loads and workspace reads skip the session table. A revoked session (sign-out elsewhere, password reset, verification cleanup) can still read for up to five minutes, but saves always check the database and stop immediately. Codes expire after 10 minutes, allow five attempts, are single-use and are hashed in the database. **Do not set `EMAIL_MODE=console` in production**: it only works in development. Missing email configuration disables accounts instead of creating users who can never verify their addresses. Vercel background tasks keep email delivery alive after the response. Auth rate limiting uses PostgreSQL, so it works across function instances.

Account emails use React Email for branded HTML and a plain-text alternative generated from the same component; OTP subjects start with the code. Run `pnpm email:preview` to render all six variants into `output/emails/` using synthetic codes and links, without sending email. The shared template lives in `src/emails/account-email.tsx`; `src/lib/email-templates.ts` renders it for delivery. Keep open and click tracking disabled on the transactional sending domain in Resend; styling does not change these domain settings.

For React Email's live editor, run `pnpm email:dev` and open http://localhost:3003. The template supplies a synthetic OTP through `PreviewProps`.

Use the exact canonical domain above when signing in to Production. For Preview, configure a separate database branch, secret and email settings. The app automatically trusts the exact `VERCEL_URL` and `VERCEL_BRANCH_URL` supplied to that preview deployment, overriding any inherited production `BETTER_AUTH_URL`. Signup, verification/reset links and saving data work on both preview URLs; no per-deployment URL edits are needed. Other deployments and arbitrary `*.vercel.app` origins are not trusted.

Keep **Automatically expose System Environment Variables** enabled in Vercel. If system URLs are unavailable, the app falls back to `BETTER_AUTH_URL`; set that to the exact preview origin and redeploy. Custom preview domains also require an explicit configuration change. Environment-variable edits apply to new deployments, so retry on the latest preview after redeploying. Never put credentials in `NEXT_PUBLIC_*` variables. References: [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Better Auth dynamic base URLs](https://www.better-auth.com/docs/reference/options#baseurl).

## 3. Automatic deployment migrations

Vercel runs `pnpm build:vercel` on every deployment. This applies the database schema before building the app:

```sh
pnpm db:migrate && pnpm build
```

The migration creates or updates Better Auth's schema, then applies the app's Drizzle migrations: typed tables, foreign keys, the restricted role and row-level security. The database login needs table ownership and permission to create and grant that role. If the migration fails, the build stops and the new version isn't deployed. Successful schema changes stay applied if the app build fails afterwards. See [the account database](DATABASE.md).

Both Production and Preview deployments migrate the database specified by their own `DATABASE_URL`. Make sure Preview uses its separate Neon branch/database and that the database and auth environment variables are available at build time. A missing database URL fails the deployment rather than silently skipping migrations. Review schema changes for compatibility with the currently deployed app, since migrations run before the new version goes live.

Local `pnpm build` only builds the app. For local account development or a fresh integration-test database, run `pnpm db:migrate` manually with `DATABASE_URL` pointing to that local database.

## 4. Deploy the application

In **Settings → Build and Deployment**, choose **Next.js** as the framework preset. Remove old `dist` output and Vite development-command overrides if present. The checked-in `vercel.json` specifies Next.js, `pnpm build:vercel` and `.next`; its build command takes precedence over the dashboard setting. See [Vercel's build command configuration](https://vercel.com/docs/project-configuration/vercel-json#buildcommand).

Push the reviewed changes to the branch Vercel deploys, or deploy them through your usual Vercel workflow. No production deployment is performed by the local implementation.

Verify these flows on the production domain:

- Anonymous page starts with empty consumption and no sample tariffs.
- Create account with a password → arrive signed in → receive verification email.
- Choose email code → receive a code → enter it → arrive signed in; test both new and existing accounts.
- Add a tariff, mark it as current and enter consumption. Wait for "Guardado en tu cuenta".
- Reload: the data remains. A second account starts empty.
- Change current prices and inspect **Mis tarifas**.
- From the comparator, use **Guardar este período como factura**. Check the period dates, reporting month and real amounts; **Guardar factura** persists immediately. Reload and check the stacked chart and breakdown. Hover, focus or tap a month to inspect it, then switch to **Evolución** for connected monthly totals (missing months remain gaps). Add a credit and check that the total decreases, tax amounts remain unchanged, and the credit survives refresh.
- Add or edit a bill under **Mis facturas** and reload.
- Request a password reset; confirm delivery and successful reset.

## Local development

Node 20.9+ and pnpm are required (a maintained Node LTS version is recommended).

Without `.env.local`, `pnpm dev` runs the guest comparator and shows that accounts are not configured. For local accounts:

```sh
docker run --name comparador-luz-dev-postgres \
  -e POSTGRES_PASSWORD=luz-local-test-only -e POSTGRES_DB=luz_test \
  -p 127.0.0.1:55432:5432 -d postgres:17-alpine
cp .env.example .env.local
```

Edit `.env.local` to use:

```dotenv
DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55432/luz_test
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<generate a random secret>
EMAIL_MODE=console
```

Then run `pnpm db:migrate` and `pnpm dev`. Verification/reset links appear only in the local server terminal. No real email is sent in this mode. Stop the database with `docker stop comparador-luz-dev-postgres`; start it again with `docker start comparador-luz-dev-postgres`.

If port 3000 is occupied, run `pnpm dev --port 3100` and set `BETTER_AUTH_URL=http://localhost:3100` in `.env.local`. The local preview prepared during implementation uses port 3100.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
TEST_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55432/luz_test pnpm test
```

The last command exercises real authentication and account-owned persistence against a disposable local database. It refuses non-local database hosts and databases whose names do not end in `_test`. The tests clean up the users they create and reset the test database's rate-limit records. Without `TEST_DATABASE_URL`, those integration tests are explicitly skipped. Run the same command with `TEST_VERCEL_PREVIEW=deployment` and then `TEST_VERCEL_PREVIEW=branch` to check the account workflow on both preview URLs while simulating an inherited production `BETTER_AUTH_URL`. The schema tests need their own database; see [Integration tests](DATABASE.md#integration-tests). Run database tests sequentially.

## Storage and privacy

Auth uses its standard relational tables. The workspace uses typed tables with account-scoped foreign keys. Every read and write derives ownership from the server session and runs under a restricted database role with transaction-local identity and forced row-level security. See [the account database](DATABASE.md). Workspaces are limited to 100 offers, 500 historical periods and 1,200 bills.

Guests' comparisons are saved in this browser's `localStorage`. On sign-in they move into the account once: consumption, offers and, if the account has none, the current tariff. An existing account contract, history and bills are kept. Signed-in changes save automatically, one action at a time, with no save button. The screen updates at once. If a save fails or is refused, a message explains why and the screen goes back to the account's copy. When the same account is used on several devices, each record keeps the last version saved. **Exportar** (home page, guests) and **Descargar mis datos** (Mi cuenta) download a JSON copy for personal backups; it doesn't include passwords or sessions. This version does not import backups or automatically discover offers.

Price confirmation buttons appear only on tariffs without a confirmation date. Bulk confirmation fills missing dates and preserves all existing dates, even from previous days.
