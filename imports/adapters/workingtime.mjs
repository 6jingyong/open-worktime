import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseCsv, normalizeImport } from '../lib.mjs';

export function parseClock(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function parseWorkdays(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!/^[1-7](?:\.0+)?$/.test(text)) return null;
  const days = Number(text);
  return Number.isInteger(days) && days >= 1 && days <= 7 ? days : null;
}

export function deriveWeeklyScheduleSpan(row) {
  const start = parseClock(row.work_begin);
  const end = parseClock(row.work_end);
  const workdays = parseWorkdays(row.workdays);
  if (start === null || end === null || workdays === null) return null;
  let minutes = end - start;
  if (minutes < 0) minutes += 24 * 60;
  if (minutes <= 0 || minutes > 24 * 60) return null;
  const weeklyHours = (minutes / 60) * workdays;
  if (weeklyHours < 0 || weeklyHours > 168) return null;
  return Number(weeklyHours.toFixed(3));
}

export function adaptWorkingTimeRows(rows) {
  return rows.map((row, index) => ({
    source_record_id: clean(row.id) ?? `row-${index + 2}`,
    brand_name_raw: clean(row.company),
    country: 'CN',
    work_region: clean(row.base),
    industry_label: clean(row.category),
    weekly_hours: deriveWeeklyScheduleSpan(row),
    period_basis: 'typical_week',
    observed_at: null
  }));
}

export function buildWorkingTimeBundleFromCsv(inputPath, generatedAt = new Date().toISOString()) {
  const bytes = readFileSync(inputPath);
  const rows = parseCsv(bytes.toString('utf8'));
  const adapted = adaptWorkingTimeRows(rows);
  const bundle = normalizeImport(workingTimeManifest(inputPath, generatedAt.slice(0, 10)), adapted, generatedAt);
  bundle.input = {
    format: 'csv',
    record_kind: 'individual',
    measure_type: 'schedule_span_hours',
    file: inputPath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    source_row_count: rows.length,
    selected_row_count: adapted.length
  };

  bundle.records.forEach((record, index) => {
    const issues = new Set(record.issues);
    issues.add('schedule_span_not_actual_hours');
    issues.add('restricted_source_not_publishable');
    issues.add('company_name_not_verified_brand');
    issues.delete('unresolved_brand');
    if (adapted[index].weekly_hours === null) issues.add('unparsed_schedule');
    record.issues = [...issues];
    record.publishable = false;
    record.comparability = 'context_only';
  });
  bundle.summary.publishable = 0;
  bundle.summary.canonical_candidates = 0;
  bundle.summary.distribution_context = 0;
  bundle.summary.context_only = bundle.records.length;
  bundle.summary.with_issues = bundle.records.filter((row) => row.issues.length > 0).length;
  return bundle;
}

export function workingTimeManifest(file = '<external-workingtime-csv>', retrievedAt = '2026-10-16') {
  return {
    import_version: 'external-import-v1',
    source: {
      source_id: 'workerlivesmatter-workingtime',
      title: 'WorkingTime company schedule dataset',
      publisher: 'WorkerLivesMatter / WorkingTime community project',
      url: 'https://github.com/Vonng/worktime',
      retrieved_at: retrievedAt,
      reuse_status: 'internal_only',
      license_name: null,
      license_url: null,
      notes: 'The original project restricts unauthorized reuse for research/nonprofit reports and other secondary uses. The source field launch_time means lunch time (午饭时间), not a publication timestamp. Adapter tests use synthetic fixtures only; do not publish source data without permission.'
    },
    input: {
      format: 'csv',
      record_kind: 'individual',
      measure_type: 'schedule_span_hours',
      file
    },
    mapping: {
      source_record_id: { column: 'source_record_id' },
      brand_name_raw: { column: 'brand_name_raw' },
      country: { column: 'country' },
      work_region: { column: 'work_region' },
      industry_label: { column: 'industry_label' },
      weekly_hours: { column: 'weekly_hours' },
      period_basis: { column: 'period_basis' },
      observed_at: { column: 'observed_at' }
    }
  };
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}
