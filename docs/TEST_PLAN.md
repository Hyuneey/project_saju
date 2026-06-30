# Test Plan

## Command

```bash
corepack pnpm verify
```

## Golden Fixtures

- `data/fixtures/kasi-2015-09-22.json` records the KASI sample date, Julian Day Number `2457288`, and expected day ganji `신축`.
- `data/solar-terms/solar-terms.v0.2.1.json` is the canonical versioned solar-term dataset used to generate the default engine data module.

## Required Tests

- Ganji cycle and positive modulo.
- 1984 after lichun returns `갑자`.
- Year pillar changes at lichun.
- Month pillar changes at 청명.
- Month pillar does not advance on the solar-term Gregorian date until the exact boundary datetime.
- Day pillar formula maps JDN `2457288` to `신축`.
- Hour branch windows.
- Hour stem formula.
- `birthTimeUnknown` returns `hour: null`.
- Lunar input without `lunarLeapMonth` fails.
- Missing solar-term data fails with `SOLAR_TERM_DATA_MISSING`.
- Invalid timezone fails with `INVALID_TIMEZONE`.
- Unknown request fields fail with `INVALID_INPUT`.
- Unsupported lunar conversion fails with `LUNAR_CONVERSION_UNAVAILABLE` and request detail.
- Unsupported forward-compatible policies emit explicit warnings while preserving the v0.1 policy.
- Result includes `engineVersion`, `policyVersion`, `dataVersion`, applied options, and normalized date metadata.
- Repository encoding check rejects Unicode replacement characters in source, docs, fixtures, and UI files.
- Solar-term validation checks canonical dataset shape, required names, Korean/Hanja labels, longitudes, UTC datetimes, complete years, carryover years, and generated engine module freshness.
- Solar-term validation rejects missing, duplicated, out-of-order, out-of-range, or stale certified data.

## Edge Cases

- Birth exactly equal to lichun should apply the new year.
- Birth exactly equal to a month solar-term boundary should apply the new month.
- `23:00` and `00:59` both map to 자 hour.
- `00:59` and `01:00` preserve minute-level basis and split at the 축 boundary.
- Dates before current-year 소한 use previous-year 대설 when that seed data exists.
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

Differences can be legitimate when any policy differs. v0.2.1 reports policy, data version, and basis values so those differences are auditable.
