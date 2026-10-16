import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAcceptedExportSql,
  buildModerationSql,
  buildPendingSql,
  extractRows,
  makeAcceptedExport,
  normalizeCutoff,
  normalizeLimit
} from '../operator/lib.mjs';

const ID = 'rpt_123e4567-e89b-42d3-a456-426614174000';

test('pending list uses a bounded integer limit', () => {
  assert.match(buildPendingSql(25), /LIMIT 25;/);
  assert.equal(normalizeLimit(undefined), 50);
  assert.throws(() => normalizeLimit(0));
  assert.throws(() => normalizeLimit(501));
});

test('accept transition is pending-only and uses accepted_valid reason', () => {
  const sql = buildModerationSql({
    id: ID,
    action: 'accept',
    reviewedAt: '2026-10-16T08:00:00Z'
  });
  assert.match(sql, /moderation_state = 'accepted'/);
  assert.match(sql, /moderation_reason = 'accepted_valid'/);
  assert.match(sql, /AND moderation_state = 'pending'/);
});

test('reject reasons are limited to abuse/data-quality reasons', () => {
  const sql = buildModerationSql({
    id: ID,
    action: 'reject',
    reason: 'spam',
    reviewedAt: '2026-10-16T08:00:00Z'
  });
  assert.match(sql, /moderation_state = 'rejected'/);
  assert.match(sql, /moderation_reason = 'spam'/);

  for (const forbidden of ['sales', 'management', 'high_income', 'location_mismatch']) {
    assert.throws(() => buildModerationSql({ id: ID, action: 'reject', reason: forbidden }));
  }
});

test('invalid receipt ids cannot become SQL fragments', () => {
  assert.throws(() => buildModerationSql({
    id: "rpt_x'; DROP TABLE intake_reports; --",
    action: 'accept'
  }));
});

test('accepted export query freezes an explicit cutoff', () => {
  const cutoff = normalizeCutoff('2026-10-01T00:00:00+09:00');
  assert.equal(cutoff, '2026-09-30T15:00:00.000Z');
  const sql = buildAcceptedExportSql(cutoff);
  assert.match(sql, /moderation_state = 'accepted'/);
  assert.match(sql, /submitted_at <= '2026-09-30T15:00:00.000Z'/);
  assert.doesNotMatch(sql, /moderation_reason/);
  assert.doesNotMatch(sql, /reviewed_at/);
});

test('wrangler json rows can be extracted from common result shapes', () => {
  assert.deepEqual(extractRows([{ results: [{ id: ID }] }]), [{ id: ID }]);
  assert.deepEqual(extractRows({ result: { results: [{ id: ID }] } }), [{ id: ID }]);
});

test('public accepted export contains raw observation fields only', () => {
  const payload = makeAcceptedExport([
    {
      schema_version: '0.4',
      id: ID,
      brand_id: 'bt-puma',
      country: 'CN',
      work_region: 'Jiangsu',
      facility_id: null,
      facility_text: null,
      employment_type: 'labor_dispatch',
      work_role: 'manufacturing_frontline',
      high_income_5x: 'no',
      weekly_hours_bucket: '55_60',
      period_basis: 'last_4_complete_weeks',
      submitted_at: '2026-09-01T00:00:00.000Z',
      source: 'community_report',
      moderation_state: 'accepted',
      moderation_reason: 'accepted_valid',
      reviewed_at: '2026-09-02T00:00:00.000Z'
    }
  ], {
    cutoff: '2026-10-01T00:00:00Z',
    exportedAt: '2026-10-02T00:00:00Z'
  });

  assert.equal(payload.report_count, 1);
  assert.equal(payload.reports[0].id, ID);
  assert.equal('moderation_state' in payload.reports[0], false);
  assert.equal('moderation_reason' in payload.reports[0], false);
  assert.equal('reviewed_at' in payload.reports[0], false);
  assert.equal('analysis_weight' in payload.reports[0], false);
});
