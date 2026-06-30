export const MANSE_ERROR_CODES = [
  "INVALID_INPUT",
  "INVALID_DATE",
  "INVALID_TIME",
  "INVALID_TIMEZONE",
  "LUNAR_LEAP_MONTH_REQUIRED",
  "SOLAR_TERM_DATA_MISSING",
  "LUNAR_CONVERSION_UNAVAILABLE",
  "OUT_OF_SUPPORTED_RANGE",
  "INTERNAL_CALCULATION_ERROR"
] as const;

export type ManseErrorCode = (typeof MANSE_ERROR_CODES)[number];

export class ManseError extends Error {
  readonly code: ManseErrorCode;
  readonly detail?: unknown;
  readonly status: number;

  constructor(code: ManseErrorCode, message: string, detail?: unknown, status = statusForManseError(code)) {
    super(message);
    this.name = "ManseError";
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export function statusForManseError(code: ManseErrorCode): number {
  switch (code) {
    case "INVALID_INPUT":
    case "INVALID_DATE":
    case "INVALID_TIME":
    case "INVALID_TIMEZONE":
    case "LUNAR_LEAP_MONTH_REQUIRED":
      return 400;
    case "SOLAR_TERM_DATA_MISSING":
    case "LUNAR_CONVERSION_UNAVAILABLE":
    case "OUT_OF_SUPPORTED_RANGE":
      return 422;
    case "INTERNAL_CALCULATION_ERROR":
    default:
      return 500;
  }
}

export function isManseErrorCode(code: unknown): code is ManseErrorCode {
  return typeof code === "string" && (MANSE_ERROR_CODES as readonly string[]).includes(code);
}

export function isManseError(error: unknown): error is ManseError {
  return error instanceof ManseError || (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    "code" in error &&
    (error as { name?: unknown }).name === "ManseError" &&
    isManseErrorCode((error as { code?: unknown }).code)
  );
}
