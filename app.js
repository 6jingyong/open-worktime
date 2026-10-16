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

const STORAGE_KEY = 'open-worktime-local-reports-v0.1';

const state = {
  brands: [],
  demoDistribution: [],
  localReports: loadLocalReports(),
  selectedBrandId: null,
  employmentFilter: 'all'
};

const els = {
  brandSearch: document.querySelector('#brand-search'),
  brandSearchButton: document.querySelector('#brand-search-button'),
  brandOptions: document.querySelector('#brand-options'),
  brandName: document.querySelector('#brand-name'),
  brandMeta: document.querySelector('#brand-meta'),
  sampleCount: document.querySelector('#sample-count'),
  employmentFilters: document.querySelector('#employment-filters'),
  histogram: document.querySelector('#histogram'),
  shapeNote: document.querySelector('#shape-note'),
  reportForm: document.querySelector('#report-form'),
  reportBrand: document.querySelector('#report-brand'),
  reportCountry: document.querySelector('#report-country'),
  reportFacility: document.querySelector('#report-facility'),
  reportEmployment: document.querySelector('#report-employment'),
  reportHours: document.querySelector('#report-hours'),
  formStatus: document.querySelector('#form-status'),
  exportButton: document.querySelector('#export-button'),
  clearButton: document.querySelector('#clear-button')
};

boot();

async function boot() {
  try {
    const [brandsResponse, distributionResponse] = await Promise.all([
      fetch('./data/brands.json'),
      fetch('./data/demo-distribution.json')
    ]);

    if (!brandsResponse.ok || !distributionResponse.ok) {
      throw new Error('Failed to load prototype data.');
    }

    state.brands = await brandsResponse.json();
    state.demoDistribution = await distributionResponse.json();
    state.selectedBrandId = state.brands[0]?.id ?? null;

    populateBrandControls();
    populateEmploymentControls();
    populateHourControls();

    if (state.selectedBrandId) {
      selectBrand(state.selectedBrandId);
    }
  } catch (error) {
    els.brandName.textContent = 'Prototype data failed to load';
    els.brandMeta.textContent = 'Serve this repository over HTTP instead of opening index.html directly from the file system.';
    console.error(error);
  }
}

function populateBrandControls() {
  els.brandOptions.innerHTML = state.brands
    .map((brand) => `<option value="${escapeHtml(brand.name)}"></option>`)
    .join('');

  els.reportBrand.innerHTML = state.brands
    .map((brand) => `<option value="${brand.id}">${escapeHtml(brand.name)}</option>`)
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

function selectBrand(brandId) {
  const brand = state.brands.find((item) => item.id === brandId);
  if (!brand) return;

  state.selectedBrandId = brand.id;
  state.employmentFilter = 'all';
  els.brandSearch.value = brand.name;
  els.reportBrand.value = brand.id;
  renderEmploymentFilters();
  renderBrand();
  document.querySelector('#brand-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBrand() {
  const brand = state.brands.find((item) => item.id === state.selectedBrandId);
  if (!brand) return;

  const counts = aggregateCounts(brand.id, state.employmentFilter);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const maxCount = Math.max(1, ...counts);

  els.brandName.textContent = brand.name;
  els.brandMeta.textContent = `${brand.sector} · ${brand.home_country} · fictional demo entity`;
  els.sampleCount.textContent = total.toLocaleString();

  els.histogram.innerHTML = '';

  HOURS_BUCKETS.forEach((bucket, index) => {
    const count = counts[index];
    const share = total > 0 ? (count / total) * 100 : 0;
    const relativeWidth = total > 0 ? (count / maxCount) * 100 : 0;

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
  } else {
    els.shapeNote.hidden = true;
    els.shapeNote.textContent = '';
  }
}

function aggregateCounts(brandId, employmentFilter) {
  const counts = HOURS_BUCKETS.map(() => 0);

  for (const row of state.demoDistribution) {
    if (row.brand_id !== brandId) continue;
    if (employmentFilter !== 'all' && row.employment_type !== employmentFilter) continue;
    const index = HOURS_BUCKETS.findIndex((bucket) => bucket.id === row.weekly_hours_bucket);
    if (index >= 0) counts[index] += Number(row.count) || 0;
  }

  for (const report of state.localReports) {
    if (report.brand_id !== brandId) continue;
    if (employmentFilter !== 'all' && report.employment_type !== employmentFilter) continue;
    const index = HOURS_BUCKETS.findIndex((bucket) => bucket.id === report.weekly_hours_bucket);
    if (index >= 0) counts[index] += 1;
  }

  return counts;
}

function detectSeparatedPeaks(counts) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total < 30) return null;

  const peaks = [];
  for (let i = 0; i < counts.length; i += 1) {
    const left = i === 0 ? -1 : counts[i - 1];
    const right = i === counts.length - 1 ? -1 : counts[i + 1];
    const share = counts[i] / total;
    if (counts[i] > left && counts[i] >= right && share >= 0.14) {
      peaks.push(i);
    }
  }

  for (let a = 0; a < peaks.length; a += 1) {
    for (let b = a + 1; b < peaks.length; b += 1) {
      const first = peaks[a];
      const second = peaks[b];
      if (second - first < 2) continue;

      const valley = Math.min(...counts.slice(first + 1, second));
      const smallerPeak = Math.min(counts[first], counts[second]);
      if (valley <= smallerPeak * 0.45) {
        return 'Separated peaks detected. This can be real workforce segmentation (site, role, employment identity) or a sign of sample contamination. The chart is not automatically corrected; inspect the identity filters and future site-level data.';
      }
    }
  }

  return null;
}

function handleBrandSearch() {
  const query = els.brandSearch.value.trim().toLowerCase();
  if (!query) return;

  const exact = state.brands.find((brand) => brand.name.toLowerCase() === query);
  const partial = state.brands.find((brand) => brand.name.toLowerCase().includes(query));
  const match = exact ?? partial;

  if (match) {
    selectBrand(match.id);
  } else {
    els.brandSearch.setCustomValidity('No demo brand matched that search.');
    els.brandSearch.reportValidity();
    setTimeout(() => els.brandSearch.setCustomValidity(''), 0);
  }
}

els.brandSearchButton.addEventListener('click', handleBrandSearch);
els.brandSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleBrandSearch();
});

els.reportForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const country = els.reportCountry.value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    els.formStatus.textContent = 'Country / region must be a two-letter ISO code, such as CN, JP, or DE.';
    return;
  }

  const report = {
    schema_version: '0.1',
    id: globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    brand_id: els.reportBrand.value,
    country,
    facility_id: els.reportFacility.value.trim() || null,
    employment_type: els.reportEmployment.value,
    weekly_hours_bucket: els.reportHours.value,
    observed_at: new Date().toISOString(),
    source: 'local_prototype'
  };

  state.localReports.push(report);
  saveLocalReports();
  selectBrand(report.brand_id);
  els.formStatus.textContent = 'Added locally. This prototype has not uploaded anything to a server.';
  els.reportFacility.value = '';
});

els.exportButton.addEventListener('click', () => {
  const payload = {
    export_version: '0.1',
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
  renderBrand();
  els.formStatus.textContent = 'Local prototype submissions cleared.';
});

function loadLocalReports() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.localReports));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
