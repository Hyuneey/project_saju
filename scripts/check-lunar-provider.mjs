import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const repoRoot = process.cwd();
const enginePackagePath = path.join(repoRoot, "packages", "manse-engine", "package.json");
const lockfilePath = path.join(repoRoot, "pnpm-lock.yaml");
const fixturePath = path.join(repoRoot, "data", "fixtures", "lunar-conversion-v0.3.1.json");

const enginePackage = JSON.parse(await readFile(enginePackagePath, "utf8"));
const lockfile = await readFile(lockfilePath, "utf8");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const errors = [];

const dependencyVersion = enginePackage.dependencies?.["korean-lunar-calendar"];

if (dependencyVersion !== "0.4.0") {
  errors.push(`korean-lunar-calendar must be pinned to 0.4.0, got ${dependencyVersion ?? "missing"}`);
}

if (fixture.provider?.version !== dependencyVersion) {
  errors.push(`fixture provider version ${fixture.provider?.version ?? "missing"} does not match dependency ${dependencyVersion}`);
}

if (!lockfile.includes("korean-lunar-calendar:\n        specifier: 0.4.0\n        version: 0.4.0")) {
  errors.push("pnpm-lock.yaml importer must pin korean-lunar-calendar specifier to 0.4.0");
}

const requireFromEngine = createRequire(enginePackagePath);
const KoreanLunarCalendar = requireFromEngine("korean-lunar-calendar");

for (const example of fixture.examples ?? []) {
  const lunar = example.lunar;
  const solar = example.solar;

  const lunarToSolar = new KoreanLunarCalendar();
  if (!lunarToSolar.setLunarDate(lunar.year, lunar.month, lunar.day, lunar.leapMonth)) {
    errors.push(`${example.name}: lunar date was rejected by provider`);
  } else {
    const convertedSolar = lunarToSolar.getSolarCalendar();
    assertDate(`${example.name}: lunarToSolar`, convertedSolar, solar);
  }

  const solarToLunar = new KoreanLunarCalendar();
  if (!solarToLunar.setSolarDate(solar.year, solar.month, solar.day)) {
    errors.push(`${example.name}: solar date was rejected by provider`);
  } else {
    const convertedLunar = solarToLunar.getLunarCalendar();
    assertDate(`${example.name}: solarToLunar`, convertedLunar, {
      ...lunar,
      intercalation: lunar.leapMonth
    });
  }
}

if (errors.length > 0) {
  console.error("Lunar provider check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${fixture.examples.length} lunar conversion fixture examples with korean-lunar-calendar@${dependencyVersion}`);

function assertDate(label, actual, expected) {
  for (const key of ["year", "month", "day"]) {
    if (actual[key] !== expected[key]) {
      errors.push(`${label}: expected ${key}=${expected[key]}, got ${actual[key]}`);
    }
  }

  if ("intercalation" in expected && (actual.intercalation ?? false) !== expected.intercalation) {
    errors.push(`${label}: expected intercalation=${expected.intercalation}, got ${actual.intercalation ?? false}`);
  }
}
