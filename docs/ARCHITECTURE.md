# Open Worktime architecture notes

## 1. Product boundary

The first product is intentionally narrow: **manufactured goods and brand/factory labor**.

The project does not initially try to measure every kind of work. Service businesses, self-employed sellers, pure distributors, marketplaces, and broad ESG scoring are outside the MVP.

The initial consumer-facing question is:

> What does the distribution of actual weekly working time look like for people whose labor is used to make this brand's products?

## 2. Why a distribution, not a score

A single company can contain very different labor regimes at the same time. Direct hires, dispatched workers, outsourced workers, and on-site service workers may have materially different schedules.

The public default is therefore a weekly-hours histogram. Employment identity is a filter, not a hidden weighting factor.

The project does not convert those observations into a moral score.

## 3. Core entities

The MVP keeps the entity graph simple:

```text
brand
  └─ production site (optional in v0.1)
       └─ observations
            ├─ employment identity
            ├─ weekly-hours bucket
            ├─ country
            └─ observation timestamp
```

Future entity resolution can map brands to owners and facilities to stable external IDs such as Open Supply Hub identifiers. External datasets should not be imported until license compatibility is explicitly confirmed.

## 4. Observation semantics

Contributors report their **average actual weekly working time over the last four complete weeks**.

The MVP buckets are half-open intervals:

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

The project is interested in actual labor time, not merely contractual hours or whether a company labels itself as "two-day weekend".

## 5. Employment identity

The initial categories are:

- `direct_contract`
- `labor_dispatch`
- `labor_outsource`
- `onsite_service`
- `other_unknown`

These categories are kept visible because shifting long-hour work into dispatch or outsourcing should not make it disappear from the public picture.

## 6. Data-quality philosophy

The first principle is **show the raw shape before inventing a score**.

Useful quality signals can include:

- sudden bursts of submissions;
- large discontinuities from historical distributions;
- separated peaks that appear only in one identity or site;
- repeated fingerprints or rate-limit violations once a backend exists;
- disagreement between all samples and higher-trust samples.

A multi-peak distribution is not itself proof of manipulation. It may reflect genuine workforce segmentation. The prototype therefore only surfaces a shape warning and never edits the histogram automatically.

## 7. Separation of community and public dataset

Open Worktime treats these as different systems:

### Community input layer

Responsible for:

- anonymous submission;
- rate limiting;
- abuse resistance;
- optional employment verification;
- moderation and dispute handling;
- privacy protection.

### Public dataset layer

Responsible for:

- accepted observations or privacy-preserving aggregates;
- reproducible snapshots;
- stable schemas;
- hashes and signatures;
- mirrors;
- later Torrent/IPFS distribution.

The website should never become the only copy of accepted public data.

## 8. Prototype implementation

v0.1 is deliberately static:

```text
index.html
styles.css
app.js
data/brands.json
data/demo-distribution.json
schema/report.schema.json
```

Prototype submissions stay in browser `localStorage`. They are not uploaded anywhere. Users can export those local observations as JSON to exercise the eventual portable-data workflow.

This lets the team validate the product interaction before deciding on authentication, database infrastructure, moderation, or anti-abuse technology.

## 9. Suggested next milestones

### v0.2 — real community ingestion

- minimal anonymous submission API;
- server-side schema validation;
- rate limiting and abuse logging that avoids unnecessary personal data retention;
- append-only accepted observation store;
- public aggregate endpoint / snapshot export.

### v0.3 — trust and entity resolution

- optional proof-of-employment verification without publishing identity;
- brand-owner mapping;
- production-site IDs;
- country/site/identity slices;
- visible sample-quality metadata.

### v0.4 — resilient distribution

- signed dataset manifest;
- immutable versioned snapshots;
- multiple HTTP/Git mirrors;
- Torrent and/or IPFS publication;
- independent clients able to verify and render the same snapshot.

## 10. Non-goals for now

Do not add these until the basic data loop has real users:

- blockchain storage;
- tokens or incentives;
- broad company ratings;
- complicated ESG dimensions;
- recommendation algorithms;
- service-sector comparisons;
- automated claims that a company is "good" or "bad".
