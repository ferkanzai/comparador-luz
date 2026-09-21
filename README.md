# Luz en claro

A Spanish electricity comparison dashboard for a weekly manual review of your household tariff.

- Guest comparison with empty forms, no sample prices, and no account requirement.
- Better Auth email/password accounts with email verification and password recovery.
- PostgreSQL persistence, available through Neon's free Vercel Marketplace plan.
- Saved consumption, current tariff, manually entered offers, review dates and offer expiry.
- Historical price snapshots when changing providers or updating current prices.
- Monthly paid bills, annual totals, charts and JSON export.
- Optional IVA and IEE, social-bonus financing, meter rental and maintenance services, with visible breakdowns.
- Spanish number formatting, decimal commas, keyboard-accessible dialogs and responsive layouts.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The guest comparator works with no environment variables. Accounts need the setup below.

[Database, email, local development and Vercel deployment](docs/SETUP.md) · [Calculation rules and researched sources](docs/CALCULATIONS.md)

Vercel deployments automatically run database migrations before building through `pnpm build:vercel`. A migration failure stops deployment. Local `pnpm build` only builds the app.

## Daily workflow

Enter the consumption and power from a real invoice, add your current tariff and mark it as the reference. Add an offer to compare it. In your account, click **Guardar cambios** to persist your work. For weekly checks, review the suppliers' current conditions, update each offer's review/expiry dates, and mark your review complete.

**Mis tarifas** preserves previous contract prices. **Mis facturas** records actual paid amounts rather than calculated estimates. No provider switching, automatic offer scraping or email reminders are performed.

## Stack

Next.js App Router, React, TypeScript, Better Auth, `pg`, Zod and CSS. Fonts are served locally. The original Vite app has been replaced with a full-stack app so that authentication and data access stay on the server.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The account integration test runs only with an explicitly configured disposable local PostgreSQL database; see the setup guide.
