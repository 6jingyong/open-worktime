# External data import pipeline

Open Worktime can ingest existing surveys, historical community datasets, NGO research, and statistical datasets without pretending that every external source is equivalent to a fresh first-party worker submission.

The pipeline is deliberately **staging-first**:

```text
external file
  + source / license manifest
  + explicit field mapping or source-specific adapter
        ↓
normalized external evidence bundle
        ↓
entity resolution / human review
        ↓
optional later promotion or publication
```

Nothing in this directory writes directly to the intake D1 database.

## Why a separate evidence layer exists

External sources can differ in all of these ways:

- one row may represent one worker, a histogram cell, or a statistical mean;
- hours can mean actual hours, schedule span, contractual hours, or another definition;
- the reference period may be four complete weeks, a typical week, one survey week, or an annual statistic;
- brand / company / factory entities may not yet be normalized;
- legal reuse rights may differ from technical accessibility.

Flattening all of those into `schema/report.schema.json` would destroy provenance and create false precision.

## Three evidence shapes

### `individual`

One source row represents one observation/person.

For `measure_type = weekly_hours_observation`, numeric weekly hours can be converted to the fixed Open Worktime bins. Only a sufficiently complete individual record with `period_basis = last_4_complete_weeks` can become:

```text
comparability = canonical_candidate
```

This still does not automatically insert the row into the community intake database.

### `aggregate`

One row represents a distribution cell, for example:

```text
PUMA / Jiangsu / 55–<60h / n=31
```

The importer keeps `count = 31` as one aggregate record. It never expands that cell into 31 synthetic workers.

This shape uses:

```text
measure_type = weekly_hours_distribution_cell
```

### `aggregate_statistic`

One row represents a scalar statistic such as:

```text
China / manufacturing / 2024 / mean actual weekly hours = 46.2
```

This shape uses:

```text
measure_type = mean_weekly_hours
```

The value stays in `weekly_hours_value`. It is **not** converted to the `45_50` histogram bucket, because a mean and a distribution are different statistics.

## Measure types

Current external measure types are:

- `weekly_hours_observation`
- `weekly_hours_distribution_cell`
- `mean_weekly_hours`
- `schedule_span_hours`

`schedule_span_hours` is contextual only. A schedule such as `09:00–18:00 × 5 days` does not prove nine net hours were actually worked each day.

## Source and license manifest

Every import has an operator-reviewed reuse status:

- `redistributable` — normalized evidence may be published, subject to the stated license/permission;
- `internal_only` — usable locally but not for public redistribution;
- `unknown` — rights have not been established.

`reuse_status` is separate from statistical comparability. Open data can still be weakly comparable; excellent data can still have restrictive reuse terms.

The importer records the reviewed decision. It does not infer legal permission automatically.

## Privacy / field whitelist

Manifest mapping is a whitelist. Unmapped source columns are discarded.

A legacy spreadsheet may contain names, exact job titles, phone numbers, comments, or other fields; none enter normalized evidence unless explicitly mapped. The synthetic individual fixture contains an `employee_name` column specifically to test this boundary.

## Period basis

Supported external period values:

- `last_4_complete_weeks`
- `typical_week`
- `survey_week`
- `annual_mean_actual_week`
- `contract_schedule`
- `unknown`

Only `last_4_complete_weeks` is currently eligible for an individual `canonical_candidate`. Other periods remain context rather than being silently relabeled.

## Entity resolution

The external layer can preserve unresolved source names instead of throwing rows away:

- `brand_id` — canonical Open Worktime brand when resolved;
- `brand_name_raw` — source text when unresolved;
- `facility_id` / `facility_text` follow the same pattern;
- statistical sources may instead carry raw country and industry codes/labels.

This allows entity resolution to improve later without rewriting the source evidence.

## Generic usage

From repository root:

```bash
node imports/import.mjs imports/examples/individual.manifest.json
```

Write a reproducible bundle:

```bash
node imports/import.mjs \
  imports/examples/mean.manifest.json \
  --out /tmp/open-worktime-import.json
```

Bundles include source metadata, SHA-256 of the exact input file, normalized records, comparability/publishability flags, and transformation issues.

## Source-specific adapters

Column names are not enough for many real datasets. Source-specific adapters live under `imports/adapters/` and encode semantics that must be reviewed explicitly.

Current pilots:

- **ILOSTAT** — open manufacturing actual-hours aggregate means;
- **WorkerLivesMatter / WorkingTime** — restricted-use company schedule context.

See [`adapters/README.md`](adapters/README.md).

Example:

```bash
node imports/adapters/import-source.mjs ilostat /path/to/ilostat.csv \
  --out /tmp/ilostat.json
```

## What this layer still does not do

- scrape arbitrary websites;
- OCR PDFs;
- infer licenses;
- fuzzy-match brands automatically;
- treat schedule spans as actual work;
- promote external evidence into D1 automatically;
- mix aggregate means into employee histograms;
- publish restricted sources merely because they are technically downloadable.

Those remain explicit reviewed steps rather than hidden heuristics.
