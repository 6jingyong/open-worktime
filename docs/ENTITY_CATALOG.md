# Entity catalog

Open Worktime separates **who makes/sells a product** from **what workers report about working time**.

The entity catalog exists so a future observation can point to stable entities without turning a brand name, legal company name, and production site into the same thing.

## Current graph

```text
brand
  └─ owner_company_id → company

report
  ├─ brand_id → brand
  └─ facility_id → facility (optional; not populated yet)
```

The current real entity seed is intentionally tiny. It exists to prove ownership resolution and search behavior, not to become a comprehensive brand database.

## IDs

Open Worktime uses its own stable internal IDs even when records come from another dataset.

Examples:

- `bt-haier`
- `bt-haier-smart-home`

External provider IDs stay in `source.record_id`. This allows a provider to be replaced later without rewriting every community observation.

## Brand ownership

The first real catalog seed is derived from Brandtree under CC BY 4.0. Brandtree is useful because ownership is dated and source-backed, so a consumer-facing brand can be mapped to a current controlling company without Open Worktime inventing that relationship.

Working-time observations remain completely separate. A real brand appearing in the catalog means only that the entity exists; it says nothing about that brand's labor conditions.

## Production facilities

`data/facilities.json` is intentionally empty in this phase.

The preferred next integration target is Open Supply Hub because it provides stable OS IDs for production locations and already treats supply-chain location data as public-interest infrastructure.

A future facility record should at minimum contain:

```json
{
  "id": "osh:CN2021250D1DTN7",
  "name": "Example Manufacturing Co., Ltd.",
  "country": "CN",
  "source": {
    "provider": "Open Supply Hub",
    "record_id": "CN2021250D1DTN7",
    "url": "https://opensupplyhub.org/...",
    "license": "source terms recorded at import time"
  }
}
```

Do not infer a brand-to-facility relationship merely because a facility exists. A relationship should carry its own source or come from a provider record that explicitly supports it.

## Licensing boundary

- software: MIT;
- selected Brandtree-derived catalog records: CC BY 4.0;
- fictional demo observations/entities: CC0 1.0;
- future community working-time dataset: undecided;
- Open Supply Hub facility records: not bundled yet.

See `data/ATTRIBUTION.md`.
