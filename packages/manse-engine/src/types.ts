import type { SolarTermKey } from "./constants";

export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female" | "unknown";
export type DayBoundaryPolicy = "midnight" | "early_zi" | "split_zi";
export type SolarTimePolicy = "civil_time" | "mean_solar_time" | "true_solar_time";

export interface PlainDateLike {
  year: number;
  month: number;
  day: number;
}

export interface LunarDate extends PlainDateLike {
  leapMonth: boolean;
}

export interface BirthPlace {
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface CalculateSajuInput {
  calendarType: CalendarType;
  birthDate: string;
  birthTime?: string;
  birthTimeUnknown: boolean;
  timezone?: string;
  gender?: Gender;
  lunarLeapMonth?: boolean;
  birthPlace?: BirthPlace;
  options?: {
    yearBoundary?: "lichun";
    monthBoundary?: "solar_terms";
    dayBoundaryPolicy?: DayBoundaryPolicy;
    solarTimePolicy?: SolarTimePolicy;
  };
}

export interface NormalizedCalculateSajuInput extends CalculateSajuInput {
  timezone: string;
  gender: Gender;
  options: {
    yearBoundary: "lichun";
    monthBoundary: "solar_terms";
    dayBoundaryPolicy: DayBoundaryPolicy;
    solarTimePolicy: SolarTimePolicy;
  };
}

export interface GanjiResult {
  stem: string;
  branch: string;
  ganji: string;
  stemIndex: number;
  branchIndex: number;
  ganjiIndex?: number;
}

export interface CalculationWarning {
  code: string;
  message: string;
  detail?: unknown;
}

export interface CalculateSajuResult {
  input: CalculateSajuInput;
  normalizedDateTime: {
    solarDate: string;
    civilTime: string;
    calculationTime: string;
    timezone: string;
    solarTimeApplied: boolean;
  };
  pillars: {
    year: GanjiResult;
    month: GanjiResult;
    day: GanjiResult;
    hour: GanjiResult | null;
  };
  basis: {
    year: Record<string, unknown>;
    month: Record<string, unknown>;
    day: Record<string, unknown>;
    hour: Record<string, unknown> | null;
  };
  metadata: {
    engineVersion: string;
    policyVersion: string;
    dataVersion: string;
    appliedOptions: NormalizedCalculateSajuInput["options"];
    warnings: CalculationWarning[];
  };
}

export interface SolarTerm {
  key: SolarTermKey;
  name: string;
  hanja: string;
  longitude: number;
  dateTime: string;
  timezone: string;
  source?: string;
}

export interface CalendarDataProvider {
  readonly dataVersion?: string;
  getJulianDay(date: PlainDateLike): number | Promise<number>;
  solarToLunar(date: PlainDateLike): LunarDate | Promise<LunarDate>;
  lunarToSolar(date: LunarDate): PlainDateLike | Promise<PlainDateLike>;
}

export interface SolarTermProvider {
  readonly dataVersion?: string;
  getTermsForGregorianYear(year: number): SolarTerm[] | Promise<SolarTerm[]>;
  getLichunForGregorianYear(year: number): SolarTerm | Promise<SolarTerm>;
}

export interface Providers {
  calendar?: CalendarDataProvider;
  solarTerms?: SolarTermProvider;
}
