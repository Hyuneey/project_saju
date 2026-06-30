import { Temporal } from "@js-temporal/polyfill";
import { ENGINE_VERSION, MONTH_BOUNDARIES, POLICY_VERSION } from "./constants";
import { ManseError } from "./errors";
import { calculateHourPillar, ganjiIndexToResult, mod, stemBranchToGanji } from "./ganji";
import { defaultCalendarDataProvider, defaultSolarTermProvider, requireSolarTerm } from "./providers";
import { normalizeInput, parseBirthDate, parseBirthTime } from "./validation";
import type {
  CalculateSajuInput,
  CalculateSajuResult,
  CalculationWarning,
  CalendarDataProvider,
  GanjiResult,
  NormalizedCalculateSajuInput,
  PlainDateLike,
  Providers,
  SolarTerm,
  SolarTermProvider
} from "./types";

interface NormalizedDateTime {
  input: NormalizedCalculateSajuInput;
  solarDate: Temporal.PlainDate;
  civilDateTime: Temporal.ZonedDateTime;
  calculationDateTime: Temporal.ZonedDateTime;
  warnings: CalculationWarning[];
}

interface PillarWithBasis {
  pillar: GanjiResult;
  basis: Record<string, unknown>;
}

export async function calculateSaju(input: CalculateSajuInput, providers: Providers = {}): Promise<CalculateSajuResult> {
  const calendarProvider = providers.calendar ?? defaultCalendarDataProvider;
  const solarTermProvider = providers.solarTerms ?? defaultSolarTermProvider;
  const normalized = await normalizeDateTime(input, calendarProvider);
  const calculationTime = normalized.calculationDateTime;

  const year = await calculateYearPillar(calculationTime, solarTermProvider);
  const month = await calculateMonthPillar(calculationTime, year.pillar.stemIndex, solarTermProvider);
  const day = await calculateDayPillar(calculationTime, calendarProvider, normalized.input);
  const hour = calculateHourPillarOrNull(calculationTime, day.pillar.stemIndex, normalized.input);

  return {
    input: normalized.input,
    normalizedDateTime: {
      solarDate: normalized.solarDate.toString(),
      civilTime: normalized.civilDateTime.toString(),
      calculationTime: normalized.calculationDateTime.toString(),
      timezone: normalized.input.timezone,
      solarTimeApplied: false
    },
    pillars: {
      year: year.pillar,
      month: month.pillar,
      day: day.pillar,
      hour: hour?.pillar ?? null
    },
    basis: {
      year: year.basis,
      month: month.basis,
      day: day.basis,
      hour: hour?.basis ?? null
    },
    metadata: {
      engineVersion: ENGINE_VERSION,
      policyVersion: POLICY_VERSION,
      dataVersion: dataVersion(calendarProvider, solarTermProvider),
      appliedOptions: normalized.input.options,
      warnings: normalized.warnings
    }
  };
}

async function normalizeDateTime(input: CalculateSajuInput, calendarProvider: CalendarDataProvider): Promise<NormalizedDateTime> {
  const normalizedInput = normalizeInput(input);
  const warnings: CalculationWarning[] = [];
  let solarDate = parseBirthDate(normalizedInput.birthDate);

  if (normalizedInput.calendarType === "lunar") {
    const converted = await calendarProvider.lunarToSolar({
      ...plainDateToLike(solarDate),
      leapMonth: normalizedInput.lunarLeapMonth ?? false
    });
    solarDate = Temporal.PlainDate.from(converted);
  }

  if (normalizedInput.birthTimeUnknown) {
    warnings.push({
      code: "BIRTH_TIME_UNKNOWN_ASSUMED_MIDNIGHT",
      message: "birthTimeUnknown is true, so hour pillar is null and date boundary calculations use 00:00 civil time."
    });
  }

  if (normalizedInput.options.dayBoundaryPolicy !== "midnight") {
    warnings.push({
      code: "DAY_BOUNDARY_POLICY_NOT_IMPLEMENTED",
      message: "v0.1.1 accepts this dayBoundaryPolicy option but calculates using midnight policy.",
      detail: { requested: normalizedInput.options.dayBoundaryPolicy, applied: "midnight" }
    });
  }

  if (normalizedInput.options.solarTimePolicy !== "civil_time") {
    warnings.push({
      code: "SOLAR_TIME_POLICY_NOT_IMPLEMENTED",
      message: "v0.1.1 accepts this solarTimePolicy option but calculates using civil time.",
      detail: { requested: normalizedInput.options.solarTimePolicy, applied: "civil_time" }
    });
  }

  const time = normalizedInput.birthTimeUnknown
    ? Temporal.PlainTime.from("00:00")
    : parseBirthTime(normalizedInput.birthTime ?? "");
  const civilDateTime = solarDate.toPlainDateTime(time).toZonedDateTime(normalizedInput.timezone);

  return {
    input: normalizedInput,
    solarDate,
    civilDateTime,
    calculationDateTime: civilDateTime,
    warnings
  };
}

async function calculateYearPillar(
  calculationTime: Temporal.ZonedDateTime,
  solarTermProvider: SolarTermProvider
): Promise<PillarWithBasis> {
  const gregorianYear = calculationTime.year;
  const lichun = await solarTermProvider.getLichunForGregorianYear(gregorianYear);
  const lichunDateTime = solarTermToZonedDateTime(lichun);
  const isAfterOrAtLichun = Temporal.Instant.compare(calculationTime.toInstant(), lichunDateTime.toInstant()) >= 0;
  const appliedYear = isAfterOrAtLichun ? gregorianYear : gregorianYear - 1;
  const yearGanjiIndex = mod(appliedYear - 4, 60);
  const pillar = ganjiIndexToResult(yearGanjiIndex);

  return {
    pillar,
    basis: {
      policy: "yearBoundary=lichun",
      gregorianYear,
      lichun,
      birthInstant: calculationTime.toInstant().toString(),
      lichunInstant: lichunDateTime.toInstant().toString(),
      appliedYear,
      formula: "mod(appliedYear - 4, 60)",
      ganjiIndex: yearGanjiIndex
    }
  };
}

