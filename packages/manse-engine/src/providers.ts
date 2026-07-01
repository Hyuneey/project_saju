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

export class TableCalendarDataProvider implements CalendarDataProvider {
  readonly dataVersion = "calendar-jdn-gregorian-0.1.0";

  getJulianDay(date: PlainDateLike): number {
    return julianDayNumber(date);
  }

  solarToLunar(date: PlainDateLike): LunarDate {
    throw new ManseError(
      "LUNAR_CONVERSION_UNAVAILABLE",
      "Solar-to-lunar conversion data is not available in the default table provider.",
      {
        provider: "TableCalendarDataProvider",
        requestedSolarDate: date,
        supportedInDefaultProvider: false
      }
    );
  }

  lunarToSolar(date: LunarDate): PlainDateLike {
    throw new ManseError(
      "LUNAR_CONVERSION_UNAVAILABLE",
      "Lunar-to-solar conversion data is not available in the default table provider.",
      {
        provider: "TableCalendarDataProvider",
        requestedLunarDate: date,
        supportedInDefaultProvider: false
      }
    );
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
