# Geography and regional comparison

Open Worktime keeps work geography because it can reveal meaningful differences across factories and regions, but **geography is optional and deliberately simple**.

The useful questions are:

- Does the same brand show different working-time distributions in different places?
- Do direct hires, dispatched workers, and outsourced workers show the same regional pattern?
- Does one company's labor regime change when it operates under different local institutions and labor markets?

A regional difference is an observation, not automatic proof of discrimination.

## v0.4 geography fields

```json
{
  "country": "CN",
  "work_region": "Shanghai"
}
```

Both fields are optional.

- `country` is a two-letter country code when supplied.
- `work_region` is a short coarse workplace label such as `Shanghai`, `Texas`, `Berlin`, or `Jiangsu`.

The project does not require contributors to know ISO subdivision codes. It does not ask for home addresses, GPS coordinates, streets, or precise private locations.

Known public facilities may fill country / region automatically.

## Intake is permissive; publication can be strict

A report such as:

```text
Brand: Example Auto
Region: Beijing
```

is accepted as a raw observation even if the current system does not believe that brand manufactures there.

The stricter decision happens when a report release is built.

Before a monthly or quarterly release, the operator reviews a versioned manufacturing-scope catalog for each brand:

- `partial`: known locations can confirm a match, but unlisted locations cannot be excluded;
- `curated_complete`: coverage is considered complete enough for that release to be used as a strict manufacturing geography gate.

For `curated_complete` brands:

- supplied geography inside the reviewed scope → normal role-based manufacturing weight;
- supplied geography outside the reviewed scope → manufacturing weight `0` for that release;
- no supplied geography → no geography penalty.

The raw observation is never deleted merely because it receives zero manufacturing weight.

This deliberately accepts some false negatives in the headline statistic. A later release can improve the manufacturing-scope database and re-run the same historical observations.

## Why partial and complete coverage are different

A small facility pilot must not pretend to be a complete global manufacturing map.

A `partial` scope can say:

> this location is known to be relevant.

It cannot safely say:

> every other location is irrelevant.

Only a deliberately reviewed `curated_complete` scope can make that exclusion for a specific release.

## Brand-first comparison

Hold brand and worker scope roughly fixed, then compare regions:

```text
Brand A
  ├─ Shanghai → weekly-hours histogram
  ├─ Texas    → weekly-hours histogram
  └─ Berlin   → weekly-hours histogram
```

This is usually the strongest regional comparison because brand-specific management and product context are partially controlled.

Employment identity and manufacturing-relevance weighting should remain visible.

## Region-first comparison

Pool reports carrying the same coarse region label across brands.

This can reveal patterns, but the result is **not automatically the average worker in that region**. Community submissions may be dominated by a few brands, facilities, or job categories.

A region-first view should therefore show:

- raw report count;
- effective weighted sample under the current frozen scope;
- number of represented brands;
- employment filter;
- raw vs manufacturing-weighted mode.

## Why region is not mandatory

The project's primary question is about labor time used in manufacturing. A worker who can reliably report brand, role, employment relationship, and weekly hours still provides useful evidence even if they leave location blank.

Missing location is therefore different from contradictory location evidence.

## Interpretation

Good wording:

> "The observed working-time distributions differ across these regions."

Not enough evidence by itself:

> "The company discriminates against workers in region X."

A discrimination claim needs additional causal and legal evidence beyond the working-time histogram.

See [`PUBLICATION_CYCLE.md`](PUBLICATION_CYCLE.md) for the batch-release workflow.
