const HOURS_BUCKETS = [
  { id: 'lt_35', label: '<35' },
  { id: '35_40', label: '35–<40' },
  { id: '40_45', label: '40–<45' },
  { id: '45_50', label: '45–<50' },
  { id: '50_55', label: '50–<55' },
  { id: '55_60', label: '55–<60' },
  { id: '60_65', label: '60–<65' },
  { id: '65_70', label: '65–<70' },
  { id: '70_75', label: '70–<75' },
  { id: 'gte_75', label: '75+' }
];

const EMPLOYMENT_TYPES = [
  { id: 'direct_contract', label: 'Direct contract', zh: '合同工 / 直接雇佣' },
  { id: 'labor_dispatch', label: 'Labor dispatch', zh: '劳务派遣' },
  { id: 'labor_outsource', label: 'Labor outsourcing', zh: '劳务外包' },
  { id: 'onsite_service', label: 'On-site service', zh: '驻场售后 / 服务' },
  { id: 'other_unknown', label: 'Other / unknown', zh: '其他 / 不确定' }
];

const STORAGE_KEY = 'open-worktime-local-reports-v0.3';
const LEGACY_STORAGE_KEY_V02 = 'open-worktime-local-reports-v0.2';
const LEGACY_STORAGE_KEY_V01 = 'open-worktime-local-reports-v0.1';
const PERIOD_BASIS = 'last_4_complete_weeks';

const state = {
  brands: [],
  companies: [],
  facilities: [],
  demoDistribution: [],
  localReports: loadLocalReports(),
  selectedBrandId: null,
  employmentFilter: 'all',
  geographyFilter: 'all'
};

const els = {
  brandSearch: document.querySelector('#brand-search'),
  brandSearchButton: document.querySelector('#brand-search-button'),
  brandOptions: document.querySelector('#brand-options'),
  brandName: document.querySelector('#brand-name'),
  brandMeta: document.querySelector('#brand-meta'),
  brandSource: document.querySelector('#brand-source'),
  sampleCount: document.querySelector('#sample-count'),
  employmentFilters: document.querySelector('#employment-filters'),
  geographyFilters: document.querySelector('#geography-filters'),
  histogram: document.querySelector('#histogram'),
  shapeNote: document.querySelector('#shape-note'),
  reportForm: document.querySelector('#report-form'),
  reportBrand: document.querySelector('#report-brand'),
  reportCountry: document.querySelector('#report-country'),
  reportSubdivision: document.querySelector('#report-subdivision'),
  reportFacility: document.querySelector('#report-facility'),
  reportEmployment: document.querySelector('#report-employment'),
  reportHours: document.querySelector('#report-hours'),
  formStatus: document.querySelector('#form-status'),
  recordPreview: document.querySelector('#record-preview'),
  exportButton: document.querySelector('#export-button'),
  clearButton: document.querySelector('#clear-button')
};

boot();

async function boot() {
  try {
    const [brandsResponse, companiesResponse, facilitiesResponse, distributionResponse] = await Promise.all([
      fetch('./data/brands.json'),
      fetch('./data/companies.json'),
      fetch('./data/facilities.json'),
      fetch('./data/demo-distribution.json')
    ]);

    if (!brandsResponse.ok || !companiesResponse.ok || !facilitiesResponse.ok || !distributionResponse.ok) {
      throw new Error('Failed to load prototype data.');
    }

    state.brands = await brandsResponse.json();
    state.companies = await companiesResponse.json();
    state.facilities = await facilitiesResponse.json();
    state.demoDistribution = await distributionResponse.json();
    state.selectedBrandId = state.brands.find((brand) => brand.demo)?.id ?? state.brands[0]?.id ?? null;

    populateBrandControls();
    populateEmploymentControls();
    populateHourControls();
    renderRecordPreview(state.localReports.length ? toSubmissionPayload(state.localReports.at(-1)) : null);

    if (state.selectedBrandId) selectBrand(state.selectedBrandId);
  } catch (error) {
    els.brandName.textContent = 'Prototype data failed to load';
    els.brandMeta.textContent = 'Serve this repository over HTTP instead of opening index.html directly from the file system.';
    console.error(error);
  }
}

