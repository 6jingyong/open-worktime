# Open Worktime architecture notes

## 1. Product boundary

The first product is intentionally narrow: **manufactured goods and brand/factory labor**.

The main question is:

> What does the distribution of actual weekly working time look like for ordinary workers whose labor is used to make this brand's products?

Service businesses, pure distributors, marketplaces, broad ESG scoring, and every kind of white-collar work are outside the MVP.

## 2. Raw observation vs manufacturing-focused analysis

Open Worktime should not reject a report just because it comes from sales, management, headquarters, an unusual region, or a high-income worker.

Instead it keeps two views:

- **raw accepted reports** — every accepted observation;
- **manufacturing-weighted view** — the default consumer-facing histogram, using a transparent public `analysis_weight`.

This prevents the project from pretending that every employee is equally representative of factory labor while also avoiding hidden deletion.

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

accepted report
  ├─ submission facts
  ├─ server receipt metadata
  └─ analysis_weight + analysis_flags
```

Entity facts and worker reports remain separate layers.

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

The default manufacturing-focused analysis needs a second dimension describing what kind of work the contributor does:

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

These rules are methodology, not private moderation logic. They belong in public documentation and in the accepted report through `analysis_weight` and `analysis_flags`.

## 7. Geography

Geography is useful but optional:

- `country`: nullable two-letter country code;
- `work_region`: nullable short label such as Shanghai, Texas, Berlin, or Jiangsu;
- `facility_id`: optional canonical facility;
- `facility_text`: unresolved site fallback.

Missing geography does not reduce weight.

Known public facilities may supply country / region automatically.

A canonical facility that is linked to the selected brand is positive manufacturing evidence. A known canonical facility that conflicts with the brand can be downweighted and flagged for review.

Free-text region mismatches are **not automatically penalized yet**, because the current facility catalog is incomplete. Once brand × manufacturing-location coverage is stronger, that consistency check can become another public weighting signal.

See [`GEOGRAPHY.md`](GEOGRAPHY.md).

## 8. Client vs server responsibility

The client submits facts. It must not be allowed to choose:

- report ID;
- authoritative receipt time;
- source label;
- analysis weight;
- analysis flags.

The server derives those after validation.

A real backend may also keep temporary private operational metadata for rate limiting, moderation, abuse resistance, or optional employment verification. That metadata must not leak into public exports.

See [`COMMUNITY_INTAKE.md`](COMMUNITY_INTAKE.md).

## 9. Data quality

Useful quality signals include:

- submission bursts;
- historical discontinuities;
- separated peaks;
- repeated operational fingerprints;
- disagreements between raw and high-confidence slices;
- brand × region combinations inconsistent with known manufacturing evidence;
- region-first samples dominated by one brand or facility.

A signal is not automatically a reason to delete a report.

## 10. Regional analysis

Two views remain useful:

- **brand-first:** hold brand and worker scope roughly fixed, compare regions;
- **region-first:** pool reports by coarse region across brands.

Region-first views must expose raw report count, weighted sample, and represented-brand count. They are community samples, not automatically estimates of a whole regional workforce.

## 11. Public dataset layer

Accepted data should eventually support:

- reproducible snapshots;
- stable schemas;
- hashes and signatures;
- mirrors;
- later Torrent/IPFS distribution;
- independent clients rendering the same snapshot.

The website must not become the only copy of accepted public data.

## 12. Current prototype

The static GitHub Pages client already proves:

- brand → owner resolution;
- evidence-backed brand → facility links;
- weekly-hours histograms;
- employment filters;
- optional region filters and region explorer;
- broad-role / high-income relevance collection;
- transparent weighted-vs-raw views;
- v0.4 client submission and accepted-report schemas;
- browser-local JSON export and legacy migration.

No real anonymous ingestion backend exists yet.

## 13. Next major milestone

Build the community ingestion backend:

- anonymous `POST /v1/reports`;
- server-side v0.4 validation;
- server-derived weight and flags;
- rate limiting with minimal retention;
- pending / accepted / rejected moderation state;
- minimum public sample thresholds;
- public aggregate / snapshot export.

## 14. Non-goals for now

Do not add these before the real data loop works:

- blockchain storage;
- tokens or incentives;
- broad company ratings;
- complicated ESG dimensions;
- automated claims that a company is good, bad, or discriminatory solely from a working-time histogram.
