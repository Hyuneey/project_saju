import { BRANCHES, STEMS } from "./constants";
import type {
  BranchDerivedMetadata,
  DerivedBranch,
  DerivedCounts,
  DerivedPillar,
  DerivedStem,
  ElementCounts,
  FiveElement,
  GanjiResult,
  HiddenStemDerived,
  HiddenStemRole,
  OriginalChartDerivedData,
  PillarKey,
  StemDerivedMetadata,
  TenGod,
  TenGodCounts,
  YinYang,
  YinYangCounts
} from "./types";

export const ORIGINAL_CHART_DERIVED_DATA_VERSION = "original-chart-derived-v0.4.0";

const ELEMENTS: readonly FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const YIN_YANG: readonly YinYang[] = ["yang", "yin"];
const TEN_GODS: readonly TenGod[] = [
  "biJian",
  "jieCai",
  "shiShen",
  "shangGuan",
  "pianCai",
  "zhengCai",
  "pianGuan",
  "zhengGuan",
  "pianYin",
  "zhengYin"
];

const STEM_ELEMENTS: readonly FiveElement[] = [
  "wood",
  "wood",
  "fire",
  "fire",
  "earth",
  "earth",
  "metal",
  "metal",
  "water",
  "water"
];

const BRANCH_ELEMENTS: readonly FiveElement[] = [
  "water",
  "earth",
  "wood",
  "wood",
  "earth",
  "fire",
  "fire",
  "earth",
  "metal",
  "metal",
  "earth",
  "water"
];

const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood"
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire"
};

const HIDDEN_STEMS_BY_BRANCH: readonly (readonly HiddenStemDefinition[])[] = [
  [
    { stemIndex: 8, role: "residual" },
    { stemIndex: 9, role: "main" }
  ],
  [
    { stemIndex: 9, role: "residual" },
    { stemIndex: 7, role: "middle" },
    { stemIndex: 5, role: "main" }
  ],
  [
    { stemIndex: 4, role: "residual" },
    { stemIndex: 2, role: "middle" },
    { stemIndex: 0, role: "main" }
  ],
  [
    { stemIndex: 0, role: "residual" },
    { stemIndex: 1, role: "main" }
  ],
  [
    { stemIndex: 1, role: "residual" },
    { stemIndex: 9, role: "middle" },
    { stemIndex: 4, role: "main" }
  ],
  [
    { stemIndex: 4, role: "residual" },
    { stemIndex: 6, role: "middle" },
    { stemIndex: 2, role: "main" }
  ],
  [
    { stemIndex: 2, role: "residual" },
    { stemIndex: 5, role: "middle" },
    { stemIndex: 3, role: "main" }
  ],
  [
    { stemIndex: 3, role: "residual" },
    { stemIndex: 1, role: "middle" },
    { stemIndex: 5, role: "main" }
  ],
  [
    { stemIndex: 4, role: "residual" },
    { stemIndex: 8, role: "middle" },
    { stemIndex: 6, role: "main" }
  ],
  [
    { stemIndex: 6, role: "residual" },
    { stemIndex: 7, role: "main" }
  ],
  [
    { stemIndex: 7, role: "residual" },
    { stemIndex: 3, role: "middle" },
    { stemIndex: 4, role: "main" }
  ],
  [
    { stemIndex: 4, role: "residual" },
    { stemIndex: 0, role: "middle" },
    { stemIndex: 8, role: "main" }
  ]
];

interface PillarsForDerivation {
  year: GanjiResult;
  month: GanjiResult;
  day: GanjiResult;
  hour: GanjiResult | null;
}

interface HiddenStemDefinition {
  stemIndex: number;
  role: HiddenStemRole;
}

export function deriveOriginalChart(pillars: PillarsForDerivation): OriginalChartDerivedData {
  const dayMaster = stemMetadata(pillars.day.stemIndex);
  const derivedPillars: Record<PillarKey, DerivedPillar | null> = {
    year: derivePillar("year", pillars.year, dayMaster),
    month: derivePillar("month", pillars.month, dayMaster),
    day: derivePillar("day", pillars.day, dayMaster),
    hour: pillars.hour ? derivePillar("hour", pillars.hour, dayMaster) : null
  };

  return {
    dataVersion: ORIGINAL_CHART_DERIVED_DATA_VERSION,
    dayMaster,
    pillars: derivedPillars,
    counts: countDerivedData(derivedPillars)
  };
}

export function stemMetadata(stemIndex: number): StemDerivedMetadata {
  const stem = STEMS[stemIndex];
  if (!stem || !STEM_ELEMENTS[stemIndex]) {
    throw new RangeError(`Invalid stem index: ${stemIndex}`);
  }

  return {
    index: stemIndex,
    label: stem.hangul,
    hanja: stem.hanja,
    romanization: stem.romanization,
    element: STEM_ELEMENTS[stemIndex],
    yinYang: stemIndex % 2 === 0 ? "yang" : "yin"
  };
}

export function branchMetadata(branchIndex: number): BranchDerivedMetadata {
  const branch = BRANCHES[branchIndex];
  if (!branch || !BRANCH_ELEMENTS[branchIndex]) {
    throw new RangeError(`Invalid branch index: ${branchIndex}`);
  }

  return {
    index: branchIndex,
    label: branch.hangul,
    hanja: branch.hanja,
    romanization: branch.romanization,
    element: BRANCH_ELEMENTS[branchIndex],
    yinYang: branchIndex % 2 === 0 ? "yang" : "yin"
  };
}