function populateBrandControls() {
  const sorted = [...state.brands].sort((a, b) => {
    if (a.demo !== b.demo) return Number(a.demo) - Number(b.demo);
    return a.name.localeCompare(b.name);
  });

  els.brandOptions.innerHTML = sorted
    .map((brand) => {
      const owner = getOwner(brand);
      const hint = brand.demo ? 'fictional demo' : owner?.short_name ?? owner?.name ?? brand.origin_country;
      return `<option value="${escapeHtml(brand.name)}" label="${escapeHtml(hint)}"></option>`;
    })
    .join('');

  els.reportBrand.innerHTML = sorted
    .map((brand) => `<option value="${escapeHtml(brand.id)}">${escapeHtml(brand.name)}${brand.demo ? ' · demo' : ''}</option>`)
    .join('');
}

function populateEmploymentControls() {
  els.reportEmployment.innerHTML = EMPLOYMENT_TYPES
    .map((type) => `<option value="${type.id}">${type.label} · ${type.zh}</option>`)
    .join('');
  renderEmploymentFilters();
}

function populateHourControls() {
  els.reportHours.innerHTML = HOURS_BUCKETS
    .map((bucket) => `<option value="${bucket.id}">${bucket.label} h/week</option>`)
    .join('');
}

function renderEmploymentFilters() {
  const filters = [
    { id: 'all', label: 'All workers' },
    ...EMPLOYMENT_TYPES.map((type) => ({ id: type.id, label: type.label }))
  ];

  els.employmentFilters.innerHTML = '';
  for (const filter of filters) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip${state.employmentFilter === filter.id ? ' active' : ''}`;
    button.textContent = filter.label;
    button.addEventListener('click', () => {
      state.employmentFilter = filter.id;
      renderEmploymentFilters();
      renderBrand();
    });
    els.employmentFilters.appendChild(button);
  }
}

function renderGeographyFilters() {
  if (!els.geographyFilters) return;

  const filters = [{ id: 'all', label: 'All regions' }, ...collectBrandGeographies(state.selectedBrandId)];
  els.geographyFilters.innerHTML = '';

  for (const filter of filters) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip${state.geographyFilter === filter.id ? ' active' : ''}`;
    button.textContent = filter.label;
    button.addEventListener('click', () => {
      state.geographyFilter = filter.id;
      renderGeographyFilters();
      renderBrand();
    });
    els.geographyFilters.appendChild(button);
  }
}

function collectBrandGeographies(brandId) {
  if (!brandId) return [];
  const countries = new Set();
  const subdivisions = new Set();

  const rows = [
    ...state.demoDistribution.filter((row) => row.brand_id === brandId),
    ...state.localReports.filter((row) => row.brand_id === brandId)
  ];

  for (const row of rows) {
    if (row.country) countries.add(row.country);
    const subdivision = effectiveSubdivision(row);
    if (subdivision) subdivisions.add(subdivision);
  }

  return [
    ...[...countries].sort().map((code) => ({ id: `country:${code}`, label: code })),
    ...[...subdivisions].sort().map((code) => ({ id: `subdivision:${code}`, label: code }))
  ];
}

