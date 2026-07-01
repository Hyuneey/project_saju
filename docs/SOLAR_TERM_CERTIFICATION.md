# Solar-Term Certification

## v0.2.3 Decision

Decision: keep `solar-terms-v0.2.2` at `cross-checked`.

Do not promote to `production-certified` yet.

## Evidence Checked

`corepack pnpm check:solar-terms-source` compares the canonical v0.2.2 dataset against:

- `solar-terms-v0.2.1.json`: 2014 `daeseol` plus all engine-required major solar terms from 2015 through 2026, with a 90 second tolerance.
- Chinese Calendar Online 24 Solar Terms table: engine-required rows for 2025 through 2028, interpreted as UTC+08:00 minute-precision values, with a 600 second tolerance.

The source comparison fixture is `data/solar-terms/source-comparison.v0.2.3.json`.

## Result

The checked sources agree within their configured tolerances, but the evidence is not sufficient for production certification.

Production certification blockers:

- No checked-in second-source exact datetime table covers every required row from 1950 through 2050 plus the 1949 carryover row.
- Chinese Calendar Online comparison is limited to 2025-2028 and publishes minute-precision values with an assumed UTC+08:00 timezone.
- The v0.2.1 overlap source covers only 2014-2026 and is not a full-range independent production source.

## Runtime Policy

Runtime calculation still consumes only the generated internal dataset. `calculateSaju` must not call live external APIs, scrape pages, or compute solar-term boundaries dynamically.

If data is missing, duplicated, out of order, malformed, stale, or outside the supported range, validation/runtime code must fail loudly with `SOLAR_TERM_DATA_MISSING` or `SOLAR_TERM_DATA_INVALID`.

## Promotion Criteria

Promotion to `production-certified` requires a checked-in, documented, license-reviewed second source that covers every engine-required row in the certified range:

- 1949 `daeseol` carryover
- all 12 engine-required major solar terms for every year from 1950 through 2050
- exact datetimes, not date-only rows
- explicit timezone
- tolerances narrow enough for year/month boundary calculation
