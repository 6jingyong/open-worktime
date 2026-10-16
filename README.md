# Open Worktime

Open Worktime is an open prototype for crowdsourcing **actual weekly working time** behind manufactured products and brands.

Live prototype: https://6jingyong.github.io/open-worktime/

The project starts narrow:

- physical goods and manufacturing-oriented brands first;
- no moral score or automatic "good/bad company" label;
- publish weekly-hours distributions;
- keep employment identity visible;
- treat geography as optional context rather than an intake gate;
- keep raw accepted observations separate from release-time manufacturing analysis;
- keep entity metadata, regional context, and labor-condition observations separate.

## What one contributor reports

A v0.4 submission asks for:

1. brand;
2. optional country / coarse work region / production site;
3. employment relationship;
4. broad work role;
5. whether total compensation is roughly >=5x typical local full-time income (`yes / no / unknown`);
6. average actual weekly working time over the last four complete weeks.

It deliberately does **not** ask for exact salary, exact job title, name, employee ID, home address, GPS coordinate, phone number, or personal email.

### Employment types

- Direct contract
- Labor dispatch
- Labor outsourcing
- On-site after-sales / service
- Other or unknown

### Broad work roles

- Production / assembly
- Manufacturing support (quality, equipment, warehouse, production support)
- Management
- Sales
- Corporate / functional role
- Other or unknown

### Weekly-hour buckets

`<35`, `35–<40`, `40–<45`, `45–<50`, `50–<55`, `55–<60`, `60–<65`, `65–<70`, `70–<75`, `75+`

## Manufacturing relevance weighting

The default consumer-facing view is intended to represent **ordinary manufacturing labor**, not every person who happens to work for a brand.

The current prototype role rule is explicit:

| Broad role | Base weight |
| --- | ---: |
| Production / assembly | 1.0 |
| Manufacturing support | 1.0 |
| Management | 0.25 |
| Sales | 0 |
| Corporate / functional role | 0 |
| Other / unknown | 0.5 |

If a contributor reports compensation roughly >=5x typical local full-time income, their weight is capped at `0.25`.

Employment identity itself does **not** reduce weight, so labor dispatch and outsourced manufacturing remain visible.

## Optional geography, strict publication scope

Geography is simple:

- `country`: optional two-letter code such as `CN`, `US`, `DE`;
- `work_region`: optional coarse label such as `Shanghai`, `Texas`, or `Berlin`;
- known facilities may fill these automatically.

Missing geography is not penalized.

The important distinction is publication-time manufacturing scope:

- `partial` brand scope can confirm known manufacturing locations but cannot exclude unlisted ones;
- `curated_complete` brand scope is deliberately reviewed before a report release;
- when a contributor supplies a location outside a `curated_complete` scope, that raw observation remains available but receives manufacturing weight `0` for that release.

This intentionally favors conservative publication. A later report can update the manufacturing-scope catalog and re-run the same historical raw observations.

See [`data/manufacturing-scope.json`](data/manufacturing-scope.json), [`docs/GEOGRAPHY.md`](docs/GEOGRAPHY.md), and [`docs/PUBLICATION_CYCLE.md`](docs/PUBLICATION_CYCLE.md).

## External research imports

Open Worktime has a staging-first import layer under [`imports/`](imports/) for existing surveys, historical community datasets, NGO research, and statistical datasets.

External data is **not** forced into the same shape as a fresh community submission. The importer keeps source/provenance, reuse status, input hash, source record IDs, original time semantics, unresolved entities, and transformation issues.

Three evidence shapes are supported:

- `individual` — one source row represents one observation/person;
- `aggregate` — one source row represents a distribution cell with a `count`;
- `aggregate_statistic` — one source row represents a scalar statistic such as mean weekly hours.

A scalar mean is never converted into a histogram bucket, and an aggregate count is never expanded into synthetic workers. Only a sufficiently complete individual record using the project's four-complete-week definition can become a `canonical_candidate`; other evidence remains contextual.

The manifest mapping is a field whitelist, so unmapped source columns are discarded rather than copied wholesale. Source-specific adapters currently cover ILOSTAT statistical data and restricted-use WorkingTime schedule data. See [`imports/README.md`](imports/README.md).

## Country context baseline

The first checked-in real worktime-related dataset is [`data/country-context.json`](data/country-context.json): a deliberately small 2025 country snapshot based on **ILO ILOSTAT modelled estimates** for average weekly hours actually worked per employed person.

This is broad labor-market context, not manufacturing-worker evidence:

