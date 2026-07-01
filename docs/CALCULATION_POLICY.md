# Calculation Policy

Policy version: `manse-policy-v0.1`

Engine release: `0.2.3`

v0.2.3 does not change the calculation formulas from v0.1. It keeps the v0.2.2 solar-term range at 1950-2050 and adds independent source comparison workflow for the dataset certification decision.

## Ganji Cycle

Heavenly stems are indexed as:

`0 갑, 1 을, 2 병, 3 정, 4 무, 5 기, 6 경, 7 신, 8 임, 9 계`

Earthly branches are indexed as:

`0 자, 1 축, 2 인, 3 묘, 4 진, 5 사, 6 오, 7 미, 8 신, 9 유, 10 술, 11 해`

`ganjiIndex 0 = 갑자`.

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

The offset is based on 1984 being `갑자`.

## Month Pillar Boundary

The month pillar uses 12 solar-term boundaries, not Gregorian months and not lunar months.

The boundary datetime is exact. Date-only solar-term data is insufficient: if a solar term occurs at 17:00, births before 17:00 remain in the previous month pillar and births at or after 17:00 use the new month pillar.

| Month order | Boundary | Branch |
| --- | --- | --- |
| 0 | 입춘 | 인 |
| 1 | 경칩 | 묘 |
| 2 | 청명 | 진 |
| 3 | 입하 | 사 |
| 4 | 망종 | 오 |
| 5 | 소서 | 미 |
| 6 | 입추 | 신 |
| 7 | 백로 | 유 |
| 8 | 한로 | 술 |
| 9 | 입동 | 해 |
| 10 | 대설 | 자 |
| 11 | 소한 | 축 |

Month stem uses the year stem index:

```ts
firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10
monthStemIndex = (firstMonthStemIndex + monthOrder) % 10
```

## Day Pillar Formula

The day pillar uses Gregorian Julian Day Number for the local calculation date.

For the KASI fixture, `2015-09-22` has `solJd = 2457288` and day ganji `신축`.

```ts
dayGanjiIndex = mod(julianDay + 49, 60)
```

## Hour Pillar Formula

Hour branch windows:

| Time | Branch |
| --- | --- |
| 23:00-00:59 | 자 |
| 01:00-02:59 | 축 |
| 03:00-04:59 | 인 |
| 05:00-06:59 | 묘 |
| 07:00-08:59 | 진 |
| 09:00-10:59 | 사 |
| 11:00-12:59 | 오 |
| 13:00-14:59 | 미 |
| 15:00-16:59 | 신 |
| 17:00-18:59 | 유 |
| 19:00-20:59 | 술 |
| 21:00-22:59 | 해 |

```ts
hourBranchIndex = Math.floor((hour + 1) / 2) % 12
hourStemIndex = ((dayStemIndex % 5) * 2 + hourBranchIndex) % 10
```

If `birthTimeUnknown` is true, the hour pillar is `null`.

## dayBoundaryPolicy

v0.2.3 applies `midnight`. The input type accepts `early_zi` and `split_zi` for forward compatibility, but v0.2.3 emits a warning and still calculates with `midnight`.

## solarTimePolicy

v0.2.3 applies `civil_time`. The input type accepts `mean_solar_time` and `true_solar_time` for forward compatibility, but v0.2.3 emits a warning and still calculates with civil time.

## dataVersion

Every result includes `metadata.engineVersion`, `metadata.policyVersion`, and `metadata.dataVersion`.

The default value combines the calendar provider and solar-term provider versions:

`calendar:calendar-jdn-gregorian-0.1.0;solarTerms:solar-terms-v0.2.2`

The solar-term dataset is table-driven in v0.2.3 and supports 1950 through 2050. Unsupported years fail with `SOLAR_TERM_DATA_MISSING`.

## Known Limitations

- Default lunar conversion is unavailable and fails with `LUNAR_CONVERSION_UNAVAILABLE`.
- Default solar-term coverage is limited to rows in `data/solar-terms/solar-terms.v0.2.2.json`.
- Mean solar time and true solar time are not applied in v0.2.3.
- `early_zi` and `split_zi` day boundary policies are accepted but not applied in v0.2.3.
- The v0.2.2 dataset is `cross-checked`, not production-certified.

## Solar-Term Data Source

The checked-in v0.2.2 rows are generated with `astronomy-engine` `SearchSunLongitude`, which searches for the apparent Sun ecliptic longitude boundary. The generated 2014-2026 overlap is checked against the v0.2.1 public UTC table import within 90 seconds, and v0.2.3 adds a limited Chinese Calendar Online 2025-2028 comparison fixture. Runtime code consumes only the generated internal dataset and does not call live astronomy APIs.
