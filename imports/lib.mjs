import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EMPLOYMENT = new Set(['direct_contract', 'labor_dispatch', 'labor_outsource', 'onsite_service', 'other_unknown']);
const ROLES = new Set(['manufacturing_frontline', 'manufacturing_support', 'management', 'sales', 'corporate_function', 'other_unknown']);
const INCOME = new Set(['no', 'yes', 'unknown']);
const BUCKETS = new Set(['lt_35', '35_40', '40_45', '45_50', '50_55', '55_60', '60_65', '65_70', '70_75', 'gte_75']);
const PERIODS = new Set(['last_4_complete_weeks', 'typical_week', 'survey_week', 'annual_mean_actual_week', 'contract_schedule', 'unknown']);
const RECORD_KINDS = new Set(['individual', 'aggregate', 'aggregate_statistic']);
const MEASURE_TYPES = new Set([
  'weekly_hours_observation',
  'weekly_hours_distribution_cell',
  'mean_weekly_hours',
  'schedule_span_hours'
]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error('unterminated CSV quote');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.trim());
  if (new Set(headers).size !== headers.length) throw new Error('duplicate CSV headers');
  return rows.slice(1).filter((values) => values.some((value) => value !== '')).map((values) => {
    const record = {};
    headers.forEach((header, index) => { record[header] = values[index] ?? ''; });
    return record;
  });
}

export function loadImport(manifestPath) {
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  validateManifest(manifest);
  const inputPath = resolve(dirname(manifestPath), manifest.input.file);
  const inputBytes = readFileSync(inputPath);
  const inputHash = createHash('sha256').update(inputBytes).digest('hex');
  let sourceRows;
  if (manifest.input.format === 'csv') {
    sourceRows = parseCsv(inputBytes.toString('utf8'));
  } else {
    const parsed = JSON.parse(inputBytes.toString('utf8'));
    if (!Array.isArray(parsed)) throw new Error('JSON input must be an array of records');
    sourceRows = parsed;
  }
  return { manifest, sourceRows, inputPath, inputHash };
}

export function normalizeImport(manifest, sourceRows, generatedAt = new Date().toISOString()) {
  const records = sourceRows.map((row, index) => normalizeRow(manifest, row, index + 2));
  const summary = {
    total: records.length,
    canonical_candidates: records.filter((r) => r.comparability === 'canonical_candidate').length,
    distribution_context: records.filter((r) => r.comparability === 'distribution_context').length,
    context_only: records.filter((r) => r.comparability === 'context_only').length,
    aggregate_statistics: records.filter((r) => r.evidence_kind === 'aggregate_statistic').length,
    publishable: records.filter((r) => r.publishable).length,
    with_issues: records.filter((r) => r.issues.length > 0).length
  };
  return {
    import_version: 'external-import-v1',
    source: manifest.source,
    generated_at: generatedAt,
    record_kind: manifest.input.record_kind,
    measure_type: manifest.input.measure_type,
    summary,
    records
  };
}

export function buildBundle(manifestPath, generatedAt = new Date().toISOString()) {
  const { manifest, sourceRows, inputPath, inputHash } = loadImport(manifestPath);
  const bundle = normalizeImport(manifest, sourceRows, generatedAt);
  bundle.input = {
    format: manifest.input.format,
    record_kind: manifest.input.record_kind,
    measure_type: manifest.input.measure_type,
    file: manifest.input.file,
    sha256: inputHash,
    row_count: sourceRows.length
  };
  bundle.input_path_resolved = inputPath;
  return bundle;
}

