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

## Fictional demo observations

`demo-distribution.json` is original fictional test data created only to exercise the prototype UI. It is dedicated to the public domain under **CC0 1.0**.

The four `demo-*` entities in `brands.json` are fictional and are also CC0 1.0 demo material.

## Future community observations

No license has been selected yet for future real community-contributed working-time observations. Do not assume those future records will be MIT, CC0, CC BY, or CC BY-SA merely because the software and entity catalogs use those licenses.
