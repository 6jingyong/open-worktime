export const DATABASE_NAME = 'open-worktime-intake';

export const REJECTION_REASONS = new Set([
  'spam',
  'duplicate',
  'malformed',
  'privacy_risk',
  'test_submission',
  'other'
]);

const REPORT_ID_PATTERN = /^rpt_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertReportId(value) {
  if (!REPORT_ID_PATTERN.test(String(value ?? ''))) {
    throw new Error('report id must look like rpt_<uuid>');
  }
  return String(value);
}

export function normalizeLimit(value, fallback = 50) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 500) {
    throw new Error('limit must be an integer between 1 and 500');
  }
  return numeric;
}

export function normalizeCutoff(value) {
  if (!value) throw new Error('--cutoff is required');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('cutoff must be a valid date/time');
  return date.toISOString();
}

export function quoteSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildPendingSql(limit = 50) {
  const safeLimit = normalizeLimit(limit);
  return `
SELECT
  id,
  submitted_at,
  brand_id,
  country,
  work_region,
  facility_id,
  facility_text,
  employment_type,
  work_role,
  high_income_5x,
  weekly_hours_bucket,
  moderation_state
FROM intake_reports
WHERE moderation_state = 'pending'
ORDER BY submitted_at ASC, id ASC
LIMIT ${safeLimit};`.trim();
}

export function buildStatsSql() {
  return `
SELECT moderation_state, COUNT(*) AS count
FROM intake_reports
GROUP BY moderation_state
ORDER BY moderation_state;`.trim();
}

export function buildModerationSql({ id, action, reason, reviewedAt = new Date().toISOString() }) {
  const safeId = assertReportId(id);
  const timestamp = new Date(reviewedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error('reviewedAt must be a valid date/time');

  if (action === 'accept') {
    if (reason && reason !== 'accepted_valid') {
      throw new Error('accepted reports use moderation_reason=accepted_valid');
    }
    return `UPDATE intake_reports
SET moderation_state = 'accepted',
    reviewed_at = ${quoteSql(timestamp.toISOString())},
    moderation_reason = 'accepted_valid'
WHERE id = ${quoteSql(safeId)}
  AND moderation_state = 'pending';`;
  }

  if (action === 'reject') {
    if (!REJECTION_REASONS.has(reason)) {
      throw new Error(`reject reason must be one of: ${[...REJECTION_REASONS].join(', ')}`);
    }
    return `UPDATE intake_reports
SET moderation_state = 'rejected',
    reviewed_at = ${quoteSql(timestamp.toISOString())},
    moderation_reason = ${quoteSql(reason)}
WHERE id = ${quoteSql(safeId)}
  AND moderation_state = 'pending';`;
  }

  throw new Error('action must be accept or reject');
}

export function buildAcceptedExportSql(cutoff) {
  const normalized = normalizeCutoff(cutoff);
  return `
SELECT
  schema_version,
  id,
  brand_id,
  country,
  work_region,
  facility_id,
  facility_text,
  employment_type,
  work_role,
  high_income_5x,
  weekly_hours_bucket,
  period_basis,
  submitted_at,
  source
FROM intake_reports
WHERE moderation_state = 'accepted'
  AND submitted_at <= ${quoteSql(normalized)}
ORDER BY submitted_at ASC, id ASC;`.trim();
}

export function extractRows(wranglerJson) {
  const values = Array.isArray(wranglerJson) ? wranglerJson : [wranglerJson];
  for (const item of values) {
    if (Array.isArray(item?.results)) return item.results;
    if (Array.isArray(item?.result?.results)) return item.result.results;
    if (Array.isArray(item?.result)) {
      const nested = extractRows(item.result);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function makeAcceptedExport(rows, { cutoff, exportedAt = new Date().toISOString() }) {
  const normalizedCutoff = normalizeCutoff(cutoff);
  const exported = new Date(exportedAt);
  if (Number.isNaN(exported.getTime())) throw new Error('exportedAt must be a valid date/time');

  const reports = rows.map((row) => ({
    schema_version: row.schema_version,
    id: row.id,
    brand_id: row.brand_id,
    country: row.country ?? null,
    work_region: row.work_region ?? null,
    facility_id: row.facility_id ?? null,
    facility_text: row.facility_text ?? null,
    employment_type: row.employment_type,
    work_role: row.work_role,
    high_income_5x: row.high_income_5x,
    weekly_hours_bucket: row.weekly_hours_bucket,
    period_basis: row.period_basis,
    submitted_at: row.submitted_at,
    source: row.source
  }));

  return {
    export_version: 'accepted-raw-v1',
    cutoff: normalizedCutoff,
    exported_at: exported.toISOString(),
    report_count: reports.length,
    reports
  };
}
