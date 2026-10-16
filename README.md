# Open Worktime

> **How many hours do the people who make our products actually work?**
>
> 看看制造你所购买商品的人，每周实际工作多久。

Open Worktime is an open public-interest project for making **actual weekly working-time evidence behind manufactured goods** easier to see, compare and audit.

It is not an ESG score and it does not label a company “good” or “bad”. The core output is a distribution: how many workers report `<35`, `35–<40`, `40–<45` … `75+` hours per week, with sample size, geography, employment relationship, methodology and source provenance visible alongside it.

**Live prototype:** https://6jingyong.github.io/open-worktime/  
**For researchers / NGOs / worker-data programs:** https://6jingyong.github.io/open-worktime/partners.html

> **Current status:** the software and data pipeline work, but the project does not yet have a real bundled brand/factory worker-hours dataset. Finding the first strong research/data partner is now more important than adding another software feature.

---

## The idea in 30 seconds

We increasingly know **where** products are made. Public supply-chain projects can identify factories and brand relationships.

What is much harder for a consumer to see is:

> **What does the actual weekly working-time distribution look like for the people making those products?**

Open Worktime tries to connect three layers without mixing them up:

```text
worker working-time evidence
        ↓
factory / region identity
        ↓
evidence-backed supply-chain links
        ↓
consumer-facing brand
```

The project keeps uncertainty visible. A known factory is not automatically linked to a brand; a brand relationship needs evidence. A difference between regions is evidence to investigate, not automatic proof of discrimination or misconduct.

---

## What the public should eventually be able to see

A useful real page might look conceptually like this:

```text
Brand: Example Brand
Factory / region: Example production site · Country
Sample: n = 112 manufacturing workers
Measure: average actual weekly hours

<35        3%
35–<40     4%
40–<45     8%
45–<50    14%
50–<55    21%
55–<60    25%
60–<65    15%
65–<70     7%
70–<75     2%
75+         1%

Source / methodology / survey period / employment mix: visible here
```

No single moral score is required for this to be useful.

---

## If you already have labor or worker-survey data

**You do not need to learn GitHub or remodel your dataset to our schema.**

A research partner can start with something as small as:

- a questionnaire;
- a data dictionary;
- a list of column names;
- a public report;
- a safe factory-level aggregate table;
- or a de-identified research extract.

Open Worktime can take responsibility for the integration work: source-specific adapters, working-time normalization, provenance, factory/entity resolution and public visualization.

Raw microdata does **not** need to become public. If required, a partner can keep all worker-level data internally and provide only:

```text
anonymous_factory_id | survey_round | weekly_hours_bucket | count
```

See:

