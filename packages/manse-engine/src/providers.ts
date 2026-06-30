import { MONTH_BOUNDARIES } from "./constants";
import { ManseError } from "./errors";
import { julianDayNumber } from "./julian";
import { SOLAR_TERM_DATA_VERSION, SOLAR_TERM_TABLE } from "./solarTermsData";
import type { CalendarDataProvider, LunarDate, PlainDateLike, SolarTerm, SolarTermProvider } from "./types";

export class TableCalendarDataProvider implements CalendarDataProvider {
  readonly dataVersion = "calendar-jdn-gregorian-0.1.0";

  getJulianDay(date: PlainDateLike): number {
    return julianDayNumber(date);
  }

  solarToLunar(): LunarDate {
    throw new ManseError(
      "LUNAR_CONVERSION_UNAVAILABLE",
      "Solar-to-lunar conversion data is not available in the default table provider."
    );
  }

  lunarToSolar(): PlainDateLike {
    throw new ManseError(
      "LUNAR_CONVERSION_UNAVAILABLE",
      "Lunar-to-solar conversion data is not available in the default table provider."
    );
  }
}

export class TableSolarTermProvider implements SolarTermProvider {
  readonly dataVersion: string;
  private readonly table: Record<string, SolarTerm[]>;

  constructor(table: Record<string, SolarTerm[]> = SOLAR_TERM_TABLE, dataVersion = SOLAR_TERM_DATA_VERSION) {
    this.table = table;
    this.dataVersion = dataVersion;
  }

  getTermsForGregorianYear(year: number): SolarTerm[] {
    const terms = this.table[String(year)];
    if (!terms) {
      throw new ManseError(
        "SOLAR_TERM_DATA_MISSING",
        `Solar-term data is missing for Gregorian year ${year}.`,
        { year }
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
