# API Spec

## Engine API

```ts
calculateSaju(input: CalculateSajuInput, providers?: Providers): Promise<CalculateSajuResult>
```

`calculateSaju` is async because providers may be async. The function performs validation, normalization, optional lunar conversion, solar-term loading, pillar calculation, and result assembly.

## Input

```ts
interface CalculateSajuInput {
  calendarType: "solar" | "lunar";
  birthDate: string;
  birthTime?: string;
  birthTimeUnknown: boolean;
  timezone?: string;
  gender?: "male" | "female" | "unknown";
  lunarLeapMonth?: boolean;
  birthPlace?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  options?: {
    yearBoundary?: "lichun";
    monthBoundary?: "solar_terms";
    dayBoundaryPolicy?: "midnight" | "early_zi" | "split_zi";
    solarTimePolicy?: "civil_time" | "mean_solar_time" | "true_solar_time";
  };
}
```

Defaults:

- `timezone`: `Asia/Seoul`
- `gender`: `unknown`
- `yearBoundary`: `lichun`
- `monthBoundary`: `solar_terms`
- `dayBoundaryPolicy`: `midnight`
- `solarTimePolicy`: `civil_time`

## Result

```ts
interface CalculateSajuResult {
  input: CalculateSajuInput;
  normalizedDateTime: {
    solarDate: string;
    civilTime: string;
    calculationTime: string;
    timezone: string;
    solarTimeApplied: boolean;
  };
  pillars: {
    year: GanjiResult;
    month: GanjiResult;
    day: GanjiResult;
    hour: GanjiResult | null;
  };
  basis: {
    year: Record<string, unknown>;
    month: Record<string, unknown>;
    day: Record<string, unknown>;
    hour: Record<string, unknown> | null;
  };
  metadata: {
    engineVersion: string;
    policyVersion: string;
    dataVersion: string;
    appliedOptions: {
      yearBoundary: "lichun";
      monthBoundary: "solar_terms";
      dayBoundaryPolicy: "midnight" | "early_zi" | "split_zi";
      solarTimePolicy: "civil_time" | "mean_solar_time" | "true_solar_time";
    };
    warnings: Array<{ code: string; message: string; detail?: unknown }>;
  };
}
```

`engineVersion` identifies the package release. `policyVersion` identifies the calculation policy. v0.2.2 still uses `manse-policy-v0.1` because the pillar formulas are unchanged.

## Providers

```ts
interface CalendarDataProvider {
  dataVersion?: string;
  getJulianDay(date): number | Promise<number>;
  solarToLunar(date): LunarDate | Promise<LunarDate>;
  lunarToSolar(date): PlainDateLike | Promise<PlainDateLike>;
}

interface SolarTermProvider {
  dataVersion?: string;
  getTermsForGregorianYear(year: number): SolarTerm[] | Promise<SolarTerm[]>;
  getLichunForGregorianYear(year: number): SolarTerm | Promise<SolarTerm>;
}
```

The default providers are table-driven. They do not call live APIs at runtime. The default solar-term provider consumes the generated internal module built from `data/solar-terms/solar-terms.v0.2.2.json`.

## HTTP Route

`POST /api/saju/calculate`

Request body is `CalculateSajuInput`. Response body is `CalculateSajuResult` on success.

Error status mapping:

- `400`: validation errors such as `INVALID_INPUT`, `INVALID_DATE`, `INVALID_TIME`, `INVALID_TIMEZONE`, `LUNAR_LEAP_MONTH_REQUIRED`
- `422`: missing or invalid data such as `SOLAR_TERM_DATA_MISSING`, `SOLAR_TERM_DATA_INVALID`, `LUNAR_CONVERSION_UNAVAILABLE`, `OUT_OF_SUPPORTED_RANGE`
- `500`: `INTERNAL_CALCULATION_ERROR`

Error response:

```json
{
  "error": {
    "code": "SOLAR_TERM_DATA_MISSING",
    "message": "Solar-term data is outside the certified range for Gregorian year 2051.",
    "detail": {
      "year": 2051,
      "dataVersion": "solar-terms-v0.2.2",
      "supportedGregorianYears": { "from": 1950, "to": 2050 }
    }
  }
}
```

Unsupported forward-compatible policies:

- `dayBoundaryPolicy: "early_zi"` and `"split_zi"` are accepted, but v0.2.2 calculates with `midnight` and emits `DAY_BOUNDARY_POLICY_NOT_IMPLEMENTED`.
- `solarTimePolicy: "mean_solar_time"` and `"true_solar_time"` are accepted, but v0.2.2 calculates with `civil_time`, sets `solarTimeApplied: false`, and emits `SOLAR_TIME_POLICY_NOT_IMPLEMENTED`.
- Default lunar conversion is unavailable. Lunar input must include `lunarLeapMonth`, then fails with `LUNAR_CONVERSION_UNAVAILABLE` unless a custom `CalendarDataProvider` is supplied.
