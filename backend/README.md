# Open Worktime anonymous intake backend

This directory contains the smallest server-side component needed to accept real community observations without changing the static GitHub Pages client architecture.

The backend is intentionally **disabled by default**. Merging this code does not start collecting worker data.

## Responsibilities

The intake Worker only does these jobs:

1. accept `POST /v1/reports` JSON payloads;
2. validate the v0.4 submission contract;
3. normalize small formatting differences such as `cn` → `CN`;
4. assign an opaque report / receipt ID and server receipt time;
5. store the raw observation as `pending` in D1;
6. return receipt metadata only.

It deliberately does **not**:

- calculate manufacturing relevance;
- decide whether a region is a valid manufacturing location;
- publish raw worker observations;
- expose a public database query endpoint;
- collect names, email addresses, phone numbers, employee IDs, exact salary, exact job title, home address, or GPS location;
- store IP addresses in the D1 schema.

Manufacturing weights are derived later by the monthly / quarterly publication pipeline described in `../docs/PUBLICATION_CYCLE.md`.

## Endpoints

### `GET /health`

Returns service status and whether writes are enabled.

### `POST /v1/reports`

Accepts one object matching `../schema/submission.schema.json`.

Success response:

```json
{
  "status": "pending",
  "receipt_id": "rpt_<opaque uuid>",
  "received_at": "2026-10-16T06:00:00.000Z"
}
```

The response does not echo the submitted brand, region, role, or hours.

There is intentionally no public `GET /v1/reports` endpoint.

## Local tests

The test suite does not require a Cloudflare account:

```bash
cd backend
npm test
```

The tests cover schema normalization, unexpected-field rejection, write-disable behavior, CORS, D1 insertion shape, and receipt-only responses.

## Local Worker development

Install dependencies:

```bash
cd backend
npm install
```

`wrangler.jsonc` is committed with:

```json
"WRITE_ENABLED": "false"
```

and without a D1 binding. This is deliberate: the Worker can be deployed accidentally without becoming an active intake endpoint.

To exercise D1 locally or deploy for real, create a database:

```bash
npx wrangler d1 create open-worktime-intake
```

Add the returned database ID to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "open-worktime-intake",
    "database_id": "<YOUR_D1_DATABASE_ID>",
    "migrations_dir": "migrations"
  }
]
```

Apply migrations:

```bash
npm run db:migrate:local
# or, for the remote database:
npm run db:migrate:remote
```

Then run:

```bash
npm run dev
```

## Before enabling public writes

Do **not** change `WRITE_ENABLED` to `true` merely because the Worker deploys successfully.

Before a real launch, the operator should also decide and test:

- abuse / bot controls;
- moderation workflow for `pending → accepted / rejected`;
- retention rules for any private operational metadata;
- minimum publication thresholds for small worker slices;
- backup and export procedure for the D1 raw-observation store.

Only after those controls exist should the D1 binding be configured in production and `WRITE_ENABLED` become `true`.

## Storage model

`migrations/0001_init.sql` creates only the private intake table and indexes.

Each row contains worker-supplied v0.4 fields plus:

- server-generated `id`;
- server-generated `submitted_at`;
- `source = community_report`;
- `moderation_state = pending | accepted | rejected`.

It does not contain release-time `analysis_weight` or `analysis_flags`.

That separation lets a later report recompute the same accepted observation under a newer manufacturing-scope database without rewriting the historical intake record.
