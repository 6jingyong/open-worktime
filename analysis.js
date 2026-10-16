export const METHODOLOGY_VERSION = 'manufacturing-v1';

const ROLE_WEIGHTS = {
  manufacturing_frontline: 1,
  manufacturing_support: 1,
  management: 0.25,
  sales: 0,
  corporate_function: 0,
  other_unknown: 0.5
};

export function deriveManufacturingAnalysis(report, context = {}) {
  const facilities = context.facilities ?? [];
  const facilityLinks = context.facilityLinks ?? [];
  const scopeCatalog = context.scopeCatalog ?? null;
  const flags = [];
  let weight = ROLE_WEIGHTS[report.work_role] ?? 0.5;

  if (report.work_role === 'manufacturing_frontline') flags.push('manufacturing_frontline');
  else if (report.work_role === 'manufacturing_support') flags.push('manufacturing_support');
  else if (report.work_role === 'management') flags.push('management_role');
  else if (report.work_role === 'sales') flags.push('sales_role');
  else if (report.work_role === 'corporate_function') flags.push('corporate_function_role');
  else flags.push('unknown_role');

  if (report.high_income_5x === 'yes') {
    weight = Math.min(weight, 0.25);
    flags.push('high_income_5x');
  }

  const facility = report.facility_id
    ? facilities.find((item) => item.id === report.facility_id) ?? null
    : null;
  const knownBrandFacility = report.facility_id
    ? facilityLinks.some((link) => link.brand_id === report.brand_id && link.facility_id === report.facility_id)
    : false;

  if (knownBrandFacility) {
    flags.push('known_brand_facility');
    flags.push('inside_curated_manufacturing_scope');
    return { weight, flags: unique(flags) };
  }

  const country = effectiveCountry(report, facility);
  const region = effectiveRegion(report, facility);
  const hasLocation = Boolean(country || region || report.facility_id || report.facility_text);

  if (!hasLocation) {
    flags.push('location_missing');
    return { weight, flags: unique(flags) };
  }

  const brandScope = scopeCatalog?.brands?.find((item) => item.brand_id === report.brand_id) ?? null;
  if (!brandScope) {
    flags.push('scope_not_curated');
    return { weight, flags: unique(flags) };
  }

  const insideScope = scopeMatches(brandScope, {
    facilityId: report.facility_id ?? null,
    country,
    region
  });

  if (insideScope) {
    flags.push('inside_curated_manufacturing_scope');
    return { weight, flags: unique(flags) };
  }

  if (brandScope.coverage === 'partial') {
    flags.push('scope_partial');
    return { weight, flags: unique(flags) };
  }

  weight = 0;
  flags.push('outside_curated_manufacturing_scope');
  return { weight, flags: unique(flags) };
}

export function buildReleaseAnalysis(report, context = {}) {
  const result = deriveManufacturingAnalysis(report, context);
  return {
    report_id: report.id,
    methodology_version: METHODOLOGY_VERSION,
    scope_version: context.scopeCatalog?.scope_version ?? 'unversioned',
    analysis_weight: result.weight,
    analysis_flags: result.flags
  };
}

export function effectiveCountry(report, facility = null) {
  if (report?.country) return String(report.country).trim().toUpperCase();
  return facility?.country ? String(facility.country).trim().toUpperCase() : null;
}

export function effectiveRegion(report, facility = null) {
  if (report?.work_region) return String(report.work_region).trim();
  return facility?.work_region ?? facility?.locality ?? facility?.subdivision_code ?? null;
}

export function normalizeRegion(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function scopeMatches(scope, location) {
  if (location.facilityId && (scope.facility_ids ?? []).includes(location.facilityId)) return true;

  const country = location.country ? String(location.country).toUpperCase() : null;
  const region = normalizeRegion(location.region);

  for (const candidate of scope.locations ?? []) {
    if (country && candidate.country !== country) continue;

    const aliases = (candidate.region_aliases ?? []).map(normalizeRegion);
    if (region) {
      if (aliases.includes(region)) return true;
      continue;
    }

    if (country && candidate.country === country) return true;
  }

  if (!country && region) {
    return (scope.locations ?? []).some((candidate) =>
      (candidate.region_aliases ?? []).map(normalizeRegion).includes(region)
    );
  }

  return false;
}

function unique(values) {
  return [...new Set(values)];
}
