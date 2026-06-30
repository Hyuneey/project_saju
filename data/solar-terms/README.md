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
    license?: string;
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

`at` is the exact boundary instant. v0.2.1 stores all boundaries as UTC ISO 8601 strings with second precision and a trailing `Z`.

## Certification

`certificationLevel` describes source confidence:

- `seed`: hand-entered smoke-test rows only.
- `imported-unverified`: imported from documented source tables and structurally validated, but not independently cross-checked.
- `cross-checked`: independently checked against at least one additional source or reproducible astronomical calculation.
- `production-certified`: approved for production use after source, license, coverage, and regression review.

The checked-in `solar-terms.v0.2.1.json` is `imported-unverified`. It is service-ready as a deterministic internal dataset, but it must not be described as independently certified.

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

The v0.2.1 supported range is 2015 through 2026. The dataset also contains only the previous year's `daeseol` as a carryover row, so early-January dates in the first supported year can resolve the previous month boundary. That carryover year is not itself a supported calculation year.

## Source Policy

Runtime code must not call public APIs or scrape source pages. Source rows are imported into a versioned JSON file and then generated into the engine package.

Accepted source records must include:

- exact UTC datetime, not date-only labels;
- source name and retrieval date;
- license or usage note;
- certification level matching the evidence quality.

If data is missing, duplicated, out of order, outside range, or stale relative to the generated engine module, validation must fail. Runtime must fail with `SOLAR_TERM_DATA_MISSING` for missing/out-of-range data or `SOLAR_TERM_DATA_INVALID` for malformed certified datasets.

## Workflow

1. Store or import source rows into `solar-terms.v0.2.1.json`.
2. Run `corepack pnpm validate:solar-terms`.
3. Run `corepack pnpm build:solar-terms` if the generated engine module is stale.
4. Run `corepack pnpm verify`.
5. Commit both the canonical JSON and generated engine module.

`corepack pnpm verify` runs the solar-term validator in CI.

## Limitations

The v0.2.1 rows are imported from public UTC tables whose pages cite JPL Horizons and Skyfield. They have not yet been independently cross-checked in this repository, so the dataset remains `imported-unverified`. Unsupported years must fail; they must not be guessed or interpolated.
