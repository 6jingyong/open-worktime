const GEO_HOURS_BUCKETS = [
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

const GEO_EMPLOYMENT_TYPES = [
  { id: 'all', label: 'All employment types' },
  { id: 'direct_contract', label: 'Direct contract' },
  { id: 'labor_dispatch', label: 'Labor dispatch' },
  { id: 'labor_outsource', label: 'Labor outsourcing' },
  { id: 'onsite_service', label: 'On-site service' },
  { id: 'other_unknown', label: 'Other / unknown' }
];

const GEO_STORAGE_KEY = 'open-worktime-local-reports-v0.4';

const geoState = {
  facilities: [],
  selectedRegion: null,
  employmentFilter: 'all',
  analysisMode: 'weighted'
};

const geoEls = {
  regionSelect: document.querySelector('#region-select'),
  employmentSelect: document.querySelector('#region-employment'),
  analysisMode: document.querySelector('#region-analysis-mode'),
  histogram: document.querySelector('#region-histogram'),
  sampleCount: document.querySelector('#region-sample-count'),
  effectiveCount: document.querySelector('#region-effective-count'),
  brandCount: document.querySelector('#region-brand-count'),
  empty: document.querySelector('#region-empty')
};

bootRegionExplorer();

async function bootRegionExplorer() {
  if (!geoEls.regionSelect || !geoEls.histogram) return;

  try {
    const response = await fetch('./data/facilities.json');
    if (!response.ok) throw new Error('Failed to load facility geography.');
    geoState.facilities = await response.json();

    geoEls.employmentSelect.innerHTML = GEO_EMPLOYMENT_TYPES
      .map((item) => `<option value="${item.id}">${item.label}</option>`)
      .join('');

    geoEls.regionSelect.addEventListener('change', () => {
      geoState.selectedRegion = geoEls.regionSelect.value || null;
      renderRegionExplorer();
    });

    geoEls.employmentSelect.addEventListener('change', () => {
      geoState.employmentFilter = geoEls.employmentSelect.value;
      renderRegionExplorer();
    });

    geoEls.analysisMode?.addEventListener('change', () => {
      geoState.analysisMode = geoEls.analysisMode.value;
      renderRegionExplorer();
    });

    window.addEventListener('open-worktime:reports-changed', refreshRegionExplorer);
    window.addEventListener('storage', (event) => {
      if (event.key === GEO_STORAGE_KEY) refreshRegionExplorer();
    });

    refreshRegionExplorer();
  } catch (error) {
    geoEls.histogram.innerHTML = '<div class="empty-chart"><strong>Regional explorer failed to load.</strong></div>';
    console.error(error);
  }
}

function refreshRegionExplorer() {
  const reports = loadGeoReports();
  const previous = geoState.selectedRegion;
  const regions = collectRegions(reports);

  geoEls.regionSelect.innerHTML = regions
    .map((region) => `<option value="${escapeGeoHtml(region.id)}">${escapeGeoHtml(region.label)}</option>`)
    .join('');

  if (regions.length === 0) {
    geoState.selectedRegion = null;
  } else if (previous && regions.some((region) => region.id === previous)) {
    geoState.selectedRegion = previous;
    geoEls.regionSelect.value = previous;
  } else {
    geoState.selectedRegion = regions[0].id;
    geoEls.regionSelect.value = regions[0].id;
  }

  renderRegionExplorer(reports);
}

function collectRegions(reports) {
  const regions = new Map();
  const countries = new Set();

  for (const report of reports) {
    const region = effectiveGeoRegion(report);
    const country = effectiveGeoCountry(report);
    if (region) regions.set(normalizeGeoRegion(region), region);
    if (country) countries.add(country);
  }

  return [
    ...[...regions.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ id: `region:${id}`, label })),
    ...[...countries]
      .sort()
      .map((code) => ({ id: `country:${code}`, label: `${code} · country` }))
  ];
}

function renderRegionExplorer(reports = loadGeoReports()) {
  const region = geoState.selectedRegion;
  const matching = reports.filter((report) =>
    matchesRegion(report, region) &&
    (geoState.employmentFilter === 'all' || report.employment_type === geoState.employmentFilter)
  );

  const effective = matching.reduce((sum, report) => sum + reportWeight(report), 0);
  geoEls.sampleCount.textContent = String(matching.length);
  if (geoEls.effectiveCount) geoEls.effectiveCount.textContent = formatGeoWeight(effective);
  geoEls.brandCount.textContent = String(new Set(matching.map((report) => report.brand_id)).size);
  geoEls.histogram.innerHTML = '';

  if (!region || matching.length === 0) {
    geoEls.empty.hidden = false;
    geoEls.empty.textContent = reports.length === 0
      ? 'No local observations with optional geography yet.'
      : 'No observations match this region and employment filter.';
    return;
  }

  geoEls.empty.hidden = true;
  const counts = GEO_HOURS_BUCKETS.map(() => 0);
  for (const report of matching) {
    const index = GEO_HOURS_BUCKETS.findIndex((bucket) => bucket.id === report.weekly_hours_bucket);
    if (index < 0) continue;
    counts[index] += geoState.analysisMode === 'all' ? 1 : reportWeight(report);
  }

  const denominator = counts.reduce((sum, value) => sum + value, 0);
  if (denominator === 0) {
    geoEls.empty.hidden = false;
    geoEls.empty.textContent = 'This region has reports, but none carry manufacturing weight in the current view. Switch to all raw reports to inspect them.';
    return;
  }

  const max = Math.max(1, ...counts);
  GEO_HOURS_BUCKETS.forEach((bucket, index) => {
    const count = counts[index];
    const share = (count / denominator) * 100;
    const width = (count / max) * 100;
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <span class="hist-label">${bucket.label}</span>
      <div class="hist-track" title="${formatGeoWeight(count)} weighted observations · ${share.toFixed(1)}%">
        <div class="hist-fill" style="width: ${width.toFixed(2)}%"></div>
      </div>
      <span class="hist-value">${formatGeoWeight(count)} · ${share.toFixed(1)}%</span>
    `;
    geoEls.histogram.appendChild(row);
  });
}

function matchesRegion(report, region) {
  if (!region) return false;
  if (region.startsWith('country:')) return effectiveGeoCountry(report) === region.slice('country:'.length);
  if (region.startsWith('region:')) return normalizeGeoRegion(effectiveGeoRegion(report)) === region.slice('region:'.length);
  return false;
}

function effectiveGeoCountry(report) {
  if (report?.country) return String(report.country).toUpperCase();
  if (!report?.facility_id) return null;
  return geoState.facilities.find((facility) => facility.id === report.facility_id)?.country ?? null;
}

function effectiveGeoRegion(report) {
  if (report?.work_region) return report.work_region;
  if (!report?.facility_id) return null;
  const facility = geoState.facilities.find((item) => item.id === report.facility_id);
  return facility?.work_region ?? facility?.locality ?? facility?.subdivision_code ?? null;
}

function normalizeGeoRegion(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function reportWeight(report) {
  const weight = Number(report?.analysis_weight);
  return Number.isFinite(weight) ? Math.max(0, Math.min(1, weight)) : 0.5;
}

function loadGeoReports() {
  try {
    const stored = localStorage.getItem(GEO_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatGeoWeight(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeGeoHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
