# Data attribution and licensing

Open Worktime keeps code licensing and data licensing separate.

## Brand and company catalog seed

The real brand/company entity seed in `brands.json` and `companies.json` includes selected records derived from the **Brandtree brand ownership dataset**.

Attribution:

> Brandtree brand ownership dataset, 2026-10-15, https://brandtree.org/data, CC BY 4.0

Those derived entity records remain subject to **CC BY 4.0** and are not relicensed under the repository's MIT software license.

The Brandtree-derived seed contains entity metadata only. It does **not** contain working-time observations and must not be interpreted as a labor-condition claim about any listed brand or company.

## Open Supply Hub facility pilot

`facilities.json` and `facility-links.json` contain a deliberately tiny pilot derived from **Open Supply Hub** production-location data.

Attribution:

> Open Supply Hub, https://opensupplyhub.org, facility information and OS IDs licensed under CC BY-SA 4.0.

The first pilot record is OS ID `CN2021159RK49KG` (NANTONG YUXIN CLOTHING CO.,LTD.). The corresponding brand-to-facility edge is included because the Open Supply Hub profile lists **PUMA** in its Supply Chain Network and attributes Final Product Assembly information to PUMA on 2026-06-18.

Open Supply Hub-derived facility information and derivative facility catalog material remain subject to **CC BY-SA 4.0**. The OS ID is preserved prominently in the data and UI. These records are not relicensed under MIT.

A facility link means only that the cited source connects the brand and production location. It does not mean the relationship is exclusive, complete, currently active beyond the evidence date, or evidence of any particular labor condition.

## ILO country working-time context

`country-context.json` contains a small real country-level context snapshot based on **International Labour Organization (ILO) ILOSTAT modelled estimates**.

Current measure:

> `HOW_2EMP_SEX_NB` — Average weekly hours actually worked per employed person, 2025.

The checked-in subset covers only a few countries useful to the current prototype. Values were reviewed through Nations Inquiry's 2025 edition, which states that it read the ILO 2026 release, reshaped it to one row per country, and did not recalculate, rescale, or round the published values. The JSON also preserves the canonical ILO indicator download URL.

License:

> ILO databases and datasets made available from 3 May 2023 are covered by **CC BY 4.0** unless otherwise indicated.

This dataset is **context only**. It is a scalar country mean for all employed persons, not a manufacturing-worker distribution, brand-level labor claim, or facility-level observation. Open Worktime never converts these means into histogram buckets or manufacturing weights.

See `docs/CONTEXT_BASELINES.md` for the statistical boundary.

## Fictional demo observations

`demo-distribution.json` is original fictional test data created only to exercise the prototype UI. It is dedicated to the public domain under **CC0 1.0**.

The four `demo-*` entities in `brands.json` are fictional and are also CC0 1.0 demo material.

## Future community observations

No license has been selected yet for future real community-contributed working-time observations. Do not assume those future records will be MIT, CC0, CC BY, or CC BY-SA merely because the software and entity catalogs use those licenses.
