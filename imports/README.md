# External data import pipeline

Open Worktime can ingest existing surveys, historical community datasets, NGO research, or manually prepared extracts without pretending that every external source is equivalent to a fresh first-party worker submission.

The pipeline is deliberately **staging-first**:

```text
external file
  + source / license manifest
  + explicit field mapping
        ↓
normalized external evidence bundle
        ↓
entity resolution / human review
        ↓
optional later promotion or publication
```

Nothing in this directory writes directly to the intake D1 database.

## Why a separate evidence layer exists

External sources vary in at least four important ways:

- one row may represent one worker, or an aggregate group;
- work time may mean the last four complete weeks, a typical week, one survey week, or a contractual schedule;
- brand / factory entities may not yet be normalized;
- legal reuse rights may differ from technical accessibility.

Flattening all of those into `schema/report.schema.json` would destroy useful provenance and could create false precision.

## Two supported record kinds

### `individual`

One source row represents one observation/person.

If all canonical fields are available **and** `period_basis = last_4_complete_weeks`, the record is marked:

```text
comparability = canonical_candidate
```

That does not automatically insert it into the community database. It means the row is semantically compatible enough for a later reviewed promotion step.

If the period is `typical_week`, `survey_week`, etc., it remains useful but is only `distribution_context`.

### `aggregate`

One row represents a count/distribution cell, for example:

```text
PUMA / Jiangsu / 55–<60h / n=31
```

The importer preserves `count = 31` as one aggregate record. It **never expands it into 31 synthetic workers**.

## Source and license manifest

Every import has a manifest with source metadata and an operator-declared reuse status:

- `redistributable` — normalized evidence may be published, subject to the stated license/permission;
- `internal_only` — useful for local analysis/entity work but not for public redistribution;
- `unknown` — rights have not been established yet.

`reuse_status` is intentionally separate from `comparability`. A perfectly measured dataset can still be non-redistributable, and an openly licensed dataset can still use a weak working-time definition.

The importer does not make a legal determination itself. The manifest records the operator's reviewed decision and source citation.

## Privacy / field whitelist

The manifest mapping is a whitelist.

Only mapped fields can enter normalized evidence. Unmapped source columns are discarded.

This means a legacy spreadsheet may contain fields such as employee name, exact job title, phone number, or free text, but those fields are not copied merely because they exist in the source file.

The checked-in individual fixture intentionally contains an `employee_name` column and the tests verify it never appears in output.

## Period basis

Supported values:

- `last_4_complete_weeks`
- `typical_week`
- `survey_week`
- `contract_schedule`
- `unknown`

Only the first is currently eligible for `canonical_candidate` status. The others are kept as context instead of being silently relabeled.

## Brand and facility resolution

External source names are often messy. The normalized layer therefore keeps both:

- `brand_id` — canonical Open Worktime brand ID when resolved;
- `brand_name_raw` — source text for unresolved/manual review.

An unresolved brand does not destroy the row. It gets the issue flag `unresolved_brand` and can be resolved later.

The same pattern applies to canonical `facility_id` versus fallback `facility_text`.

## Usage

From repository root:

```bash
node imports/import.mjs imports/examples/individual.manifest.json
```

Write a reproducible bundle:

```bash
node imports/import.mjs \
  imports/examples/individual.manifest.json \
  --out /tmp/open-worktime-import.json
```

The bundle includes:

- source metadata;
- SHA-256 of the exact input file;
- source row count;
- normalized records;
- comparability / publishability flags;
- transformation issues and summary counts.

The input hash makes later review able to answer "which exact source file produced this normalized bundle?"

## Mapping rules

A field can be mapped from a source column:

```json
"country": {
  "column": "country",
  "transform": "upper"
}
```

or from a constant:

```json
"high_income_5x": {
  "constant": "unknown"
}
```

Simple source-value dictionaries are also supported:

```json
"employment_type": {
  "column": "employment",
  "map": {
    "dispatch": "labor_dispatch",
    "direct": "direct_contract"
  }
}
```

Numeric `weekly_hours` can be mapped directly and is converted into Open Worktime's fixed 5-hour bins. A source that already provides compatible buckets can map `weekly_hours_bucket` instead.

## What this first version does not do

- scrape websites;
- OCR PDFs;
- infer licenses;
- fuzzy-match brands automatically;
- infer exact weekly hours from clock-in/clock-out schedules;
- merge external evidence into D1;
- combine aggregate counts with individual reports in the public UI.

Those should be explicit adapters or reviewed downstream steps rather than hidden heuristics in the generic importer.
