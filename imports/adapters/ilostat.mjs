import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseCsv, normalizeImport } from '../lib.mjs';

export const ILOSTAT_INDICATOR = 'HOW_TEMP_SEX_ECO_NB_A';
const MANUFACTURING_CODES = new Set(['ECO_ISIC4_C', 'ECO_AGGREGATE_MAN']);
const TOTAL_SEX_CODES = new Set(['SEX_T', 'SEX_TOTAL']);
const ISO3_TO_ISO2 = new Map([
  ['CHN', 'CN'],
  ['DEU', 'DE'],
  ['USA', 'US'],
  ['JPN', 'JP'],
  ['THA', 'TH']
]);

export function filterIlostatManufacturingRows(rows) {
  return rows.filter((row) => {
    const indicator = first(row, ['indicator', 'indicator_code']);
    const sex = first(row, ['sex', 'sex_code']);
    const industryCode = findManufacturingCode(row);
    return indicator === ILOSTAT_INDICATOR &&
      TOTAL_SEX_CODES.has(sex) &&
      Boolean(industryCode);
  });
}

export function adaptIlostatRows(rows) {
  return filterIlostatManufacturingRows(rows).map((row, index) => {
    const refArea = first(row, ['ref_area', 'ref_area_code', 'country_code']) ?? '';
    const industryCode = findManufacturingCode(row);
    const industryLabel = findIndustryLabel(row, industryCode);
    const time = first(row, ['time', 'year', 'time_period']) ?? '';
    const value = first(row, ['obs_value', 'value', 'mean_weekly_hours']);
    const source = first(row, ['source', 'source_code']) ?? '';
    const sourceRecordId = [refArea, time, industryCode, source || index + 1]
      .map((part) => String(part).replaceAll(':', '_'))
      .join(':');

    return {
      source_record_id: sourceRecordId,
      country: ISO3_TO_ISO2.get(refArea) ?? null,
      country_code_raw: refArea || null,
      country_label_raw: first(row, ['ref_area.label', 'ref_area_label', 'country_label']) ?? null,
      industry_code: industryCode,
      industry_label: industryLabel,
      weekly_hours: value,
      period_basis: 'annual_mean_actual_week',
      observed_at: time || null
    };
  });
}

export function buildIlostatBundleFromCsv(inputPath, generatedAt = new Date().toISOString()) {
  const bytes = readFileSync(inputPath);
  const rows = parseCsv(bytes.toString('utf8'));
  const adapted = adaptIlostatRows(rows);
  const manifest = ilostatManifest(inputPath, generatedAt.slice(0, 10));
  const bundle = normalizeImport(manifest, adapted, generatedAt);
  bundle.input = {
    format: 'csv',
    record_kind: 'aggregate_statistic',
    measure_type: 'mean_weekly_hours',
    file: inputPath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    source_row_count: rows.length,
    selected_row_count: adapted.length
  };
  bundle.records.forEach((record) => {
    if (!record.country && record.country_code_raw) {
      record.issues = [...new Set([...record.issues, 'unresolved_country_code'])];
    }
  });
  bundle.summary.with_issues = bundle.records.filter((row) => row.issues.length > 0).length;
  return bundle;
}

export function ilostatManifest(file = '<external-ilostat-csv>', retrievedAt = '2026-10-16') {
  return {
    import_version: 'external-import-v1',
    source: {
      source_id: 'ilostat-how-temp-sex-eco-nb-a',
      title: 'Average weekly hours actually worked per employed person by sex and economic activity',
      publisher: 'International Labour Organization (ILOSTAT)',
      url: 'https://ilostat.ilo.org/data/',
      retrieved_at: retrievedAt,
      reuse_status: 'redistributable',
      license_name: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      notes: 'Adapter selects total-sex manufacturing rows for HOW_TEMP_SEX_ECO_NB_A. ILO databases and datasets made available from 3 May 2023 are covered by CC BY 4.0 unless otherwise indicated.'
    },
    input: {
      format: 'csv',
      record_kind: 'aggregate_statistic',
      measure_type: 'mean_weekly_hours',
      file
    },
    mapping: {
      source_record_id: { column: 'source_record_id' },
      country: { column: 'country' },
      country_code_raw: { column: 'country_code_raw' },
      country_label_raw: { column: 'country_label_raw' },
      industry_code: { column: 'industry_code' },
      industry_label: { column: 'industry_label' },
      weekly_hours: { column: 'weekly_hours' },
      period_basis: { column: 'period_basis' },
      observed_at: { column: 'observed_at' }
    }
  };
}

function findManufacturingCode(row) {
  for (const key of ['classif1', 'classif2', 'economic_activity', 'industry_code']) {
    const value = row[key];
    if (MANUFACTURING_CODES.has(value)) return value;
  }
  return null;
}

function findIndustryLabel(row, code) {
  if (!code) return null;
  for (const [codeKey, labelKey] of [
    ['classif1', 'classif1.label'],
    ['classif2', 'classif2.label'],
    ['economic_activity', 'economic_activity.label'],
    ['industry_code', 'industry_label']
  ]) {
    if (row[codeKey] === code && row[labelKey]) return row[labelKey];
  }
  return code === 'ECO_ISIC4_C' ? 'C. Manufacturing' : 'Manufacturing';
}

function first(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
}
