-- The migration runner renames a legacy JSON workspace before executing this file.
CREATE TABLE workspace (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  current_id UUID,
  current_since DATE,
  reviewed_on DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE workspace_profile (
  user_id TEXT PRIMARY KEY REFERENCES workspace(user_id) ON DELETE CASCADE,
  days NUMERIC CHECK (days BETWEEN 0 AND 366),
  peak_kwh NUMERIC CHECK (peak_kwh BETWEEN 0 AND 1000000),
  flat_kwh NUMERIC CHECK (flat_kwh BETWEEN 0 AND 1000000),
  valley_kwh NUMERIC CHECK (valley_kwh BETWEEN 0 AND 1000000),
  peak_kw NUMERIC CHECK (peak_kw BETWEEN 0 AND 15),
  valley_kw NUMERIC CHECK (valley_kw BETWEEN 0 AND 15),
  taxes BOOLEAN NOT NULL,
  vat NUMERIC CHECK (vat BETWEEN 0 AND 100),
  electricity_tax NUMERIC CHECK (electricity_tax BETWEEN 0 AND 100),
  minimum_tax BOOLEAN NOT NULL
);
CREATE TABLE workspace_tariff (
  user_id TEXT NOT NULL REFERENCES workspace(user_id) ON DELETE CASCADE,
  id UUID NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  provider VARCHAR(100) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fixed','periods')),
  energy_peak NUMERIC CHECK (energy_peak BETWEEN 0 AND 100),
  energy_flat NUMERIC CHECK (energy_flat BETWEEN 0 AND 100),
  energy_valley NUMERIC CHECK (energy_valley BETWEEN 0 AND 100),
  power_peak NUMERIC CHECK (power_peak BETWEEN 0 AND 1000),
  power_valley NUMERIC CHECK (power_valley BETWEEN 0 AND 1000),
  power_kind TEXT NOT NULL CHECK (power_kind IN ('periods','same','combined')),
  power_unit TEXT NOT NULL CHECK (power_unit IN ('day','month','year')),
  meter_day NUMERIC CHECK (meter_day BETWEEN 0 AND 100),
  meter_estimate TEXT NOT NULL CHECK (meter_estimate IN ('none','single-2013','three-2013')),
  social_day NUMERIC CHECK (social_day BETWEEN 0 AND 100),
  social_estimate TEXT NOT NULL CHECK (social_estimate IN ('none','ted634-2026')),
  social_in_electricity_tax BOOLEAN NOT NULL,
  services_month NUMERIC CHECK (services_month BETWEEN 0 AND 10000),
  url VARCHAR(2000) NOT NULL CHECK (url = '' OR url ~ '^https?://'),
  checked_on DATE,
  valid_until DATE,
  notes VARCHAR(2000) NOT NULL,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE workspace ADD CONSTRAINT workspace_current_tariff_fk
  FOREIGN KEY (user_id, current_id) REFERENCES workspace_tariff(user_id, id)
  DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE workspace_tariff_snapshot (
  user_id TEXT NOT NULL REFERENCES workspace(user_id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL CHECK (snapshot_key ~ '^(history|bill)/[0-9a-f-]{36}$'),
  tariff_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  provider VARCHAR(100) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fixed','periods')),
  energy_peak NUMERIC CHECK (energy_peak BETWEEN 0 AND 100),
  energy_flat NUMERIC CHECK (energy_flat BETWEEN 0 AND 100),
  energy_valley NUMERIC CHECK (energy_valley BETWEEN 0 AND 100),
  power_peak NUMERIC CHECK (power_peak BETWEEN 0 AND 1000),
  power_valley NUMERIC CHECK (power_valley BETWEEN 0 AND 1000),
  power_kind TEXT NOT NULL CHECK (power_kind IN ('periods','same','combined')),
  power_unit TEXT NOT NULL CHECK (power_unit IN ('day','month','year')),
  meter_day NUMERIC CHECK (meter_day BETWEEN 0 AND 100),
  meter_estimate TEXT NOT NULL CHECK (meter_estimate IN ('none','single-2013','three-2013')),
  social_day NUMERIC CHECK (social_day BETWEEN 0 AND 100),
  social_estimate TEXT NOT NULL CHECK (social_estimate IN ('none','ted634-2026')),
  social_in_electricity_tax BOOLEAN NOT NULL,
  services_month NUMERIC CHECK (services_month BETWEEN 0 AND 10000),
  url VARCHAR(2000) NOT NULL CHECK (url = '' OR url ~ '^https?://'),
  checked_on DATE,
  valid_until DATE,
  notes VARCHAR(2000) NOT NULL,
  PRIMARY KEY (user_id, snapshot_key)
);
CREATE TABLE workspace_history (
  user_id TEXT NOT NULL REFERENCES workspace(user_id) ON DELETE CASCADE,
  id UUID NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  snapshot_key TEXT NOT NULL CHECK (snapshot_key = 'history/' || id::text),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (user_id, snapshot_key) REFERENCES workspace_tariff_snapshot(user_id, snapshot_key) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE workspace_bill (
  user_id TEXT NOT NULL REFERENCES workspace(user_id) ON DELETE CASCADE,
  id UUID NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  month TEXT NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  period_start DATE,
  period_end DATE,
  provider VARCHAR(100) NOT NULL CHECK (length(trim(provider)) > 0),
  paid NUMERIC NOT NULL CHECK (paid BETWEEN -1000000 AND 1000000),
  credit NUMERIC NOT NULL CHECK (credit BETWEEN 0 AND 1000000),
  kwh NUMERIC CHECK (kwh BETWEEN 0 AND 1000000),
  notes VARCHAR(2000) NOT NULL,
  snapshot_key TEXT CHECK (snapshot_key = 'bill/' || id::text),
  consumption_kind TEXT NOT NULL CHECK (consumption_kind IN ('legacy','total','periods')),
  peak_kwh NUMERIC CHECK (peak_kwh BETWEEN 0 AND 1000000),
  flat_kwh NUMERIC CHECK (flat_kwh BETWEEN 0 AND 1000000),
  valley_kwh NUMERIC CHECK (valley_kwh BETWEEN 0 AND 1000000),
  review_signature VARCHAR(80),
  review_reason VARCHAR(500),
  CHECK ((period_start IS NULL AND period_end IS NULL) OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end > period_start)),
  CHECK ((consumption_kind = 'periods' AND peak_kwh IS NOT NULL AND flat_kwh IS NOT NULL AND valley_kwh IS NOT NULL AND kwh IS NOT NULL AND abs(peak_kwh + flat_kwh + valley_kwh - kwh) <= 0.000001) OR (consumption_kind <> 'periods' AND peak_kwh IS NULL AND flat_kwh IS NULL AND valley_kwh IS NULL)),
  CHECK ((review_signature IS NULL AND review_reason IS NULL) OR (review_signature IS NOT NULL AND review_reason IS NOT NULL AND length(trim(review_reason)) > 0)),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (user_id, snapshot_key) REFERENCES workspace_tariff_snapshot(user_id, snapshot_key) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX workspace_bill_month_idx ON workspace_bill(user_id, month);
CREATE INDEX workspace_history_dates_idx ON workspace_history(user_id, start_date, end_date);
CREATE TABLE workspace_bill_profile (
  user_id TEXT NOT NULL,
  bill_id UUID NOT NULL,
  days NUMERIC CHECK (days BETWEEN 0 AND 366),
  peak_kwh NUMERIC CHECK (peak_kwh BETWEEN 0 AND 1000000),
  flat_kwh NUMERIC CHECK (flat_kwh BETWEEN 0 AND 1000000),
  valley_kwh NUMERIC CHECK (valley_kwh BETWEEN 0 AND 1000000),
  peak_kw NUMERIC CHECK (peak_kw BETWEEN 0 AND 15),
  valley_kw NUMERIC CHECK (valley_kw BETWEEN 0 AND 15),
  taxes BOOLEAN NOT NULL,
  vat NUMERIC CHECK (vat BETWEEN 0 AND 100),
  electricity_tax NUMERIC CHECK (electricity_tax BETWEEN 0 AND 100),
  minimum_tax BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, bill_id),
  FOREIGN KEY (user_id, bill_id) REFERENCES workspace_bill(user_id, id) ON DELETE CASCADE
);
CREATE TABLE workspace_bill_breakdown (
  user_id TEXT NOT NULL,
  bill_id UUID NOT NULL,
  energy NUMERIC NOT NULL CHECK (energy BETWEEN 0 AND 1000000), power NUMERIC NOT NULL CHECK (power BETWEEN 0 AND 1000000), social NUMERIC NOT NULL CHECK (social BETWEEN 0 AND 1000000), meter NUMERIC NOT NULL CHECK (meter BETWEEN 0 AND 1000000), services NUMERIC NOT NULL CHECK (services BETWEEN 0 AND 1000000), electricity_tax NUMERIC NOT NULL CHECK (electricity_tax BETWEEN 0 AND 1000000), vat NUMERIC NOT NULL CHECK (vat BETWEEN 0 AND 1000000), services_vat NUMERIC NOT NULL CHECK (services_vat BETWEEN 0 AND 1000000),
  PRIMARY KEY (user_id, bill_id),
  FOREIGN KEY (user_id, bill_id) REFERENCES workspace_bill(user_id, id) ON DELETE CASCADE
);