- population = all employed persons;
- statistic = scalar country mean;
- it never contributes to brand/facility histograms;
- it never changes manufacturing-relevance weights;
- it may be shown even when Open Worktime has zero community reports for that country.

The Region explorer presents the country mean in a separate context card. See [`docs/CONTEXT_BASELINES.md`](docs/CONTEXT_BASELINES.md) and [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md).

## Batch publication model

Open Worktime does not need to publish every submission as an authoritative statistic in real time.

A nonprofit or community operator can publish monthly, quarterly, or on another explicit cadence:

1. collect raw observations continuously;
2. review pending reports for spam / duplicate / malformed / privacy-risk cases;
3. freeze a report cutoff and export accepted raw observations;
4. refresh brand manufacturing countries / regions / facilities;
5. freeze a versioned `scope_version`;
6. derive manufacturing weights from that frozen scope and methodology;
7. publish raw sample counts plus weighted histograms.

Raw observations are not rewritten when the scope database improves.

## Current prototype

The dependency-free GitHub Pages client includes:

- a small real brand / owner seed;
- one evidence-backed production-location pilot;
- a small real ILO country working-time context snapshot;
- brand search;
- weekly-hours histograms;
- employment filters;
- optional geography filters and a region explorer;
- manufacturing-weighted vs all-raw views;
- broad-role and high-income relevance collection;
- browser-local raw observation storage and JSON export;
- a versioned manufacturing-scope catalog;
- release-time analysis generated separately from raw reports.

The repository also contains a **disabled-by-default anonymous intake backend** under [`backend/`](backend/):

- Cloudflare Worker endpoint `POST /v1/reports`;
- strict v0.4 server-side validation;
- D1 migration for private pending-report storage;
- server-assigned receipt ID and receipt time;
- no public report-reading endpoint;
- no IP column and no release-time weight stored in the intake table;
- local/remote operator CLI for pending review, moderation-state counts, accepted/rejected transitions, accepted-raw export, and private D1 backup;
- moderation reasons intentionally limited to abuse/data-quality cases rather than manufacturing-relevance judgments;
- unit tests that run without a Cloudflare account.

`backend/wrangler.jsonc` ships with `WRITE_ENABLED = false` and no D1 binding. Merging the backend code therefore does **not** start collecting real worker data. See [`backend/README.md`](backend/README.md).

The repository still contains **no real bundled brand/facility worker observations**. Real brands remain entity metadata only; bundled histograms and import fixtures are fictional. The ILO country snapshot is real aggregate context and is deliberately kept outside those worker distributions.

## Data contracts

The client submits facts only:

```json
{
  "schema_version": "0.4",
  "brand_id": "bt-puma",
  "country": "CN",
  "work_region": "Jiangsu",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "work_role": "manufacturing_frontline",
  "high_income_5x": "no",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks"
}
```

The intake server attaches only receipt metadata such as report ID, authoritative receipt time, and source label. New submissions first enter private storage as `pending`.

Moderation decides only whether a raw observation is usable/abusive. It does not decide manufacturing relevance. Accepted raw observations can then be exported at a fixed cutoff without private moderation fields.

A later report build derives a separate record containing:

- `report_id`;
- `methodology_version`;
- `scope_version`;
- `analysis_weight`;
- public `analysis_flags` explaining that weight.

This keeps worker facts stable while allowing later report releases to improve the manufacturing-footprint database.

See [`schema/submission.schema.json`](schema/submission.schema.json), [`schema/report.schema.json`](schema/report.schema.json), [`schema/release-analysis.schema.json`](schema/release-analysis.schema.json), [`schema/external-import-manifest.schema.json`](schema/external-import-manifest.schema.json), and [`schema/external-evidence.schema.json`](schema/external-evidence.schema.json).

## Licensing

- **source code:** MIT;
- **selected Brandtree-derived brand/company seed:** CC BY 4.0;
- **Open Supply Hub-derived facility data and facility-link material:** CC BY-SA 4.0;
- **ILO country context snapshot:** CC BY 4.0;
- **fictional demo entities, demo distributions, and import fixtures:** CC0 1.0;
- **future real community working-time dataset:** not chosen yet;
- **external research imports:** retain their own per-source license / permission metadata and are not assumed redistributable merely because they are technically accessible.

See [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md) and [`imports/README.md`](imports/README.md).

## Run the static prototype locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Status

Prototype / pre-community-data. Intake, private moderation, accepted-raw export, private backup, external-data staging/adapters, and the first openly licensed country context snapshot now exist. Public writes remain intentionally disabled. The next useful data work is additional openly reusable brand/company/facility-level historical evidence and entity resolution, not a publication scheduler.
