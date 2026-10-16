const facilityState = {
  brands: [],
  facilities: [],
  links: []
};

const facilityEls = {
  brandName: document.querySelector('#brand-name'),
  facilityBlock: document.querySelector('#facility-block'),
  facilityCount: document.querySelector('#facility-count'),
  facilityList: document.querySelector('#facility-list'),
  reportBrand: document.querySelector('#report-brand'),
  reportFacility: document.querySelector('#report-facility'),
  facilityOptions: document.querySelector('#facility-options'),
  facilityHint: document.querySelector('#facility-hint')
};

bootFacilityLayer();

async function bootFacilityLayer() {
  try {
    const [brandsResponse, facilitiesResponse, linksResponse] = await Promise.all([
      fetch('./data/brands.json'),
      fetch('./data/facilities.json'),
      fetch('./data/facility-links.json')
    ]);

    if (!brandsResponse.ok || !facilitiesResponse.ok || !linksResponse.ok) {
      throw new Error('Failed to load facility catalog.');
    }

    facilityState.brands = await brandsResponse.json();
    facilityState.facilities = await facilitiesResponse.json();
    facilityState.links = await linksResponse.json();

    renderFacilitiesForVisibleBrand();
    populateFacilityOptions(facilityEls.reportBrand?.value ?? null);

    if (facilityEls.brandName) {
      const observer = new MutationObserver(() => renderFacilitiesForVisibleBrand());
      observer.observe(facilityEls.brandName, { childList: true, subtree: true, characterData: true });
    }

    facilityEls.reportBrand?.addEventListener('change', () => {
      populateFacilityOptions(facilityEls.reportBrand.value);
    });
  } catch (error) {
    if (facilityEls.facilityList) {
      facilityEls.facilityList.innerHTML = '<p class="muted">Facility catalog failed to load.</p>';
    }
    console.error(error);
  }
}

function renderFacilitiesForVisibleBrand() {
  if (!facilityEls.facilityList || !facilityEls.brandName) return;

  const visibleName = facilityEls.brandName.textContent.trim().toLowerCase();
  const brand = facilityState.brands.find((item) => item.name.toLowerCase() === visibleName);
  if (!brand) return;

  const linked = getLinkedFacilities(brand.id);
  facilityEls.facilityCount.textContent = String(linked.length);
  facilityEls.facilityList.innerHTML = '';
  populateFacilityOptions(brand.id);

  if (linked.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'facility-empty';
    empty.textContent = brand.demo
      ? 'Fictional demo brand — no real production locations.'
      : 'No evidence-backed production locations are included for this brand in the current pilot catalog.';
    facilityEls.facilityList.appendChild(empty);
    return;
  }

  for (const item of linked) {
    const { facility, link } = item;
    const card = document.createElement('article');
    card.className = 'facility-card';

    const sourceUrl = link.source?.url ?? facility.source?.url ?? '#';
    const evidence = link.evidence ?? {};
    const details = [
      facility.country,
      facility.os_id ? `OS ID ${facility.os_id}` : null,
      evidence.location_type ?? null
    ].filter(Boolean).join(' · ');

    card.innerHTML = `
      <div class="facility-card-main">
        <a class="facility-name" href="${escapeFacilityHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeFacilityHtml(facility.name)}</a>
        <p>${escapeFacilityHtml(details)}</p>
        <p class="facility-address">${escapeFacilityHtml(facility.address ?? '')}</p>
      </div>
      <div class="facility-evidence">
        <span class="evidence-badge">Brand-disclosed link</span>
        <span>${escapeFacilityHtml(evidence.contributor ?? 'source contributor')} · ${escapeFacilityHtml(evidence.contribution_date ?? 'date unknown')}</span>
      </div>
    `;

    facilityEls.facilityList.appendChild(card);
  }
}

function populateFacilityOptions(brandId) {
  if (!facilityEls.facilityOptions) return;

  const linked = getLinkedFacilities(brandId);
  facilityEls.facilityOptions.innerHTML = linked
    .map(({ facility }) => `<option value="${escapeFacilityHtml(facility.id)}" label="${escapeFacilityHtml(facility.name)} · ${escapeFacilityHtml(facility.os_id ?? '')}"></option>`)
    .join('');

  if (facilityEls.facilityHint) {
    facilityEls.facilityHint.textContent = linked.length > 0
      ? `${linked.length} evidence-backed production location(s) are suggested for this brand. You can still type another site if it is missing.`
      : 'No linked facility is in the pilot catalog for this brand. You can still enter a factory/site name manually.';
  }
}

function getLinkedFacilities(brandId) {
  if (!brandId) return [];

  return facilityState.links
    .filter((link) => link.brand_id === brandId)
    .map((link) => ({
      link,
      facility: facilityState.facilities.find((facility) => facility.id === link.facility_id)
    }))
    .filter((item) => item.facility);
}

function escapeFacilityHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