- [Research partner brief](docs/RESEARCH_PARTNERS.md)
- [Public no-GitHub partner page](https://6jingyong.github.io/open-worktime/partners.html)
- [Real-data acquisition strategy](docs/DATA_ACQUISITION.md)
- [Better Work collaboration concept](docs/BETTER_WORK_COLLABORATION.md) — proposal draft, not a claim of partnership

---

## Privacy: what we do **not** need

The public working-time model is deliberately low-information.

We do not need:

- worker names;
- personal email addresses or phone numbers;
- employee IDs;
- exact salaries;
- home addresses;
- GPS traces;
- unnecessary exact job titles;
- free-text complaints tied to identifiable workers.

For the native community intake, the project asks only for broad facts such as brand, optional coarse geography/site, employment relationship, broad role, a high-income relevance flag, and one weekly-hours bucket.

The brandless fallback survey is even simpler: **work city × employment relationship × broad role × weekly-hours bucket**, with no employer required. See [Area survey pilot](docs/AREA_SURVEY_PILOT.md).

---

## The working-time measure

The native Open Worktime community question is:

> **Over the last four complete weeks, how many hours did you actually work per week on average?**

The fixed public buckets are:

`<35`, `35–<40`, `40–<45`, `45–<50`, `50–<55`, `55–<60`, `60–<65`, `65–<70`, `70–<75`, `75+`

External research does **not** have to use the same wording.

A `typical week`, a `survey week`, an `annual mean` and a `contractual schedule` are different measures. The import layer preserves those differences instead of silently relabeling everything as the native Open Worktime metric.

Likewise:

- a scalar mean is **not** converted into a histogram bucket;
- an aggregate count is **not** expanded into synthetic workers;
- schedule span is **not** called actual work time.

---

## Manufacturing relevance

The consumer-facing default should represent **ordinary manufacturing labor**, not every employee who happens to work for a brand.

Current broad-role weights are transparent and deliberately simple:

| Broad role | Base weight |
| --- | ---: |
| Production / assembly | 1.0 |
| Manufacturing support (quality, equipment, warehouse, production support) | 1.0 |
| Management | 0.25 |
| Sales | 0 |
| Corporate / functional role | 0 |
| Other / unknown | 0.5 |

If a contributor reports compensation roughly `≥5×` typical local full-time income, the weight is capped at `0.25`.

Employment identity itself does **not** reduce weight. Direct workers, labor-dispatch workers and outsourced manufacturing workers can all represent real manufacturing labor.

Geography is optional. Missing geography is not penalized. When a brand's manufacturing geography has been deliberately reviewed as complete for a release, a supplied location outside that scope can receive zero manufacturing weight while the raw observation remains intact.

See [Geography methodology](docs/GEOGRAPHY.md) and [`data/manufacturing-scope.json`](data/manufacturing-scope.json).

---

## What already works

The current prototype already has enough infrastructure to learn from real data:

### Public/static layer

- real brand / owner seed;
- an evidence-backed Open Supply Hub production-location pilot;
- brand search;
- weekly-hours histograms;
- employment and optional geography filters;
- region explorer;
- manufacturing-weighted vs all-raw views;
- a real ILO country working-time context snapshot kept separate from worker histograms.

### External research layer

- provenance-preserving import manifests;
- source/input hashing;
- individual observations;
- aggregate distribution cells;
- scalar aggregate statistics;
- explicit reuse / permission status;
- source-specific adapters for ILOSTAT and restricted-use WorkingTime-style schedule data;
- unresolved entity names can remain unresolved instead of being guessed.

### Community / operator layer

- privacy-minimal submission contracts;
- browser-local prototype intake;
- disabled-by-default Cloudflare Worker + D1 backend;
- pending / accepted / rejected moderation states;
- accepted raw export;
- private backup tooling;
- release-time analysis kept separate from raw worker facts.

Public writes remain disabled by default. Merging the backend does not silently start collecting worker data.

---

## Real external data currently included

### ILO country context

[`data/country-context.json`](data/country-context.json) contains a small real 2025 ILOSTAT modelled-estimate snapshot for **average weekly hours actually worked per employed person**.

It is intentionally shown as broad country context only:

- population = all employed persons;
- measure = scalar country mean;
- it never enters a worker histogram;
- it never changes manufacturing relevance weights.

See [Country context baseline](docs/CONTEXT_BASELINES.md) and [data attribution](data/ATTRIBUTION.md).

### Real brand/factory worker observations

**None are bundled yet.**

That is the current bottleneck and the reason the project is prioritizing data partnerships and carefully licensed external research over additional infrastructure.

---

## Current data-acquisition priorities

1. **Research partnerships / existing microdata** — highest priority.
2. **Factory-level aggregate distributions** when microdata cannot be shared.
3. **Entity resolution** from source factory IDs/names → public facility → evidence-backed brand relationships.
4. **Brandless city survey fallback** if external access is slow, so the real collection pipeline can still be tested.

Better Work is currently the highest-value research target because public Better Work materials describe worker weekly-hours microdata and stable factory identifiers across research programs. The project has prepared a low-burden collaboration concept, but no partnership is claimed and no outreach should be sent until the public-facing materials are ready.

See [Data acquisition strategy](docs/DATA_ACQUISITION.md).

---

## Architecture, briefly

The important separation is conceptual, not technological:

```text
EXTERNAL ENTITY DATA
brands / companies / facilities / supply-chain evidence

WORKER OR RESEARCH EVIDENCE
raw facts, source semantics, provenance, permission

PRIVATE INTAKE / MODERATION
anti-abuse and operational state kept out of public observations

RELEASE ANALYSIS
manufacturing relevance + frozen scope/version

PUBLIC OUTPUT
histograms, sample sizes, geography, provenance, context
```

This lets the project improve factory mappings or manufacturing scope later without rewriting the original worker evidence.

For technical details see:

- [Architecture](docs/ARCHITECTURE.md)
- [Community intake](docs/COMMUNITY_INTAKE.md)
- [Moderation](docs/MODERATION.md)
- [External imports](imports/README.md)
- [Publication cycle](docs/PUBLICATION_CYCLE.md)
- schemas under [`schema/`](schema/)

---

## Data and software licensing

Code and data licenses are intentionally separate.

- **software:** MIT;
- **Brandtree-derived entity seed:** CC BY 4.0;
- **Open Supply Hub-derived facility/link material:** CC BY-SA 4.0;
- **ILO country context snapshot:** CC BY 4.0;
- **fictional demo material / import fixtures:** CC0 1.0;
- **future community worker observations:** license not chosen yet;
- **external research:** retains source-specific permission/license terms and is never assumed redistributable merely because it is technically accessible.

See [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md).

---

## Run locally

The public prototype is dependency-free:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The repository also contains Node-based import tools and a disabled-by-default Cloudflare backend; those are optional for simply viewing the site.

---

## What not to build next

Until the project obtains at least one real manufacturing-worker dataset, these are deliberately **not** the main priority:

- publication schedulers;
- large factory-catalog bulk imports with no worker evidence;
- complex dashboards/admin panels;
- IPFS/Torrent distribution;
- sophisticated significance machinery;
- additional fictional demo datasets.

The project has enough infrastructure. The next breakthrough should come from **real evidence**.
