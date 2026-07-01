import type { SolarTermKey } from "./constants";

export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female" | "unknown";
export type DayBoundaryPolicy = "midnight" | "early_zi" | "split_zi";
export type SolarTimePolicy = "civil_time" | "mean_solar_time" | "true_solar_time";
export type SolarTermName = SolarTermKey;
export type SolarTermCertificationLevel = "seed" | "imported-unverified" | "cross-checked" | "production-certified";

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
    providers: {
      calendar: CalendarProviderMetadata;
      solarTerms: SolarTermProviderMetadata;
    };
    appliedOptions: NormalizedCalculateSajuInput["options"];
    warnings: CalculationWarning[];
  };
}

export interface SolarTerm {
  key: SolarTermName;
  name: string;
  nameKo?: string;
  hanja: string;
  longitude: number;
  at?: string;
  dateTime: string;
  timezone: string;
  source?: string;
}

export interface SolarTermDataset {
  dataVersion: string;
  certificationLevel: SolarTermCertificationLevel;
  source: {
    name: string;
    url?: string;
    retrievedAt?: string;
    license: string;
    notes?: string;
  };
  generatedAt?: string;
  timezone: "UTC";
  supportedGregorianYears: {
    from: number;
    to: number;
  };
  terms: readonly SolarTermRecord[];
}

export interface SolarTermRecord {
  gregorianYear: number;
  name: SolarTermName;
  nameKo: string;
  hanja: string;
  longitude: number;
  at: string;
  source?: string;
}

export interface CalendarDataProvider {
  readonly dataVersion?: string;
  readonly metadata?: CalendarProviderMetadata;
  getJulianDay(date: PlainDateLike): number | Promise<number>;
  solarToLunar(date: PlainDateLike): LunarDate | Promise<LunarDate>;
  lunarToSolar(date: LunarDate): PlainDateLike | Promise<PlainDateLike>;
}

export interface SolarTermProvider {
  readonly dataVersion?: string;
  readonly metadata?: SolarTermProviderMetadata;
  getTermsForGregorianYear(year: number): SolarTerm[] | Promise<SolarTerm[]>;
  getLichunForGregorianYear(year: number): SolarTerm | Promise<SolarTerm>;
}

export interface Providers {
  calendar?: CalendarDataProvider;
  solarTerms?: SolarTermProvider;
}

export interface CalendarProviderMetadata {
  name: string;
  dataVersion: string;
  source: {
    name: string;
    packageName?: string;
    version?: string;
    url?: string;
    license?: string;
  };
  supportedRange?: {
    solarToLunar?: DateRange;
    lunarToSolar?: DateRange;
  };
  runtimeNetwork?: boolean;
  notes?: string;
}

export interface SolarTermProviderMetadata {
  name: string;
  dataVersion: string;
  source?: {
    name: string;
    url?: string;
    license?: string;
  };
  supportedGregorianYears?: {
    from: number;
    to: number;
  };
  certificationLevel?: SolarTermCertificationLevel;
  runtimeNetwork?: boolean;
}

export interface DateRange {
  from: PlainDateLike;
  to: PlainDateLike;
}
