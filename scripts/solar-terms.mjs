import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SearchSunLongitude } from "astronomy-engine";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const datasetFileName = "solar-terms.v0.2.2.json";
const datasetPath = path.join(repoRoot, "data", "solar-terms", datasetFileName);
const previousDatasetPath = path.join(repoRoot, "data", "solar-terms", "solar-terms.v0.2.1.json");
const generatedModulePath = path.join(repoRoot, "packages", "manse-engine", "src", "solarTermsData.ts");
const certificationLevels = new Set(["seed", "imported-unverified", "cross-checked", "production-certified"]);
const supportedGregorianYears = { from: 1950, to: 2050 };
const overlapToleranceSeconds = 90;

const termDefinitions = [
  { name: "sohan", nameKo: "소한", hanja: "小寒", longitude: 285, startMonth: 0, order: 0 },
  { name: "lichun", nameKo: "입춘", hanja: "立春", longitude: 315, startMonth: 1, order: 1 },
  { name: "gyeongchip", nameKo: "경칩", hanja: "驚蟄", longitude: 345, startMonth: 2, order: 2 },
  { name: "cheongmyeong", nameKo: "청명", hanja: "清明", longitude: 15, startMonth: 3, order: 3 },
  { name: "ipha", nameKo: "입하", hanja: "立夏", longitude: 45, startMonth: 4, order: 4 },
  { name: "mangjong", nameKo: "망종", hanja: "芒種", longitude: 75, startMonth: 5, order: 5 },
  { name: "soseo", nameKo: "소서", hanja: "小暑", longitude: 105, startMonth: 6, order: 6 },
  { name: "ipchu", nameKo: "입추", hanja: "立秋", longitude: 135, startMonth: 7, order: 7 },
  { name: "baengno", nameKo: "백로", hanja: "白露", longitude: 165, startMonth: 8, order: 8 },
  { name: "hanro", nameKo: "한로", hanja: "寒露", longitude: 195, startMonth: 9, order: 9 },
  { name: "ipdong", nameKo: "입동", hanja: "立冬", longitude: 225, startMonth: 10, order: 10 },
  { name: "daeseol", nameKo: "대설", hanja: "大雪", longitude: 255, startMonth: 11, order: 11 }
];

const termByName = new Map(termDefinitions.map((term) => [term.name, term]));
const command = process.argv[2] ?? "validate";

if (!["generate", "import", "validate"].includes(command)) {
  console.error(`Unknown solar-term command: ${command}`);
  process.exit(1);
}

if (command === "import") {
  const generatedDataset = await generateDataset();
  const errors = [
    ...validateDataset(generatedDataset),
    ...(await validateOverlapWithPreviousDataset(generatedDataset))
  ];

  if (errors.length > 0) {
    reportValidationErrors(errors);
    process.exit(1);
  }

  await writeFile(datasetPath, `${JSON.stringify(generatedDataset, null, 2)}\n`, "utf8");
  console.log(`Imported ${path.relative(repoRoot, datasetPath)}`);
  process.exit(0);
}

const dataset = await readDataset(datasetPath);
const errors = validateDataset(dataset);

if (errors.length > 0) {
  reportValidationErrors(errors);
  process.exit(1);
}

const generatedModule = renderSolarTermsModule(dataset);

if (command === "generate") {
  await writeFile(generatedModulePath, generatedModule, "utf8");
  console.log(`Generated ${path.relative(repoRoot, generatedModulePath)}`);
} else {
  const currentModule = await readFile(generatedModulePath, "utf8");
  if (currentModule !== generatedModule) {
    console.error(`${path.relative(repoRoot, generatedModulePath)} is stale.`);
    console.error("Run: corepack pnpm build:solar-terms");
    process.exit(1);
  }
  console.log(`Validated ${path.relative(repoRoot, datasetPath)}`);
}

