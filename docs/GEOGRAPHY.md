# Geography and regional comparison

Open Worktime treats **work geography** as a first-class observation dimension alongside brand and employment identity.

The purpose is not to infer motive. It is to make questions such as these measurable:

- Does the same brand show different working-time distributions in different countries or regions?
- Do direct hires and dispatched workers show the same regional pattern?
- Does a factory system converge toward local working-time norms when a brand operates in multiple jurisdictions?

A regional difference is an observation, not proof of discrimination. Local law, product mix, shift design, factory maturity, labor-market conditions, seasonality, supplier structure, and sampling composition can all contribute.

## Geography fields

A v0.3 submission contains:

```json
{
  "country": "CN",
  "subdivision_code": "CN-SH"
}
```

- `country` uses ISO 3166-1 alpha-2.
- `subdivision_code` uses a coarse ISO 3166-2 first-level subdivision when available.

Examples:

- `CN-SH` — Shanghai
- `US-TX` — Texas
- `DE-BB` — Brandenburg

The project does **not** ask a contributor for a home address, GPS coordinate, street, or precise personal location.

## Known facilities

When a contributor selects a canonical production facility, country and subdivision can be derived from the public facility catalog.

That is preferable to asking the contributor to type the same location twice. The submitted observation still stores the coarse geography so historical reports remain interpretable even if facility metadata changes later.

## Two useful views

### Brand-first

Hold the brand fixed and compare geography:

```text
Brand A
  ├─ CN-SH → weekly-hours histogram
  ├─ US-TX → weekly-hours histogram
  └─ DE-BB → weekly-hours histogram
```

This is usually the strongest way to investigate whether one organization operates with materially different working-time regimes across locations.

Employment identity should remain separately filterable so outsourcing or dispatch does not disappear inside a regional average.

### Region-first

Pool reports within a region across brands:

```text
US-TX
  └─ reports from Brand A + Brand B + Brand C ...
```

This can reveal a regional pattern, but it is **not automatically an estimate of the regional labor-force average**. Community samples can be dominated by a few large brands or factories.

A region-first view should therefore always expose at least:

- number of observations;
- number of represented brands;
- employment-identity filter;
- the weekly-hours histogram itself.

Later methodology may add weighting or minimum-diversity rules, but v0.3 deliberately avoids inventing a hidden weighting model.

## Privacy and publication thresholds

First-level subdivision is coarse enough for broad comparisons, but it can still combine with a rare employment identity or tiny factory sample to create re-identification risk.

Before real public community data is accepted, Open Worktime should define minimum publication thresholds for small region × brand × employment slices.

The raw intake schema can be more granular than the public UI is willing to display.

## Interpretation rule

Open Worktime should report:

> "The observed working-time distributions differ across these regions."

It should not automatically report:

> "The company discriminates against workers in region X."

A discrimination claim requires additional causal and legal evidence beyond the working-time distribution alone.