export function tenGodFor(dayMaster: StemDerivedMetadata, target: StemDerivedMetadata | BranchDerivedMetadata): TenGod {
  const samePolarity = dayMaster.yinYang === target.yinYang;

  if (target.element === dayMaster.element) {
    return samePolarity ? "biJian" : "jieCai";
  }

  if (GENERATES[dayMaster.element] === target.element) {
    return samePolarity ? "shiShen" : "shangGuan";
  }

  if (CONTROLS[dayMaster.element] === target.element) {
    return samePolarity ? "pianCai" : "zhengCai";
  }

  if (GENERATES[target.element] === dayMaster.element) {
    return samePolarity ? "pianYin" : "zhengYin";
  }

  if (CONTROLS[target.element] === dayMaster.element) {
    return samePolarity ? "pianGuan" : "zhengGuan";
  }

  throw new RangeError(`No ten-god relation for ${dayMaster.element} and ${target.element}`);
}

function derivePillar(pillar: PillarKey, ganji: GanjiResult, dayMaster: StemDerivedMetadata): DerivedPillar {
  const stem = stemMetadata(ganji.stemIndex);
  const branch = branchMetadata(ganji.branchIndex);
  const isDayMaster = pillar === "day";
  const derivedStem: DerivedStem = {
    ...stem,
    tenGod: isDayMaster ? null : tenGodFor(dayMaster, stem),
    isDayMaster
  };
  const derivedBranch: DerivedBranch = {
    ...branch,
    tenGod: tenGodFor(dayMaster, branch)
  };

  return {
    pillar,
    stem: derivedStem,
    branch: derivedBranch,
    hiddenStems: hiddenStemsForBranch(ganji.branchIndex, dayMaster)
  };
}

function hiddenStemsForBranch(branchIndex: number, dayMaster: StemDerivedMetadata): HiddenStemDerived[] {
  return HIDDEN_STEMS_BY_BRANCH[branchIndex].map((definition) => {
    const metadata = stemMetadata(definition.stemIndex);
    return {
      ...metadata,
      role: definition.role,
      tenGod: tenGodFor(dayMaster, metadata)
    };
  });
}

function countDerivedData(pillars: Record<PillarKey, DerivedPillar | null>): DerivedCounts {
  const elementCounts = {
    visible: emptyElementCounts(),
    hiddenStems: emptyElementCounts(),
    totalWithHiddenStems: emptyElementCounts()
  };
  const yinYangCounts = {
    visible: emptyYinYangCounts(),
    hiddenStems: emptyYinYangCounts(),
    totalWithHiddenStems: emptyYinYangCounts()
  };
  const tenGodCounts = {
    visibleStems: emptyTenGodCounts(),
    branchMain: emptyTenGodCounts(),
    hiddenStems: emptyTenGodCounts(),
    totalWithHiddenStems: emptyTenGodCounts()
  };

  for (const pillar of Object.values(pillars)) {
    if (!pillar) {
      continue;
    }

    if (pillar.stem) {
      incrementElement(elementCounts.visible, pillar.stem.element);
      incrementYinYang(yinYangCounts.visible, pillar.stem.yinYang);

      if (pillar.stem.tenGod) {
        incrementTenGod(tenGodCounts.visibleStems, pillar.stem.tenGod);
        incrementTenGod(tenGodCounts.totalWithHiddenStems, pillar.stem.tenGod);
      }
    }

    incrementElement(elementCounts.visible, pillar.branch.element);
    incrementYinYang(yinYangCounts.visible, pillar.branch.yinYang);
    incrementTenGod(tenGodCounts.branchMain, pillar.branch.tenGod);
    incrementTenGod(tenGodCounts.totalWithHiddenStems, pillar.branch.tenGod);

    for (const hiddenStem of pillar.hiddenStems) {
      incrementElement(elementCounts.hiddenStems, hiddenStem.element);
      incrementYinYang(yinYangCounts.hiddenStems, hiddenStem.yinYang);
      incrementTenGod(tenGodCounts.hiddenStems, hiddenStem.tenGod);
      incrementTenGod(tenGodCounts.totalWithHiddenStems, hiddenStem.tenGod);
    }
  }

  addElementCounts(elementCounts.totalWithHiddenStems, elementCounts.visible);
  addElementCounts(elementCounts.totalWithHiddenStems, elementCounts.hiddenStems);
  addYinYangCounts(yinYangCounts.totalWithHiddenStems, yinYangCounts.visible);
  addYinYangCounts(yinYangCounts.totalWithHiddenStems, yinYangCounts.hiddenStems);

  return {
    elements: elementCounts,
    yinYang: yinYangCounts,
    tenGods: tenGodCounts
  };
}

function emptyElementCounts(): ElementCounts {
  return Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as ElementCounts;
}

function emptyYinYangCounts(): YinYangCounts {
  return Object.fromEntries(YIN_YANG.map((yinYang) => [yinYang, 0])) as YinYangCounts;
}

function emptyTenGodCounts(): TenGodCounts {
  return Object.fromEntries(TEN_GODS.map((tenGod) => [tenGod, 0])) as TenGodCounts;
}

function incrementElement(counts: ElementCounts, element: FiveElement): void {
  counts[element] += 1;
}

function incrementYinYang(counts: YinYangCounts, yinYang: YinYang): void {
  counts[yinYang] += 1;
}

function incrementTenGod(counts: TenGodCounts, tenGod: TenGod): void {
  counts[tenGod] += 1;
}

function addElementCounts(target: ElementCounts, source: ElementCounts): void {
  for (const element of ELEMENTS) {
    target[element] += source[element];
  }
}

function addYinYangCounts(target: YinYangCounts, source: YinYangCounts): void {
  for (const yinYang of YIN_YANG) {
    target[yinYang] += source[yinYang];
  }
}
