# Source-specific external adapters

These adapters sit on top of the generic `imports/` staging layer. They encode semantics that cannot safely be inferred from column names alone.

No real third-party dataset is committed in this directory. Checked-in CSV files under `fixtures/` are synthetic and only imitate source shapes for tests.

## ILOSTAT manufacturing actual-hours baseline

Adapter: `ilostat.mjs`

Target indicator:

- `HOW_TEMP_SEX_ECO_NB_A` — Average weekly hours actually worked per employed person by sex and economic activity.

The adapter conservatively selects only:

- the exact indicator above;
- total-sex rows (`SEX_T` / `SEX_TOTAL`);
- manufacturing classifications `ECO_ISIC4_C` or `ECO_AGGREGATE_MAN`.

The result is deliberately modeled as:

```text
record_kind = aggregate_statistic
measure_type = mean_weekly_hours
period_basis = annual_mean_actual_week
comparability = context_only
```

A country/industry mean such as `46.2` is **not** converted into Open Worktime's `45_50` histogram bucket. A mean and a distribution are different statistics.

The adapter preserves:

- raw ILO country code and label;
- manufacturing classification code and label;
- year/time;
- scalar mean weekly hours.

A small ISO3→ISO2 map exists only for pilot countries. Unknown codes stay unresolved while the raw code remains available.

ILOSTAT provides bulk-download and other data tools at:

- https://ilostat.ilo.org/data/

ILO states that databases and datasets made available from 3 May 2023 are covered by CC BY 4.0 unless otherwise indicated:

- https://www.ilo.org/rights-and-permissions

This makes ILOSTAT useful as an open **regional / manufacturing-industry baseline**, not as brand-level evidence.

Example against a local ILO-style CSV:

```bash
node imports/adapters/import-source.mjs ilostat /path/to/ilostat.csv \
  --out /tmp/ilostat-manufacturing-hours.json
```

## WorkerLivesMatter / WorkingTime schedule context

Adapter: `workingtime.mjs`

The historical WorkingTime dataset contains fields such as:

- company;
- department / job;
- base location;
- work start / end;
- lunch and dinner times;
- workdays per week;
- category and free-text fields.

A processed mirror documents `launch_time` as **午饭时间 (lunch time)**, not a launch/publication timestamp:

- https://github.com/Vonng/worktime

The adapter therefore never uses `launch_time` as `observed_at`.

It only derives a weekly **schedule span** when all of these are strictly parseable:

```text
work_begin = HH:MM
work_end   = HH:MM
workdays   = integer 1..7
```

For example, `09:00 → 18:00 × 5` becomes `45` schedule-span hours. The adapter does not subtract lunch/dinner and does not claim those 45 hours are net or actual working hours.

Every record is forced to:

```text
measure_type = schedule_span_hours
comparability = context_only
publishable = false
```

with flags including:

- `schedule_span_not_actual_hours`;
- `restricted_source_not_publishable`;
- `company_name_not_verified_brand`;
- `unparsed_schedule` when strict parsing fails.

The original WorkingTime project states that, without team permission, its data should not be used for other purposes including academic research and nonprofit reports. Therefore Open Worktime marks this source `internal_only` and does not commit or publish its real records:

- https://github.com/182yzh/WorkerLivesMatter

The adapter is useful for testing entity-resolution and legacy-schedule ingestion, and could become publishable only if reuse permission is obtained.

Local/internal use:

```bash
node imports/adapters/import-source.mjs workingtime /path/to/worktime.csv \
  --out /tmp/workingtime-internal.json
```

The CLI prints an explicit `internal_only` warning for this source.

## Why these two pilots

They intentionally stress opposite sides of the import layer:

| Source | Granularity | Rights | What Open Worktime learns |
| --- | --- | --- | --- |
| ILOSTAT | country × industry aggregate mean | CC BY 4.0 | open manufacturing baseline; scalar statistic semantics |
| WorkingTime | company/role schedule records | restricted secondary reuse | messy company/entity data; schedule ≠ actual hours |

Together they prevent the generic importer from assuming that every useful external number is a worker-level histogram observation.
