import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBundle, hoursToBucket, parseCsv } from '../lib.mjs';

const here = fileURLToPath(new URL('../examples/', import.meta.url));

test('numeric weekly hours map to fixed buckets for observation data', () => {
  assert.equal(hoursToBucket(34.9), 'lt_35');
  assert.equal(hoursToBucket(35), '35_40');
  assert.equal(hoursToBucket(57), '55_60');
  assert.equal(hoursToBucket(75), 'gte_75');
});

test('CSV parser supports quotes and escaped quotes', () => {
  const rows = parseCsv('a,b\n"x,y","z""q"\n');
  assert.deepEqual(rows, [{ a: 'x,y', b: 'z"q' }]);
});

test('individual import creates one canonical candidate and preserves unresolved context', () => {
  const bundle = buildBundle(resolve(here, 'individual.manifest.json'), '2026-10-16T07:30:00Z');
  assert.equal(bundle.summary.total, 2);
  assert.equal(bundle.summary.canonical_candidates, 1);
  assert.equal(bundle.records[0].weekly_hours_bucket, '55_60');
  assert.equal(bundle.records[0].weekly_hours_value, null);
  assert.equal(bundle.records[0].comparability, 'canonical_candidate');
  assert.equal(bundle.records[1].comparability, 'distribution_context');
  assert.ok(bundle.records[1].issues.includes('unresolved_brand'));
  assert.equal(bundle.records[1].period_basis, 'typical_week');
  const serialized = JSON.stringify(bundle);
  assert.equal(serialized.includes('Alice Example'), false);
  assert.equal(serialized.includes('Bob Example'), false);
  assert.equal(serialized.includes('employee_name'), false);
});

test('aggregate import preserves counts instead of synthesizing people', () => {
  const bundle = buildBundle(resolve(here, 'aggregate.manifest.json'), '2026-10-16T07:30:00Z');
  assert.equal(bundle.records.length, 2);
  assert.deepEqual(bundle.records.map((row) => row.count), [18, 31]);
  assert.ok(bundle.records.every((row) => row.evidence_kind === 'aggregate'));
  assert.ok(bundle.records.every((row) => row.measure_type === 'weekly_hours_distribution_cell'));
  assert.ok(bundle.records.every((row) => row.comparability === 'distribution_context'));
  assert.equal(bundle.summary.canonical_candidates, 0);
});

test('aggregate mean weekly hours remain scalar rather than becoming fake distributions', () => {
  const bundle = buildBundle(resolve(here, 'mean.manifest.json'), '2026-10-16T07:30:00Z');
  assert.equal(bundle.records.length, 2);
  assert.equal(bundle.records[0].evidence_kind, 'aggregate_statistic');
  assert.equal(bundle.records[0].measure_type, 'mean_weekly_hours');
  assert.equal(bundle.records[0].weekly_hours_value, 46.2);
  assert.equal(bundle.records[0].weekly_hours_bucket, null);
  assert.equal(bundle.records[0].comparability, 'context_only');
  assert.equal(bundle.records[0].period_basis, 'annual_mean_actual_week');
  assert.equal(bundle.summary.aggregate_statistics, 2);
});

test('reuse status controls publication permission independently of comparability', () => {
  const bundle = buildBundle(resolve(here, 'individual.manifest.json'), '2026-10-16T07:30:00Z');
  assert.equal(bundle.source.reuse_status, 'redistributable');
  assert.ok(bundle.records.every((row) => row.publishable));
});
