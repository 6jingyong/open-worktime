# Open Worktime

Open Worktime is an open prototype for crowdsourcing **actual weekly working time** behind manufactured products and brands.

The project intentionally starts narrow:

- physical goods and manufacturing-oriented brands first;
- no moral score and no "good/bad company" label;
- publish the distribution of reported weekly working hours;
- keep employment identity visible as a filter;
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

This first version is deliberately dependency-free: plain HTML, CSS, and JavaScript. It can be hosted directly on GitHub Pages or mirrored as static files.

The demo includes:

- brand search;
- weekly-hour histogram;
- employment-type filters;
- a small distribution-shape warning for separated peaks;
- a submission form that stores prototype submissions only in the current browser;
- JSON export of those local submissions.

**All bundled sample observations are fictional demo data.** They must not be interpreted as claims about any real company.

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

See [`schema/report.schema.json`](schema/report.schema.json) for the machine-readable schema.

## Architecture principle

The project separates two problems:

1. **Community input** — how new observations are submitted, validated, rate-limited, and moderated.
2. **Public dataset** — how accepted observations and aggregates are exported so that no single website is the only copy.

The MVP only proves the product loop. Signed snapshots, mirrors, Torrent/IPFS distribution, and third-party ingestion are later layers.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Licensing

Source code is MIT licensed.

The bundled demo observations are fictional. A license for future real community-contributed datasets has **not yet been chosen**. Do not import third-party datasets until their licenses and the future Open Worktime data license are explicitly compatible.

## Run locally

Serve the repository root with any static HTTP server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Status

Prototype / pre-data. The immediate goal is to validate whether the interaction and data model are understandable before building a real submission backend or importing external entity datasets.
