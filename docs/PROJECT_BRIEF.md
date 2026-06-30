# Manse Engine v0.2.1 Project Brief

## Goal

Manse Engine v0.2.1 calculates Korean saju four pillars from birth date/time input with deterministic, testable code. It is not an interpretation or fortune-telling layer.

v0.2.1 certifies the solar-term data pipeline. The calculation policy remains `manse-policy-v0.1`; this release expands the supported solar-term range and strengthens completeness, source, and runtime range checks without changing the pillar formulas.

The calculation logic lives in `packages/manse-engine`. The Next.js app in `apps/web` calls the engine through `POST /api/saju/calculate` and contains no pillar calculation logic.

## Scope

- Solar input normalization with IANA timezones.
- Lunar input validation and loud failure when conversion data is unavailable.
- Year pillar by lichun boundary.
- Month pillar by 12 solar-term boundaries.
- Versioned UTC solar-term boundary datetimes, not date-only solar-term labels.
- Continuous supported solar-term range from 2015 through 2026.
- Day pillar by Julian Day Number.
- Hour pillar by two-hour branch windows.
- Basis/debug metadata for each pillar.
- Explicit `engineVersion`, `policyVersion`, and `dataVersion` in every result.
- Strict input schema validation so unknown request fields fail instead of being silently discarded.

## Non-goals

- LLM or AI calculation.
- Saju interpretation text.
- Production-grade lunar conversion tables.
- Exhaustive solar-term data coverage.
- Mean or true solar-time adjustment.

## Workspace

- `apps/web`: minimal Next.js debug UI and API route.
- `packages/manse-engine`: deterministic engine, providers, errors, tests.
- `data/solar-terms`: canonical solar-term schema, README, and versioned datasets.
- `data/fixtures`: golden calculation fixtures.
- `docs`: policy, API, and test documentation.

## Data

The default v0.2.1 solar-term data is generated from `data/solar-terms/solar-terms.v0.2.1.json` into the engine package. It includes exact UTC boundary datetimes for every engine-required major solar term from 2015 through 2026, plus the 2014 대설 carryover row needed for early January 2015. Unsupported years fail with `SOLAR_TERM_DATA_MISSING` rather than falling back to guessed dates.
