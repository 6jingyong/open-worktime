# Open Worktime

Open Worktime is an open prototype for crowdsourcing **actual weekly working time** behind manufactured products and brands.

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
- brand search across names, aliases, and owner companies;
- weekly-hour histogram;
- employment-type filters;
- a distribution-shape warning for separated peaks;
- a submission form that stores prototype submissions only in the current browser;
- JSON export of those local submissions;
- a machine-readable observation schema and entity-catalog schema.

### Important data boundary

The repository currently contains **no real bundled working-time observations**.

Real brands such as Haier, IKEA, Toyota, Lexus, Candy, AQUA, Casarte, and Comfee appear only as entity metadata. Their presence is not a claim about their labor conditions.

The bundled histogram observations still target only four fictional `demo-*` brands. CI explicitly rejects demo rows that point at a real brand.

## Entity catalog

The current graph is deliberately small:

```text
brand
  └─ owner_company_id → company

report
  ├─ brand_id → brand
  └─ facility_id → facility (optional)
```

`data/facilities.json` is empty for now. The preferred next facility-identity provider is Open Supply Hub, but no OS Hub facility records are bundled yet.

See [`docs/ENTITY_CATALOG.md`](docs/ENTITY_CATALOG.md).

## Data model

A real observation is designed around a minimal record:

```json
{
  "schema_version": "0.1",
  "brand_id": "brand-id",
  "country": "CN",
  "facility_id": null,
  "employment_type": "direct_contract",
  "weekly_hours_bucket": "45_50",
  "observed_at": "2026-10-16T00:00:00Z"
}
```

See [`schema/report.schema.json`](schema/report.schema.json) and [`schema/catalog.schema.json`](schema/catalog.schema.json).

## Architecture principle

The project separates three problems:

1. **Entity resolution** — what brand, owner company, and production site an observation refers to.
2. **Community input** — how new observations are submitted, validated, rate-limited, and moderated.
3. **Public dataset** — how accepted observations and aggregates are exported so that no single website is the only copy.

The MVP only proves the product loop and entity boundary. Signed snapshots, mirrors, Torrent/IPFS distribution, and a real community submission backend are later layers.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Licensing

Licenses are deliberately separated:

- **source code:** MIT;
- **selected Brandtree-derived brand/company seed:** CC BY 4.0;
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

The repository includes a Pages deployment workflow. GitHub requires Pages to be enabled once at repository level:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Until that one-time setting is enabled, the deployment workflow exits cleanly with a notice rather than failing the repository checks. After Pages is enabled, future pushes to `main` deploy automatically.

## Status

Prototype / pre-community-data.

The immediate goal is to validate the entity model and public interaction before importing production-site catalogs or accepting real employee submissions.
