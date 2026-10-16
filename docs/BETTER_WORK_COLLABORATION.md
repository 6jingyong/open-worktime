# Open Worktime × Better Work · collaboration concept

This note is a **proposal draft**, not a claim of partnership.

The aim is to explain why Better Work's existing research could be unusually valuable to Open Worktime, while keeping the burden on Better Work as small as possible.

## The complement

Better Work already does work that Open Worktime should not try to reinvent:

- worker and management surveys;
- factory-level compliance research;
- longitudinal / multi-round evidence;
- stable factory identifiers inside research datasets;
- public transparency work in participating supply chains.

Open Worktime is trying to solve a different downstream problem:

> How can labor evidence become a simple, auditable public view of **actual weekly working-time distributions** by factory, region, employment relationship and—where evidence permits—consumer-facing brand?

The project is therefore closer to a translation / public-interface layer than a competing labor-research program.

## Why Better Work is a particularly strong fit

Our source review identified two promising Better Work research paths:

1. published Jordan research describing worker-level weekly working-hours data across multiple survey rounds and many factories;
2. historical impact-assessment microdata in multiple countries, with unique factory identifiers used to match worker/manager/supervisor surveys to factory compliance information.

Those stable factory identifiers are the key. A factory ID makes it possible to preserve worker anonymity while still linking aggregate evidence to a production site.

If a safe public facility crosswalk can then be established, Open Worktime can attempt evidence-backed links to Open Supply Hub and disclosed supplier networks.

## The lowest-burden first conversation

We would **not** begin by asking Better Work to prepare a custom public dataset.

A useful first reply could be only:

- whether the relevant historical datasets are still available for research access;
- whether a stable anonymous factory identifier is present across survey rounds;
- the data dictionary / questionnaire for working-hours variables;
- what rules apply to publishing derived factory-level aggregates;
- whether factory identifiers can be mapped to public factory identities under any approved process.

That information alone would tell us whether a pilot is feasible.

## If microdata sharing is difficult

Open Worktime can work with several safer alternatives.

### Option A · Better Work keeps all microdata

Better Work (or an approved researcher) produces only:

```text
anonymous_factory_id
survey_round
weekly_hours_bucket
count
```

Open Worktime receives no individual records.

### Option B · De-identified research extract

A narrow extract could contain:

```text
anonymous_factory_id
survey_round
weekly_actual_hours
country / region (if allowed)
employment relationship (if available and allowed)
broad worker category (if available and allowed)
```

No names, contact information, employee IDs or exact salaries are needed.

### Option C · Public outputs only

If neither microdata nor custom aggregates can be shared, Better Work can simply point us to the best public tables and clarify variable definitions. We can keep those results as contextual evidence without pretending they are worker-level Open Worktime observations.

## What Open Worktime would do

Better Work would not need to learn our schema or GitHub workflow.

We would take responsibility for:

- adapting the existing data structure;
- preserving survey-round and working-time semantics;
- creating weekly-hours histograms without inventing observations;
- documenting provenance and permission boundaries;
- suppressing small groups when required;
- resolving public factory identity only where allowed;
- researching factory→brand relationships from public evidence;
- keeping uncertain mappings explicitly unresolved;
- building the public visualization;
- publishing methodology and transformation code for auditability.

## What public output could look like

A hypothetical safe output might read:

```text
Factory / site: public factory identity (where permitted)
Country / region: Jordan
Survey round: 2022-R2
Sample: n = 112 workers
Measure: self-reported total weekly hours, including overtime

<35       3%
35–<40    4%
40–<45    8%
45–<50   14%
50–<55   21%
55–<60   25%
60–<65   15%
65–<70    7%
70–<75    2%
75+        1%

Source: Better Work research dataset
Methodology: linked here
Brand relationship: shown only if independently evidenced
```

The numbers above are illustrative only.

## What Open Worktime would not claim

A working-time difference does not automatically prove:

- discrimination;
- illegal behavior;
- coercion;
- poor overall working conditions;
- causation by a brand.

The value of the project is to make the distribution visible and auditable, then let researchers investigate the causes.

## Why this may be useful to Better Work too

If the pilot works, it creates an additional public-use layer for research Better Work has already invested in:

- research findings become easier for non-specialists to understand;
- factory-level working-time evidence can be compared across rounds or regions;
- methodology remains linked rather than disappearing behind a score;
- supply-chain context can connect research to the products consumers recognize;
- the visualization and import code remain open for review and reuse.

The ideal collaboration is therefore not “please give us your database.” It is:

> **Can we turn a safe slice of your existing evidence into a transparent public demonstration together, with Open Worktime doing the integration work?**

## Before sending outreach

We should send the first Better Work email only after:

- the public prototype is understandable without GitHub;
- this partner brief is linked from the public site;
- the data-acquisition request is precise;
- we have a clear safe-aggregate fallback;
- we can show that real external statistics are already handled without semantic distortion;
- the repository README is readable by a non-developer.
