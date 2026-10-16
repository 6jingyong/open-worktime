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
- keep entity metadata separate from labor-condition observations.

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

## Batch publication model

Open Worktime does not need to publish every submission as an authoritative statistic in real time.

A nonprofit or community operator can publish monthly, quarterly, or on another explicit cadence:

1. collect raw observations continuously;
2. freeze a report cutoff;
3. refresh brand manufacturing countries / regions / facilities;
4. freeze a versioned `scope_version`;
5. derive manufacturing weights from that frozen scope and methodology;
6. publish raw sample counts plus weighted histograms.

Raw observations are not rewritten when the scope database improves.

## Current prototype

The dependency-free GitHub Pages client now includes:

- a small real brand / owner seed;
- one evidence-backed production-location pilot;
- brand search;
- weekly-hours histograms;
- employment filters;
- optional geography filters and a region explorer;
- manufacturing-weighted vs all-raw views;
- broad-role and high-income relevance collection;
- browser-local raw observation storage and JSON export;
- a versioned manufacturing-scope catalog;
- release-time analysis generated separately from raw reports.

The repository still contains **no real bundled working-time observations**. Real brands are entity metadata only; bundled histogram rows target fictional `demo-*` entities.

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

The intake server attaches only receipt metadata such as report ID, authoritative receipt time, and source label.

A later report build derives a separate record containing:

- `report_id`;
- `methodology_version`;
- `scope_version`;
- `analysis_weight`;
- public `analysis_flags` explaining that weight.

This keeps worker facts stable while allowing later report releases to improve the manufacturing-footprint database.

See [`schema/submission.schema.json`](schema/submission.schema.json), [`schema/report.schema.json`](schema/report.schema.json), [`schema/release-analysis.schema.json`](schema/release-analysis.schema.json), and [`docs/COMMUNITY_INTAKE.md`](docs/COMMUNITY_INTAKE.md).

## Licensing

- **source code:** MIT;
- **selected Brandtree-derived brand/company seed:** CC BY 4.0;
- **Open Supply Hub-derived facility data and facility-link material:** CC BY-SA 4.0;
- **fictional demo entities and demo distributions:** CC0 1.0;
- **future real community working-time dataset:** not chosen yet.

See [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md).

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Status

Prototype / pre-community-data. The next major engineering steps are a real anonymous intake backend and a reproducible monthly/quarterly publication pipeline.
