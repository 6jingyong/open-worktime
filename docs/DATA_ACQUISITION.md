# Real-data acquisition strategy

Open Worktime's current bottleneck is no longer software infrastructure. It is obtaining real working-time evidence that can be tied to manufacturing workers and, ideally, to factories and brands.

The immediate success criterion is not another feature. It is:

> first real manufacturing working-time distribution on the site

The preferred path is brand/factory level. A geography-only survey pilot exists as a fallback so the project can still validate real-world collection while external data access is being negotiated.

## Priority order

### P0 — Better Work research microdata

Better Work is currently the highest-value target.

Public Better Work material documents worker surveys containing weekly working hours, including a Jordan dataset with more than 8,000 respondents across multiple rounds. Better Work also states that its historical impact-assessment research collected microdata in five countries and matched worker/manager/supervisor data to compliance data using unique factory IDs.

This creates a plausible path:

```text
Better Work worker microdata
  -> stable anonymized factory ID
  -> Better Work factory identity / Transparency Portal
  -> Open Supply Hub / disclosed supplier lists
  -> brand(s)
  -> Open Worktime histogram
```

The key unknowns are access rights and factory identifiers, not whether weekly-hours observations exist.

### Access-route recheck · 2026-10-20

The [official Jordan programme page](https://betterwork.org/jordan/our-programme/) states that operations have been paused since June 2025 because of funding cuts. This does not establish whether historical research data can still be accessed. The [Better Work research page](https://betterwork.org/research/) continues to direct research proposals and data requests to `research@betterwork.org`.

The next practical step is therefore to ask the research team about **existing historical data, a data dictionary or an already approved aggregate table**, rather than depending on a new Jordan collection or requesting a custom export immediately. Access, response time and permission to publish remain unconfirmed.

The [Transparency Portal's issues page](https://portal.betterwork.org/transparency/issues) says working time is assessed but is not subject to public reporting there. The page also contains old rollout dates, so it should not be treated as a fresh operational status notice. In any case, public compliance findings are not a worker-hour distribution and cannot fill the current data gap.

For the first local demonstration, accept an anonymous factory or manufacturing-region distribution without requiring a brand link. Require genuine worker observations or counts, the original working-time definition, reference period, sample size, provenance and terms permitting the intended use. Preserve source bins when they cannot be mapped exactly to our ten buckets; never estimate missing cells from a mean or a chart.

The immediate deliverable should be a short feasibility comparison of the leading sources and a low-burden inquiry draft. Sending outreach remains a separate, explicitly authorized action. GitHub publication is not a prerequisite for this local feasibility work.

### What to request

Ask the Better Work research team for the minimum privacy-preserving fields needed for Open Worktime:

- country / programme;
- survey round or date;
- worker-reported weekly working hours or the raw variables needed to reproduce them;
- a stable anonymized factory ID that is consistent within the dataset;
- if permitted, a crosswalk from that anonymized ID to the public Better Work factory identity;
- broad employment/worker category fields only if already available and safe;
- data dictionary and methodology notes;
- explicit terms for publishing only aggregated factory/region histograms and sample counts.

Do **not** request names, phone numbers, employee IDs, exact home locations, or any direct personal identifiers.

### Proposed outreach

Contact: `research@betterwork.org`

Suggested subject:

> Data request: anonymized factory-level weekly working-time research for Open Worktime

Suggested message:

> Hello Better Work research team,
>
> I am working on Open Worktime, an open-source public-interest project that aims to publish privacy-preserving distributions of actual weekly working time behind manufactured products and supply chains. We do not rank companies morally; our goal is to make working-time distributions auditable and comparable while preserving source methodology and privacy.
>
> Better Work's published research appears unusually well aligned with this goal. In particular, the Jordan working-hours research describes more than 8,000 worker survey responses with weekly working hours, and Better Work materials describe historical multi-country microdata linked to compliance records through unique factory IDs.
>
> We would like to ask whether a research-use dataset could be made available containing weekly working-time observations, survey round/date, country/programme, and a stable anonymized factory identifier. We do not need direct personal identifiers. If possible, we would also like to understand whether that factory identifier can be linked, directly or through an approved crosswalk, to public Better Work factory identities.
>
> Our intended public output would be aggregate histograms/sample counts only, with clear methodology and source attribution. We are happy to comply with access conditions and to keep restricted microdata private if redistribution is not permitted.
>
> Could you advise on the available datasets, application process, data dictionary, and terms for publishing aggregated results?
>
> Thank you.

Do not send this message automatically. The project operator should review and send it from an appropriate identity/account.

## P0 entity-resolution bridge

Factory-level data becomes useful to consumers only after a source factory can be connected to a public supply chain.

The preferred evidence chain is:

```text
source factory identifier/name
  -> Better Work public factory identity when available
  -> Open Supply Hub OS ID
  -> evidence-backed brand/facility links
```

Rules:

- fuzzy matching may suggest candidates but must not create a brand/factory edge automatically;
- a confirmed mapping should retain the source string, canonical target ID, match method, reviewer, and evidence URL;
- one factory may serve multiple brands;
- absence of a brand link is not evidence that the factory does not serve that brand;
- expand the facility catalog only when a real worktime source needs resolution, rather than bulk-importing factories without observations.

## P1 public aggregate sources

Public reports and openly licensed statistics are still useful, but they should remain context unless they contain a real distribution or individual observations.

Examples:

- Better Work research papers with mean/SD/min/max weekly hours;
- Better Work compliance reports about overtime violations;
- ILOSTAT country/industry means;
- national labour-force statistics.

A mean is not a histogram and a compliance violation rate is not a worker-hour distribution.

## Fallback — Open Worktime area survey pilot

If access to P0 microdata is blocked or takes too long, launch a small China-first questionnaire through a service such as Wenjuanxing.

The pilot intentionally drops brand/factory identity. Its goal is to validate:

- whether workers will answer the minimal questions;
- whether city × employment-type distributions produce sensible results;
- whether the four-complete-week question is understandable;
- moderation / duplicate / abuse handling;
- privacy-safe aggregation and visualization;
- whether the project can attract enough real respondents to justify a brand-level phase.

The contract is `schema/area-survey-submission.schema.json`.

This pilot does **not** replace the long-term brand/factory objective. It is a real-data bootstrap path.

## Stop doing for now

Until at least one real manufacturing-worker dataset is obtained, avoid making these the main line of work:

- monthly/quarterly report schedulers;
- large-scale factory catalog expansion;
- IPFS/Torrent distribution;
- complex statistical significance machinery;
- administrator dashboards;
- additional fictional demo datasets;
- broad country-baseline expansion without a concrete comparison need.

The project already has enough infrastructure to learn from real data.
