# Solar Term Data

This directory stores canonical, versioned solar-term boundary data for `@project-saju/manse-engine`.

The engine must calculate year and month pillars from exact solar-term boundary datetimes. Date-only data is not acceptable: if `경칩` occurs at `17:00`, a birth at `16:59` is still in the previous month pillar and a birth at `17:00` is in the new month pillar.

## Canonical Shape

The canonical dataset shape is defined in `schema.json`.

```ts
interface SolarTermDataset {
  dataVersion: string;
  source: {
    name: string;
    url?: string;
    retrievedAt?: string;
    notes?: string;
  };
  timezone: "UTC";
  supportedGregorianYears: {
    from: number;
    to: number;
    completeYears: number[];
    carryoverYears: number[];
  };
  terms: SolarTermRecord[];
}

interface SolarTermRecord {
  gregorianYear: number;
  name: SolarTermName;
  nameKo: string;
  hanja: string;
  longitude: number;
  at: string;
  source?: string;
}
```

`at` is the exact boundary instant. v0.2.0 stores all boundaries as UTC ISO 8601 strings with second precision and a trailing `Z`.

## Coverage

`completeYears` lists Gregorian years that contain all 12 engine-required major solar-term boundaries:

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
- `sohan`

`carryoverYears` lists years that intentionally contain only boundary rows needed to calculate early-January dates in the following supported year. For example, `2014` can contain only `daeseol` so that dates before 2015 `소한` can still resolve the previous month boundary.

## Workflow

The runtime engine does not call public APIs and does not read these JSON files directly. The workflow is:

1. Store or import source rows into `solar-terms.v0.2.0.json`.
2. Run `corepack pnpm validate:solar-terms`.
3. Run `corepack pnpm build:solar-terms` if the generated engine module is stale.
4. Commit both the canonical JSON and generated engine module.

`corepack pnpm verify` runs the solar-term validator in CI.

## Source Boundary

The checked-in v0.2.0 rows are a small seed dataset transcribed from published UTC tables that identify JPL Horizons as source data on the relevant Wikipedia solar-term pages. This is infrastructure, not final production coverage. Unsupported years must fail with `SOLAR_TERM_DATA_MISSING`; they must not be guessed.
