import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { DEFAULT_TIMEZONE } from "./constants";
import { ManseError } from "./errors";
import type { CalculateSajuInput, NormalizedCalculateSajuInput, PlainDateLike } from "./types";

const optionsSchema = z.object({
  yearBoundary: z.literal("lichun").optional(),
  monthBoundary: z.literal("solar_terms").optional(),
  dayBoundaryPolicy: z.enum(["midnight", "early_zi", "split_zi"]).optional(),
  solarTimePolicy: z.enum(["civil_time", "mean_solar_time", "true_solar_time"]).optional()
}).strict().optional();

const inputSchema = z.object({
  calendarType: z.enum(["solar", "lunar"]),
  birthDate: z.string(),
  birthTime: z.string().optional(),
  birthTimeUnknown: z.boolean(),
  timezone: z.string().optional(),
  gender: z.enum(["male", "female", "unknown"]).optional(),
  lunarLeapMonth: z.boolean().optional(),
  birthPlace: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).strict().optional(),
  options: optionsSchema
}).strict();

export function normalizeInput(input: CalculateSajuInput): NormalizedCalculateSajuInput {
  const raw = parseInputShape(input);
  const birthTime = raw.birthTime === "" ? undefined : raw.birthTime;
  const timezone = raw.timezone || DEFAULT_TIMEZONE;

  if (raw.calendarType === "solar") {
    parseBirthDate(raw.birthDate);
  } else {
    parseLunarBirthDate(raw.birthDate);
  }
  assertIanaTimezone(timezone);

  if (!raw.birthTimeUnknown && !birthTime) {
    throw new ManseError("INVALID_TIME", "birthTime is required when birthTimeUnknown is false.");
  }

  if (birthTime) {
    parseBirthTime(birthTime);
  }

  if (raw.calendarType === "lunar" && raw.lunarLeapMonth === undefined) {
    throw new ManseError(
      "LUNAR_LEAP_MONTH_REQUIRED",
      "lunarLeapMonth must be supplied for lunar calendar input."
    );
  }

  return {
    ...raw,
    ...(birthTime ? { birthTime } : {}),
    timezone,
    gender: raw.gender ?? "unknown",
    options: {
      yearBoundary: raw.options?.yearBoundary ?? "lichun",
      monthBoundary: raw.options?.monthBoundary ?? "solar_terms",
      dayBoundaryPolicy: raw.options?.dayBoundaryPolicy ?? "midnight",
      solarTimePolicy: raw.options?.solarTimePolicy ?? "civil_time"
    }
  };
}

export function parseBirthDate(value: string): Temporal.PlainDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ManseError("INVALID_DATE", "birthDate must use YYYY-MM-DD format.", { birthDate: value });
  }

  try {
    return Temporal.PlainDate.from(value);
  } catch (error) {
    throw new ManseError("INVALID_DATE", "birthDate is not a valid Gregorian date.", { birthDate: value, error });
  }
}

export function parseLunarBirthDate(value: string): PlainDateLike {
  const date = parseDateParts(value);

  if (date.month < 1 || date.month > 12) {
    throw new ManseError("INVALID_DATE", "lunar birthDate month must be between 1 and 12.", { birthDate: value });
  }

  if (date.day < 1 || date.day > 30) {
    throw new ManseError("INVALID_DATE", "lunar birthDate day must be between 1 and 30.", { birthDate: value });
  }

  return date;
}

export function parseBirthTime(value: string): Temporal.PlainTime {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    throw new ManseError("INVALID_TIME", "birthTime must use HH:mm or HH:mm:ss format.", { birthTime: value });
  }

  try {
    return Temporal.PlainTime.from(value);
  } catch (error) {
    throw new ManseError("INVALID_TIME", "birthTime is not valid civil time.", { birthTime: value, error });
  }
}

function parseDateParts(value: string): PlainDateLike {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new ManseError("INVALID_DATE", "birthDate must use YYYY-MM-DD format.", { birthDate: value });
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

export function assertIanaTimezone(timezone: string): void {
  if (/^[+-]\d{2}:?\d{2}$/.test(timezone) || /^(UTC|GMT)[+-]\d/i.test(timezone)) {
    throw new ManseError("INVALID_TIMEZONE", "timezone must be an IANA timezone identifier, not a fixed offset.", {
      timezone
    });
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch (error) {
    throw new ManseError("INVALID_TIMEZONE", "timezone is not a valid IANA timezone identifier.", {
      timezone,
      error
    });
  }
}

function parseInputShape(input: CalculateSajuInput): CalculateSajuInput {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ManseError("INVALID_INPUT", "Input does not match the calculateSaju schema.", parsed.error.issues);
  }
  return parsed.data;
}
