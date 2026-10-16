# Moderation boundary

Open Worktime moderation answers one narrow question:

> Is this raw observation usable enough to remain in the accepted observation pool?

It does **not** answer:

> How representative is this observation of ordinary manufacturing labor?

The second question belongs to release-time manufacturing analysis.

## States

Every intake row starts as:

- `pending`

An operator may move it once to:

- `accepted`
- `rejected`

The operator CLI only updates rows that are still `pending`, so already reviewed rows are not silently reclassified by ordinary commands.

## Accept

Accept a report when the submission is structurally usable and there is no concrete abuse/privacy reason to reject it.

Acceptance does **not** mean:

- the worker is definitely a manufacturing worker;
- the region is definitely a manufacturing location;
- the report will receive full weight;
- the report's factual claim has been independently proven.

A sales worker, manager, high-income employee, or worker in an unusual region may still produce a valid accepted raw observation.

## Reject

Current coarse rejection reasons are limited to:

- `spam`
- `duplicate`
- `malformed`
- `privacy_risk`
- `test_submission`
- `other`

`other` should be used sparingly and documented in the operator's internal process if it becomes common.

Do not create rejection reasons such as:

- sales role;
- management role;
- high income;
- part-time work;
- labor dispatch / outsourcing;
- location mismatch;
- outside manufacturing scope.

Those are analysis dimensions, not evidence that the raw report is invalid.

## Minimal audit metadata

The private intake database stores only:

- `moderation_state`;
- `reviewed_at`;
- coarse `moderation_reason`.

It intentionally does not store the reviewer's name in the worker-observation row. Organizations that require staff accountability can keep their own operational audit log separately from the worker dataset.

## Export boundary

The accepted-raw export contains only fields from the public raw observation contract.

It excludes:

- `moderation_state`;
- `moderation_reason`;
- `reviewed_at`;
- release-time `analysis_weight`;
- release-time `analysis_flags`.

This keeps the publication pipeline reproducible without turning private moderation metadata into part of the public worker dataset.

## Relationship to publication

The intended sequence is:

```text
anonymous submission
  → pending private intake row
  → moderation
  → accepted raw observation
  → fixed release cutoff
  → frozen manufacturing-scope + methodology
  → release-time analysis weight
  → privacy-thresholded aggregate publication
```

Moderation may remove abuse or unusable records. Manufacturing analysis may give an accepted record low or zero weight. Publication privacy may suppress a tiny slice even when all of its underlying accepted records remain valid.

These are three different decisions and should remain separate in code and governance.
