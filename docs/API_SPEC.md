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
    policyVersion: string;
    dataVersion: string;
    warnings: Array<{ code: string; message: string; detail?: unknown }>;
  };
}
```

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

The default providers are table-driven. They do not call live APIs.

## HTTP Route

`POST /api/saju/calculate`

Request body is `CalculateSajuInput`. Response body is `CalculateSajuResult` on success.

Error status mapping:

- `400`: validation errors such as `INVALID_DATE`, `INVALID_TIME`, `INVALID_TIMEZONE`, `LUNAR_LEAP_MONTH_REQUIRED`
- `422`: missing data such as `SOLAR_TERM_DATA_MISSING`, `LUNAR_CONVERSION_UNAVAILABLE`, `OUT_OF_SUPPORTED_RANGE`
- `500`: `INTERNAL_CALCULATION_ERROR`

Error response:

```json
{
  "error": {
    "code": "SOLAR_TERM_DATA_MISSING",
    "message": "Solar-term data is missing for Gregorian year 2035.",
    "detail": { "year": 2035 }
  }
}
```
