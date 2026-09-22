-- Existing tariffs have no additional cost; recorded invoice totals stay unchanged.
ALTER TABLE workspace_tariff
  ADD COLUMN snoee_kwh NUMERIC CHECK (snoee_kwh BETWEEN 0 AND 100);
ALTER TABLE workspace_tariff_snapshot
  ADD COLUMN snoee_kwh NUMERIC CHECK (snoee_kwh BETWEEN 0 AND 100);
ALTER TABLE workspace_bill_breakdown
  ADD COLUMN snoee NUMERIC NOT NULL DEFAULT 0 CHECK (snoee BETWEEN 0 AND 1000000);
