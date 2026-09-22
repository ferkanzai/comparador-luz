# Luz en claro

A Spanish electricity comparison dashboard for a weekly manual review of your household tariff.

- Guest comparison with empty forms, no sample prices, and no account requirement.
- Better Auth email-code login or email/password with immediate signup sessions, email verification and password recovery.
- Relational PostgreSQL persistence with account-scoped foreign keys, row-level security and atomic versioned saves.
- Saved consumption, current tariff, manually entered offers, review dates and offer expiry.
- Historical price snapshots when changing providers or updating current prices.
- Bills with actual date ranges, consumption snapshots, editable breakdowns, immediate saving, monthly stacked charts and JSON export.
- Optional IVA and IEE, social-bonus financing, separately billed SNOEE costs, meter rental and maintenance services, with visible breakdowns.
- Spanish number formatting, decimal commas, keyboard-accessible dialogs and responsive layouts.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The guest comparator works with no environment variables. Accounts need the setup below.

[Database, email, local development and Vercel deployment](docs/SETUP.md) · [Calculation rules and researched sources](docs/CALCULATIONS.md)

Vercel deployments automatically run database migrations before building through `pnpm build:vercel`. A migration failure stops deployment. Local `pnpm build` only builds the app.

## Daily workflow

Start with your current tariff or your consumption. The tariff editor includes consumption, taxes and a live breakdown; the first tariff can become your reference immediately. Add an offer to compare it. Draft comparisons survive refresh and account navigation in the same browser tab. Signing in recovers guest consumption and offers alongside account data. In your account, click **Guardar cambios** to persist your work beyond the tab. For weekly checks, add new offers or update prices that have changed. Tariffs without a confirmation date show **Confirmar precios a día de hoy**; the bulk action **Confirmar precios pendientes** confirms only undated tariffs. Confirmed tariffs show their existing date instead of a confirmation button. For signed-in users these dates save immediately.

**Mis tarifas** preserves previous contract prices. **Mis facturas** records actual paid amounts. Use **Guardar este periodo como factura** to copy consumption and estimated line items, then check dates and actual amounts. **Guardar factura** saves immediately; no second save is required. Optional credits reduce the final amount while preserving the recorded taxes. Explore the monthly breakdown by hover, keyboard or tap, or switch to the line view to follow spending over time. No provider switching, automatic offer scraping or email reminders are performed.

## Stack

Next.js App Router, React, TypeScript, Better Auth, `pg`, Zod and CSS. Fonts are served locally. The original Vite app has been replaced with a full-stack app so that authentication and data access stay on the server.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The account and relational storage integration tests run only with explicitly configured disposable local PostgreSQL databases; see [the setup guide](docs/SETUP.md) and [database model, migration and isolation tests](docs/DATABASE.md). Existing JSON workspace installations require a maintenance-window migration before deploying this version.
