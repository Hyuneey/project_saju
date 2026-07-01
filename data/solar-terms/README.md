# Solar Term Data

This directory stores canonical, versioned solar-term boundary data for `@project-saju/manse-engine`.

The engine must calculate year and month pillars from exact solar-term boundary datetimes. Date-only data is not acceptable: if `경칩` occurs at `17:00`, a birth at `16:59` is still in the previous month pillar and a birth at `17:00` is in the new month pillar.

## Canonical Shape

The canonical dataset shape is defined in `schema.json`.

```ts
interface SolarTermDataset {
  dataVersion: string;
  certificationLevel:
    | "seed"
    | "imported-unverified"
    | "cross-checked"
    | "production-certified";
  source: {
    name: string;
    url?: string;
    retrievedAt?: string;
    license: string;
    notes?: string;
  };
  generatedAt?: string;
  timezone: "UTC";
  supportedGregorianYears: {
    from: number;
    to: number;
  };
  terms: SolarTermRecord[];
}
```

`at` is the exact boundary instant. v0.2.2 stores all boundaries as UTC ISO 8601 strings with second precision and a trailing `Z`.

## Certification

`certificationLevel` describes source confidence:

- `seed`: hand-entered smoke-test rows only.
- `imported-unverified`: imported from documented source tables and structurally validated, but not independently cross-checked.
- `cross-checked`: independently checked against at least one additional source or reproducible astronomical calculation.
- `production-certified`: approved for production use after source, license, coverage, and regression review.

The checked-in `solar-terms.v0.2.2.json` is `cross-checked`. It is generated with `astronomy-engine` `SearchSunLongitude` and overlap-checked against the v0.2.1 imported UTC table data for 2015 through 2026 within 90 seconds. It is not marked `production-certified`.

## Coverage

`supportedGregorianYears.from` and `to` define a continuous certified calculation range. Every year in that inclusive range must contain all 12 engine-required major solar terms:

- `sohan`
- `lichun`
- `gyeongchip`
- `cheongmyeong`
- `ipha`
- `mangjong`
- `soseo`
- `ipchu`
- `baengno`
- `hanro`
- `ipdong`
- `daeseol`

The v0.2.2 supported range is 1950 through 2050. The dataset also contains only the previous year's `daeseol` as a carryover row, so early-January dates in the first supported year can resolve the previous month boundary. That carryover year is not itself a supported calculation year.

## Source Policy

Runtime code must not call public APIs, scrape source pages, or compute solar terms dynamically. Source rows are imported into a versioned JSON file and then generated into the engine package.

Accepted source records must include:

- exact UTC datetime, not date-only labels;
- source name and retrieval or generation date;
- license or usage note;
- certification level matching the evidence quality.

If data is missing, duplicated, out of order, outside range, or stale relative to the generated engine module, validation must fail. Runtime must fail with `SOLAR_TERM_DATA_MISSING` for missing/out-of-range data or `SOLAR_TERM_DATA_INVALID` for malformed certified datasets.

## Workflow

1. Run `corepack pnpm import:solar-terms` to regenerate `solar-terms.v0.2.2.json`.
2. Run `corepack pnpm validate:solar-terms`.
3. Run `corepack pnpm build:solar-terms` if the generated engine module is stale.
4. Run `corepack pnpm verify`.
5. Commit both the canonical JSON and generated engine module.

`corepack pnpm verify` runs the solar-term validator in CI.

## Limitations

The v0.2.2 rows are generated from `astronomy-engine` rather than imported from an official government almanac. The overlap guard compares the 2015-2026 generated rows to the v0.2.1 public UTC table import, but the full 1950-2050 range has not been independently checked against a second complete official table in this repository. Unsupported years must fail; they must not be guessed or interpolated.
