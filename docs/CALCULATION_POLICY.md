# Calculation Policy

Policy version: `manse-policy-v0.1`

Engine release: `0.4.1`

v0.4.1 keeps the pillar formulas from v0.1. It hardens the deterministic derived-data layer from the resulting original chart.

## Input Calendar Normalization

`calendarType: "solar"` uses `birthDate` as a Gregorian date.

`calendarType: "lunar"` uses `birthDate` as a Korean lunar date and requires `lunarLeapMonth`. The default `TableCalendarDataProvider` converts the Korean lunar date to a Gregorian solar date before applying year, month, day, and hour pillar formulas.

Default lunar conversion ranges:

- Solar to lunar: `1000-02-13` through `2050-12-31`
- Lunar to solar: `1000-01-01` through `2050-11-18`

Dates outside those ranges fail with `OUT_OF_SUPPORTED_RANGE`. Impossible lunar dates or invalid leap-month requests fail with `INVALID_DATE`.

## Ganji Cycle

Heavenly stems and earthly branches are indexed in the standard 10-stem and 12-branch order. `ganjiIndex 0` is gapja.

```ts
stem = STEMS[ganjiIndex % 10]
branch = BRANCHES[ganjiIndex % 12]
mod(n, m) = ((n % m) + m) % m
```

## Year Pillar Boundary

The year pillar uses lichun as the year boundary.

If the calculation datetime is greater than or equal to lichun of the Gregorian year, `appliedYear = gregorianYear`. Otherwise, `appliedYear = gregorianYear - 1`.

```ts
yearGanjiIndex = mod(appliedYear - 4, 60)
```

The offset is based on 1984 being gapja.

## Month Pillar Boundary

The month pillar uses 12 solar-term boundaries, not Gregorian months and not lunar months.

The boundary datetime is exact. Date-only solar-term data is insufficient: if a solar term occurs at 17:00, births before 17:00 remain in the previous month pillar and births at or after 17:00 use the new month pillar.

| Month order | Boundary key | Branch order |
| --- | --- | --- |
| 0 | lichun | yin |
| 1 | gyeongchip | mao |
| 2 | cheongmyeong | chen |
| 3 | ipha | si |
| 4 | mangjong | wu |
| 5 | soseo | wei |
| 6 | ipchu | shen |
| 7 | baengno | you |
| 8 | hanro | xu |
| 9 | ipdong | hai |
| 10 | daeseol | zi |
| 11 | sohan | chou |

Month stem uses the year stem index:

```ts
firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10
monthStemIndex = (firstMonthStemIndex + monthOrder) % 10
```

## Day Pillar Formula

The day pillar uses Gregorian Julian Day Number for the local calculation date.

For the KASI fixture, `2015-09-22` has `solJd = 2457288`.

```ts
dayGanjiIndex = mod(julianDay + 49, 60)
```

## Hour Pillar Formula

Hour branch windows:

| Time | Branch order |
| --- | --- |
| 23:00-00:59 | zi |
| 01:00-02:59 | chou |
| 03:00-04:59 | yin |
| 05:00-06:59 | mao |
| 07:00-08:59 | chen |
| 09:00-10:59 | si |
| 11:00-12:59 | wu |
| 13:00-14:59 | wei |
| 15:00-16:59 | shen |
| 17:00-18:59 | you |
| 19:00-20:59 | xu |
| 21:00-22:59 | hai |

```ts
hourBranchIndex = Math.floor((hour + 1) / 2) % 12
hourStemIndex = ((dayStemIndex % 5) * 2 + hourBranchIndex) % 10
```

If `birthTimeUnknown` is true, the hour pillar is `null`.

## dayBoundaryPolicy

v0.4.1 applies `midnight`. The input type accepts `early_zi` and `split_zi` for forward compatibility, but v0.4.1 emits a warning and still calculates with `midnight`.

## solarTimePolicy

v0.4.1 applies `civil_time`. The input type accepts `mean_solar_time` and `true_solar_time` for forward compatibility, but v0.4.1 emits a warning and still calculates with civil time.

## Derived Original Chart Data

The output separates these layers:

```text
pillars = calculated four pillars
derived = deterministic data derived from pillars
interpretation = natural language explanation, not implemented
```

`derived.policyVersion` is `derived-original-chart-v0.4.1`.

`derived.dataVersion` is `original-chart-derived-v0.4.1`.

The derived layer includes:

- Day master metadata from the day heavenly stem.
- Element and yin-yang metadata for visible stems and branches.
- Hidden stems for each visible branch.
- Ten gods for visible stems, branch main metadata, and hidden stems relative to the day master.
- Five-element counts.
- Yin-yang counts.
- Ten-god counts.

Count groups are separated into `visible`, `hiddenStems`, and `totalWithHiddenStems` where applicable. Ten-god `visibleStems` excludes the day stem itself because it is represented as `dayMaster`.

The derived layer must not classify a chart as strong, weak, balanced, imbalanced, favorable, unfavorable, good, or bad.

## dataVersion

Every result includes `metadata.engineVersion`, `metadata.policyVersion`, and `metadata.dataVersion`.

The default value combines the calendar provider and solar-term provider versions:

`calendar:calendar-jdn-korean-lunar-0.3.1;solarTerms:solar-terms-v0.2.2`

`metadata.providers.calendar` also exposes `KoreanLunarCalendarProvider`, source package `korean-lunar-calendar`, source version `0.4.0`, supported conversion ranges, and `runtimeNetwork: false`.

The solar-term dataset is table-driven and supports 1950 through 2050. Unsupported years fail with `SOLAR_TERM_DATA_MISSING`.

## Known Limitations

- Default lunar conversion is limited to the Korean lunar provider range documented above.
- Default solar-term coverage is limited to rows in `data/solar-terms/solar-terms.v0.2.2.json`.
- Mean solar time and true solar time are not applied in v0.4.1.
- `early_zi` and `split_zi` day boundary policies are accepted but not applied in v0.4.1.
- The v0.2.2 solar-term dataset is `cross-checked`, not production-certified.

## Data Sources

The checked-in v0.2.2 solar-term rows are generated with `astronomy-engine` `SearchSunLongitude`, which searches for the apparent Sun ecliptic longitude boundary. The generated 2014-2026 overlap is checked against the v0.2.1 public UTC table import within 90 seconds, and v0.2.3 adds a limited Chinese Calendar Online 2025-2028 comparison fixture. Runtime code consumes only the generated internal dataset and does not call live astronomy APIs.

The default lunar conversion provider is exact dependency `korean-lunar-calendar@0.4.0`. It is used locally and offline at runtime; `calculateSaju` does not call live public calendar APIs.
