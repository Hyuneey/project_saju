import KoreanLunarCalendar from "korean-lunar-calendar";
import { MONTH_BOUNDARIES } from "./constants";
import { ManseError } from "./errors";
import { julianDayNumber } from "./julian";
import { SOLAR_TERM_DATASET } from "./solarTermsData";
import type {
  CalendarDataProvider,
  LunarDate,
  PlainDateLike,
  SolarTerm,
  SolarTermDataset,
  SolarTermProvider
} from "./types";

const CHRONOLOGICAL_TERM_KEYS = [
  "sohan",
  "lichun",
  "gyeongchip",
  "cheongmyeong",
  "ipha",
  "mangjong",
  "soseo",
  "ipchu",
  "baengno",
  "hanro",
  "ipdong",
  "daeseol"
] as const;

const KOREAN_LUNAR_PROVIDER = "KoreanLunarCalendarProvider";
const KOREAN_LUNAR_SOURCE = "korean-lunar-calendar@0.4.0";
const SUPPORTED_SOLAR_RANGE = {
  from: { year: 1000, month: 2, day: 13 },
  to: { year: 2050, month: 12, day: 31 }
} as const;
const SUPPORTED_LUNAR_RANGE = {
  from: { year: 1000, month: 1, day: 1 },
  to: { year: 2050, month: 11, day: 18 }
} as const;

export class TableCalendarDataProvider implements CalendarDataProvider {
  readonly dataVersion = "calendar-jdn-korean-lunar-0.3.0";

  getJulianDay(date: PlainDateLike): number {
    return julianDayNumber(date);
  }

  solarToLunar(date: PlainDateLike): LunarDate {
    assertDateInRange(date, SUPPORTED_SOLAR_RANGE, "solar");
    const calendar = new KoreanLunarCalendar();

    if (!calendar.setSolarDate(date.year, date.month, date.day)) {
      throw new ManseError("INVALID_DATE", "Solar date cannot be converted to a Korean lunar date.", {
        provider: KOREAN_LUNAR_PROVIDER,
        source: KOREAN_LUNAR_SOURCE,
        requestedSolarDate: date
      });
    }

    const lunar = calendar.getLunarCalendar();
    return {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      leapMonth: lunar.intercalation ?? false
    };
  }

  lunarToSolar(date: LunarDate): PlainDateLike {
    assertDateInRange(date, SUPPORTED_LUNAR_RANGE, "lunar");
    const calendar = new KoreanLunarCalendar();

    if (!calendar.setLunarDate(date.year, date.month, date.day, date.leapMonth)) {
      throw new ManseError("INVALID_DATE", "Korean lunar date cannot be converted to a solar date.", {
        provider: KOREAN_LUNAR_PROVIDER,
        source: KOREAN_LUNAR_SOURCE,
        requestedLunarDate: date
      });
    }

    return calendar.getSolarCalendar();
  }
}

export class TableSolarTermProvider implements SolarTermProvider {
  readonly dataVersion: string;
  private readonly table: Record<string, SolarTerm[]>;
  private readonly supportedGregorianYears?: SolarTermDataset["supportedGregorianYears"];

  constructor(source: Record<string, SolarTerm[]> | SolarTermDataset = SOLAR_TERM_DATASET, dataVersion?: string) {
    if (isSolarTermDataset(source)) {
      assertCertifiedSolarTermDataset(source);
      this.table = solarTermDatasetToTable(source);
      this.dataVersion = source.dataVersion;
      this.supportedGregorianYears = source.supportedGregorianYears;
      return;
    }

    this.table = source;
    this.dataVersion = dataVersion ?? "custom-solar-term-table";
  }

  getTermsForGregorianYear(year: number): SolarTerm[] {
    if (
      this.supportedGregorianYears &&
      (year < this.supportedGregorianYears.from - 1 || year > this.supportedGregorianYears.to)
    ) {
      throw new ManseError(
        "SOLAR_TERM_DATA_MISSING",
        `Solar-term data is outside the certified range for Gregorian year ${year}.`,
        {
          year,
          dataVersion: this.dataVersion,
          supportedGregorianYears: this.supportedGregorianYears
        }
      );
    }

    const terms = this.table[String(year)];
    if (!terms) {
      throw new ManseError(
        "SOLAR_TERM_DATA_MISSING",
        `Solar-term data is missing for Gregorian year ${year}.`,
        { year, dataVersion: this.dataVersion }
      );
    }
    return terms;
  }

  getLichunForGregorianYear(year: number): SolarTerm {
    const terms = this.getTermsForGregorianYear(year);
    const lichun = terms.find((term) => term.key === "lichun");
    if (!lichun) {
      throw new ManseError(
        "SOLAR_TERM_DATA_MISSING",
        `Lichun data is missing for Gregorian year ${year}.`,
        { year, key: "lichun" }
      );
    }
    return lichun;
  }
}

