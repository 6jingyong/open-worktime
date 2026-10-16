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

The tests cover schema normalization, unexpected-field rejection, write-disable behavior, CORS, D1 insertion shape, receipt-only responses, moderation semantics, and accepted-report export privacy.

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

## Operator workflow

Moderation is intentionally a command-line workflow rather than a public/admin web API. By default every command targets local D1. Add `--remote` explicitly to touch the production database.

From `backend/`:

```bash
# inspect pending reports
npm run operator -- list --limit 50

# counts by moderation state
npm run operator -- stats

# accept one report
npm run operator -- accept rpt_<uuid>

# reject an abusive/unusable report
npm run operator -- reject rpt_<uuid> --reason spam

# repeat any command against production only when intended
npm run operator -- list --remote
```

Allowed rejection reasons are deliberately narrow:

- `spam`
- `duplicate`
- `malformed`
- `privacy_risk`
- `test_submission`
- `other`

**Do not reject a report because it is sales, management, high-income, or outside a reviewed manufacturing region.** Those observations can remain valid raw reports while receiving low or zero manufacturing relevance in a publication release.

Migration `0002_moderation_audit.sql` adds only `reviewed_at` and a coarse `moderation_reason`; it does not identify the reviewer.

## Accepted raw export

A release should use an explicit cutoff. The operator tool exports only accepted raw observations and strips private moderation fields:

```bash
npm run operator -- export-accepted \
  --cutoff 2026-12-31T23:59:59Z \
  --out ../private-work/accepted-2026-q4.json \
  --remote
```

The output contains:

- `export_version = accepted-raw-v1`;
- normalized cutoff;
- export timestamp;
- report count;
- only fields allowed by the accepted raw observation contract.

It does **not** contain `moderation_state`, `moderation_reason`, or `reviewed_at`, and it does not contain release-time weights.

## Private database backup

A full D1 backup is operational/private material, not a public dataset artifact:

```bash
npm run operator -- backup \
  --out ../private-work/intake-backup.sql \
  --remote
```

Keep private backups outside the public repository. The repository intentionally does not contain a backup directory.

## Retention boundary

No automatic deletion rule is encoded yet because the eventual operator must adopt the policy explicitly. The intended separation is:

- accepted observations: eligible for reviewed public snapshots;
- pending observations: private until reviewed;
- rejected observations: private operational material, never part of a public release;
- public release artifacts: should be reproducible from an accepted-raw export plus frozen methodology/scope.

Before production launch, the operator should set an explicit retention duration for pending and rejected rows and document how private backups inherit that policy.

## Before enabling public writes

Do **not** change `WRITE_ENABLED` to `true` merely because the Worker deploys successfully.

Before a real launch, the operator should also decide and test:

- abuse / bot controls;
- retention duration for pending/rejected operational data;
- minimum publication thresholds for small worker slices;
- production D1 binding and backup location;
- recovery procedure from a private backup.

The moderation/export workflow now exists, but public intake should remain disabled until those remaining controls are in place.

## Storage model

`migrations/0001_init.sql` creates the private intake table and indexes.

Each row contains worker-supplied v0.4 fields plus:

- server-generated `id`;
- server-generated `submitted_at`;
- `source = community_report`;
- `moderation_state = pending | accepted | rejected`.

`migrations/0002_moderation_audit.sql` adds:

- `reviewed_at`;
- coarse `moderation_reason`.

The intake database does not contain release-time `analysis_weight` or `analysis_flags`.

That separation lets a later report recompute the same accepted observation under a newer manufacturing-scope database without rewriting the historical intake record.
