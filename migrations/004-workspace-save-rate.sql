-- One fixed-window counter per account; each save reuses the same row.
CREATE TABLE workspace_save_rate (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0)
);
REVOKE ALL ON workspace_save_rate FROM PUBLIC;
ALTER TABLE workspace_save_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_save_rate FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_owner ON workspace_save_rate TO luz_workspace
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE ON workspace_save_rate TO luz_workspace;
