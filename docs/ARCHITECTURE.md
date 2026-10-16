# Open Worktime architecture notes

## 1. Product boundary

The first product is intentionally narrow: **manufactured goods and brand/factory labor**.

The main question is:

> What does the distribution of actual weekly working time look like for ordinary workers whose labor is used to make this brand's products?

Service businesses, pure distributors, marketplaces, broad ESG scoring, and every kind of white-collar work are outside the MVP.

## 2. Raw observation vs release-time manufacturing analysis

Open Worktime should accept useful raw observations even when they come from sales, management, headquarters, an unusual region, or a high-income worker.

But those reports should not automatically enter the headline manufacturing statistic with equal weight.

The architecture therefore separates:

- **raw accepted reports** — stable historical worker-supplied facts plus receipt metadata;
- **release analysis** — a reproducible weight derived later under one frozen methodology and manufacturing-scope version.

This allows monthly or quarterly reports to update the brand/factory database and re-run historical observations without rewriting what contributors originally submitted.

## 3. Core graph

```text
brand
  ├─ owner_company_id → company
  └─ facility-link evidence → facility

submission
  ├─ brand
  ├─ optional country / work_region / facility
  ├─ employment identity
  ├─ broad work role
  ├─ high-income >=5x signal
  └─ weekly-hours bucket

private intake row
  ├─ submission facts
  ├─ server receipt metadata
  └─ moderation_state = pending | accepted | rejected

accepted public report
  ├─ submission facts
  └─ server receipt metadata

publication release
  ├─ methodology_version
  ├─ scope_version
  └─ per-report analysis_weight + analysis_flags
```

Entity facts, private intake state, accepted worker observations, and release-time classification remain separate layers.

## 4. Observation semantics

Contributors report average actual weekly working time over the **last four complete weeks**.

Fixed buckets:

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

The project measures actual labor time, not contractual hours or whether an employer labels itself as having a two-day weekend.

## 5. Employment identity

The initial employment identities remain:

- `direct_contract`
- `labor_dispatch`
- `labor_outsource`
- `onsite_service`
- `other_unknown`

Employment identity is a filter, **not a penalty**. Outsourcing should not make labor disappear.

## 6. Broad work role

The default manufacturing-focused analysis uses a broad work-role dimension:

- `manufacturing_frontline`
- `manufacturing_support`
- `management`
- `sales`
- `corporate_function`
- `other_unknown`

Exact job title is deliberately not collected.

Current prototype base weights:

- frontline: `1.0`;
- manufacturing support: `1.0`;
- management: `0.25`;
- sales: `0`;
- corporate function: `0`;
- unknown: `0.5`.

If `high_income_5x = yes`, weight is capped at `0.25`.

These rules are public methodology, not private moderation logic.

## 7. Geography and reviewed manufacturing scope

Geography is useful but optional:

- `country`: nullable two-letter country code;
- `work_region`: nullable short label such as Shanghai, Texas, Berlin, or Jiangsu;
- `facility_id`: optional canonical facility;
- `facility_text`: unresolved site fallback.

Missing geography does not reduce weight.

The publication pipeline maintains a versioned manufacturing-scope catalog with two coverage levels:

- `partial`: known locations can confirm a match but cannot exclude unlisted locations;
- `curated_complete`: coverage has been deliberately reviewed for a release and can act as a strict geography gate.

For a `curated_complete` brand, a supplied location outside the reviewed manufacturing scope receives manufacturing weight `0` for that release. The raw report remains available.

This explicitly prefers conservative publication over trying to resolve every edge case in real time.

See [`GEOGRAPHY.md`](GEOGRAPHY.md) and [`PUBLICATION_CYCLE.md`](PUBLICATION_CYCLE.md).

## 8. Client, intake server, and publication pipeline

The client submits facts. It must not choose:

- report ID;
- authoritative receipt time;
- source label;
- analysis weight;
- analysis flags.

