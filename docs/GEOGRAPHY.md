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

## Region as evidence, not an intake gate

A report such as:

```text
Brand: Tesla
Region: Beijing
```

should not be rejected merely because the current catalog does not recognize Beijing as a manufacturing location for that brand.

Instead, location can become one input to manufacturing relevance:

- confirmed brand-linked factory → strong location evidence;
- known canonical facility that conflicts with the selected brand → downweight / review;
- free-text region not resolved by the catalog → keep the report, flag it as unresolved;
- no geography at all → no automatic penalty.

This matters because an incomplete factory catalog must not become a machine for false exclusions.

As the brand × manufacturing-location graph becomes more complete, location mismatch can safely become a stronger weighting signal. The weight should remain public and explainable.

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
- effective weighted sample;
- number of represented brands;
- employment filter;
- raw vs manufacturing-weighted mode.

## Why region is not mandatory

The project's primary question is about the labor time used in manufacturing. A worker who can reliably report brand, role, employment relationship, and weekly hours still provides useful evidence even if they leave location blank.

Missing location is therefore different from contradictory location evidence.

## Interpretation

Good wording:

> "The observed working-time distributions differ across these regions."

Not enough evidence by itself:

> "The company discriminates against workers in region X."

A discrimination claim needs additional causal and legal evidence beyond the working-time histogram.
