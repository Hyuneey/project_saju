# Manse Engine v0.3.1 Project Brief

## Goal

Manse Engine v0.3.1 calculates Korean saju four pillars from solar or Korean lunar birth-date input with deterministic, testable code. It is not an interpretation or fortune-telling layer.

v0.3.1 hardens the default Korean lunar-to-solar conversion provider added in v0.3.0. The calculation policy remains `manse-policy-v0.1`; the pillar formulas and solar-term dataset are unchanged from v0.2.3.

The calculation logic lives in `packages/manse-engine`. The Next.js app in `apps/web` calls the engine through `POST /api/saju/calculate` and contains no pillar calculation logic.

## Scope

- Solar input normalization with IANA timezones.
- Korean lunar input conversion with explicit `lunarLeapMonth`.
- Year pillar by lichun boundary.
- Month pillar by 12 solar-term boundaries.
- Versioned UTC solar-term boundary datetimes, not date-only solar-term labels.
- Continuous supported solar-term range from 1950 through 2050.
- Day pillar by Julian Day Number.
- Hour pillar by two-hour branch windows.
- Basis/debug metadata for each pillar.
- Explicit `engineVersion`, `policyVersion`, `dataVersion`, and provider metadata in every result.
- Strict input schema validation so unknown request fields fail instead of being silently discarded.

## Non-goals

- LLM or AI calculation.
- Saju interpretation text.
- Lunar conversion outside the default provider range.
- Solar-term data outside the certified 1950-2050 range.
- Mean or true solar-time adjustment.

## Workspace

- `apps/web`: minimal Next.js debug UI and API route.
- `packages/manse-engine`: deterministic engine, providers, errors, tests.
- `data/solar-terms`: canonical solar-term schema, README, and versioned datasets.
- `data/fixtures`: golden calculation and provider fixtures.
- `docs`: policy, API, and test documentation.

## Data

The default v0.3.1 engine still uses `data/solar-terms/solar-terms.v0.2.2.json`. It includes exact UTC boundary datetimes for every engine-required major solar term from 1950 through 2050, plus the 1949 daeseol carryover row needed for early January 1950. The solar-term dataset remains `cross-checked`; see `docs/SOLAR_TERM_CERTIFICATION.md`.

The default calendar provider uses exact dependency `korean-lunar-calendar@0.4.0` for offline Korean lunar/solar conversion. Runtime calculation consumes the installed local package and internal solar-term data only; it does not call public calendar APIs inside `calculateSaju`.
