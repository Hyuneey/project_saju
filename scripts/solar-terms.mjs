import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const datasetPath = path.join(repoRoot, "data", "solar-terms", "solar-terms.v0.2.0.json");
const generatedModulePath = path.join(repoRoot, "packages", "manse-engine", "src", "solarTermsData.ts");

const termDefinitions = [
  { name: "sohan", nameKo: "소한", hanja: "小寒", longitude: 285, order: 0 },
  { name: "lichun", nameKo: "입춘", hanja: "立春", longitude: 315, order: 1 },
  { name: "gyeongchip", nameKo: "경칩", hanja: "驚蟄", longitude: 345, order: 2 },
  { name: "cheongmyeong", nameKo: "청명", hanja: "淸明", longitude: 15, order: 3 },
  { name: "ipha", nameKo: "입하", hanja: "立夏", longitude: 45, order: 4 },
  { name: "mangjong", nameKo: "망종", hanja: "芒種", longitude: 75, order: 5 },
  { name: "soseo", nameKo: "소서", hanja: "小暑", longitude: 105, order: 6 },
  { name: "ipchu", nameKo: "입추", hanja: "立秋", longitude: 135, order: 7 },
  { name: "baengno", nameKo: "백로", hanja: "白露", longitude: 165, order: 8 },
  { name: "hanro", nameKo: "한로", hanja: "寒露", longitude: 195, order: 9 },
  { name: "ipdong", nameKo: "입동", hanja: "立冬", longitude: 225, order: 10 },
  { name: "daeseol", nameKo: "대설", hanja: "大雪", longitude: 255, order: 11 }
];

const termByName = new Map(termDefinitions.map((term) => [term.name, term]));
const command = process.argv[2] ?? "validate";

if (!["generate", "validate"].includes(command)) {
  console.error(`Unknown solar-term command: ${command}`);
  process.exit(1);
}

const dataset = await readDataset();
const errors = validateDataset(dataset);

if (errors.length > 0) {
  console.error("Solar-term dataset validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
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

async function readDataset() {
  return JSON.parse(await readFile(datasetPath, "utf8"));
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

  if (candidate.timezone !== "UTC") {
    errors.push("timezone must be UTC in v0.2.0 datasets");
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
    if (candidate.source.notes !== undefined) {
      expectString(candidate.source.notes, "source.notes", errors);
    }
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
    validateYearList(support.completeYears, "supportedGregorianYears.completeYears", errors);
    validateYearList(support.carryoverYears, "supportedGregorianYears.carryoverYears", errors);
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
    }

    if (Number.isInteger(record.gregorianYear) && typeof record.name === "string") {
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

  for (const year of support?.completeYears ?? []) {
    const records = recordsByYear.get(year) ?? [];
    const names = new Set(records.map((record) => record.name));
    for (const definition of termDefinitions) {
      if (!names.has(definition.name)) {
        errors.push(`complete year ${year} is missing ${definition.name}`);
      }
    }
  }

  for (const year of support?.carryoverYears ?? []) {
    const records = recordsByYear.get(year) ?? [];
    const names = new Set(records.map((record) => record.name));
    if (!names.has("daeseol")) {
      errors.push(`carryover year ${year} must include daeseol`);
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

function validateYearList(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }

  const seen = new Set();
  for (const year of value) {
    if (!Number.isInteger(year)) {
      errors.push(`${label} must contain only integers`);
      continue;
    }
    if (seen.has(year)) {
      errors.push(`${label} contains duplicate year ${year}`);
    }
    seen.add(year);
  }
}

function renderSolarTermsModule(dataset) {
  const source = JSON.stringify(dataset, null, 2);

  return `import type { SolarTermDataset } from "./types";

// Generated from data/solar-terms/solar-terms.v0.2.0.json.
// Run \`corepack pnpm build:solar-terms\` after changing the canonical dataset.
export const SOLAR_TERM_DATASET = ${source} as const satisfies SolarTermDataset;

export const SOLAR_TERM_DATA_VERSION = SOLAR_TERM_DATASET.dataVersion;
export const SOLAR_TERM_SOURCE = SOLAR_TERM_DATASET.source.notes ?? SOLAR_TERM_DATASET.source.name;
`;
}
