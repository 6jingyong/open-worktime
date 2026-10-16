import { validateAndNormalizeSubmission } from './validate.js';

const MAX_BODY_BYTES = 4096;
const REPORT_INSERT_SQL = `
  INSERT INTO intake_reports (
    id,
    schema_version,
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
    source,
    moderation_state
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'community_report', 'pending')
`;

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const originCheck = checkOrigin(request, env);

  if (!originCheck.allowed) {
    return jsonResponse(
      { error: 'origin_not_allowed' },
      403,
      originCheck.headers
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: originCheck.headers
    });
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    return jsonResponse(
      {
        status: 'ok',
        schema_version: '0.4',
        intake: writesEnabled(env) ? 'enabled' : 'disabled'
      },
      200,
      originCheck.headers
    );
  }

  if (request.method === 'POST' && url.pathname === '/v1/reports') {
    return handleReportPost(request, env, originCheck.headers);
  }

  return jsonResponse({ error: 'not_found' }, 404, originCheck.headers);
}

async function handleReportPost(request, env, corsHeaders) {
  if (!writesEnabled(env)) {
    return jsonResponse({ error: 'intake_disabled' }, 503, corsHeaders);
  }

  if (!env.DB || typeof env.DB.prepare !== 'function') {
    return jsonResponse({ error: 'storage_unavailable' }, 503, corsHeaders);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'json_required' }, 415, corsHeaders);
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'payload_too_large' }, 413, corsHeaders);
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return jsonResponse({ error: 'body_read_failed' }, 400, corsHeaders);
  }

  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'payload_too_large' }, 413, corsHeaders);
  }

  let input;
  try {
    input = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, corsHeaders);
  }

  const validation = validateAndNormalizeSubmission(input);
  if (!validation.ok) {
    return jsonResponse(
      {
        error: 'invalid_submission',
        fields: validation.errors
      },
      422,
      corsHeaders
    );
  }

  const report = validation.value;
  const receiptId = `rpt_${crypto.randomUUID()}`;
  const submittedAt = new Date().toISOString();

  try {
    const result = await env.DB
      .prepare(REPORT_INSERT_SQL)
      .bind(
        receiptId,
        report.schema_version,
        report.brand_id,
        report.country,
        report.work_region,
        report.facility_id,
        report.facility_text,
        report.employment_type,
        report.work_role,
        report.high_income_5x,
        report.weekly_hours_bucket,
        report.period_basis,
        submittedAt
      )
      .run();

    if (result && result.success === false) {
      throw new Error('D1 write was not successful');
    }
  } catch (error) {
    console.error('intake write failed', error);
    return jsonResponse({ error: 'storage_unavailable' }, 503, corsHeaders);
  }

  return jsonResponse(
    {
      status: 'pending',
      receipt_id: receiptId,
      received_at: submittedAt
    },
    202,
    corsHeaders
  );
}

function writesEnabled(env) {
  return String(env.WRITE_ENABLED ?? '').toLowerCase() === 'true';
}

function checkOrigin(request, env) {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set(
    String(env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  const baseHeaders = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
    'cache-control': 'no-store',
    vary: 'Origin'
  };

  if (!origin) {
    return { allowed: true, headers: baseHeaders };
  }

  if (!allowedOrigins.has(origin)) {
    return { allowed: false, headers: baseHeaders };
  }

  return {
    allowed: true,
    headers: {
      ...baseHeaders,
      'access-control-allow-origin': origin
    }
  };
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}
