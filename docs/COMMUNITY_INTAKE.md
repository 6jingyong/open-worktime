# Community intake contract

Open Worktime separates three things:

1. what the contributor submits;
2. private anti-abuse / moderation metadata;
3. the accepted public observation.

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

`country` and `work_region` are nullable. A contributor can leave geography blank without losing manufacturing relevance.

`work_role` is intentionally broad. The project does not need exact job titles.

`high_income_5x` is only `yes / no / unknown`; no salary amount is collected.

The client cannot choose report ID, receipt time, source label, analysis weight, or analysis flags.

## Accepted public observation

After validation the server may publish:

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
  "analysis_weight": 1,
  "analysis_flags": ["manufacturing_frontline", "known_brand_facility"],
  "submitted_at": "2026-10-16T05:30:00Z",
  "source": "community_report"
}
```

The weight is public and explainable; it is not a hidden deletion rule.

## Default weighting rule

Current prototype base weights:

- manufacturing frontline: `1.0`;
- manufacturing support: `1.0`;
- management: `0.25`;
- sales: `0`;
- corporate / functional role: `0`;
- other / unknown: `0.5`.

If `high_income_5x = yes`, weight is capped at `0.25`.

Employment identity itself does **not** reduce weight. Direct employees, dispatch labor, outsourcing, and on-site service remain separately visible because outsourcing should not erase labor from the dataset.

### Location evidence

- a canonical facility with an evidence-backed link to the selected brand gets `known_brand_facility`;
- a canonical facility known to the catalog but not linked to the selected brand is capped at `0.25` and receives `location_mismatch_review`;
- free-text region / site data that cannot yet be resolved receives `location_unresolved` but is not automatically penalized today.

The last rule is deliberate: the current facility catalog is incomplete. A future backend may safely use brand × region mismatch more strongly only when the underlying manufacturing-location coverage is good enough.

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

The server should:

1. validate `schema/submission.schema.json`;
2. resolve known entities when possible;
3. accept missing or unresolved geography rather than inventing facts;
4. derive `analysis_weight` and `analysis_flags` from public rules plus evidence-backed entity matching;
5. apply private rate-limit / abuse checks;
6. assign opaque ID, receipt time, and source;
7. move the report through pending / accepted / rejected moderation;
8. publish accepted raw observations or privacy-preserving aggregates.

## Publication privacy

Even coarse region + brand + role can identify someone in a tiny subgroup. Before real community data is public, small slices need minimum-sample rules.

The raw accepted dataset may therefore contain information that the public UI chooses not to render as a tiny filtered histogram.

## Current implementation

The GitHub Pages prototype stores reports only in browser `localStorage`. It locally simulates server-derived `analysis_weight`, `analysis_flags`, ID, timestamp, and source so the data contract can be tested without pretending a real anonymous backend exists.
