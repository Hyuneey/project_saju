# Original Chart Derived Data

## Scope

v0.4.0 adds `derived` to `calculateSaju` results.

This layer is a pure transformation of calculated pillars:

```text
pillars = calculated four pillars
derived = deterministic structured data
interpretation = natural language explanation, not implemented
```

The derived layer must not generate chart judgments. It does not decide strength, weakness, balance, imbalance, favorable elements, unfavorable elements, yongsin, geokguk, daewoon, sewoon, shinsal, or fortune content.

## Data Version

`original-chart-derived-v0.4.0`

The derived data version is separate from:

- `engineVersion`
- `policyVersion`
- calendar provider data version
- solar-term dataset version

## Stem And Branch Metadata

Every visible heavenly stem includes:

- stem index
- source label from `STEMS`
- source Hanja from `STEMS`
- romanization
- five element
- yin-yang
- ten god relative to the day master, except the day stem itself

Every visible earthly branch includes:

- branch index
- source label from `BRANCHES`
- source Hanja from `BRANCHES`
- romanization
- five element
- yin-yang
- ten god relative to the day master

## Day Master

`derived.dayMaster` is copied from the day heavenly stem metadata.

The day stem is marked in `derived.pillars.day.stem` as:

```json
{
  "tenGod": null,
  "isDayMaster": true
}
```

The day stem is not counted in `counts.tenGods.visibleStems`; it is represented separately as day master.

## Hidden Stems

Hidden stems are emitted per branch as an ordered list with roles:

- `residual`
- `middle`
- `main`

Each hidden stem includes stem metadata plus a ten god relative to the day master.

## Counts

Element counts:

- `visible`: visible stems and branches
- `hiddenStems`: hidden stems only
- `totalWithHiddenStems`: visible plus hidden stems

Yin-yang counts use the same grouping.

Ten-god counts:

- `visibleStems`: visible heavenly stems excluding the day stem
- `branchMain`: visible earthly branch metadata
- `hiddenStems`: hidden stems only
- `totalWithHiddenStems`: visible stems excluding day stem, branch metadata, and hidden stems

Counts are unweighted. Hidden stems are counted once per listed hidden stem.