async function calculateMonthPillar(
  calculationTime: Temporal.ZonedDateTime,
  yearStemIndex: number,
  solarTermProvider: SolarTermProvider
): Promise<PillarWithBasis> {
  const gregorianYear = calculationTime.year;
  const currentTerms = await solarTermProvider.getTermsForGregorianYear(gregorianYear);
  const candidates = MONTH_BOUNDARIES.map((boundary) => ({
    boundary,
    term: requireSolarTerm(currentTerms, boundary.key, gregorianYear)
  }));
  const birthInstant = calculationTime.toInstant();
  const sohan = candidates.find((candidate) => candidate.boundary.key === "sohan");

  if (!sohan) {
    throw new ManseError("SOLAR_TERM_DATA_MISSING", `Sohan data is missing for Gregorian year ${gregorianYear}.`, {
      gregorianYear,
      key: "sohan"
    });
  }

  if (Temporal.Instant.compare(birthInstant, solarTermToZonedDateTime(sohan.term).toInstant()) < 0) {
    const previousYear = gregorianYear - 1;
    const previousTerms = await solarTermProvider.getTermsForGregorianYear(previousYear);
    candidates.push({
      boundary: MONTH_BOUNDARIES.find((boundary) => boundary.key === "daeseol")!,
      term: requireSolarTerm(previousTerms, "daeseol", previousYear)
    });
  }

  const active = candidates
    .map((candidate) => ({
      ...candidate,
      instant: solarTermToZonedDateTime(candidate.term).toInstant()
    }))
    .filter((candidate) => Temporal.Instant.compare(birthInstant, candidate.instant) >= 0)
    .sort((a, b) => Temporal.Instant.compare(a.instant, b.instant))
    .at(-1);

  if (!active) {
    throw new ManseError(
      "SOLAR_TERM_DATA_MISSING",
      "No solar-term boundary was available at or before the birth instant.",
      { birthInstant: birthInstant.toString(), gregorianYear }
    );
  }

  const monthOrder = active.boundary.monthOrder;
  const branchIndex = active.boundary.branchIndex;
  const firstMonthStemIndex = mod((yearStemIndex % 5) * 2 + 2, 10);
  const monthStemIndex = mod(firstMonthStemIndex + monthOrder, 10);

  return {
    pillar: stemBranchToGanji(monthStemIndex, branchIndex),
    basis: {
      policy: "monthBoundary=solar_terms",
      activeBoundary: active.boundary,
      activeTerm: active.term,
      birthInstant: birthInstant.toString(),
      yearStemIndex,
      firstMonthStemIndex,
      monthOrder,
      branchIndex,
      formula: "firstMonthStemIndex=((yearStemIndex % 5) * 2 + 2) % 10; monthStemIndex=(firstMonthStemIndex + monthOrder) % 10",
      monthStemIndex
    }
  };
}

async function calculateDayPillar(
  calculationTime: Temporal.ZonedDateTime,
  calendarProvider: CalendarDataProvider,
  input: NormalizedCalculateSajuInput
): Promise<PillarWithBasis> {
  const date = plainDateToLike(calculationTime.toPlainDate());
  const julianDay = await calendarProvider.getJulianDay(date);
  const dayGanjiIndex = mod(julianDay + 49, 60);
  const pillar = ganjiIndexToResult(dayGanjiIndex);

  return {
    pillar,
    basis: {
      policy: "dayBoundaryPolicy=midnight",
      requestedDayBoundaryPolicy: input.options.dayBoundaryPolicy,
      appliedDayBoundaryPolicy: "midnight",
      solarDate: calculationTime.toPlainDate().toString(),
      julianDay,
      formula: "mod(julianDay + 49, 60)",
      ganjiIndex: dayGanjiIndex
    }
  };
}

function calculateHourPillarOrNull(
  calculationTime: Temporal.ZonedDateTime,
  dayStemIndex: number,
  input: NormalizedCalculateSajuInput
): PillarWithBasis | null {
  if (input.birthTimeUnknown) {
    return null;
  }

  const hour = calculationTime.hour;
  const pillar = calculateHourPillar(dayStemIndex, hour);

  return {
    pillar,
    basis: {
      policy: "two-hour branch windows",
      civilTime: calculationTime.toPlainTime().toString(),
      civilHour: hour,
      civilMinute: calculationTime.minute,
      dayStemIndex,
      hourBranchIndex: pillar.branchIndex,
      formula: "hourStemIndex=((dayStemIndex % 5) * 2 + hourBranchIndex) % 10",
      hourStemIndex: pillar.stemIndex
    }
  };
}

function solarTermToZonedDateTime(term: SolarTerm): Temporal.ZonedDateTime {
  return Temporal.PlainDateTime.from(term.dateTime).toZonedDateTime(term.timezone);
}

function plainDateToLike(date: Temporal.PlainDate): PlainDateLike {
  return { year: date.year, month: date.month, day: date.day };
}

function dataVersion(calendarProvider: CalendarDataProvider, solarTermProvider: SolarTermProvider): string {
  return [
    `calendar:${calendarProvider.dataVersion ?? "custom-provider"}`,
    `solarTerms:${solarTermProvider.dataVersion ?? "custom-provider"}`
  ].join(";");
}