async function readDataset(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function generateDataset() {
  const terms = [
    generateTermRecord(supportedGregorianYears.from - 1, termByName.get("daeseol"))
  ];

  for (let year = supportedGregorianYears.from; year <= supportedGregorianYears.to; year += 1) {
    for (const term of termDefinitions) {
      terms.push(generateTermRecord(year, term));
    }
  }

  return {
    dataVersion: "solar-terms-v0.2.2",
    certificationLevel: "cross-checked",
    source: {
      name: "Astronomy Engine SearchSunLongitude generated solar-term boundaries",
      url: "https://github.com/cosinekitty/astronomy",
      retrievedAt: "2026-07-01",
      license: "MIT",
      notes: `Generated with astronomy-engine 2.1.19 using apparent Sun ecliptic longitude. Overlap with solar-terms-v0.2.1 public UTC table import is checked within ${overlapToleranceSeconds} seconds.`
    },
    generatedAt: "2026-07-01",
    timezone: "UTC",
    supportedGregorianYears,
    terms
  };
}

function generateTermRecord(year, term) {
  if (!term) {
    throw new Error("Missing solar-term definition.");
  }

  const searchStart = new Date(Date.UTC(year, term.startMonth, 1, 0, 0, 0));
  const result = SearchSunLongitude(term.longitude, searchStart, 12);
  if (!result) {
    throw new Error(`Could not find ${term.name} for ${year}.`);
  }

  return {
    gregorianYear: year,
    name: term.name,
    nameKo: term.nameKo,
    hanja: term.hanja,
    longitude: term.longitude,
    at: toUtcSecondIso(result.date),
    source: "Astronomy Engine 2.1.19 SearchSunLongitude"
  };
}

async function validateOverlapWithPreviousDataset(candidate) {
  const errors = [];
  const previous = await readDataset(previousDatasetPath);
  const candidateByKey = new Map(candidate.terms.map((record) => [recordKey(record), record]));

  for (const previousRecord of previous.terms) {
    if (
      previousRecord.gregorianYear < candidate.supportedGregorianYears.from ||
      previousRecord.gregorianYear > candidate.supportedGregorianYears.to
    ) {
      continue;
    }

    const candidateRecord = candidateByKey.get(recordKey(previousRecord));
    if (!candidateRecord) {
      errors.push(`overlap check is missing ${recordKey(previousRecord)}`);
      continue;
    }

    const diffSeconds = Math.abs(Date.parse(candidateRecord.at) - Date.parse(previousRecord.at)) / 1000;
    if (diffSeconds > overlapToleranceSeconds) {
      errors.push(
        `overlap check mismatch for ${recordKey(previousRecord)}: ${candidateRecord.at} differs from ${previousRecord.at} by ${diffSeconds} seconds`
      );
    }
  }

  return errors;
}

function recordKey(record) {
  return `${record.gregorianYear}:${record.name}`;
}

function validateDataset(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return ["dataset must be a JSON object"];
  }

  expectString(candidate.dataVersion, "dataVersion", errors);
  if (!/^solar-terms-v\d+\.\d+\.\d+$/.test(candidate.dataVersion ?? "")) {
    errors.push("dataVersion must look like solar-terms-vX.Y.Z");
  }

  if (!certificationLevels.has(candidate.certificationLevel)) {
    errors.push("certificationLevel must be seed, imported-unverified, cross-checked, or production-certified");
  }

  if (candidate.timezone !== "UTC") {
    errors.push("timezone must be UTC in v0.2.2 datasets");
  }

  if (!candidate.source || typeof candidate.source !== "object" || Array.isArray(candidate.source)) {
    errors.push("source must be an object");
  } else {
    expectString(candidate.source.name, "source.name", errors);
    if (candidate.source.url !== undefined) {
      expectString(candidate.source.url, "source.url", errors);
    }
    if (candidate.source.retrievedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(candidate.source.retrievedAt)) {
      errors.push("source.retrievedAt must use YYYY-MM-DD format");
    }
    expectString(candidate.source.license, "source.license", errors);
    if (candidate.source.notes !== undefined) {
      expectString(candidate.source.notes, "source.notes", errors);
    }
  }

  if (candidate.generatedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(candidate.generatedAt)) {
    errors.push("generatedAt must use YYYY-MM-DD format");
  }

  const support = candidate.supportedGregorianYears;
  if (!support || typeof support !== "object" || Array.isArray(support)) {
    errors.push("supportedGregorianYears must be an object");
  } else {
    expectInteger(support.from, "supportedGregorianYears.from", errors);
    expectInteger(support.to, "supportedGregorianYears.to", errors);
    if (Number.isInteger(support.from) && Number.isInteger(support.to) && support.from > support.to) {
      errors.push("supportedGregorianYears.from must be less than or equal to supportedGregorianYears.to");
    }
  }

  if (!Array.isArray(candidate.terms)) {
    errors.push("terms must be an array");
    return errors;
  }

  const recordsByYear = new Map();
  const seenYearTerm = new Set();

  for (const [index, record] of candidate.terms.entries()) {
    const prefix = `terms[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }

    expectInteger(record.gregorianYear, `${prefix}.gregorianYear`, errors);
    expectString(record.name, `${prefix}.name`, errors);
    expectString(record.nameKo, `${prefix}.nameKo`, errors);
    expectString(record.hanja, `${prefix}.hanja`, errors);
    expectInteger(record.longitude, `${prefix}.longitude`, errors);
    expectString(record.at, `${prefix}.at`, errors);

    const definition = termByName.get(record.name);
    if (!definition) {
      errors.push(`${prefix}.name is not one of the engine-required solar terms`);
    } else {
      if (record.nameKo !== definition.nameKo) {
        errors.push(`${prefix}.nameKo must be ${definition.nameKo}`);
      }
      if (record.hanja !== definition.hanja) {
        errors.push(`${prefix}.hanja must be ${definition.hanja}`);
      }
      if (record.longitude !== definition.longitude) {
        errors.push(`${prefix}.longitude must be ${definition.longitude}`);
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(record.at ?? "")) {
      errors.push(`${prefix}.at must be a UTC ISO 8601 datetime with seconds and trailing Z`);
    } else if (Number.isNaN(Date.parse(record.at))) {
      errors.push(`${prefix}.at is not parseable as a datetime`);
    } else if (Number.isInteger(record.gregorianYear) && new Date(record.at).getUTCFullYear() !== record.gregorianYear) {
      errors.push(`${prefix}.at must fall inside gregorianYear ${record.gregorianYear}`);
    }

    if (Number.isInteger(record.gregorianYear) && typeof record.name === "string") {
      if (
        Number.isInteger(support?.from) &&
        Number.isInteger(support?.to) &&
        (record.gregorianYear < support.from - 1 || record.gregorianYear > support.to)
      ) {
        errors.push(`${prefix}.gregorianYear is outside the supported range plus one carryover year`);
      }

      if (
        Number.isInteger(support?.from) &&
        record.gregorianYear === support.from - 1 &&
        record.name !== "daeseol"
      ) {
        errors.push(`${prefix} may only contain daeseol in the carryover year ${support.from - 1}`);
      }

      const key = `${record.gregorianYear}:${record.name}`;
      if (seenYearTerm.has(key)) {
        errors.push(`${prefix} duplicates ${key}`);
      }
      seenYearTerm.add(key);

      const records = recordsByYear.get(record.gregorianYear) ?? [];
      records.push(record);
      recordsByYear.set(record.gregorianYear, records);
    }
  }

  if (Number.isInteger(support?.from) && Number.isInteger(support?.to)) {
    for (let year = support.from; year <= support.to; year += 1) {
      const records = recordsByYear.get(year) ?? [];
      const names = new Set(records.map((record) => record.name));
      for (const definition of termDefinitions) {
        if (!names.has(definition.name)) {
          errors.push(`certified year ${year} is missing ${definition.name}`);
        }
      }

      if (records.length !== termDefinitions.length) {
        errors.push(`certified year ${year} must contain exactly ${termDefinitions.length} major solar terms`);
      }
    }
  }

  const carryoverYear = support?.from - 1;
  if (Number.isInteger(carryoverYear)) {
    const year = carryoverYear;
    const records = recordsByYear.get(year) ?? [];
    const names = new Set(records.map((record) => record.name));
    if (!names.has("daeseol")) {
      errors.push(`carryover year ${year} must include daeseol`);
    }
    if (records.length !== 1) {
      errors.push(`carryover year ${year} must contain only daeseol`);
    }
  }

  for (const [year, records] of recordsByYear.entries()) {
    const sorted = [...records].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const expectedOrder = sorted.map((record) => termByName.get(record.name)?.order ?? 99);
    for (let index = 1; index < expectedOrder.length; index += 1) {
      if (expectedOrder[index] < expectedOrder[index - 1]) {
        errors.push(`records for ${year} are not in solar-term boundary order`);
        break;
      }
    }
  }

  return errors;
}

function expectString(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function expectInteger(value, label, errors) {
  if (!Number.isInteger(value)) {
    errors.push(`${label} must be an integer`);
  }
}

function toUtcSecondIso(date) {
  return new Date(Math.round(date.getTime() / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

function renderSolarTermsModule(dataset) {
  const source = JSON.stringify(dataset, null, 2);

  return `import type { SolarTermDataset } from "./types";

// Generated from data/solar-terms/${datasetFileName}.
// Run \`corepack pnpm build:solar-terms\` after changing the canonical dataset.
export const SOLAR_TERM_DATASET = ${source} as const satisfies SolarTermDataset;

export const SOLAR_TERM_DATA_VERSION = SOLAR_TERM_DATASET.dataVersion;
export const SOLAR_TERM_SOURCE = SOLAR_TERM_DATASET.source.notes ?? SOLAR_TERM_DATASET.source.name;
`;
}

function reportValidationErrors(errors) {
  console.error("Solar-term dataset validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
}
