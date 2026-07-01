# Manse Engine v0.2.3 Project Brief

## Goal

Manse Engine v0.2.3 calculates Korean saju four pillars from birth date/time input with deterministic, testable code. It is not an interpretation or fortune-telling layer.

v0.2.3 independently reviews the v0.2.2 solar-term dataset and keeps it at `cross-checked`. The calculation policy remains `manse-policy-v0.1`; this release adds source comparison workflow and certification documentation without changing the pillar formulas or dataset range.

The calculation logic lives in `packages/manse-engine`. The Next.js app in `apps/web` calls the engine through `POST /api/saju/calculate` and contains no pillar calculation logic.

## Scope

- Solar input normalization with IANA timezones.
- Lunar input validation and loud failure when conversion data is unavailable.
- Year pillar by lichun boundary.
- Month pillar by 12 solar-term boundaries.
- Versioned UTC solar-term boundary datetimes, not date-only solar-term labels.
- Continuous supported solar-term range from 1950 through 2050.
- Day pillar by Julian Day Number.
- Hour pillar by two-hour branch windows.
- Basis/debug metadata for each pillar.
- Explicit `engineVersion`, `policyVersion`, and `dataVersion` in every result.
- Strict input schema validation so unknown request fields fail instead of being silently discarded.

## Non-goals

- LLM or AI calculation.
- Saju interpretation text.
- Production-grade lunar conversion tables.
- Solar-term data outside the certified 1950-2050 range.
- Mean or true solar-time adjustment.

## Workspace

- `apps/web`: minimal Next.js debug UI and API route.
- `packages/manse-engine`: deterministic engine, providers, errors, tests.
- `data/solar-terms`: canonical solar-term schema, README, and versioned datasets.
- `data/fixtures`: golden calculation fixtures.
- `docs`: policy, API, and test documentation.

## Data

The default v0.2.3 engine still uses `data/solar-terms/solar-terms.v0.2.2.json`. It includes exact UTC boundary datetimes for every engine-required major solar term from 1950 through 2050, plus the 1949 대설 carryover row needed for early January 1950. v0.2.3 does not promote the dataset to `production-certified`; see `docs/SOLAR_TERM_CERTIFICATION.md`.