export const defaultCalendarDataProvider = new TableCalendarDataProvider();
export const defaultSolarTermProvider = new TableSolarTermProvider();

export function assertCertifiedSolarTermDataset(dataset: SolarTermDataset): void {
  const errors: string[] = [];
  const { from, to } = dataset.supportedGregorianYears;

  if (from > to) {
    errors.push("supportedGregorianYears.from must be less than or equal to supportedGregorianYears.to");
  }

  const recordsByYear = new Map<number, SolarTerm[]>();
  const seen = new Set<string>();

  for (const record of dataset.terms) {
    const key = `${record.gregorianYear}:${record.name}`;
    if (seen.has(key)) {
      errors.push(`duplicate solar term ${key}`);
    }
    seen.add(key);
  }

  const table = solarTermDatasetToTable(dataset);
  for (const [year, terms] of Object.entries(table)) {
    recordsByYear.set(Number(year), terms);
  }

  for (let year = from; year <= to; year += 1) {
    const terms = recordsByYear.get(year) ?? [];
    for (const boundary of MONTH_BOUNDARIES) {
      if (!terms.some((term) => term.key === boundary.key)) {
        errors.push(`certified year ${year} is missing ${boundary.key}`);
      }
    }

    if (terms.length !== CHRONOLOGICAL_TERM_KEYS.length) {
      errors.push(`certified year ${year} must contain exactly ${CHRONOLOGICAL_TERM_KEYS.length} major solar terms`);
    }

    const chronologicalKeys = [...terms]
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .map((term) => term.key);
    if (chronologicalKeys.join(",") !== CHRONOLOGICAL_TERM_KEYS.join(",")) {
      errors.push(`certified year ${year} has out-of-order solar-term datetimes`);
    }
  }

  const carryover = recordsByYear.get(from - 1) ?? [];
  if (!carryover.some((term) => term.key === "daeseol")) {
    errors.push(`carryover year ${from - 1} is missing daeseol`);
  }
  if (carryover.length !== 1) {
    errors.push(`carryover year ${from - 1} must contain only daeseol`);
  }

  if (errors.length > 0) {
    throw new ManseError("SOLAR_TERM_DATA_INVALID", "Solar-term dataset failed certification checks.", {
      dataVersion: dataset.dataVersion,
      errors
    });
  }
}

export function solarTermDatasetToTable(dataset: SolarTermDataset): Record<string, SolarTerm[]> {
  const table: Record<string, SolarTerm[]> = {};

  for (const record of dataset.terms) {
    const year = String(record.gregorianYear);
    table[year] ??= [];
    table[year].push({
      key: record.name,
      name: record.nameKo,
      nameKo: record.nameKo,
      hanja: record.hanja,
      longitude: record.longitude,
      at: record.at,
      dateTime: utcInstantToPlainDateTime(record.at),
      timezone: dataset.timezone,
      source: record.source ?? dataset.source.name
    });
  }

  for (const terms of Object.values(table)) {
    terms.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  return table;
}

export function requireSolarTerm(terms: SolarTerm[], key: SolarTerm["key"], year: number): SolarTerm {
  const term = terms.find((candidate) => candidate.key === key);
  if (!term) {
    const definition = MONTH_BOUNDARIES.find((boundary) => boundary.key === key);
    throw new ManseError(
      "SOLAR_TERM_DATA_MISSING",
      `Solar-term data is missing for ${definition?.name ?? key} in Gregorian year ${year}.`,
      { year, key }
    );
  }
  return term;
}

function isSolarTermDataset(source: Record<string, SolarTerm[]> | SolarTermDataset): source is SolarTermDataset {
  return "dataVersion" in source && "terms" in source && Array.isArray(source.terms);
}

function utcInstantToPlainDateTime(value: string): string {
  return value.endsWith("Z") ? value.slice(0, -1) : value;
}

function assertDateInRange(
  date: PlainDateLike,
  range: { from: PlainDateLike; to: PlainDateLike },
  calendarType: "solar" | "lunar"
): void {
  if (compareDate(date, range.from) < 0 || compareDate(date, range.to) > 0) {
    throw new ManseError("OUT_OF_SUPPORTED_RANGE", `${calendarType} date is outside the supported Korean lunar conversion range.`, {
      provider: KOREAN_LUNAR_PROVIDER,
      source: KOREAN_LUNAR_SOURCE,
      calendarType,
      requestedDate: date,
      supportedRange: range
    });
  }
}

function compareDate(left: PlainDateLike, right: PlainDateLike): number {
  return (
    left.year - right.year ||
    left.month - right.month ||
    left.day - right.day
  );
}
