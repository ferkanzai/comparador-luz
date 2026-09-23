# Save each record through CRUD endpoints; the last save wins

Signed-in changes are saved one record at a time through plain endpoints: the comparison profile, each offer, the tariff periods and each bill. Actions that touch several records at once, such as a tariff price change, are one transactional endpoint each. The server checks each change against the workspace's rules. There is no conflict detection between devices. A new record never overwrites anything, because every record has its own id. When two devices edit the same record, the last save wins. Profile saves send only the fields that changed, so different fields don't overwrite each other. The client refetches after each save and when the window regains focus.

We chose this because the app has one person per account, who rarely edits from two devices at once. Whole-workspace saves with version conflicts (the original design) and per-record change sets with versions, tombstones and an idempotency log (ADR-0002) both solved concurrent editing. That's a problem we don't have, and each cost more than the features it served.

## Considered options

- **Whole-workspace saves with an optimistic version.** Simple on the server, but any second device made every save an all-or-nothing conflict, and the only way out discarded local edits.
- **Per-record change sets (ADR-0002).** Built and tested, then abandoned: about 1,700 lines, a migration and two tracking tables for rare multi-device editing.
- **Merging on the client, record by record, before resending the whole workspace.** Less code than ADR-0002, but it keeps the whole-workspace protocol and its drafts and versions.
- **One JSON document per account.** Rejected in favour of tables organized by record, which stay readable as the schema grows.

## Consequences

- Guests keep their workspace in the browser. Signing in uploads it once through an import endpoint that has no button in the UI.
- An older build of the app could save a record without fields it doesn't know. The endpoints reject requests from an older schema version and ask for a reload.
- Tables are defined with Drizzle ORM, which generates the migrations. Nobody uses the app yet, so the schema starts again from one baseline migration instead of migrating the existing data.
