import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const datasetPath = path.join(repoRoot, "data", "solar-terms", "solar-terms.v0.2.2.json");
const previousDatasetPath = path.join(repoRoot, "data", "solar-terms", "solar-terms.v0.2.1.json");
const sourceComparisonPath = path.join(repoRoot, "data", "solar-terms", "source-comparison.v0.2.3.json");

const dataset = await readJson(datasetPath);
const previousDataset = await readJson(previousDatasetPath);
const comparison = await readJson(sourceComparisonPath);

const failures = [];
const results = [];
const candidateByKey = new Map(dataset.terms.map((record) => [recordKey(record), record]));

if (comparison.dataVersionUnderReview !== dataset.dataVersion) {
  failures.push(
    `source comparison reviews ${comparison.dataVersionUnderReview}, but canonical dataset is ${dataset.dataVersion}`
  );
}

checkPreviousDatasetOverlap();
checkFixtureSources();
checkProductionDecision();

if (failures.length > 0) {
  console.error("Solar-term source comparison failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Solar-term source comparison passed:");
for (const result of results) {
  console.log(
    `- ${result.sourceId}: ${result.comparedRecords} records, maxDiffSeconds=${result.maxDiffSeconds}, toleranceSeconds=${result.toleranceSeconds}`
  );
}
console.log(`Certification decision: ${comparison.decision}`);
if (comparison.decision !== "promote-production-certified") {
  console.log("Production certification blockers:");
  for (const blocker of comparison.productionCertificationBlockers ?? []) {
    console.log(`- ${blocker}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function checkPreviousDatasetOverlap() {
  const source = requireSource("v0.2.1-wikipedia-jpl-skyfield-overlap");
  const diffs = [];

  for (const previousRecord of previousDataset.terms) {
    if (
      previousRecord.gregorianYear < dataset.supportedGregorianYears.from ||
      previousRecord.gregorianYear > dataset.supportedGregorianYears.to
    ) {
      continue;
    }

    const key = recordKey(previousRecord);
    const candidate = candidateByKey.get(key);
    if (!candidate) {
      failures.push(`${source.id} missing candidate record ${key}`);
      continue;
    }

    diffs.push(compareRecords(source.id, key, candidate.at, previousRecord.at, source.toleranceSeconds));
  }

  pushResult(source.id, source.toleranceSeconds, diffs);
}

function checkFixtureSources() {
  for (const source of comparison.sources) {
    if (source.id === "v0.2.1-wikipedia-jpl-skyfield-overlap") {
      continue;
    }

    const diffs = [];
    for (const fixture of source.records ?? []) {
      const key = recordKey(fixture);
      const candidate = candidateByKey.get(key);
      if (!candidate) {
        failures.push(`${source.id} missing candidate record ${key}`);
        continue;
      }

      const sourceAt = sourceInstantToUtcIso(fixture);
      diffs.push(compareRecords(source.id, key, candidate.at, sourceAt, source.toleranceSeconds));
    }

    pushResult(source.id, source.toleranceSeconds, diffs);
  }
}

function checkProductionDecision() {
  if (comparison.decision === "promote-production-certified") {
    const expectedRows = 1 + (dataset.supportedGregorianYears.to - dataset.supportedGregorianYears.from + 1) * 12;
    const fullCoverageSource = comparison.sources.some(
      (source) => (source.records?.length ?? 0) >= expectedRows && source.precision === "second"
    );

    if (!fullCoverageSource) {
      failures.push("production-certified promotion requires a second-source exact datetime table for all dataset rows");
    }
  }

  if (
    comparison.decision !== "promote-production-certified" &&
    (!Array.isArray(comparison.productionCertificationBlockers) || comparison.productionCertificationBlockers.length === 0)
  ) {
    failures.push("non-production certification decision must document productionCertificationBlockers");
  }
}

function requireSource(sourceId) {
  const source = comparison.sources.find((candidate) => candidate.id === sourceId);
  if (!source) {
    failures.push(`missing source comparison config ${sourceId}`);
    return { id: sourceId, toleranceSeconds: 0 };
  }
  return source;
}

function compareRecords(sourceId, key, candidateAt, sourceAt, toleranceSeconds) {
  const diffSeconds = Math.abs(Date.parse(candidateAt) - Date.parse(sourceAt)) / 1000;
  if (diffSeconds > toleranceSeconds) {
    failures.push(
      `${sourceId} mismatch for ${key}: canonical ${candidateAt}, source ${sourceAt}, diffSeconds ${diffSeconds}, toleranceSeconds ${toleranceSeconds}`
    );
  }
  return diffSeconds;
}

function pushResult(sourceId, toleranceSeconds, diffs) {
  results.push({
    sourceId,
    toleranceSeconds,
    comparedRecords: diffs.length,
    maxDiffSeconds: diffs.length === 0 ? 0 : Math.round(Math.max(...diffs))
  });
}

function sourceInstantToUtcIso(record) {
  if (record.at) {
    return record.at;
  }

  if (!record.localAt) {
    failures.push(`${recordKey(record)} must include at or localAt`);
    return "Invalid Date";
  }

  return new Date(record.localAt).toISOString().replace(".000Z", "Z");
}

function recordKey(record) {
  return `${record.gregorianYear}:${record.name}`;
}
