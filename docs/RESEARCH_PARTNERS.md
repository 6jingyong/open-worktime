# Open Worktime · research partner brief

Open Worktime is a public-interest project built around one question:

> **How many hours do the people who make our products actually work?**

The goal is not to create another ESG score. The goal is to make existing working-time evidence easier to understand, compare and audit.

A public Open Worktime view should show distributions, sample sizes, employment relationships, geography, methodology and provenance rather than a hidden single-number judgment.

## Why this may complement existing labor research

Many organizations already do the hard part:

- interview workers;
- audit factories;
- maintain longitudinal panels;
- collect working-hours or overtime measures;
- maintain factory identifiers;
- publish research and compliance findings.

The missing layer is often consumer-facing reuse. A labor researcher may know that a factory has a certain working-hours distribution, while a consumer still has no practical way to connect that evidence to a production site, region or brand.

Open Worktime focuses on that translation layer.

## A partner does not need to learn GitHub

GitHub is only where the project source code is hosted. It is **not** a requirement for collaboration.

A partner can simply reply to an outreach email and share any of the following through whatever channel is appropriate for the organization:

- a questionnaire;
- a data dictionary;
- a list of column names;
- a public report;
- a safe aggregate table;
- a de-identified research extract;
- a description of what can and cannot be redistributed.

Open Worktime can do the schema mapping and build a source-specific adapter.

## Three collaboration levels

### Level 1 · Metadata only

Useful material:

- survey questionnaire;
- data dictionary;
- description of weekly-hours variable;
- whether a stable factory/site ID exists;
- survey rounds / collection dates;
- reuse and publication constraints.

No worker data needs to move.

### Level 2 · Safe aggregate export

A partner can keep raw microdata internally and provide only cells such as:

```text
factory_id | survey_round | weekly_hours_bucket | count
J-042      | 2024-R1      | 45_50               | 12
J-042      | 2024-R1      | 50_55               | 31
J-042      | 2024-R1      | 55_60               | 18
```

This is sufficient to publish a distribution while avoiding worker-level release.

### Level 3 · De-identified microdata

Where research permission allows it, the most useful minimal fields are:

```text
stable_factory_id
survey_round_or_reference_period
weekly_actual_hours
country_or_coarse_region   (optional)
employment_relationship    (optional)
broad_role                 (optional)
```

Open Worktime does not need names, contact details or employee identifiers.

## What Open Worktime will do

We take responsibility for the integration work:

1. document the source and permission status;
2. preserve the source's original time definition;
3. map hours into a common display only where statistically valid;
4. create a source-specific adapter instead of forcing the partner to remodel the dataset;
5. resolve factories/legal entities to public facility records where evidence exists;
6. connect facilities to brands only through auditable supply-chain evidence;
7. publish provenance and transformation notes;
8. keep raw evidence separate from later entity mappings and release-time weighting.

## What Open Worktime will not do

We do not want public records containing:

- worker names;
- personal email addresses or phone numbers;
- employee IDs;
- exact salaries;
- home addresses;
- GPS traces;
- unnecessary precise job titles;
- free-text complaints tied to an identifiable person.

We also do not assume that a difference between factories or regions proves discrimination or misconduct. Different distributions can reflect law, product mix, production cycles, employment composition or management. The project shows the evidence first.

## Restricted data is still useful

A collaboration does **not** require open-sourcing partner microdata.

Possible arrangements include:

- partner keeps raw microdata and publishes only approved aggregates;
- Open Worktime receives a de-identified research extract but publishes only histograms and counts;
- partner runs a small aggregation script internally;
- Open Worktime works only from already-public tables and uses the partner for methodological clarification.

The permission boundary should be explicit for every source.

## Statistical compatibility

Open Worktime's native community question is:

> Average actual weekly working time over the last four complete weeks.

External research does not need to use that exact wording.

If a source measures a typical week, survey week, annual mean, contractual schedule or another concept, Open Worktime preserves that distinction. Incompatible measures remain contextual rather than being silently relabeled.

## What a first pilot could look like

A small useful pilot does not need global coverage.

Example:

1. one country;
2. several factories with stable anonymous IDs;
3. one or more survey rounds;
4. actual weekly-hours observations or approved histogram counts;
5. public facility identity for some subset of factories;
6. supply-chain evidence connecting some factories to brands.

That is enough to demonstrate the full path:

```text
worker evidence
  → anonymous factory ID
  → public facility identity
  → supply-chain evidence
  → brand / region
  → weekly-hours distribution + sample size + provenance
```

## What we would ask before any transfer

Before exchanging data, we would agree on:

- the exact meaning of the working-time field;
- which fields are needed;
- which fields must never leave the partner;
- whether factory IDs may be mapped externally;
- whether aggregate histograms/sample counts may be published;
- attribution wording;
- license or research-use permission;
- any required minimum sample threshold or suppression rule.

## Current project status

The prototype already contains:

- fixed weekly-hours histogram buckets;
- geography and employment-relationship comparisons;
- a provenance-preserving external import layer;
- support for individual evidence, aggregate distributions and scalar statistics;
- an Open Supply Hub facility-link pilot;
- a real ILO country context baseline kept separate from worker histograms;
- privacy-minimal community intake contracts;
- moderation/export tooling;
- a disabled-by-default anonymous backend.

The main missing ingredient is now real brand/factory worker evidence. That is why research partnerships matter more to the project than another software feature.

## Links

- Public prototype: https://6jingyong.github.io/open-worktime/
- Partner page: https://6jingyong.github.io/open-worktime/partners.html
- Source repository: https://github.com/6jingyong/open-worktime
- Data acquisition notes: [`DATA_ACQUISITION.md`](DATA_ACQUISITION.md)
