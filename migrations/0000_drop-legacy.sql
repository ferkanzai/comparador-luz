-- The schema before Drizzle (docs/adr/0003). Nobody used the app yet, so its
-- data is dropped rather than migrated. Harmless on an empty database.
DROP TABLE IF EXISTS
  workspace_bill_breakdown,
  workspace_bill_profile,
  workspace_bill,
  workspace_history,
  workspace_tariff_snapshot,
  workspace_tariff,
  workspace_profile,
  workspace_save_rate,
  workspace_legacy,
  workspace,
  app_migration
CASCADE;