function selectBrand(brandId) {
  const brand = state.brands.find((item) => item.id === brandId);
  if (!brand) return;

  state.selectedBrandId = brand.id;
  state.employmentFilter = 'all';
  state.geographyFilter = 'all';
  els.brandSearch.value = brand.name;
  els.reportBrand.value = brand.id;
  renderEmploymentFilters();
  renderGeographyFilters();
  renderBrand();
  document.querySelector('#brand-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBrand() {
  const brand = state.brands.find((item) => item.id === state.selectedBrandId);
  if (!brand) return;

  const owner = getOwner(brand);
  const counts = aggregateCounts(brand.id, state.employmentFilter, state.geographyFilter);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const maxCount = Math.max(1, ...counts);

  els.brandName.textContent = brand.name;
  els.sampleCount.textContent = total.toLocaleString();

  if (brand.demo) {
    els.brandMeta.textContent = `${brand.sector} · ${brand.home_country} · fictional demo entity`;
    setBrandSource(null, 'Fictional demo entity. No real-world claim.');
  } else {
    const ownerText = owner ? `${owner.short_name} (${owner.hq_country})` : 'owner not resolved';
    els.brandMeta.textContent = `${brand.sector} · origin ${brand.origin_country} · current owner ${ownerText}`;
    setBrandSource(
      brand.source?.url ?? null,
      `Entity metadata: ${brand.source?.provider ?? 'external catalog'} · ${brand.source?.license ?? 'source license'}${brand.source?.verified_at ? ` · verified ${brand.source.verified_at}` : ''}`
    );
  }

  els.histogram.innerHTML = '';
  els.shapeNote.hidden = true;
  els.shapeNote.textContent = '';

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-chart';
    empty.innerHTML = `
      <strong>No working-time observations under the current filters.</strong>
      <span>${brand.demo ? 'This demo entity may not have geography metadata for every bundled row.' : 'Entity metadata can exist without any labor-condition observation for this brand or region.'}</span>
    `;
    els.histogram.appendChild(empty);
    return;
  }

  HOURS_BUCKETS.forEach((bucket, index) => {
    const count = counts[index];
    const share = (count / total) * 100;
    const relativeWidth = (count / maxCount) * 100;

    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <span class="hist-label">${bucket.label}</span>
      <div class="hist-track" title="${count} observations · ${share.toFixed(1)}%">
        <div class="hist-fill" style="width: ${relativeWidth.toFixed(2)}%"></div>
      </div>
      <span class="hist-value">${count} · ${share.toFixed(1)}%</span>
    `;
    els.histogram.appendChild(row);
  });

  const shapeWarning = detectSeparatedPeaks(counts);
  if (shapeWarning) {
    els.shapeNote.hidden = false;
    els.shapeNote.textContent = shapeWarning;
  }
}

function setBrandSource(url, text) {
  if (!els.brandSource) return;
  els.brandSource.textContent = '';
  if (!url) {
    els.brandSource.textContent = text;
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = text;
  els.brandSource.appendChild(link);
}

function getOwner(brand) {
  if (!brand?.owner_company_id) return null;
  return state.companies.find((company) => company.id === brand.owner_company_id) ?? null;
}

function aggregateCounts(brandId, employmentFilter, geographyFilter) {
  const counts = HOURS_BUCKETS.map(() => 0);

  for (const row of state.demoDistribution) {
    if (row.brand_id !== brandId) continue;
    if (employmentFilter !== 'all' && row.employment_type !== employmentFilter) continue;
    if (!matchesGeography(row, geographyFilter)) continue;
    const index = HOURS_BUCKETS.findIndex((bucket) => bucket.id === row.weekly_hours_bucket);
    if (index >= 0) counts[index] += Number(row.count) || 0;
  }

  for (const report of state.localReports) {
    if (report.brand_id !== brandId) continue;
    if (employmentFilter !== 'all' && report.employment_type !== employmentFilter) continue;
    if (!matchesGeography(report, geographyFilter)) continue;
    const index = HOURS_BUCKETS.findIndex((bucket) => bucket.id === report.weekly_hours_bucket);
    if (index >= 0) counts[index] += 1;
  }

  return counts;
}

function matchesGeography(row, filter) {
  if (filter === 'all') return true;
  if (filter.startsWith('country:')) return row.country === filter.slice('country:'.length);
  if (filter.startsWith('subdivision:')) return effectiveSubdivision(row) === filter.slice('subdivision:'.length);
  return false;
}

function effectiveSubdivision(row) {
  if (row?.subdivision_code) return row.subdivision_code;
  if (!row?.facility_id) return null;
  return state.facilities.find((facility) => facility.id === row.facility_id)?.subdivision_code ?? null;
}

function detectSeparatedPeaks(counts) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total < 30) return null;

  const peaks = [];
  for (let i = 0; i < counts.length; i += 1) {
    const left = i === 0 ? -1 : counts[i - 1];
    const right = i === counts.length - 1 ? -1 : counts[i + 1];
    const share = counts[i] / total;
    if (counts[i] > left && counts[i] >= right && share >= 0.14) peaks.push(i);
  }

  for (let a = 0; a < peaks.length; a += 1) {
    for (let b = a + 1; b < peaks.length; b += 1) {
      const first = peaks[a];
      const second = peaks[b];
      if (second - first < 2) continue;

      const valley = Math.min(...counts.slice(first + 1, second));
      const smallerPeak = Math.min(counts[first], counts[second]);
      if (valley <= smallerPeak * 0.45) {
        return 'Separated peaks detected. This can be real workforce segmentation (site, role, employment identity, or region) or a sign of sample contamination. The chart is not automatically corrected; inspect identity and geography filters.';
      }
    }
  }

  return null;
}

function brandSearchText(brand) {
  const owner = getOwner(brand);
  return [
    brand.name,
    ...(brand.aliases ?? []),
    owner?.name,
    owner?.short_name
  ].filter(Boolean).join(' ').toLowerCase();
}

function handleBrandSearch() {
  const query = els.brandSearch.value.trim().toLowerCase();
  if (!query) return;

  const exact = state.brands.find((brand) => brand.name.toLowerCase() === query || (brand.aliases ?? []).some((alias) => alias.toLowerCase() === query));
  const partial = state.brands.find((brand) => brandSearchText(brand).includes(query));
  const match = exact ?? partial;

  if (match) {
    selectBrand(match.id);
  } else {
    els.brandSearch.setCustomValidity('No catalog brand matched that search.');
    els.brandSearch.reportValidity();
    setTimeout(() => els.brandSearch.setCustomValidity(''), 0);
  }
}

els.brandSearchButton.addEventListener('click', handleBrandSearch);
els.brandSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleBrandSearch();
});

els.reportFacility.addEventListener('input', () => {
  const knownFacility = resolveKnownFacility(els.reportFacility.value.trim());
  if (!knownFacility) return;
  els.reportCountry.value = knownFacility.country;
  if (els.reportSubdivision && knownFacility.subdivision_code) {
    els.reportSubdivision.value = knownFacility.subdivision_code;
  }
});

els.reportForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const country = els.reportCountry.value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    els.formStatus.textContent = 'Country must be a two-letter ISO code, such as CN, US, or DE.';
    return;
  }

  const facilityInput = els.reportFacility.value.trim();
  const knownFacility = resolveKnownFacility(facilityInput);
  if (knownFacility && knownFacility.country !== country) {
    els.formStatus.textContent = `That known facility is cataloged in ${knownFacility.country}. Please use the matching country code or clear the facility.`;
    return;
  }

  const rawSubdivision = els.reportSubdivision?.value.trim().toUpperCase() ?? '';
  const subdivisionCode = knownFacility?.subdivision_code ?? (rawSubdivision || null);

  if (subdivisionCode && !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(subdivisionCode)) {
    els.formStatus.textContent = 'Region must use an ISO 3166-2 code such as CN-SH, US-TX, or DE-BB.';
    return;
  }

  if (subdivisionCode && !subdivisionCode.startsWith(`${country}-`)) {
    els.formStatus.textContent = `Region ${subdivisionCode} does not match country ${country}.`;
    return;
  }

  if (knownFacility?.subdivision_code && rawSubdivision && rawSubdivision !== knownFacility.subdivision_code) {
    els.formStatus.textContent = `That known facility is cataloged in ${knownFacility.subdivision_code}.`;
    return;
  }

  const submission = {
    schema_version: '0.3',
    brand_id: els.reportBrand.value,
    country,
    subdivision_code: subdivisionCode,
    facility_id: knownFacility?.id ?? null,
    facility_text: facilityInput && !knownFacility ? facilityInput : null,
    employment_type: els.reportEmployment.value,
    weekly_hours_bucket: els.reportHours.value,
    period_basis: PERIOD_BASIS
  };

  const report = {
    ...submission,
    id: globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    submitted_at: new Date().toISOString(),
    source: 'local_prototype'
  };

  state.localReports.push(report);
  saveLocalReports();
  renderRecordPreview(submission);
  selectBrand(report.brand_id);
  els.formStatus.textContent = 'Saved locally. Region is coarse by design; no precise worker location is collected. Nothing was uploaded.';
  els.reportFacility.value = '';
});

els.exportButton.addEventListener('click', () => {
  const payload = {
    export_version: '0.3',
    exported_at: new Date().toISOString(),
    reports: state.localReports
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `open-worktime-local-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  els.formStatus.textContent = `Exported ${state.localReports.length} local observation(s).`;
});

els.clearButton.addEventListener('click', () => {
  if (state.localReports.length === 0) {
    els.formStatus.textContent = 'There are no local prototype submissions to clear.';
    return;
  }

  if (!window.confirm('Clear all local prototype submissions stored in this browser?')) return;
  state.localReports = [];
  saveLocalReports();
  renderGeographyFilters();
  renderBrand();
  renderRecordPreview(null);
  els.formStatus.textContent = 'Local prototype submissions cleared.';
});

function resolveKnownFacility(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return state.facilities.find((facility) =>
    facility.id.toLowerCase() === normalized ||
    String(facility.os_id ?? '').toLowerCase() === normalized
  ) ?? null;
}

function toSubmissionPayload(report) {
  if (!report) return null;
  return {
    schema_version: '0.3',
    brand_id: report.brand_id,
    country: report.country,
    subdivision_code: effectiveSubdivision(report),
    facility_id: report.facility_id ?? null,
    facility_text: report.facility_text ?? null,
    employment_type: report.employment_type,
    weekly_hours_bucket: report.weekly_hours_bucket,
    period_basis: PERIOD_BASIS
  };
}

function renderRecordPreview(payload) {
  if (!els.recordPreview) return;
  if (!payload) {
    els.recordPreview.textContent = 'No local report yet.';
    return;
  }

  els.recordPreview.textContent = JSON.stringify(payload, null, 2);
}

function loadLocalReports() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current);
      return Array.isArray(parsed) ? parsed : [];
    }

    for (const legacyKey of [LEGACY_STORAGE_KEY_V02, LEGACY_STORAGE_KEY_V01]) {
      const legacy = localStorage.getItem(legacyKey);
      if (!legacy) continue;
      const parsedLegacy = JSON.parse(legacy);
      if (!Array.isArray(parsedLegacy)) continue;
      const migrated = parsedLegacy.map(migrateLegacyReport);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return [];
  } catch {
    return [];
  }
}

function migrateLegacyReport(report) {
  const rawFacility = String(report.facility_id ?? '').trim();
  const looksCanonical = rawFacility.startsWith('osh-');
  return {
    schema_version: '0.3',
    id: report.id ?? `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    brand_id: report.brand_id,
    country: report.country,
    subdivision_code: report.subdivision_code ?? null,
    facility_id: looksCanonical ? rawFacility : null,
    facility_text: report.facility_text ?? (rawFacility && !looksCanonical ? rawFacility : null),
    employment_type: report.employment_type,
    weekly_hours_bucket: report.weekly_hours_bucket,
    period_basis: PERIOD_BASIS,
    submitted_at: report.submitted_at ?? report.observed_at ?? new Date().toISOString(),
    source: 'local_prototype'
  };
}

function saveLocalReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.localReports));
  window.dispatchEvent(new CustomEvent('open-worktime:reports-changed'));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
