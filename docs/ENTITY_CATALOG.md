# Entity catalog

Open Worktime separates **who makes/sells a product** from **what workers report about working time**.

The entity catalog exists so a future observation can point to stable entities without turning a brand name, legal company name, and production site into the same thing.

## Current graph

```text
brand
  └─ owner_company_id → company

brand
  └─ facility-link evidence → facility

report
  ├─ brand_id → brand
  └─ facility_id → facility (optional)
```

The current real entity seed is intentionally tiny. It exists to prove ownership resolution, facility resolution, provenance, and search behavior — not to become a comprehensive brand or supplier database yet.

## IDs

Open Worktime uses stable internal IDs while preserving important external identifiers.

Examples:

- `bt-haier`
- `bt-haier-smart-home`
- `osh-CN2021159RK49KG`

Brandtree source IDs stay in `source.record_id`. For Open Supply Hub facilities, the OS ID is both preserved in `os_id` and embedded in the Open Worktime facility ID because OS ID is itself a useful interoperable production-location identifier.

## Brand ownership

The first real catalog seed is derived from Brandtree under CC BY 4.0. Brandtree is useful because ownership is dated and source-backed, so a consumer-facing brand can be mapped to a current controlling company without Open Worktime inventing that relationship.

Working-time observations remain completely separate. A real brand appearing in the catalog means only that the entity exists; it says nothing about that brand's labor conditions.

## Production facilities

The first production-location pilot uses Open Supply Hub under CC BY-SA 4.0.

Facility entities live in `data/facilities.json`. Brand-to-facility relationships live separately in `data/facility-links.json` because the existence of a production location and the evidence that a specific brand uses it are different claims.

The pilot record is:

```json
{
  "id": "osh-CN2021159RK49KG",
  "os_id": "CN2021159RK49KG",
  "name": "NANTONG YUXIN CLOTHING CO.,LTD.",
  "country": "CN"
}
```

Its link to PUMA is included because the Open Supply Hub profile explicitly lists PUMA in the Supply Chain Network and attributes Final Product Assembly information to PUMA on 2026-06-18.

A relationship edge therefore carries its own evidence and source:

```json
{
  "brand_id": "bt-puma",
  "facility_id": "osh-CN2021159RK49KG",
  "relationship": "brand_disclosed_supply_chain",
  "evidence": {
    "contributor": "PUMA",
    "contribution_date": "2026-06-18"
  }
}
```

Do not infer a brand-to-facility relationship merely because a facility exists, is nearby, shares a parent company, or appears in the same sector. Every edge should be independently source-backed.

## Scope and completeness

A listed facility is **not** a complete supplier list. Missing facilities are unknown, not negative evidence. Supply-chain relationships can also change over time.

That is why facility edges preserve source and evidence dates rather than being treated as timeless ownership facts.

## Licensing boundary

- software: MIT;
- selected Brandtree-derived catalog records: CC BY 4.0;
- Open Supply Hub-derived facility and facility-link records: CC BY-SA 4.0;
- fictional demo observations/entities: CC0 1.0;
- future community working-time dataset: undecided.

See `data/ATTRIBUTION.md`.