export function normalizeRow(manifest, row, rowNumber) {
  const get = (name) => applyRule(row, manifest.mapping[name]);
  const sourceRecordId = stringOrNull(get('source_record_id')) ?? `row-${rowNumber}`;
  const kind = manifest.input.record_kind;
  const measureType = manifest.input.measure_type;
  const issues = [];

  let bucket = null;
  let weeklyHoursValue = null;
  if (measureType === 'weekly_hours_observation' || measureType === 'weekly_hours_distribution_cell') {
    bucket = stringOrNull(get('weekly_hours_bucket'));
    if (!bucket) {
      const rawHours = get('weekly_hours');
      if (rawHours !== undefined && rawHours !== null && String(rawHours).trim() !== '') {
        const hours = Number(rawHours);
        if (Number.isFinite(hours) && hours >= 0 && hours <= 168) bucket = hoursToBucket(hours);
        else issues.push('invalid_weekly_hours');
      }
    }
    if (bucket && !BUCKETS.has(bucket)) {
      issues.push('invalid_hours_bucket');
      bucket = null;
    }
  } else {
    const rawHours = get('weekly_hours');
    if (rawHours !== undefined && rawHours !== null && String(rawHours).trim() !== '') {
      const hours = Number(rawHours);
      if (Number.isFinite(hours) && hours >= 0 && hours <= 168) weeklyHoursValue = hours;
      else issues.push('invalid_weekly_hours');
    }
  }

  let country = stringOrNull(get('country'));
  const countryCodeRaw = stringOrNull(get('country_code_raw'));
  const countryLabelRaw = stringOrNull(get('country_label_raw'));
  if (country) {
    country = country.toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      issues.push('invalid_country');
      country = null;
    }
  }

  const brandId = stringOrNull(get('brand_id'));
  const brandNameRaw = stringOrNull(get('brand_name_raw'));
  if (!brandId && (brandNameRaw || kind === 'individual')) issues.push('unresolved_brand');

  const employmentType = enumOrNull(get('employment_type'), EMPLOYMENT, 'unknown_employment_type', issues);
  const workRole = enumOrNull(get('work_role'), ROLES, 'unknown_work_role', issues);
  const highIncome = enumOrNull(get('high_income_5x'), INCOME, 'unknown_high_income_status', issues);
  let periodBasis = stringOrNull(get('period_basis')) ?? 'unknown';
  if (!PERIODS.has(periodBasis)) {
    issues.push('unknown_period_basis');
    periodBasis = 'unknown';
  }

  const record = {
    import_record_id: `${manifest.source.source_id}:${sourceRecordId}`,
    source_id: manifest.source.source_id,
    source_record_id: sourceRecordId,
    evidence_kind: kind,
    measure_type: measureType,
    brand_id: brandId,
    brand_name_raw: brandNameRaw,
    country,
    country_code_raw: countryCodeRaw,
    country_label_raw: countryLabelRaw,
    work_region: stringOrNull(get('work_region')),
    facility_id: stringOrNull(get('facility_id')),
    facility_text: stringOrNull(get('facility_text')),
    industry_code: stringOrNull(get('industry_code')),
    industry_label: stringOrNull(get('industry_label')),
    employment_type: employmentType,
    work_role: workRole,
    high_income_5x: highIncome,
    weekly_hours_bucket: bucket,
    weekly_hours_value: weeklyHoursValue,
    period_basis: periodBasis,
    observed_at: stringOrNull(get('observed_at')),
    comparability: 'context_only',
    publishable: manifest.source.reuse_status === 'redistributable',
    issues
  };

  if (kind === 'aggregate') {
    const count = Number(get('count'));
    if (!Number.isInteger(count) || count < 1) issues.push('invalid_count');
    else record.count = count;
  }

  if ((measureType === 'weekly_hours_observation' || measureType === 'weekly_hours_distribution_cell') && !bucket) {
    issues.push('missing_hours');
  }
  if ((measureType === 'mean_weekly_hours' || measureType === 'schedule_span_hours') && weeklyHoursValue === null) {
    issues.push('missing_hours');
  }

  if (kind === 'individual' && measureType === 'weekly_hours_observation' && isCanonicalCandidate(record)) {
    record.comparability = 'canonical_candidate';
  } else if (measureType === 'weekly_hours_distribution_cell' ||
    (measureType === 'weekly_hours_observation' && bucket && periodBasis !== 'unknown')) {
    record.comparability = 'distribution_context';
  }

  record.issues = [...new Set(issues)];
  return record;
}

function isCanonicalCandidate(record) {
  return record.period_basis === 'last_4_complete_weeks' &&
    Boolean(record.brand_id) && Boolean(record.weekly_hours_bucket) &&
    Boolean(record.employment_type) && Boolean(record.work_role) && Boolean(record.high_income_5x);
}

function enumOrNull(value, allowed, issue, issues) {
  const normalized = stringOrNull(value);
  if (!normalized) return null;
  if (!allowed.has(normalized)) {
    issues.push(issue);
    return null;
  }
  return normalized;
}

function applyRule(row, rule) {
  if (!rule) return undefined;
  if (Object.hasOwn(rule, 'constant')) return rule.constant;
  let value = row[rule.column];
  if (value === undefined) return undefined;
  if (rule.map && Object.hasOwn(rule.map, String(value))) value = rule.map[String(value)];
  if (typeof value === 'string') {
    if (rule.transform === 'upper') value = value.trim().toUpperCase();
    else if (rule.transform === 'lower') value = value.trim().toLowerCase();
    else value = value.trim();
  }
  return value;
}

function stringOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

export function hoursToBucket(hours) {
  if (hours < 35) return 'lt_35';
  if (hours < 40) return '35_40';
  if (hours < 45) return '40_45';
  if (hours < 50) return '45_50';
  if (hours < 55) return '50_55';
  if (hours < 60) return '55_60';
  if (hours < 65) return '60_65';
  if (hours < 70) return '65_70';
  if (hours < 75) return '70_75';
  return 'gte_75';
}

export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('manifest must be an object');
  if (manifest.import_version !== 'external-import-v1') throw new Error('unsupported import_version');
  if (!manifest.source?.source_id || !manifest.source?.title || !manifest.source?.publisher || !manifest.source?.url || !manifest.source?.retrieved_at) throw new Error('source metadata is incomplete');
  if (!['redistributable', 'internal_only', 'unknown'].includes(manifest.source.reuse_status)) throw new Error('invalid reuse_status');
  if (!['csv', 'json'].includes(manifest.input?.format)) throw new Error('unsupported input format');
  if (!RECORD_KINDS.has(manifest.input?.record_kind)) throw new Error('unsupported record_kind');
  if (!MEASURE_TYPES.has(manifest.input?.measure_type)) throw new Error('unsupported measure_type');
  if (manifest.input.record_kind === 'aggregate' && manifest.input.measure_type !== 'weekly_hours_distribution_cell') throw new Error('aggregate imports must be distribution cells');
  if (manifest.input.record_kind === 'aggregate_statistic' && manifest.input.measure_type !== 'mean_weekly_hours') throw new Error('aggregate_statistic imports must use mean_weekly_hours');
  if (!manifest.input?.file || !manifest.mapping || typeof manifest.mapping !== 'object') throw new Error('input file and mapping are required');
}
