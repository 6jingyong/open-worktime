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

## Intake and pending storage

`backend/` now contains a disabled-by-default implementation of:

```text
POST /v1/reports
Content-Type: application/json
```

The intake Worker:

1. rejects payloads that do not match the v0.4 field set;
2. normalizes small formatting differences such as a lowercase country code;
3. rejects client-supplied extra fields such as `analysis_weight`;
4. assigns an opaque receipt/report ID;
5. assigns the authoritative server receipt time;
6. stores the raw observation with `source = community_report` and `moderation_state = pending`;
7. returns receipt metadata only.

The D1 intake schema does not contain an IP-address column and does not contain release-time weight fields.

There is intentionally no public report-reading endpoint in the intake Worker.

The checked-in Worker configuration has `WRITE_ENABLED = false` and no production D1 binding, so the backend code is not an active collection service merely because it is merged or deployed.

See [`../backend/README.md`](../backend/README.md).

## Accepted raw observation

After moderation, an accepted observation may publish the worker-supplied facts plus receipt metadata:

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

## Private operational metadata

A real public launch may still need restricted data or transient signals for:

- rate limiting;
- abuse resistance;
- moderation state;
- optional employment verification;
- receipt tracking.

Those signals belong to a private intake layer and must not leak into public exports. Their retention should be explicitly documented before collection begins.

The current D1 migration stores only the report facts, server receipt metadata, and moderation state.

## Before real activation

The backend skeleton is not yet a complete public launch because anonymous write abuse still needs an operational policy.

Before changing `WRITE_ENABLED` to `true`, the operator should have:

1. an abuse / bot-control mechanism;
2. a moderation process for `pending → accepted / rejected`;
3. backup/export procedures;
4. retention rules for any future private operational metadata;
5. minimum publication thresholds for small slices.

## Publication privacy

Even coarse region + brand + role can identify someone in a tiny subgroup. Before real community data is public, small slices need minimum-sample rules.

The raw accepted dataset may therefore contain information that the public UI chooses not to render as a tiny filtered histogram.

## Current implementation

The GitHub Pages prototype still stores browser demo reports only in `localStorage` and does **not** call the Worker yet.

The repository now separately contains a tested intake Worker and D1 schema, but production writes remain disabled. This lets the API contract and storage boundary stabilize before any real employee data is collected.
