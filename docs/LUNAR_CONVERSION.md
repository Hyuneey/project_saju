# Lunar Conversion

## Scope

v0.3.0 supports Korean lunar calendar input through the default `TableCalendarDataProvider`.

The runtime calculation path is local and deterministic:

1. Validate `calendarType`, `birthDate`, and `lunarLeapMonth`.
2. Convert Korean lunar input to a Gregorian solar date with `korean-lunar-calendar@0.4.0`.
3. Calculate all pillars from the normalized solar date/time.

`calculateSaju` does not call live public calendar APIs.

## Provider

Default data version:

`calendar-jdn-korean-lunar-0.3.0`

Default source package:

`korean-lunar-calendar@0.4.0`

Supported ranges enforced by the default provider:

- Solar to lunar: `1000-02-13` through `2050-12-31`
- Lunar to solar: `1000-01-01` through `2050-11-18`

Dates outside those ranges fail with `OUT_OF_SUPPORTED_RANGE`. Impossible Korean lunar dates, including invalid leap-month combinations, fail with `INVALID_DATE`.

After conversion, pillar calculation still requires the normalized solar date to be inside the supported solar-term dataset range, currently 1950 through 2050 with the required 1949 carryover row.

## Evidence

KASI provides the official Korean lunar/solar conversion reference page and documents solar conversion support through `2050-12-31` with a leap-month input option.

The `korean-lunar-calendar` package states that it performs offline Korean lunar/solar conversion following the KARI/KASI Korean lunar calendar standard, supports leap months, and covers the ranges used by this provider.

Regression examples are recorded in `data/fixtures/lunar-conversion-v0.3.0.json` and covered by engine tests:

- Korean lunar `2015-08-10`, non-leap, converts to solar `2015-09-22`.
- Korean leap lunar `2017-05-01`, leap month, converts to solar `2017-06-24`.
- Korean lunar `1956-01-21`, non-leap, converts to solar `1956-03-03`.

## Limitations

- The provider is Korean lunar calendar specific. Chinese or other regional lunar calendars can differ.
- Conversion outside the documented provider range is unsupported.
- The lunar conversion layer does not change the year, month, day, or hour pillar formulas after normalization.
