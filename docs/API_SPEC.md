# API Spec

## Engine API

```ts
calculateSaju(input: CalculateSajuInput, providers?: Providers): Promise<CalculateSajuResult>
```

`calculateSaju` is async because providers may be async. The function performs validation, lunar-to-solar normalization when needed, solar-term loading, pillar calculation, and result assembly.

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

For `calendarType: "lunar"`, `birthDate` is a Korean lunar calendar date in `YYYY-MM-DD` format and `lunarLeapMonth` is required. The default provider converts it to a solar Gregorian date before year, month, day, and hour pillars are calculated.

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
    providers: {
      calendar: CalendarProviderMetadata;
      solarTerms: SolarTermProviderMetadata;
    };
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

`engineVersion` identifies the package release. `policyVersion` identifies the calculation policy. v0.3.1 still uses `manse-policy-v0.1` because the pillar formulas are unchanged.

Default calendar provider metadata shape:

```ts
interface CalendarProviderMetadata {
  name: "KoreanLunarCalendarProvider";
  dataVersion: "calendar-jdn-korean-lunar-0.3.1";
  source: {
    packageName: "korean-lunar-calendar";
    version: "0.4.0";
    url: "https://github.com/usingsky/korean_lunar_calendar_js";
    license: "MIT";
  };
  supportedRange: {
    solarToLunar: { from: PlainDateLike; to: PlainDateLike };
    lunarToSolar: { from: PlainDateLike; to: PlainDateLike };
  };
  runtimeNetwork: false;
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

The default providers are local and deterministic. They do not call live APIs at runtime.

- Default calendar provider: `calendar-jdn-korean-lunar-0.3.1`, backed by exact dependency `korean-lunar-calendar@0.4.0`.
- Default solar-term provider: `solar-terms-v0.2.2`, backed by the generated internal module from `data/solar-terms/solar-terms.v0.2.2.json`.

Default lunar conversion supported ranges:

- Solar input to lunar: `1000-02-13` through `2050-12-31`
- Lunar input to solar: `1000-01-01` through `2050-11-18`

Pillar calculation also requires the normalized solar date to be covered by the default solar-term dataset, currently 1950 through 2050 with the required 1949 carryover row.

`metadata.providers.calendar` exposes the default lunar provider name, data version, source package, source version, supported ranges, and `runtimeNetwork: false`.

## HTTP Route

`POST /api/saju/calculate`

Request body is `CalculateSajuInput`. Response body is `CalculateSajuResult` on success.

Error status mapping:

- `400`: validation errors such as `INVALID_INPUT`, `INVALID_DATE`, `INVALID_TIME`, `INVALID_TIMEZONE`, `LUNAR_LEAP_MONTH_REQUIRED`
- `422`: missing, invalid, or unsupported provider data such as `SOLAR_TERM_DATA_MISSING`, `SOLAR_TERM_DATA_INVALID`, `LUNAR_CONVERSION_UNAVAILABLE`, `OUT_OF_SUPPORTED_RANGE`
- `500`: `INTERNAL_CALCULATION_ERROR`

`LUNAR_CONVERSION_UNAVAILABLE` remains a typed provider error for custom providers that do not support conversion. The default v0.3.1 provider supports Korean lunar conversion inside the documented range.

Example lunar out-of-range response:

```json
{
  "error": {
    "code": "OUT_OF_SUPPORTED_RANGE",
    "message": "lunar date is outside the supported Korean lunar conversion range.",
    "detail": {
      "provider": "KoreanLunarCalendarProvider",
      "source": "korean-lunar-calendar@0.4.0",
      "calendarType": "lunar",
      "requestedDate": { "year": 2050, "month": 12, "day": 1 },
      "supportedRange": {
        "from": { "year": 1000, "month": 1, "day": 1 },
        "to": { "year": 2050, "month": 11, "day": 18 }
      }
    }
  }
}
```

Unsupported forward-compatible policies:

- `dayBoundaryPolicy: "early_zi"` and `"split_zi"` are accepted, but v0.3.1 calculates with `midnight` and emits `DAY_BOUNDARY_POLICY_NOT_IMPLEMENTED`.
- `solarTimePolicy: "mean_solar_time"` and `"true_solar_time"` are accepted, but v0.3.1 calculates with `civil_time`, sets `solarTimeApplied: false`, and emits `SOLAR_TIME_POLICY_NOT_IMPLEMENTED`.
