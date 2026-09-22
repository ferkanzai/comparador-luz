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

Start with your current tariff or your consumption. Every tariff uses one shared comparison profile. The comparison table shows estimated period totals, savings, energy and power costs, original unit prices, and other charges. Power quotes can be compared in a shared day/month/year unit. On a phone, scroll the table horizontally while tariff names remain visible. Select up to three tariffs for an optional detailed comparison; selection does not change your current contract.

Use **Editar perfil** to change the shared inputs. **Simular consumo** lets you change total kWh while retaining its period distribution, or change the percentages while retaining the total. Simulations apply to every result but stay outside autosave and export until you choose **Usar este consumo**. **Restablecer** returns to the underlying profile. Reset or adopt a simulation before creating a bill from the comparison, then check the actual invoice figures.

Guest edits are saved in this browser; signed-in edits also synchronize automatically to the account. Price review is a personal record inside tariff details: **He revisado estos precios** records today's date on an undated tariff without fetching or validating prices. Existing review dates remain visible and editable in tariff details.

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

## Comparison browser tests

`pnpm test:browser` exercises the comparison through browser controls, with synthetic tariffs in isolated browser contexts. It covers the table, simulation reset/adoption, tariff edits, finalist selection, mobile scrolling, accessibility and retained pricing behavior. Install the browser once with `pnpm exec playwright install chromium`. Reports and screenshots go under `output/playwright/`.

The signed-in autosave/failure/conflict scenario additionally requires a disposable local PostgreSQL database whose name ends in `_test`. Migrate that database using the existing setup instructions, stop any dev server on port 3000, and run:

```sh
COMPARISON_TEST_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55433/luz_redesign_test pnpm test:browser
```

The test runner starts its own server with that database and console-only email; it refuses to reuse another server in account-test mode. Without the variable, the account scenario is explicitly skipped. Synthetic data is test-only and is never installed in production or shown to new guests.
