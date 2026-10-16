CREATE TABLE IF NOT EXISTS intake_reports (
  id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  country TEXT,
  work_region TEXT,
  facility_id TEXT,
  facility_text TEXT,
  employment_type TEXT NOT NULL,
  work_role TEXT NOT NULL,
  high_income_5x TEXT NOT NULL,
  weekly_hours_bucket TEXT NOT NULL,
  period_basis TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'community_report',
  moderation_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_state IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_intake_reports_submitted_at
  ON intake_reports(submitted_at);

CREATE INDEX IF NOT EXISTS idx_intake_reports_moderation_state
  ON intake_reports(moderation_state, submitted_at);

CREATE INDEX IF NOT EXISTS idx_intake_reports_brand
  ON intake_reports(brand_id, submitted_at);
