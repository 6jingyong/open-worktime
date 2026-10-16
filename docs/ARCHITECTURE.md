# Open Worktime architecture notes

## 1. Product boundary

The first product is intentionally narrow: **manufactured goods and brand/factory labor**.

The project does not initially try to measure every kind of work. Service businesses, self-employed sellers, pure distributors, marketplaces, and broad ESG scoring are outside the MVP.

The initial consumer-facing question is:

> What does the distribution of actual weekly working time look like for people whose labor is used to make this brand's products?

## 2. Why a distribution, not a score

A single brand can contain very different labor regimes at the same time. Direct hires, dispatched workers, outsourced workers, and on-site service workers may have materially different schedules.

The public default is therefore a weekly-hours histogram. Employment identity is a filter, not a hidden weighting factor.

The project does not convert those observations into a moral score.

## 3. Core entities

The current graph separates entity facts, supply-chain evidence, and worker observations:

```text
brand
  ├─ owner_company_id → company
  └─ facility-link evidence → facility

report
  ├─ brand_id → brand
  ├─ facility_id → canonical facility (optional)
  ├─ facility_text → unresolved site fallback (optional)
  ├─ employment identity
  └─ weekly-hours bucket
```

A facility existing in the catalog is not proof that a brand uses it. A brand-to-facility relationship therefore has its own cited evidence edge.

A real brand or facility in the catalog is also not a labor-condition claim. Working-time reports are a separate layer.

## 4. Observation semantics

Contributors report their **average actual weekly working time over the last four complete weeks**.

The fixed buckets are:

- `<35`
- `35 <= h < 40`
- `40 <= h < 45`
- `45 <= h < 50`
- `50 <= h < 55`
- `55 <= h < 60`
- `60 <= h < 65`
- `65 <= h < 70`
- `70 <= h < 75`
- `75+`

The project measures actual labor time, not merely contractual hours or whether a company labels itself as "two-day weekend".

The period rule is machine-readable as `period_basis = last_4_complete_weeks` so different clients do not silently ask different questions.

## 5. Employment identity

The initial categories are:

- `direct_contract`
- `labor_dispatch`
- `labor_outsource`
- `onsite_service`
- `other_unknown`

These categories remain visible because shifting long-hour work into dispatch or outsourcing should not make it disappear from the public picture.

## 6. Facility resolution

Known and unknown production sites are deliberately different fields:

- `facility_id`: canonical facility entity in the Open Worktime catalog;
- `facility_text`: unresolved contributor-supplied fallback.

A user-entered factory name must never be treated as a verified facility ID merely because it was typed into the site field.

The current pilot uses an Open Supply Hub OS ID for one PUMA-linked facility. Bulk facility import and automatic matching remain out of scope.

## 7. Public observation vs private intake

The public observation is intentionally small. It does not need a worker's name, email, phone number, employee ID, exact job title, salary, gender, age, documents, or written story.

A future ingestion backend may still need restricted operational metadata for:

- rate limiting;
- abuse resistance;
- moderation state;
- optional employment verification;
- receipt tracking.

Those fields belong to a **private intake layer** and must not be silently appended to public exports.

See [`COMMUNITY_INTAKE.md`](COMMUNITY_INTAKE.md).

## 8. Data-quality philosophy

The first principle is **show the raw shape before inventing a score**.

Useful quality signals can include:

- sudden bursts of submissions;
- large discontinuities from historical distributions;
- separated peaks that appear only in one identity or site;
- repeated fingerprints or rate-limit violations once a backend exists;
- disagreement between all samples and higher-trust samples.

A multi-peak distribution is not itself proof of manipulation. It may reflect genuine workforce segmentation. The prototype therefore only surfaces a shape warning and never edits the histogram automatically.

## 9. Public dataset layer

Accepted data should eventually support:

- reproducible snapshots;
- stable schemas;
- hashes and signatures;
- mirrors;
- later Torrent/IPFS distribution;
- independent clients rendering the same snapshot.

The website must not become the only copy of accepted public data.

## 10. Current prototype

The current client remains static HTML/CSS/JavaScript on GitHub Pages.

It already proves:

- brand → owner resolution;
- evidence-backed brand → facility links;
- weekly-hours histograms;
- employment-identity filters;
- facility-aware local report creation;
- privacy-minimal report schema v0.2;
- JSON export;
- migration of older browser-local v0.1 demo reports.

Prototype reports still stay in browser `localStorage`. No real anonymous submission backend exists yet.

## 11. Next milestones

### Community ingestion backend

- minimal anonymous `POST /v1/reports` endpoint;
- server-side v0.2 schema validation;
- rate limiting with minimal retention of network metadata;
- pending/accepted/rejected moderation state;
- opaque receipt IDs;
- aggregate/snapshot publication after privacy review.

### Trust and privacy

- optional proof-of-employment verification without publishing identity;
- minimum sample thresholds for small site/identity slices;
- visible sample-quality metadata;
- time-decay or historical windows without rewriting raw accepted observations.

### Resilient distribution

- signed dataset manifest;
- immutable versioned snapshots;
- multiple HTTP/Git mirrors;
- Torrent and/or IPFS publication.

## 12. Non-goals for now

Do not add these until the basic data loop has real users:

- blockchain storage;
- tokens or incentives;
- broad company ratings;
- complicated ESG dimensions;
- recommendation algorithms;
- service-sector comparisons;
- automated claims that a company is "good" or "bad".
