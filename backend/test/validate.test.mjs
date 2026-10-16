import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndNormalizeSubmission } from '../src/validate.js';

function validSubmission(overrides = {}) {
  return {
    schema_version: '0.4',
    brand_id: 'bt-puma',
    country: 'cn',
    work_region: ' Jiangsu ',
    facility_id: 'osh-CN2021159RK49KG',
    facility_text: null,
    employment_type: 'labor_dispatch',
    work_role: 'manufacturing_frontline',
    high_income_5x: 'no',
    weekly_hours_bucket: '55_60',
    period_basis: 'last_4_complete_weeks',
    ...overrides
  };
}

test('accepts and normalizes a valid v0.4 submission', () => {
  const result = validateAndNormalizeSubmission(validSubmission());
  assert.equal(result.ok, true);
  assert.equal(result.value.country, 'CN');
  assert.equal(result.value.work_region, 'Jiangsu');
});

test('keeps geography optional', () => {
  const result = validateAndNormalizeSubmission(validSubmission({
    country: '',
    work_region: '',
    facility_id: null
  }));
  assert.equal(result.ok, true);
  assert.equal(result.value.country, null);
  assert.equal(result.value.work_region, null);
});

test('rejects unexpected fields including client-supplied analysis weight', () => {
  const result = validateAndNormalizeSubmission(validSubmission({
    analysis_weight: 1
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.field === 'analysis_weight' && item.code === 'unexpected_field'));
});

test('rejects canonical and fallback facility fields at the same time', () => {
  const result = validateAndNormalizeSubmission(validSubmission({
    facility_text: 'some typed factory'
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === 'canonical_and_fallback_conflict'));
});

test('rejects narrative-like control characters in coarse text fields', () => {
  const result = validateAndNormalizeSubmission(validSubmission({
    work_region: 'Shanghai\nprivate detail'
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.field === 'work_region' && item.code === 'invalid_text'));
});
