# Community intake contract

Open Worktime should eventually accept real worker reports, but the public observation format must stay much smaller than the private anti-abuse system around it.

## Public observation

A public observation contains only the fields needed to place one report into the weekly-hours distribution:

```json
{
  "schema_version": "0.2",
  "brand_id": "bt-puma",
  "country": "CN",
  "facility_id": "osh-CN2021159RK49KG",
  "facility_text": null,
  "employment_type": "labor_dispatch",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks",
  "submitted_at": "2026-10-16T04:10:00Z",
  "source": "community_report"
}
```

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
- uploaded documents.

This is deliberate data minimization, not an incomplete profile.

## Private intake metadata

A future backend may need temporary or restricted metadata for abuse resistance, for example rate-limit state, receipt IDs, moderation decisions, or optional employment-verification results.

Those fields belong in a separate private intake system. They must not be silently appended to the public observation export.

Network identifiers should be retained only as long as necessary for abuse prevention. If hashing or other pseudonymous fingerprints are used, they should still be treated as sensitive operational metadata rather than public data.

## Backend contract

A minimal future endpoint can be conceptually simple:

```text
POST /v1/reports
Content-Type: application/json
```

Request body: one object valid under `schema/report.schema.json` with `source = community_report`.

The server should:

1. validate the schema;
2. resolve or quarantine unknown entity references rather than inventing them;
3. apply rate limits and abuse checks outside the public record;
4. assign an opaque receipt ID;
5. place the report into a pending/accepted/rejected moderation state;
6. publish only accepted observations or privacy-preserving aggregates.

A successful response need not reveal internal moderation signals. A simple receipt is enough:

```json
{
  "status": "pending",
  "receipt_id": "opaque-random-id"
}
```

## Facility handling

Known facilities and user-entered facilities are different facts:

- `facility_id`: canonical Open Worktime facility entity, such as one derived from an Open Supply Hub OS ID;
- `facility_text`: contributor-supplied fallback when the site is not resolved.

A future moderation process can later map a fallback name to a canonical facility without rewriting what the contributor originally submitted.

## Publication threshold

The prototype does not yet choose a minimum sample threshold. Before real publication, small site/identity slices should be reviewed for re-identification risk. A histogram should not expose a tiny subgroup merely because the underlying report schema permits that filter.

## Current implementation

The GitHub Pages prototype does not upload reports. It stores v0.2 records in browser `localStorage`, renders them locally, and allows JSON export. This exercises the future submission contract without pretending that an anonymous backend already exists.
