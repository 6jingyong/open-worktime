# Community intake contract

Open Worktime should eventually accept real worker reports, but the client submission, the private anti-abuse system, and the accepted public observation are three different things.

## Client submission

The browser should send only the facts supplied by the contributor:

```json
{
  "schema_version": "0.3",
  "brand_id": "bt-puma",
  "country": "CN",
  "subdivision_code": "CN-JS",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks"
}
```

This payload is defined by `schema/submission.schema.json`.

The client does **not** get to choose the authoritative receipt time, public report ID, or public source label.

`subdivision_code` is deliberately coarse. It should be an ISO 3166-2 first-level region when available, such as `CN-SH`, `US-TX`, or `DE-BB`. The public intake contract does not ask for a worker's home address, GPS location, or private street address.

## Accepted public observation

After intake validation, the server can attach receipt metadata and produce a public record:

```json
{
  "schema_version": "0.3",
  "id": "opaque-server-id",
  "brand_id": "bt-puma",
  "country": "CN",
  "subdivision_code": "CN-JS",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks",
  "submitted_at": "2026-10-16T04:10:00Z",
  "source": "community_report"
}
```

This accepted record is defined by `schema/report.schema.json`.

If a production site is not yet in the facility catalog, `facility_id` remains `null` and `facility_text` may contain a short site name. The fallback text is not a verified facility identity.

## Fields intentionally not collected in the public record

The core dataset does not need:

- worker name;
- personal email or phone number;
- employee ID;
- exact job title;
- salary;
- gender or age;
- written narrative;
- uploaded documents;
- home address;
- GPS coordinate or precise private location.

This is deliberate data minimization, not an incomplete profile.

## Private intake metadata

A future backend may need temporary or restricted metadata for abuse resistance, for example rate-limit state, moderation decisions, optional employment-verification results, or network-derived abuse signals.

Those fields belong in a separate private intake system. They must not be silently appended to the public observation export.

Network identifiers should be retained only as long as necessary for abuse prevention. If hashing or other pseudonymous fingerprints are used, they should still be treated as sensitive operational metadata rather than public data.

## Backend contract

A minimal future endpoint can be conceptually simple:

```text
POST /v1/reports
Content-Type: application/json
```

Request body: one object valid under `schema/submission.schema.json`.

The server should:

1. validate the submission schema;
2. resolve or quarantine unknown entity references rather than inventing them;
3. validate that `country`, `subdivision_code`, and any canonical facility do not contradict one another;
4. apply rate limits and abuse checks outside the public record;
5. assign an opaque receipt/report ID;
6. assign the authoritative `submitted_at` receipt time and `source = community_report`;
7. place the report into a pending/accepted/rejected moderation state;
8. publish only accepted observations or privacy-preserving aggregates.

A successful response need not reveal internal moderation signals. A simple receipt is enough:

```json
{
  "status": "pending",
  "receipt_id": "opaque-random-id"
}
```

## Facility and geography handling

Known facilities and user-entered facilities are different facts:

- `facility_id`: canonical Open Worktime facility entity, such as one derived from an Open Supply Hub OS ID;
- `facility_text`: contributor-supplied fallback when the site is not resolved;
- `country`: coarse national work location;
- `subdivision_code`: optional first-level work region.

When a known facility already has country and subdivision metadata, the client can fill those fields automatically. A future moderation process can later map a fallback site name to a canonical facility without pretending the contributor originally supplied a verified facility ID.

## Publication threshold

The prototype does not yet choose a minimum sample threshold. Before real publication, small site / region / employment-identity slices should be reviewed for re-identification risk. A histogram should not expose a tiny subgroup merely because the underlying report schema permits that filter.

Regional aggregation also needs a sampling warning: pooled community reports in a region are not automatically representative of that region's entire labor force. The mix of brands and factories should remain visible.

See `docs/GEOGRAPHY.md`.

## Current implementation

The GitHub Pages prototype does not upload reports. It previews the exact v0.3 **client submission payload**, then locally simulates the server-added `id`, `submitted_at`, and `source` fields before storing the report in browser `localStorage`.

JSON export contains those locally simulated accepted-report records. This exercises both contracts without pretending that an anonymous backend already exists.
