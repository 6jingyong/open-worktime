import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptIlostatRows,
  buildIlostatBundleFromCsv,
  filterIlostatManufacturingRows
} from '../adapters/ilostat.mjs';
import {
  buildWorkingTimeBundleFromCsv,
  deriveWeeklyScheduleSpan,
  parseClock,
  parseWorkdays
} from '../adapters/workingtime.mjs';
import { parseCsv } from '../lib.mjs';
import { readFileSync } from 'node:fs';

const fixtureDir = fileURLToPath(new URL('../adapters/fixtures/', import.meta.url));

test('ILOSTAT adapter keeps only total-sex manufacturing rows', () => {
  const rows = parseCsv(readFileSync(resolve(fixtureDir, 'ilostat-sample.csv'), 'utf8'));
  const selected = filterIlostatManufacturingRows(rows);
  assert.equal(selected.length, 2);
  const adapted = adaptIlostatRows(rows);
  assert.deepEqual(adapted.map((row) => row.country), ['CN', 'DE']);
  assert.ok(adapted.every((row) => row.industry_code === 'ECO_ISIC4_C'));
});

test('ILOSTAT means remain scalar context, never histogram buckets', () => {
  const bundle = buildIlostatBundleFromCsv(
    resolve(fixtureDir, 'ilostat-sample.csv'),
    '2026-10-16T09:00:00Z'
  );
  assert.equal(bundle.records.length, 2);
  assert.equal(bundle.records[0].weekly_hours_value, 46.2);
  assert.equal(bundle.records[0].weekly_hours_bucket, null);
  assert.equal(bundle.records[0].period_basis, 'annual_mean_actual_week');
  assert.equal(bundle.records[0].comparability, 'context_only');
  assert.equal(bundle.records[0].publishable, true);
  assert.equal(bundle.input.source_row_count, 4);
  assert.equal(bundle.input.selected_row_count, 2);
});

test('WorkingTime strict schedule parser derives only schedule span', () => {
  assert.equal(parseClock('09:00'), 540);
  assert.equal(parseClock('9:30'), 570);
  assert.equal(parseClock('flexible'), null);
  assert.equal(parseWorkdays('5'), 5);
  assert.equal(parseWorkdays('5 days'), null);
  assert.equal(deriveWeeklyScheduleSpan({ work_begin: '09:00', work_end: '18:00', workdays: '5' }), 45);
  assert.equal(deriveWeeklyScheduleSpan({ work_begin: '22:00', work_end: '06:00', workdays: '5' }), 40);
});

test('WorkingTime adapter is internal-only context and drops unrelated source fields', () => {
  const bundle = buildWorkingTimeBundleFromCsv(
    resolve(fixtureDir, 'workingtime-sample.csv'),
    '2026-10-16T09:00:00Z'
  );
  assert.equal(bundle.records.length, 3);
  assert.equal(bundle.records[0].weekly_hours_value, 45);
  assert.equal(bundle.records[0].weekly_hours_bucket, null);
  assert.equal(bundle.records[0].measure_type, 'schedule_span_hours');
  assert.equal(bundle.records[0].comparability, 'context_only');
  assert.equal(bundle.records[0].publishable, false);
  assert.ok(bundle.records[0].issues.includes('schedule_span_not_actual_hours'));
  assert.ok(bundle.records[0].issues.includes('restricted_source_not_publishable'));
  assert.ok(bundle.records[2].issues.includes('unparsed_schedule'));
  assert.equal(bundle.records[2].weekly_hours_value, null);

  const serialized = JSON.stringify(bundle);
  assert.equal(serialized.includes('department'), false);
  assert.equal(serialized.includes('job'), false);
  assert.equal(serialized.includes('remark'), false);
  assert.equal(bundle.summary.publishable, 0);
  assert.equal(bundle.summary.canonical_candidates, 0);
});
