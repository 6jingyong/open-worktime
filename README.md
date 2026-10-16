# Open Worktime

Open Worktime is an open prototype for crowdsourcing **actual weekly working time** behind manufactured products and brands.

Live prototype: https://6jingyong.github.io/open-worktime/

The project intentionally starts narrow:

- physical goods and manufacturing-oriented brands first;
- no moral score and no "good/bad company" label;
- publish the distribution of reported weekly working hours;
- keep employment identity visible as a filter;
- keep entity metadata separate from labor-condition observations;
- keep the public dataset easy to copy, export, mirror, and later distribute over P2P systems.

## MVP question

A contributor answers two core questions:

1. What is your employment relationship with the company / production site?
2. Over the last four complete weeks, what was your average actual weekly working time?

### Employment types

- Direct contract
- Labor dispatch
- Labor outsourcing
- On-site after-sales / service
- Other or unknown

### Weekly-hour buckets

- `<35`
- `35–<40`
- `40–<45`
- `45–<50`
- `50–<55`
- `55–<60`
- `60–<65`
- `65–<70`
- `70–<75`
- `75+`

The public view is a histogram, not a single score or average.

## Current prototype

The prototype remains dependency-free: plain HTML, CSS, and JavaScript. It can be hosted directly on GitHub Pages or mirrored as static files.

It now includes:

- a small **real brand and owner catalog seed**;
- an evidence-backed **production-location pilot**;
- brand search across names, aliases, and owner companies;
- weekly-hour histogram;
- employment-type filters;
- production-location suggestions in the local prototype submission form;
- a distribution-shape warning for separated peaks;
- a privacy-minimal v0.2 intake contract;
- browser-local report creation plus JSON export;
- separate machine-readable schemas for client submissions, accepted reports, entities, and facility links.

### Important data boundary

The repository currently contains **no real bundled working-time observations**.

Real brands such as Haier, IKEA, PUMA, Toyota, Lexus, Candy, AQUA, Casarte, and Comfee appear only as entity metadata. Their presence is not a claim about their labor conditions.

The bundled histogram observations still target only four fictional `demo-*` brands. CI explicitly rejects demo rows that point at a real brand.

## Entity catalog

The graph separates entities from evidence edges:

```text
brand
  └─ owner_company_id → company

brand
  └─ facility-link evidence → facility

report
  ├─ brand_id → brand
  ├─ facility_id → canonical facility (optional)
  └─ facility_text → unresolved site fallback (optional)
```

The first facility pilot uses Open Supply Hub OS ID `CN2021159RK49KG` for NANTONG YUXIN CLOTHING CO.,LTD. The brand-to-facility edge is included because the OS Hub profile lists PUMA in the Supply Chain Network and attributes Final Product Assembly information to PUMA.

This is intentionally a one-location pilot, not an attempt to mirror PUMA's full supplier list.

See [`docs/ENTITY_CATALOG.md`](docs/ENTITY_CATALOG.md) and [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md).

## Submission and report contracts

The client submission is deliberately smaller than the final public record:

```json
{
  "schema_version": "0.2",
  "brand_id": "bt-puma",
  "country": "CN",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks"
}
```

A future server validates that payload, then assigns the authoritative report `id`, receipt-time `submitted_at`, and `source = community_report`. The client therefore cannot choose the timestamp used for freshness or historical analysis.

The public observation does **not** need a worker's name, email, phone number, employee ID, exact job title, salary, gender, age, document upload, or written narrative.

Known production sites use `facility_id`. If a site is not yet resolved, it stays separate as `facility_text` rather than being treated as a verified facility entity.

See [`schema/submission.schema.json`](schema/submission.schema.json), [`schema/report.schema.json`](schema/report.schema.json), and [`docs/COMMUNITY_INTAKE.md`](docs/COMMUNITY_INTAKE.md).

## Architecture principle

The project separates three problems:

1. **Entity resolution** — what brand, owner company, and production site an observation refers to.
2. **Community input** — how new observations are submitted, validated, rate-limited, and moderated without leaking private intake metadata into the public dataset.
3. **Public dataset** — how accepted observations and aggregates are exported so that no single website is the only copy.

The current GitHub Pages client only exercises the submission contract locally. A real anonymous ingestion backend has not been deployed yet.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/COMMUNITY_INTAKE.md`](docs/COMMUNITY_INTAKE.md).

## Licensing

Licenses are deliberately separated:

- **source code:** MIT;
- **selected Brandtree-derived brand/company seed:** CC BY 4.0;
- **Open Supply Hub-derived facility data and facility-link material:** CC BY-SA 4.0;
- **fictional demo entities and demo distributions:** CC0 1.0;
- **future real community working-time dataset:** not chosen yet.

See [`data/ATTRIBUTION.md`](data/ATTRIBUTION.md) before importing or redistributing data.

## Run locally

Serve the repository root with any static HTTP server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Pages is enabled and deploys automatically from `main` through GitHub Actions.

Live prototype: https://6jingyong.github.io/open-worktime/

## Status

Prototype / pre-community-data.

The immediate goal is to keep the public observation contract stable enough that a future anonymous ingestion backend can be added without redesigning the client or dataset.
