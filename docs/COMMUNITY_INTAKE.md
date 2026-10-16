# Community intake contract

Open Worktime separates four things:

1. what the contributor submits;
2. private anti-abuse / moderation metadata;
3. the accepted raw public observation;
4. release-time manufacturing analysis.

## Client submission

The browser sends facts only:

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

`country` and `work_region` are nullable. Geography is useful evidence, not an intake requirement.

`work_role` is intentionally broad. The project does not need exact job titles.

`high_income_5x` is only `yes / no / unknown`; no salary amount is collected.

The client cannot choose report ID, receipt time, source label, analysis weight, or analysis flags.

## Accepted raw observation

After validation the intake system may publish the worker-supplied facts plus receipt metadata:

```json
{
  "schema_version": "0.4",
  "id": "opaque-server-id",
  "brand_id": "bt-puma",
  "country": "CN",
  "work_region": "Jiangsu",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "work_role": "manufacturing_frontline",
  "high_income_5x": "no",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks",
  "submitted_at": "2026-10-16T05:30:00Z",
  "source": "community_report"
}
```

The accepted observation deliberately does **not** freeze an analysis weight.

## Release-time analysis

A monthly, quarterly, or otherwise versioned report can later derive:

```json
{
  "report_id": "opaque-server-id",
  "methodology_version": "manufacturing-v1",
  "scope_version": "2026-Q4",
  "analysis_weight": 1,
  "analysis_flags": [
    "manufacturing_frontline",
    "inside_curated_manufacturing_scope"
  ]
}
```

This separation matters because the project's knowledge of a brand's manufacturing footprint can improve after the worker submitted the observation.

The same historical raw observation may therefore receive a different release-time classification in a later report if the manufacturing-scope catalog is corrected or expanded.

## Current role weighting

Current prototype base weights:

- manufacturing frontline: `1.0`;
- manufacturing support: `1.0`;
- management: `0.25`;
- sales: `0`;
- corporate / functional role: `0`;
- other / unknown: `0.5`.

If `high_income_5x = yes`, weight is capped at `0.25`.

Employment identity itself does **not** reduce weight. Direct employees, dispatch labor, outsourcing, and on-site service remain separately visible.

## Geography and manufacturing scope

Geography is optional at intake.

Before a release, the operator can review a brand's manufacturing footprint and freeze a versioned scope:

- `partial`: known locations can confirm a match, but missing locations cannot be used to exclude a report;
- `curated_complete`: the scope is considered complete enough for that release to act as a strict geography gate.

If geography is supplied and falls outside a `curated_complete` brand scope, the raw report remains accepted but receives manufacturing weight `0` for that release.

If geography is missing, no geography penalty is applied.

See [`PUBLICATION_CYCLE.md`](PUBLICATION_CYCLE.md).

## Fields intentionally not collected

The public/core record does not need:

- worker name;
- personal email or phone number;
- employee ID;
- exact job title;
- exact salary;
- gender or age;
- home address;
- GPS coordinate;
- written narrative;
- uploaded documents.

## Private intake metadata

A real backend may still need restricted data for:

- rate limiting;
- abuse resistance;
- moderation state;
- optional employment verification;
- receipt tracking.

Those fields belong to a private intake layer and must not leak into public exports.

## Backend outline

```text
POST /v1/reports
Content-Type: application/json
```

The intake server should:

1. validate `schema/submission.schema.json`;
2. resolve known entities when possible;
3. accept missing or unresolved geography rather than inventing facts;
4. apply private rate-limit / abuse checks;
5. assign opaque ID, receipt time, and source;
6. move the report through pending / accepted / rejected moderation;
7. store the accepted raw observation without permanently attaching a manufacturing weight.

The publication pipeline later:

1. freezes a cutoff;
2. refreshes and freezes `data/manufacturing-scope.json`;
3. applies the current methodology;
4. produces `schema/release-analysis.schema.json` records;
5. builds the public weighted histograms.

## Publication privacy

Even coarse region + brand + role can identify someone in a tiny subgroup. Before real community data is public, small slices need minimum-sample rules.

The raw accepted dataset may therefore contain information that the public UI chooses not to render as a tiny filtered histogram.

## Current implementation

The GitHub Pages prototype stores raw reports only in browser `localStorage`. The current weighting view is recomputed from those raw reports using the checked-in manufacturing-scope catalog, and JSON export includes the raw reports plus a separate release-analysis projection.
