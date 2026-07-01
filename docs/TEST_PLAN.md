# Test Plan

## Command

```bash
corepack pnpm verify
```

## Golden Fixtures

- `data/fixtures/kasi-2015-09-22.json` records the KASI sample date, Julian Day Number `2457288`, and expected day ganji.
- `data/fixtures/lunar-conversion-v0.3.1.json` records Korean lunar/solar provider examples used by tests and documentation.
- `data/solar-terms/solar-terms.v0.2.2.json` is the canonical versioned solar-term dataset used to generate the default engine data module.

## Required Tests

- Ganji cycle and positive modulo.
- 1984 after lichun returns gapja.
- Year pillar changes at lichun.
- Month pillar changes at cheongmyeong.
- Month pillar does not advance on the solar-term Gregorian date until the exact boundary datetime.
- Day pillar formula maps JDN `2457288`.
- Hour branch windows.
- Hour stem formula.
- `birthTimeUnknown` returns `hour: null`.
- Lunar input without `lunarLeapMonth` fails.
- `korean-lunar-calendar` is pinned to exact version `0.4.0` in package and lock files.
- `corepack pnpm check:lunar-provider` validates dependency pinning and all checked-in lunar conversion fixture examples.
- Default Korean lunar input converts to the same result as the equivalent solar input.
- Korean leap lunar month input converts correctly.
- KASI monthly lunar/solar table examples convert both directions.
- Default lunar provider metadata exposes source package, source version, supported ranges, and `runtimeNetwork: false`.
- Default lunar provider creates a fresh stateful converter instance for each conversion call.
- Original-chart derived data returns day master metadata.
- Original-chart derived data includes `policyVersion: "derived-original-chart-v0.4.1"`.
- Original-chart derived data returns stem and branch element/yin-yang metadata.
- Original-chart derived data returns hidden stems.
- Original-chart derived data maps ten gods relative to the day master.
- Original-chart derived data returns five-element, yin-yang, and ten-god counts.
- Original-chart derived data omits hour derived data when birth time is unknown.
- Original-chart derived data matches `data/fixtures/original-chart-derived-v0.4.1.json`.
- Original-chart derived data has a full-output Vitest snapshot.
- Original-chart derived data contains no interpretive judgment fields.
- Impossible Korean lunar leap-month dates fail with `INVALID_DATE`.
- Korean lunar provider out-of-range dates fail with `OUT_OF_SUPPORTED_RANGE`.
- Default provider can convert solar dates back to Korean lunar dates.
- Missing solar-term data fails with `SOLAR_TERM_DATA_MISSING`.
- Invalid timezone fails with `INVALID_TIMEZONE`.
- Unknown request fields fail with `INVALID_INPUT`.
- Unsupported forward-compatible policies emit explicit warnings while preserving the v0.1 policy.
- Result includes `engineVersion`, `policyVersion`, `dataVersion`, `derived`, applied options, and normalized date metadata.
- Repository encoding check rejects Unicode replacement characters in source, docs, fixtures, and UI files.
- Solar-term validation checks canonical dataset shape, required names, Korean/Hanja labels, longitudes, UTC datetimes, complete years, carryover years, and generated engine module freshness.
- Solar-term validation rejects missing, duplicated, out-of-order, out-of-range, or stale certified data.
- Solar-term import checks generated 2015-2026 overlap against the v0.2.1 public UTC table import within 90 seconds.
- Solar-term source comparison checks v0.2.1 overlap plus the checked-in Chinese Calendar Online 2025-2028 fixture and documents why production certification is still blocked.

## Edge Cases

- Birth exactly equal to lichun should apply the new year.
- Birth exactly equal to a month solar-term boundary should apply the new month.
- `23:00` and `00:59` both map to zi hour.
- `00:59` and `01:00` preserve minute-level basis and split at the chou boundary.
- Dates before current-year sohan use previous-year daeseol when that carryover data exists.
- Early January 1950 uses the 1949 daeseol carryover row.
- Dates through 2050 calculate from certified solar-term data.
- Unsupported years must not use guessed solar-term dates.
- Fixed offsets such as `+09:00` must be rejected even if the offset is valid.

## External Calendar Comparison

When comparing with external manse calendars:

1. Confirm the same timezone and birth civil time.
2. Confirm whether the external calendar uses lichun as year boundary.
3. Confirm whether month boundaries are solar-term boundaries, lunar months, or Gregorian months.
4. Confirm day boundary policy: midnight, early zi, or split zi.
5. Confirm whether mean or true solar time is applied.
6. Compare intermediate basis values before comparing final pillars.

Differences can be legitimate when any policy differs. v0.4.1 reports policy, data version, provider metadata, derived policy/data versions, and basis values so those differences are auditable.
