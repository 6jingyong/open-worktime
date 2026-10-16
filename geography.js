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

const GEO_STORAGE_KEY = 'open-worktime-local-reports-v0.3';

const geoState = {
  facilities: [],
  selectedRegion: null,
  employmentFilter: 'all'
};

const geoEls = {
  regionSelect: document.querySelector('#region-select'),
  employmentSelect: document.querySelector('#region-employment'),
  histogram: document.querySelector('#region-histogram'),
  sampleCount: document.querySelector('#region-sample-count'),
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
    .map((region) => `<option value="${region.id}">${region.label}</option>`)
    .join('');

  if (regions.length === 0) {
    geoState.selectedRegion = null;
  } else if (previous && regions.some((region) => region.id === previous)) {
    geoState.selectedRegion = previous;
    geoEls.regionSelect.value = previous;
  } else {
    const preferred = regions.find((region) => region.level === 'subdivision') ?? regions[0];
    geoState.selectedRegion = preferred.id;
    geoEls.regionSelect.value = preferred.id;
  }

  renderRegionExplorer(reports);
}

function collectRegions(reports) {
  const countries = new Set();
  const subdivisions = new Set();

  for (const report of reports) {
    if (report.country) countries.add(report.country);
    const subdivision = effectiveGeoSubdivision(report);
    if (subdivision) subdivisions.add(subdivision);
  }

  return [
    ...[...subdivisions].sort().map((code) => ({ id: `subdivision:${code}`, label: `${code} · subdivision`, level: 'subdivision' })),
    ...[...countries].sort().map((code) => ({ id: `country:${code}`, label: `${code} · country`, level: 'country' }))
  ];
}

function renderRegionExplorer(reports = loadGeoReports()) {
  const region = geoState.selectedRegion;
  const matching = reports.filter((report) =>
    matchesRegion(report, region) &&
    (geoState.employmentFilter === 'all' || report.employment_type === geoState.employmentFilter)
  );

  geoEls.sampleCount.textContent = String(matching.length);
  geoEls.brandCount.textContent = String(new Set(matching.map((report) => report.brand_id)).size);
  geoEls.histogram.innerHTML = '';

  if (!region || matching.length === 0) {
    geoEls.empty.hidden = false;
    geoEls.empty.textContent = reports.length === 0
      ? 'No geocoded local observations yet. Add a local report with a country and region to exercise this view.'
      : 'No observations match this region and employment filter.';
    return;
  }

  geoEls.empty.hidden = true;
  const counts = GEO_HOURS_BUCKETS.map(() => 0);
  for (const report of matching) {
    const index = GEO_HOURS_BUCKETS.findIndex((bucket) => bucket.id === report.weekly_hours_bucket);
    if (index >= 0) counts[index] += 1;
  }

  const max = Math.max(1, ...counts);
  GEO_HOURS_BUCKETS.forEach((bucket, index) => {
    const count = counts[index];
    const share = matching.length ? (count / matching.length) * 100 : 0;
    const width = (count / max) * 100;
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <span class="hist-label">${bucket.label}</span>
      <div class="hist-track" title="${count} observations · ${share.toFixed(1)}%">
        <div class="hist-fill" style="width: ${width.toFixed(2)}%"></div>
      </div>
      <span class="hist-value">${count} · ${share.toFixed(1)}%</span>
    `;
    geoEls.histogram.appendChild(row);
  });
}

function matchesRegion(report, region) {
  if (!region) return false;
  if (region.startsWith('country:')) return report.country === region.slice('country:'.length);
  if (region.startsWith('subdivision:')) return effectiveGeoSubdivision(report) === region.slice('subdivision:'.length);
  return false;
}

function effectiveGeoSubdivision(report) {
  if (report?.subdivision_code) return report.subdivision_code;
  if (!report?.facility_id) return null;
  return geoState.facilities.find((facility) => facility.id === report.facility_id)?.subdivision_code ?? null;
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
