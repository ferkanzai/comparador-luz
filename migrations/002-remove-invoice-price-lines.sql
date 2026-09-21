-- Intentionally discard entire invoices with retired tramos, as requested by the owner.
-- Affected workspace versions advance so old browser drafts cannot restore deleted bills.
DO $$
DECLARE table_name TEXT;
BEGIN
  IF to_regclass('public.workspace_bill_price_line') IS NOT NULL THEN
    LOCK TABLE workspace IN ACCESS EXCLUSIVE MODE;
    -- The migration owner must see all accounts even when it does not have BYPASSRLS.
    -- These DDL changes and the cleanup are atomic; runtime policies stay installed.
    FOREACH table_name IN ARRAY ARRAY['workspace', 'workspace_bill', 'workspace_bill_profile', 'workspace_bill_breakdown', 'workspace_tariff_snapshot', 'workspace_bill_price_line'] LOOP
      EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', table_name);
    END LOOP;
    WITH deleted AS (
      DELETE FROM workspace_bill b
      WHERE EXISTS (
        SELECT 1 FROM workspace_bill_price_line l
        WHERE l.user_id = b.user_id AND l.bill_id = b.id
      )
      RETURNING b.user_id, b.snapshot_key
    ), bumped AS (
      UPDATE workspace SET version = version + 1, updated_at = now()
      WHERE user_id IN (SELECT user_id FROM deleted)
      RETURNING user_id
    )
    DELETE FROM workspace_tariff_snapshot t USING deleted d
    WHERE t.user_id = d.user_id AND t.snapshot_key = d.snapshot_key;
    SET CONSTRAINTS ALL IMMEDIATE;
    DROP TABLE workspace_bill_price_line;
    FOREACH table_name IN ARRAY ARRAY['workspace', 'workspace_bill', 'workspace_bill_profile', 'workspace_bill_breakdown', 'workspace_tariff_snapshot'] LOOP
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    END LOOP;
  END IF;
END $$;
