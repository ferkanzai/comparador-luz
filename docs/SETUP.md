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

Accounts support both a six-digit email code and email/password. A code verifies the mailbox and creates or signs into the account in one step. Password signup immediately creates a session and sends a verification email; unverified users can use their own workspace, with a verification reminder. Password recovery is included. Codes expire after 10 minutes, allow five attempts, are single-use and are hashed in the database. **Do not set `EMAIL_MODE=console` in production**: it only works in development. Missing email configuration disables accounts instead of creating users who can never verify their addresses. Vercel background tasks keep email delivery alive after the response. Auth rate limiting uses PostgreSQL, so it works across function instances.

Use the exact canonical domain above when signing in to Production. For Preview, configure a separate database branch, secret and email settings. The app automatically trusts the exact `VERCEL_URL` and `VERCEL_BRANCH_URL` supplied to that preview deployment, overriding any inherited production `BETTER_AUTH_URL`. Signup, verification/reset links and saving data work on both preview URLs; no per-deployment URL edits are needed. Other deployments and arbitrary `*.vercel.app` origins are not trusted.

Keep **Automatically expose System Environment Variables** enabled in Vercel. If system URLs are unavailable, the app falls back to `BETTER_AUTH_URL`; set that to the exact preview origin and redeploy. Custom preview domains also require an explicit configuration change. Environment-variable edits apply to new deployments, so retry on the latest preview after redeploying. Never put credentials in `NEXT_PUBLIC_*` variables. References: [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Better Auth dynamic base URLs](https://www.better-auth.com/docs/reference/options#baseurl).

## 3. Automatic deployment migrations

Vercel runs `pnpm build:vercel` on every deployment. This applies the database schema before building the app:

```sh
pnpm db:migrate && pnpm build
```

No manual migration is required for deployment, including the first deployment. The migration creates or updates Better Auth's schema using the installed version's migration API and creates the account-owned `workspace` table if needed. If it fails, the build stops and the new version is not deployed. Successful schema changes remain applied if the subsequent application build fails.

Both Production and Preview deployments migrate the database specified by their own `DATABASE_URL`. Make sure Preview uses its separate Neon branch/database and that the database and auth environment variables are available at build time. A missing database URL fails the deployment rather than silently skipping migrations. Review schema changes for compatibility with the currently deployed app, since migrations run before the new version goes live.

Local `pnpm build` only builds the app. For local account development or a fresh integration-test database, run `pnpm db:migrate` manually with `DATABASE_URL` pointing to that local database.

## 4. Deploy the application

In **Settings → Build and Deployment**, choose **Next.js** as the framework preset. Remove old `dist` output and Vite development-command overrides if present. The checked-in `vercel.json` specifies Next.js, `pnpm build:vercel` and `.next`; its build command takes precedence over the dashboard setting. See [Vercel's build command configuration](https://vercel.com/docs/project-configuration/vercel-json#buildcommand).

Push the reviewed changes to the branch Vercel deploys, or deploy them through your usual Vercel workflow. No production deployment is performed by the local implementation.

Verify these flows on the production domain:

- Anonymous page starts with empty consumption and no sample tariffs.
- Create account with a password → arrive signed in → receive verification email.
- Choose email code → receive a code → enter it → arrive signed in; test both new and existing accounts.
- Add a tariff, mark it as current, enter consumption and click **Guardar cambios**.
- Reload: the data remains. A second account starts empty.
- Change current prices and inspect **Mis tarifas**.
- From the comparator, use **Guardar este periodo como factura**. Check the period dates, reporting month and real amounts; **Guardar factura** persists immediately. Reload and check the stacked chart and breakdown. Hover, focus or tap a month to inspect it, then switch to **Evolución** for connected monthly totals (missing months remain gaps). Add a credit and check that the total decreases, tax amounts remain unchanged, and the credit survives refresh.
- Add or edit a bill under **Mis facturas** and reload without clicking **Guardar cambios**.
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

The last command exercises real authentication and account-owned persistence against a disposable local database. It refuses non-local database hosts and databases whose names do not end in `_test`. The test cleans up the users it creates and resets the test database's rate-limit records. Without `TEST_DATABASE_URL`, that integration test is explicitly skipped. Run the same command with `TEST_VERCEL_PREVIEW=deployment` and then `TEST_VERCEL_PREVIEW=branch` to check the entire account workflow on both preview URLs while simulating an inherited production `BETTER_AUTH_URL`. Run these database tests sequentially.

## Storage and privacy

Auth uses its standard relational tables. Each account has one validated JSONB workspace (profile, offers, tariff snapshots and bills), with a foreign key to its user. Every read/write derives ownership from the server session; request data cannot select a different user. Versioned saves reject stale tabs with HTTP 409. Workspaces are limited to 1 MB, 100 offers, 500 historical changes and 1,200 bills.

Tariff and comparison edits are saved with **Guardar cambios**. Explicit price-review confirmations save immediately for signed-in users. Creating, editing or deleting a bill saves immediately; the editor waits for server confirmation and retains the draft on failure. These saves also persist the current comparison workspace. Network failures retain the visible draft. Comparison drafts are backed up in sessionStorage, scoped to the signed-in account or guest, and survive refresh/navigation within the same tab. On sign-in, guest consumption and offers are recovered alongside saved tariffs; an existing account contract, history and bills are preserved. Use **Guardar cambios** to persist this recovered comparison in the account. Closing the tab can clear this temporary copy; export or save first. If another tab/device has saved a newer version, the stale draft cannot overwrite it; the UI offers export and loading the account version. Navigation warns only when the browser cannot store a draft. Export downloads a JSON copy for personal backups, including unsaved edits; it does not include passwords or sessions. This version does not import backups or automatically discover offers.