The intake server validates and stores a pending raw observation, then attaches only receipt metadata. It does **not** decide manufacturing relevance.

The current backend implementation is a small Cloudflare Worker + D1-compatible schema under `backend/`. Its public write path is deliberately disabled in checked-in configuration.

The Worker exposes:

- `GET /health`;
- `POST /v1/reports` when explicitly enabled.

It does not expose a public raw-report query route.

A later publication pipeline freezes:

- a cutoff timestamp;
- `methodology_version`;
- `scope_version`.

It then derives the weights and flags used by the public manufacturing-focused charts.

Private anti-abuse or verification metadata remains outside public exports.

See [`COMMUNITY_INTAKE.md`](COMMUNITY_INTAKE.md) and [`../backend/README.md`](../backend/README.md).

## 9. Intake privacy boundary

The private D1 intake schema stores only:

- v0.4 worker-supplied fields;
- server-generated report ID;
- server receipt timestamp;
- source label;
- moderation state.

The schema intentionally has no columns for IP address, personal contact details, exact salary, exact job title, GPS data, or release-time manufacturing weights.

If future abuse controls require transient or pseudonymous operational signals, their retention and isolation must be designed explicitly rather than silently adding them to the public/core record.

## 10. Data quality

Useful quality signals include:

- submission bursts;
- historical discontinuities;
- separated peaks;
- repeated operational fingerprints if a future private anti-abuse layer supports them;
- disagreements between raw and high-confidence slices;
- brand × region combinations inconsistent with a reviewed manufacturing footprint;
- region-first samples dominated by one brand or facility.

A signal is not automatically a reason to delete a raw report.

## 11. Regional analysis

Two views remain useful:

- **brand-first:** hold brand and worker scope roughly fixed, compare regions;
- **region-first:** pool reports by coarse region across brands.

Region-first views must expose raw report count, current-scope weighted sample, and represented-brand count. They are community samples, not automatically estimates of a whole regional workforce.

## 12. Public dataset layer

A release should eventually support:

- reproducible raw-observation snapshots;
- versioned manufacturing-scope catalogs;
- versioned release-analysis records;
- hashes and signatures;
- mirrors;
- later Torrent/IPFS distribution;
- independent clients reproducing the same histogram from the same release artifacts.

The website and the live intake database must not become the only copies of published data.

## 13. Current prototype

The static GitHub Pages client proves:

- brand → owner resolution;
- evidence-backed brand → facility links;
- weekly-hours histograms;
- employment filters;
- optional region filters and region explorer;
- broad-role / high-income relevance collection;
- transparent weighted-vs-raw views;
- raw v0.4 browser-local observation storage;
- versioned manufacturing-scope data;
- release-time weight recalculation;
- browser-local JSON export containing raw reports plus separate release analysis.

The repository also contains a tested but inactive anonymous intake backend:

- strict v0.4 validation;
- D1 migration for pending reports;
- opaque receipt IDs and server timestamps;
- no public read endpoint;
- writes disabled until an operator explicitly configures D1 and changes `WRITE_ENABLED`.

The GitHub Pages client does not call this backend yet.

## 14. Next major milestones

### Operational intake activation

- choose abuse / bot controls that do not require publishing worker identity;
- define moderation workflow for `pending → accepted / rejected`;
- define backup/export and retention procedures;
- configure production D1;
- explicitly enable writes;
- then connect the static client to the API.

### Batch publication pipeline

- freeze report cutoff;
- export accepted raw observations;
- update manufacturing-scope catalog;
- freeze scope and methodology versions;
- derive release-analysis records;
- generate public aggregate snapshots;
- apply minimum publication thresholds;
- publish reproducible manifests and hashes.

## 15. Non-goals for now

Do not add these before the real data loop works:

- blockchain storage;
- tokens or incentives;
- broad company ratings;
- complicated ESG dimensions;
- automated claims that a company is good, bad, or discriminatory solely from a working-time histogram.
