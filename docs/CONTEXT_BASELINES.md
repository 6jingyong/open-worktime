# Context baselines

Open Worktime keeps external regional context separate from worker-report distributions.

The first context snapshot is `data/country-context.json`, based on ILOSTAT modelled estimates for **average weekly hours actually worked per employed person** in 2025.

## Why this is separate

A country-level mean is not a brand-level observation and is not a histogram.

For example:

```text
China / 2025 / mean actual weekly hours = 44.56
```

must **not** become:

```text
China / 45–<50h bucket
```

The first statement is a scalar population mean; the second would falsely imply a worker distribution.

Therefore country context:

- is displayed beside the region explorer;
- never contributes rows to the Open Worktime histogram;
- never changes manufacturing-relevance weights;
- never substitutes for brand/facility evidence;
- may remain visible even when there are zero community reports for that country.

## Population boundary

The current ILO context measure covers **all employed persons**, not manufacturing workers only.

It should be read as a broad local work-time background, not as a manufacturing-sector benchmark. A future manufacturing-specific baseline can be added as a separate measure when a reproducible source snapshot is available.

## Current snapshot

The checked-in subset currently covers countries useful to the prototype catalog and demo geography:

- China (`CN`)
- Germany (`DE`)
- Japan (`JP`)
- Netherlands (`NL`)
- Sweden (`SE`)
- Singapore (`SG`)
- United States (`US`)

The subset is intentionally small. Missing countries mean “not included in this snapshot,” not “no data exists.”

## Provenance

Publisher: International Labour Organization (ILO), ILOSTAT modelled estimates.

Indicator: `HOW_2EMP_SEX_NB`.

The retained values were reviewed through Nations Inquiry's 2025 edition page, which states that it read ILO's 2026 release, reshaped it to one row per country, and did not recalculate, rescale, or round the published values.

License: CC BY 4.0.

The JSON keeps both the publisher source URL and the review/retrieval page so the provenance chain remains explicit.
