# Manse Engine v0.1.1 Project Brief

## Goal

Manse Engine v0.1.1 calculates Korean saju four pillars from birth date/time input with deterministic, testable code. It is not an interpretation or fortune-telling layer.

v0.1.1 is a hardening release. The calculation policy remains `manse-policy-v0.1`; this release improves validation, CI, metadata transparency, and UTF-8 repository defaults without changing the pillar formulas.

The calculation logic lives in `packages/manse-engine`. The Next.js app in `apps/web` calls the engine through `POST /api/saju/calculate` and contains no pillar calculation logic.

## Scope

- Solar input normalization with IANA timezones.
- Lunar input validation and loud failure when conversion data is unavailable.
- Year pillar by lichun boundary.
- Month pillar by 12 solar-term boundaries.
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
- `data/solar-terms`: visible seed solar-term table.
- `data/fixtures`: golden calculation fixtures.
- `docs`: policy, API, and test documentation.

## Data

The default v0.1 solar-term table is intentionally small. It includes real UTC rows for the dates needed by smoke tests and the debug UI. Unsupported years fail with `SOLAR_TERM_DATA_MISSING` rather than falling back to guessed dates.
