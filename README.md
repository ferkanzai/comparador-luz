# Luz en claro

A Spanish electricity dashboard for comparing offers and recording your household contracts and bills.

- Guest comparison with empty forms, no sample prices, and no account requirement.
- Better Auth email-code login or email/password with immediate signup sessions, email verification and password recovery.
- PostgreSQL persistence (Drizzle) with account-scoped foreign keys and row-level security; each change saves on its own, and the last save wins.
- Saved consumption, current tariff, manually entered offers and optional offer expiry.
- Dated contract history, with separate corrections and real price changes.
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

Use **Editar perfil** to change the shared inputs. **Simular consumo** accepts punta, llano and valle kWh directly, like an invoice, and shows their calculated total on the right (below on a phone). Simulations apply to every result but stay outside autosave and export until you choose **Usar este consumo**. **Restablecer** returns to the underlying profile. Reset or adopt a simulation before creating a bill from the comparison, then check the actual invoice figures.

Guest edits are saved in this browser; signed-in edits save automatically to the account. Optional **Oferta válida hasta** sits inside collapsed offer details and appears in the comparison table when supplied. Expired candidates remain visible but unranked; the current contract remains the baseline. Legacy personal-review dates are preserved in storage but no longer appear in the interface.

**Mis tarifas** lets you add current and previous contract periods, correct mistakes, register real price changes, and remove mistakenly entered records. Gaps are allowed; new or corrected periods cannot overlap. A shared change date can be corrected on both adjoining periods with a preview. Corrections never rewrite saved bills. Expand **Comparar precios** to compare up to three recorded periods with power prices in a common unit. **Registrar como actual/anterior** records a comparator candidate as a contract; **Volver a comparar** creates an independent candidate from recorded prices. **Mis facturas** records actual paid amounts. Use **Guardar este período como factura** to copy consumption and estimated line items, then check dates and actual amounts. **Guardar factura** saves immediately; no second save is required. Optional credits reduce the final amount while preserving the recorded taxes. Explore the monthly breakdown by hover, keyboard or tap, or switch to the line view to follow spending over time. No provider switching, automatic offer scraping or email reminders are performed.

## Stack

Next.js App Router, React, TypeScript, Better Auth, Drizzle ORM on `pg`, TanStack Query, Zod and CSS. Fonts are served locally. The original Vite app has been replaced with a full-stack app so that authentication and data access stay on the server.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The account and database integration tests run only with explicitly configured disposable local PostgreSQL databases; see [the setup guide](docs/SETUP.md) and [the account database](docs/DATABASE.md).

## Comparison browser tests

`pnpm test:browser` exercises the comparison through browser controls, with synthetic tariffs in isolated browser contexts. It covers the table, simulation reset/adoption, tariff edits, finalist selection, mobile scrolling, accessibility and retained pricing behavior. Install the browser once with `pnpm exec playwright install chromium`. Reports and screenshots go under `output/playwright/`.

The signed-in autosave/failure/conflict scenario additionally requires a disposable local PostgreSQL database whose name ends in `_test`. Migrate that database using the existing setup instructions, stop any dev server on port 3000, and run:

```sh
COMPARISON_TEST_DATABASE_URL=postgresql://postgres:luz-local-test-only@127.0.0.1:55433/luz_redesign_test pnpm test:browser
```

The test runner starts its own server with that database and console-only email; it refuses to reuse another server in account-test mode. Without the variable, the account scenario is explicitly skipped. Synthetic data is test-only and is never installed in production or shown to new guests.
