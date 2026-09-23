# Simple persistence: CRUD per record, last save wins

Rebuild how signed-in data is saved, following [ADR-0003](../../docs/adr/0003-save-each-record-through-crud-endpoints.md). The app is for one person per account, so it aims for simplicity, not concurrent editing. What you see doesn't change: same screens, same flows. Only the way data reaches the database does.

## Decisions (user, 2026-09-23)

- **Tables organized by record, defined in Drizzle ORM.** Drizzle generates the migrations and the typed queries. No JSON document storage.
- **Start from scratch.** Nobody uses the app, so existing data is dropped. One baseline migration replaces 001–004, and the legacy import, the 002 cleanup and the hand-written migration runner go. Better Auth keeps its own tables and migrations.
- **CRUD endpoints per record, plus one transactional endpoint per multi-record action.** The last save wins for each record. New records never overwrite anything, because they carry client-generated UUIDs. Profile saves send only the changed fields.
- **The server enforces the domain rules** (limits, no overlapping periods, the current tariff exists) by reusing the existing pure functions in `workspace-actions.ts` and `tariff-periods.ts`.
- **TanStack Query on the client** for signed-in data: a mutation per action (optimistic UI when possible), an immediate on-screen update that rolls back on error, and a refetch after each save and on window focus. No local drafts, versions or conflict states for accounts. No "several devices" notice.
- **Guests are unchanged:** their workspace lives in the browser. Signing in uploads it once through an import endpoint with no UI.
- **Export** moves to the account page for signed-in users. Guests keep it on the home page.
- **Kept as they are:** row-level security with the restricted role, the per-account save rate limit, origin checks, and a schema-version header. The server refuses an older build with 426 so it can't save records without fields it doesn't know.
- **Dropped:** `reviewedOn` (stored but unused in the UI).



## Default schema (adjust in ticket 01 if something doesn't fit)


| Table           | One row per                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `workspace`     | account: the comparison profile's columns, `current_tariff_id`, `current_since`                                       |
| `tariff`        | offer, including the current tariff (ADR-0001)                                                                        |
| `tariff_period` | recorded past contract period, with its tariff snapshot columns                                                       |
| `bill`          | bill, with its optional tariff snapshot, profile snapshot, breakdown and period consumption as nullable column groups |


Tariff columns are defined once as a Drizzle column helper and reused for `tariff` and both snapshots. The same applies to the profile columns in `workspace` and `bill`. Decimals stay `numeric` and are exchanged as strings.

## Endpoints


| Endpoint                                  | Action it serves                                                    |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/workspace`                      | Load everything on page open (same `Workspace` shape as today)      |
| `PATCH /api/profile`                      | Edit the profile, adopt a simulation                                |
| `PUT /api/offers/:id`, `DELETE`           | Save, duplicate or remove an offer; copy a period into the offers   |
| `POST /api/contract/current`              | Register the current tariff or a price change (`recordCurrent`)     |
| `POST /api/contract/periods`              | Record a past period (`recordHistorical`)                           |
| `PUT /api/contract/periods/:id`, `DELETE` | Correct or remove a period, including the current one               |
| `PUT /api/bills/:id`, `DELETE`            | Save or remove a bill, optionally creating an offer from its prices |
| `POST /api/import`                        | Move a guest workspace into the account on sign-in                  |


Each mutation loads the workspace, runs the existing pure action, validates the result, and writes only the rows that differ, all in one transaction. The response is the saved record, or a 4xx with a Spanish message.

## Tickets


| #   | Ticket                                                                           | Effort | Status          | Blocked by |
| --- | -------------------------------------------------------------------------------- | ------ | --------------- | ---------- |
| 01  | [Drizzle schema and a fresh baseline](issues/01-drizzle-baseline.md)             | M      | completed       |            |
| 02  | [Read endpoint and mutation plumbing](issues/02-read-and-plumbing.md)            | M      | completed       | 01         |
| 03  | [Profile and offer endpoints](issues/03-profile-and-offers.md)                   | S      | completed       | 02         |
| 04  | [Contract endpoints](issues/04-contract.md)                                      | M      | completed       | 02         |
| 05  | [Bill endpoints](issues/05-bills.md)                                             | S      | completed       | 02         |
| 06  | [Client on TanStack Query](issues/06-client-tanstack-query.md)                   | M–L    | completed       | 03, 04, 05 |
| 07  | [Export on the account page](issues/07-export-on-account-page.md)                | S      | completed       | 06         |
| 08  | [Remove the old persistence and rewrite the docs](issues/08-cleanup-and-docs.md) | M      | completed       | 06         |


Work on one branch and merge once 01–08 are done and the browser suite passes: halfway through, the app can't save.