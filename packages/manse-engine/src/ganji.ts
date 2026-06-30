import { BRANCHES, STEMS } from "./constants";
import type { GanjiResult } from "./types";

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function ganjiIndexToResult(ganjiIndex: number): GanjiResult {
  const normalizedIndex = mod(ganjiIndex, 60);
  const stemIndex = normalizedIndex % 10;
  const branchIndex = normalizedIndex % 12;
  return stemBranchToGanji(stemIndex, branchIndex, normalizedIndex);
}

export function stemBranchToGanji(stemIndex: number, branchIndex: number, ganjiIndex?: number): GanjiResult {
  if (!STEMS[stemIndex] || !BRANCHES[branchIndex]) {
    throw new RangeError(`Invalid stem/branch index: ${stemIndex}/${branchIndex}`);
  }

  const resolvedGanjiIndex = ganjiIndex ?? findGanjiIndex(stemIndex, branchIndex);
  return {
    stem: STEMS[stemIndex].hangul,
    branch: BRANCHES[branchIndex].hangul,
    ganji: `${STEMS[stemIndex].hangul}${BRANCHES[branchIndex].hangul}`,
    stemIndex,
    branchIndex,
    ...(resolvedGanjiIndex === undefined ? {} : { ganjiIndex: resolvedGanjiIndex })
  };
}

export function findGanjiIndex(stemIndex: number, branchIndex: number): number | undefined {
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) {
      return index;
    }
  }
  return undefined;
}

export function getHourBranchIndex(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Invalid hour: ${hour}`);
  }
  return Math.floor((hour + 1) / 2) % 12;
}

export function calculateHourPillar(dayStemIndex: number, hour: number): GanjiResult {
  const hourBranchIndex = getHourBranchIndex(hour);
  const hourStemIndex = mod((dayStemIndex % 5) * 2 + hourBranchIndex, 10);
  return stemBranchToGanji(hourStemIndex, hourBranchIndex);
}
