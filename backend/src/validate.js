const REQUIRED_FIELDS = [
  'schema_version',
  'brand_id',
  'country',
  'work_region',
  'facility_id',
  'facility_text',
  'employment_type',
  'work_role',
  'high_income_5x',
  'weekly_hours_bucket',
  'period_basis'
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);

const EMPLOYMENT_TYPES = new Set([
  'direct_contract',
  'labor_dispatch',
  'labor_outsource',
  'onsite_service',
  'other_unknown'
]);

const WORK_ROLES = new Set([
  'manufacturing_frontline',
  'manufacturing_support',
  'management',
  'sales',
  'corporate_function',
  'other_unknown'
]);

const HIGH_INCOME_VALUES = new Set(['no', 'yes', 'unknown']);

const HOURS_BUCKETS = new Set([
  'lt_35',
  '35_40',
  '40_45',
  '45_50',
  '50_55',
  '55_60',
  '60_65',
  '65_70',
  '70_75',
  'gte_75'
]);

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export function validateAndNormalizeSubmission(input) {
  const errors = [];

  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [{ field: '$', code: 'object_required' }],
      value: null
    };
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({ field: key, code: 'unexpected_field' });
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in input)) errors.push({ field, code: 'required' });
  }

  const normalized = {
    schema_version: normalizeScalar(input.schema_version),
    brand_id: normalizeScalar(input.brand_id),
    country: normalizeNullable(input.country, { uppercase: true }),
    work_region: normalizeNullable(input.work_region),
    facility_id: normalizeNullable(input.facility_id),
    facility_text: normalizeNullable(input.facility_text),
    employment_type: normalizeScalar(input.employment_type),
    work_role: normalizeScalar(input.work_role),
    high_income_5x: normalizeScalar(input.high_income_5x),
    weekly_hours_bucket: normalizeScalar(input.weekly_hours_bucket),
    period_basis: normalizeScalar(input.period_basis)
  };

  requireExact(normalized.schema_version, '0.4', 'schema_version', errors);
  validateId(normalized.brand_id, 'brand_id', 160, errors);
  validateNullableCountry(normalized.country, errors);
  validateNullableText(normalized.work_region, 'work_region', 80, errors);
  validateNullableId(normalized.facility_id, 'facility_id', 200, errors);
  validateNullableText(normalized.facility_text, 'facility_text', 200, errors);
  validateEnum(normalized.employment_type, EMPLOYMENT_TYPES, 'employment_type', errors);
  validateEnum(normalized.work_role, WORK_ROLES, 'work_role', errors);
  validateEnum(normalized.high_income_5x, HIGH_INCOME_VALUES, 'high_income_5x', errors);
  validateEnum(normalized.weekly_hours_bucket, HOURS_BUCKETS, 'weekly_hours_bucket', errors);
  requireExact(normalized.period_basis, 'last_4_complete_weeks', 'period_basis', errors);

  if (normalized.facility_id && normalized.facility_text) {
    errors.push({ field: 'facility_text', code: 'canonical_and_fallback_conflict' });
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? normalized : null
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeScalar(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeNullable(value, options = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return options.uppercase ? trimmed.toUpperCase() : trimmed;
}

function requireExact(value, expected, field, errors) {
  if (value !== expected) errors.push({ field, code: 'invalid_value' });
}

function validateId(value, field, maxLength, errors) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength || !ID_PATTERN.test(value)) {
    errors.push({ field, code: 'invalid_identifier' });
  }
}

function validateNullableId(value, field, maxLength, errors) {
  if (value === null) return;
  validateId(value, field, maxLength, errors);
}

function validateNullableCountry(value, errors) {
  if (value === null) return;
  if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value)) {
    errors.push({ field: 'country', code: 'invalid_country' });
  }
}

function validateNullableText(value, field, maxLength, errors) {
  if (value === null) return;
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > maxLength ||
    CONTROL_CHAR_PATTERN.test(value)
  ) {
    errors.push({ field, code: 'invalid_text' });
  }
}

function validateEnum(value, allowed, field, errors) {
  if (typeof value !== 'string' || !allowed.has(value)) {
    errors.push({ field, code: 'invalid_value' });
  }
}
