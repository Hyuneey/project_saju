# Test Plan

## Command

```bash
pnpm test
```

## Golden Fixtures

- `data/fixtures/kasi-2015-09-22.json` records the KASI sample date, Julian Day Number `2457288`, and expected day ganji `신축`.
- `data/solar-terms/solar-terms.v0.1.json` mirrors the seed solar-term rows used by the default table provider.

## Required Tests

- Ganji cycle and positive modulo.
- 1984 after lichun returns `갑자`.
- Year pillar changes at lichun.
- Month pillar changes at 청명.
- Day pillar formula maps JDN `2457288` to `신축`.
- Hour branch windows.
- Hour stem formula.
- `birthTimeUnknown` returns `hour: null`.
- Lunar input without `lunarLeapMonth` fails.
- Missing solar-term data fails with `SOLAR_TERM_DATA_MISSING`.
- Invalid timezone fails with `INVALID_TIMEZONE`.
- Result includes `policyVersion` and `dataVersion`.

## Edge Cases

- Birth exactly equal to lichun should apply the new year.
- Birth exactly equal to a month solar-term boundary should apply the new month.
- `23:00` and `00:59` both map to 자 hour.
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

Differences can be legitimate when any policy differs. v0.1 reports policy and basis values so those differences are auditable.
