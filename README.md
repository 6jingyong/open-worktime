# Open Worktime

Open Worktime is an open prototype for crowdsourcing **actual weekly working time** behind manufactured products and brands.

Live prototype: https://6jingyong.github.io/open-worktime/

The project starts narrow:

- physical goods and manufacturing-oriented brands first;
- no moral score or automatic "good/bad company" label;
- publish weekly-hours distributions;
- keep employment identity visible;
- treat geography as optional context rather than an intake gate;
- keep raw accepted reports visible while also publishing a transparent manufacturing-focused weighting rule;
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

The current prototype rule is explicit:

| Broad role | Base weight |
| --- | ---: |
| Production / assembly | 1.0 |
| Manufacturing support | 1.0 |
| Management | 0.25 |
| Sales | 0 |
| Corporate / functional role | 0 |
| Other / unknown | 0.5 |

If a contributor reports compensation roughly >=5x typical local full-time income, their weight is capped at `0.25`.

A canonical facility that is known to be linked to the selected brand can add a positive evidence flag. A canonical facility that is known but not linked to the selected brand is capped at `0.25` and flagged for location-mismatch review.

**Missing geography does not reduce weight.** Free-text region mismatches are not automatically punished yet because the facility catalog is intentionally incomplete. As the manufacturing-location catalog becomes more complete, brand × region consistency can become an additional auditable signal without rejecting the report itself.

Raw reports remain available through an `All raw reports` view. The weighting system is therefore not a hidden deletion rule.

## Optional geography

Geography is simple in v0.4:

- `country`: optional two-letter code such as `CN`, `US`, `DE`;
- `work_region`: optional coarse label such as `Shanghai`, `Texas`, or `Berlin`;
- known facilities may fill these automatically.

This supports both:

- brand-first comparisons across regions;
- region-first pooled community views.

A regional difference is an observation, not automatic proof of discrimination. See [`docs/GEOGRAPHY.md`](docs/GEOGRAPHY.md).

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
- browser-local v0.4 report simulation and JSON export;
- separate schemas for client submissions and accepted public reports.

The repository still contains **no real bundled working-time observations**. Real brands are entity metadata only; bundled histogram rows target fictional `demo-*` entities.

## Submission vs accepted report

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

A future server then attaches:

- opaque report ID;
- authoritative receipt time;
- public source label;
- `analysis_weight`;
- public `analysis_flags` explaining that weight.

Contributors cannot choose their own weight.

See [`schema/submission.schema.json`](schema/submission.schema.json), [`schema/report.schema.json`](schema/report.schema.json), [`docs/COMMUNITY_INTAKE.md`](docs/COMMUNITY_INTAKE.md), and [`docs/GEOGRAPHY.md`](docs/GEOGRAPHY.md).

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

Prototype / pre-community-data. The next major engineering step is a real anonymous intake backend, not a larger front-end feature set.
