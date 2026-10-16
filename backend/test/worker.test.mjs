import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/index.js';

function validSubmission(overrides = {}) {
  return {
    schema_version: '0.4',
    brand_id: 'bt-puma',
    country: 'CN',
    work_region: 'Jiangsu',
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

class FakeD1 {
  constructor() {
    this.rows = [];
  }

  prepare(sql) {
    return {
      bind: (...args) => ({
        run: async () => {
          this.rows.push({ sql, args });
          return { success: true };
        }
      })
    };
  }
}

test('health is available while writes remain disabled', async () => {
  const response = await handleRequest(
    new Request('https://api.example.test/health'),
    { WRITE_ENABLED: 'false' }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.intake, 'disabled');
});

test('POST refuses writes until explicitly enabled', async () => {
  const response = await handleRequest(
    new Request('https://api.example.test/v1/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validSubmission())
    }),
    { WRITE_ENABLED: 'false', DB: new FakeD1() }
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'intake_disabled');
});

test('valid report is stored pending and response only exposes receipt metadata', async () => {
  const db = new FakeD1();
  const response = await handleRequest(
    new Request('https://api.example.test/v1/reports', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://6jingyong.github.io'
      },
      body: JSON.stringify(validSubmission())
    }),
    {
      WRITE_ENABLED: 'true',
      ALLOWED_ORIGINS: 'https://6jingyong.github.io',
      DB: db
    }
  );

  assert.equal(response.status, 202);
  assert.equal(db.rows.length, 1);
  const body = await response.json();
  assert.equal(body.status, 'pending');
  assert.match(body.receipt_id, /^rpt_[0-9a-f-]+$/i);
  assert.equal('brand_id' in body, false);
  assert.equal('work_region' in body, false);
  assert.equal(db.rows[0].args[2], 'bt-puma');
});

test('disallowed browser origin is blocked before write', async () => {
  const db = new FakeD1();
  const response = await handleRequest(
    new Request('https://api.example.test/v1/reports', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example'
      },
      body: JSON.stringify(validSubmission())
    }),
    {
      WRITE_ENABLED: 'true',
      ALLOWED_ORIGINS: 'https://6jingyong.github.io',
      DB: db
    }
  );

  assert.equal(response.status, 403);
  assert.equal(db.rows.length, 0);
});

test('invalid submission returns field-only validation errors and is not stored', async () => {
  const db = new FakeD1();
  const response = await handleRequest(
    new Request('https://api.example.test/v1/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validSubmission({ analysis_weight: 1 }))
    }),
    {
      WRITE_ENABLED: 'true',
      DB: db
    }
  );

  assert.equal(response.status, 422);
  assert.equal(db.rows.length, 0);
  const body = await response.json();
  assert.equal(body.error, 'invalid_submission');
  assert.ok(body.fields.some((item) => item.field === 'analysis_weight'));
  assert.equal(JSON.stringify(body).includes('Jiangsu'), false);
});
