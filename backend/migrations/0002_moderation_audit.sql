ALTER TABLE intake_reports ADD COLUMN reviewed_at TEXT;

ALTER TABLE intake_reports ADD COLUMN moderation_reason TEXT
  CHECK (
    moderation_reason IS NULL OR moderation_reason IN (
      'accepted_valid',
      'spam',
      'duplicate',
      'malformed',
      'privacy_risk',
      'test_submission',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_intake_reports_reviewed_at
  ON intake_reports(reviewed_at);
