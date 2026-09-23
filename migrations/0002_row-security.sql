-- The current tariff is one of the account's offers (docs/adr/0001).
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_current_tariff_fk" FOREIGN KEY ("user_id","current_tariff_id") REFERENCES "public"."tariff"("user_id","id");--> statement-breakpoint
-- Accounts are Better Auth users; deleting one deletes its workspace.
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "save_rate" ADD CONSTRAINT "save_rate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
-- Account data is read and written as luz_workspace: an unprivileged role that
-- only sees rows whose user_id matches the transaction's app.user_id.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'luz_workspace') THEN
    CREATE ROLE luz_workspace NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'luz_workspace' AND (rolsuper OR rolbypassrls OR rolcanlogin OR rolcreaterole OR rolcreatedb OR rolreplication)) OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'luz_workspace')) THEN
    RAISE EXCEPTION 'luz_workspace must be an unprivileged NOLOGIN role without memberships';
  END IF;
  EXECUTE format('GRANT luz_workspace TO %I', current_user);
END $$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO luz_workspace;--> statement-breakpoint
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['workspace', 'tariff', 'tariff_period', 'bill', 'bill_tariff', 'bill_profile', 'bill_breakdown', 'save_rate'] LOOP
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format($p$CREATE POLICY account_owner ON %I TO luz_workspace USING (user_id = NULLIF(current_setting('app.user_id', true), '')) WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''))$p$, table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO luz_workspace', table_name);
  END LOOP;
END $$;
