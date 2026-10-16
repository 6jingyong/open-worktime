# Publication cycle

Open Worktime does not need to turn every submission into an authoritative public statistic in real time.

A nonprofit or community operator can collect raw observations continuously and publish a reviewed snapshot monthly, quarterly, or on another explicit cadence.

## Recommended release flow

1. **Collect raw observations**
   - accept privacy-minimal worker facts;
   - do not reject a report merely because its region or factory is unfamiliar;
   - do not permanently attach a manufacturing-analysis weight at intake.

2. **Freeze a cutoff**
   - choose a release cutoff timestamp;
   - keep later submissions for the next release.

3. **Refresh the manufacturing-scope catalog**
   - update known manufacturing countries, regions, and facilities for brands that will appear in the release;
   - use public supply-chain evidence, company disclosures, facility databases, and manual review;
   - mark each brand scope as either `partial` or `curated_complete`.

4. **Freeze `scope_version`**
   - the manufacturing-scope file used for the release becomes immutable for that release;
   - future releases may use a newer scope and therefore reclassify the same historical raw observation.

5. **Derive release-time analysis**
   - role relevance is applied;
   - unusually high-income workers are downweighted;
   - employment identity itself is not penalized;
   - optional geography is checked against the frozen brand scope.

6. **Publish the release**
   - raw sample counts remain visible;
   - manufacturing-weighted histograms use the frozen release analysis;
   - the release records its methodology version and scope version so the result is reproducible.

## Strict geography rule

Geography is optional at intake.

If a contributor leaves geography blank, the report is not penalized merely for missing location information.

If a contributor supplies geography and the brand has `curated_complete` manufacturing coverage for that release:

- a match to the curated manufacturing scope is eligible for the normal role-based weight;
- a location outside the curated manufacturing scope receives manufacturing weight `0` for that release.

The raw report is still retained.

This intentionally prefers conservative publication over trying to rescue every edge case in real time. If the scope was incomplete, the next release can update the catalog and recompute the historical observation.

For example, once a brand's manufacturing geography has been deliberately reviewed, a report that claims a manufacturing role in a non-manufacturing city can remain in the raw dataset while contributing zero weight to the manufacturing headline distribution.

## Partial scopes

A `partial` scope can confirm known manufacturing locations, but it must not be used to exclude unlisted locations.

This distinction prevents a tiny pilot facility catalog from becoming a false negative engine while still allowing mature brand scopes to be strict.

## Why raw observations and release analysis are separate

A worker observation is a historical fact claim supplied at one point in time. The project's understanding of a brand's manufacturing footprint can improve later.

Therefore:

- `schema/report.schema.json` stores the accepted raw observation;
- `data/manufacturing-scope.json` stores one version of the reviewed manufacturing footprint;
- `schema/release-analysis.schema.json` stores the derived weight and reasons for a specific release.

Changing the manufacturing-scope database should change the next analysis snapshot, not silently rewrite what the worker originally submitted.
