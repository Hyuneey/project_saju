import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TableCalendarDataProvider,
  TableSolarTermProvider,
  ORIGINAL_CHART_DERIVED_DATA_VERSION,
  ORIGINAL_CHART_DERIVED_POLICY_VERSION,
  calculateHourPillar,
  calculateSaju,
  ganjiIndexToResult,
  getHourBranchIndex,
  julianDayNumber,
  mod,
  stemMetadata,
  tenGodFor
} from ".";
import { SOLAR_TERM_DATASET } from "./solarTermsData";
import type { SolarTerm, SolarTermDataset } from "./types";

const originalChartDerivedFixture = JSON.parse(
  readFileSync(new URL("../../../data/fixtures/original-chart-derived-v0.4.1.json", import.meta.url), "utf8")
) as {
  policyVersion: string;
  dataVersion: string;
  input: Parameters<typeof calculateSaju>[0];
  expect: {
    dayMaster: Record<string, unknown>;
    pillarTenGods: Record<string, string | null>;
    dayHiddenStems: Array<{ stemIndex: number; role: string; tenGod: string }>;
    counts: Record<string, unknown>;
  };
};

describe("ganji cycle", () => {
  it("maps the 60-cycle with positive modulo", () => {
    expect(ganjiIndexToResult(0).ganji).toBe("갑자");
    expect(ganjiIndexToResult(59).ganji).toBe("계해");
    expect(mod(-1, 60)).toBe(59);
  });
});

describe("year pillar", () => {
  it("returns 갑자 for 1984 after lichun", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "1984-06-01" }), {
      solarTerms: new TableSolarTermProvider(policyFixtureTerms, "policy-fixture")
    });

    expect(result.pillars.year.ganji).toBe("갑자");
    expect(result.basis.year.appliedYear).toBe(1984);
  });

  it("changes at the lichun boundary", async () => {
    const before = await calculateSaju(baseInput({ birthDate: "2015-02-04", birthTime: "12:58" }));
    const afterBoundary = await calculateSaju(baseInput({ birthDate: "2015-02-04", birthTime: "12:59" }));

    expect(before.pillars.year.ganji).toBe("갑오");
    expect(before.basis.year.appliedYear).toBe(2014);
    expect(afterBoundary.pillars.year.ganji).toBe("을미");
    expect(afterBoundary.basis.year.appliedYear).toBe(2015);
  });

  it("calculates exact lichun boundary inside the expanded certified range", async () => {
    const before = await calculateSaju(baseInput({ birthDate: "2024-02-04", birthTime: "17:26" }));
    const atBoundary = await calculateSaju(baseInput({ birthDate: "2024-02-04", birthTime: "17:27" }));

    expect(before.basis.year.appliedYear).toBe(2023);
    expect(atBoundary.basis.year.appliedYear).toBe(2024);
    expect(atBoundary.basis.year.lichun).toMatchObject({
      key: "lichun",
      at: "2024-02-04T08:26:50Z"
    });
  });
});

describe("month pillar", () => {
  it("does not advance month on the solar-term date before the exact boundary time", async () => {
    const before = await calculateSaju(baseInput({ birthDate: "2015-03-06", birthTime: "06:55" }));
    const afterBoundary = await calculateSaju(baseInput({ birthDate: "2015-03-06", birthTime: "06:56" }));

    expect(before.basis.month.activeBoundary).toMatchObject({ key: "lichun", monthOrder: 0 });
    expect(before.basis.month.activeTerm).toMatchObject({
      key: "lichun",
      at: "2015-02-04T03:58:30Z",
      dateTime: "2015-02-04T03:58:30"
    });
    expect(before.pillars.month.ganji).toBe("무인");

    expect(afterBoundary.basis.month.activeBoundary).toMatchObject({ key: "gyeongchip", monthOrder: 1 });
    expect(afterBoundary.basis.month.activeTerm).toMatchObject({
      key: "gyeongchip",
      at: "2015-03-05T21:55:46Z",
      dateTime: "2015-03-05T21:55:46"
    });
    expect(afterBoundary.pillars.month.ganji).toBe("기묘");
  });

  it("changes at the cheongmyeong solar-term boundary", async () => {
    const before = await calculateSaju(baseInput({ birthDate: "2015-04-05", birthTime: "11:39" }));
    const afterBoundary = await calculateSaju(baseInput({ birthDate: "2015-04-05", birthTime: "11:40" }));

    expect(before.pillars.month.ganji).toBe("기묘");
    expect(before.basis.month.monthOrder).toBe(1);
    expect(afterBoundary.pillars.month.ganji).toBe("경진");
    expect(afterBoundary.basis.month.monthOrder).toBe(2);
  });
});

describe("day pillar", () => {
  it("uses the KASI sample JDN formula", () => {
    const julianDay = julianDayNumber({ year: 2015, month: 9, day: 22 });
    const ganji = ganjiIndexToResult(mod(julianDay + 49, 60));

    expect(julianDay).toBe(2457288);
    expect(ganji.ganji).toBe("신축");
  });
});

describe("original chart derived data", () => {
  it("maps all ten gods relative to a day master without interpretation", () => {
    const dayMaster = stemMetadata(0);

    expect(tenGodFor(dayMaster, stemMetadata(0))).toBe("biJian");
    expect(tenGodFor(dayMaster, stemMetadata(1))).toBe("jieCai");
    expect(tenGodFor(dayMaster, stemMetadata(2))).toBe("shiShen");
    expect(tenGodFor(dayMaster, stemMetadata(3))).toBe("shangGuan");
    expect(tenGodFor(dayMaster, stemMetadata(4))).toBe("pianCai");
    expect(tenGodFor(dayMaster, stemMetadata(5))).toBe("zhengCai");
    expect(tenGodFor(dayMaster, stemMetadata(6))).toBe("pianGuan");
    expect(tenGodFor(dayMaster, stemMetadata(7))).toBe("zhengGuan");
    expect(tenGodFor(dayMaster, stemMetadata(8))).toBe("pianYin");
    expect(tenGodFor(dayMaster, stemMetadata(9))).toBe("zhengYin");
  });

  it("derives day master, stem/branch metadata, hidden stems, and counts from calculated pillars", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2015-09-22", birthTime: "09:30" }));

    expect(result.derived.policyVersion).toBe(ORIGINAL_CHART_DERIVED_POLICY_VERSION);
    expect(result.derived.dataVersion).toBe(ORIGINAL_CHART_DERIVED_DATA_VERSION);
    expect(result.derived.dayMaster).toMatchObject({
      index: 7,
      romanization: "sin",
      element: "metal",
      yinYang: "yin"
    });
    expect(result.derived.pillars.day?.stem).toMatchObject({
      index: 7,
      tenGod: null,
      isDayMaster: true
    });
    expect(result.derived.pillars.hour?.stem).toMatchObject({
      index: 9,
      element: "water",
      yinYang: "yin",
      tenGod: "shiShen",
      isDayMaster: false
    });
    expect(result.derived.pillars.hour?.branch).toMatchObject({
      index: 5,
      element: "fire",
      yinYang: "yin",
      tenGod: "pianGuan"
    });
    expect(result.derived.pillars.day?.hiddenStems).toEqual([
      expect.objectContaining({ index: 9, role: "residual", tenGod: "shiShen" }),
      expect.objectContaining({ index: 7, role: "middle", tenGod: "biJian" }),
      expect.objectContaining({ index: 5, role: "main", tenGod: "pianYin" })
    ]);

    expect(result.derived.counts.elements.visible).toEqual({
      wood: 2,
      fire: 1,
      earth: 2,
      metal: 2,
      water: 1
    });
    expect(result.derived.counts.elements.hiddenStems).toEqual({
      wood: 1,
      fire: 2,
      earth: 3,
      metal: 4,
      water: 1
    });
    expect(result.derived.counts.elements.totalWithHiddenStems).toEqual({
      wood: 3,
      fire: 3,
      earth: 5,
      metal: 6,
      water: 2
    });
    expect(result.derived.counts.yinYang.visible).toEqual({ yang: 0, yin: 8 });
    expect(result.derived.counts.yinYang.hiddenStems).toEqual({ yang: 4, yin: 7 });
    expect(result.derived.counts.yinYang.totalWithHiddenStems).toEqual({ yang: 4, yin: 15 });
    expect(result.derived.counts.tenGods.visibleStems).toMatchObject({
      shiShen: 1,
      pianCai: 2
    });
    expect(result.derived.counts.tenGods.hiddenStems).toMatchObject({
      biJian: 2,
      jieCai: 2,
      shiShen: 1,
      pianCai: 1,
      pianGuan: 1,
      zhengGuan: 1,
      pianYin: 2,
      zhengYin: 1
    });
    expect(result.derived.counts.tenGods.totalWithHiddenStems).toMatchObject({
      biJian: 3,
      jieCai: 2,
      shiShen: 2,
      shangGuan: 0,
      pianCai: 3,
      zhengCai: 0,
      pianGuan: 2,
      zhengGuan: 1,
      pianYin: 4,
      zhengYin: 1
    });
  });

  it("matches the canonical original-chart derived fixture and snapshot", async () => {
    const result = await calculateSaju(originalChartDerivedFixture.input);
    const expected = originalChartDerivedFixture.expect;

    expect(result.derived.policyVersion).toBe(originalChartDerivedFixture.policyVersion);
    expect(result.derived.dataVersion).toBe(originalChartDerivedFixture.dataVersion);
    expect(result.derived.dayMaster).toMatchObject(expected.dayMaster);
    expect({
      yearStem: result.derived.pillars.year?.stem?.tenGod,
      monthStem: result.derived.pillars.month?.stem?.tenGod,
      dayStem: result.derived.pillars.day?.stem?.tenGod,
      hourStem: result.derived.pillars.hour?.stem?.tenGod,
      yearBranch: result.derived.pillars.year?.branch.tenGod,
      monthBranch: result.derived.pillars.month?.branch.tenGod,
      dayBranch: result.derived.pillars.day?.branch.tenGod,
      hourBranch: result.derived.pillars.hour?.branch.tenGod
    }).toEqual(expected.pillarTenGods);
    expect(result.derived.pillars.day?.hiddenStems.map((hiddenStem) => ({
      stemIndex: hiddenStem.index,
      role: hiddenStem.role,
      tenGod: hiddenStem.tenGod
    }))).toEqual(expected.dayHiddenStems);
    expect(result.derived.counts).toEqual(expected.counts);
    expect(result.derived).toMatchSnapshot("original-chart-derived-v0.4.1");
  });

  it("omits hour derived data when birth time is unknown", async () => {
    const result = await calculateSaju({
      ...baseInput({ birthDate: "2015-09-22" }),
      birthTime: undefined,
      birthTimeUnknown: true
    });

    expect(result.pillars.hour).toBeNull();
    expect(result.derived.pillars.hour).toBeNull();
    expect(result.derived.counts.elements.visible).toEqual({
      wood: 2,
      fire: 0,
      earth: 2,
      metal: 2,
      water: 0
    });
    expect(result.derived.counts.yinYang.visible).toEqual({ yang: 0, yin: 6 });
  });

  it("does not emit interpretation judgment fields in derived data", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2015-09-22", birthTime: "09:30" }));

    expect(JSON.stringify(result.derived)).not.toMatch(
      /strong|weak|balanced|imbalanced|favorable|unfavorable|good|bad|yongsin|geokguk|daewoon|sewoon|shinsal/i
    );
  });
});

describe("hour pillar", () => {
  it("maps civil hours into branch windows", () => {
    expect(getHourBranchIndex(23)).toBe(0);
    expect(getHourBranchIndex(0)).toBe(0);
    expect(getHourBranchIndex(1)).toBe(1);
    expect(getHourBranchIndex(22)).toBe(11);
  });

  it("uses the hour stem formula", () => {
    expect(calculateHourPillar(0, 23).ganji).toBe("갑자");
    expect(calculateHourPillar(7, 9).ganji).toBe("계사");
  });

  it("returns null when birth time is unknown", async () => {
    const result = await calculateSaju({
      ...baseInput({ birthDate: "2015-09-22" }),
      birthTime: undefined,
      birthTimeUnknown: true
    });

    expect(result.pillars.hour).toBeNull();
    expect(result.basis.hour).toBeNull();
    expect(result.metadata.warnings).toEqual([
      expect.objectContaining({ code: "BIRTH_TIME_UNKNOWN_ASSUMED_MIDNIGHT" })
    ]);
  });

  it("preserves minute-level basis while hour branch changes at 01:00", async () => {
    const before = await calculateSaju(baseInput({ birthTime: "00:59" }));
    const atBoundary = await calculateSaju(baseInput({ birthTime: "01:00" }));

    expect(before.basis.hour?.hourBranchIndex).toBe(0);
    expect(before.basis.hour?.civilMinute).toBe(59);
    expect(atBoundary.basis.hour?.hourBranchIndex).toBe(1);
    expect(atBoundary.basis.hour?.civilMinute).toBe(0);
  });
});

describe("validation and missing data", () => {
  it("rejects unknown root, option, and birthPlace fields", async () => {
    await expect(calculateSaju({ ...baseInput(), unknownField: true } as Parameters<typeof calculateSaju>[0]))
      .rejects.toMatchObject({ code: "INVALID_INPUT" });

    await expect(calculateSaju({
      ...baseInput(),
      options: { ...baseOptions(), unknownOption: true }
    } as Parameters<typeof calculateSaju>[0])).rejects.toMatchObject({ code: "INVALID_INPUT" });

    await expect(calculateSaju({
      ...baseInput(),
      birthPlace: { city: "Seoul", unknownPlaceField: true }
    } as Parameters<typeof calculateSaju>[0])).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("keeps date and time validation codes specific", async () => {
    await expect(calculateSaju(baseInput({ birthDate: "2015-02-30" }))).rejects.toMatchObject({
      code: "INVALID_DATE"
    });

    await expect(calculateSaju(baseInput({ birthTime: "24:00" }))).rejects.toMatchObject({
      code: "INVALID_TIME"
    });

    await expect(calculateSaju({ ...baseInput(), birthTime: undefined })).rejects.toMatchObject({
      code: "INVALID_TIME"
    });
  });

  it("requires lunarLeapMonth for lunar input", async () => {
    await expect(calculateSaju({
      ...baseInput({ birthDate: "2015-09-22" }),
      calendarType: "lunar"
    })).rejects.toMatchObject({ code: "LUNAR_LEAP_MONTH_REQUIRED" });
  });

  it("converts lunar input with the default Korean lunar provider", async () => {
    const fromSolarInput = await calculateSaju({
      ...baseInput({ birthDate: "2015-09-22" }),
      calendarType: "solar"
    });
    const fromLunarInput = await calculateSaju({
      ...baseInput({ birthDate: "2015-08-10" }),
      calendarType: "lunar",
      lunarLeapMonth: false
    });

    expect(fromLunarInput.normalizedDateTime.solarDate).toBe("2015-09-22");
    expect(fromLunarInput.pillars).toEqual(fromSolarInput.pillars);
    expect(fromLunarInput.metadata.dataVersion).toContain("calendar:calendar-jdn-korean-lunar-0.3.1");
  });

  it("converts Korean leap lunar months", async () => {
    const result = await calculateSaju({
      ...baseInput({ birthDate: "2017-05-01" }),
      calendarType: "lunar",
      lunarLeapMonth: true
    });

    expect(result.normalizedDateTime.solarDate).toBe("2017-06-24");
  });

  it("rejects impossible Korean lunar leap-month dates", async () => {
    await expect(calculateSaju({
      ...baseInput({ birthDate: "2017-03-01" }),
      calendarType: "lunar",
      lunarLeapMonth: true
    })).rejects.toMatchObject({
      code: "INVALID_DATE",
      detail: {
        provider: "KoreanLunarCalendarProvider",
        requestedLunarDate: { year: 2017, month: 3, day: 1, leapMonth: true }
      }
    });
  });

  it("fails loudly when Korean lunar conversion is outside the supported range", async () => {
    await expect(calculateSaju({
      ...baseInput({ birthDate: "2050-12-01" }),
      calendarType: "lunar",
      lunarLeapMonth: false
    })).rejects.toMatchObject({
      code: "OUT_OF_SUPPORTED_RANGE",
      detail: {
        provider: "KoreanLunarCalendarProvider",
        calendarType: "lunar",
        supportedRange: {
          from: { year: 1000, month: 1, day: 1 },
          to: { year: 2050, month: 11, day: 18 }
        }
      }
    });
  });

  it("converts solar dates to Korean lunar dates through the default calendar provider", () => {
    const provider = new TableCalendarDataProvider();

    expect(provider.solarToLunar({ year: 2017, month: 6, day: 24 })).toEqual({
      year: 2017,
      month: 5,
      day: 1,
      leapMonth: true
    });
  });

  it("converts documented Korean lunar fixture examples through the default calendar provider", () => {
    const provider = new TableCalendarDataProvider();

    expect(provider.lunarToSolar({ year: 2015, month: 8, day: 10, leapMonth: false })).toEqual({
      year: 2015,
      month: 9,
      day: 22
    });
    expect(provider.solarToLunar({ year: 2026, month: 7, day: 1 })).toEqual({
      year: 2026,
      month: 5,
      day: 17,
      leapMonth: false
    });
    expect(provider.lunarToSolar({ year: 2026, month: 6, day: 1, leapMonth: false })).toEqual({
      year: 2026,
      month: 7,
      day: 14
    });
    expect(provider.solarToLunar({ year: 2026, month: 7, day: 31 })).toEqual({
      year: 2026,
      month: 6,
      day: 18,
      leapMonth: false
    });
    expect(provider.lunarToSolar({ year: 1956, month: 1, day: 21, leapMonth: false })).toEqual({
      year: 1956,
      month: 3,
      day: 3
    });
  });

  it("uses a fresh stateful Korean lunar converter for every conversion call", () => {
    let instanceCount = 0;
    const provider = new TableCalendarDataProvider({
      createKoreanLunarCalendar: () => {
        instanceCount += 1;
        let lastSet: "solar" | "lunar" | null = null;
        return {
          setSolarDate: () => {
            lastSet = "solar";
            return true;
          },
          setLunarDate: () => {
            lastSet = "lunar";
            return true;
          },
          getSolarCalendar: () => {
            if (lastSet !== "lunar") {
              throw new Error("expected lunar date to be set first");
            }
            return { year: 2015, month: 9, day: 22 };
          },
          getLunarCalendar: () => {
            if (lastSet !== "solar") {
              throw new Error("expected solar date to be set first");
            }
            return { year: 2015, month: 8, day: 10, intercalation: false };
          }
        };
      }
    });

    expect(provider.solarToLunar({ year: 2015, month: 9, day: 22 })).toEqual({
      year: 2015,
      month: 8,
      day: 10,
      leapMonth: false
    });
    expect(provider.lunarToSolar({ year: 2015, month: 8, day: 10, leapMonth: false })).toEqual({
      year: 2015,
      month: 9,
      day: 22
    });
    expect(instanceCount).toBe(2);
  });

  it("exposes default lunar provider source metadata", async () => {
    const result = await calculateSaju({
      ...baseInput({ birthDate: "2015-08-10" }),
      calendarType: "lunar",
      lunarLeapMonth: false
    });

    expect(result.metadata.providers.calendar).toMatchObject({
      name: "KoreanLunarCalendarProvider",
      dataVersion: "calendar-jdn-korean-lunar-0.3.1",
      source: {
        packageName: "korean-lunar-calendar",
        version: "0.4.0",
        license: "MIT"
      },
      supportedRange: {
        solarToLunar: {
          from: { year: 1000, month: 2, day: 13 },
          to: { year: 2050, month: 12, day: 31 }
        },
        lunarToSolar: {
          from: { year: 1000, month: 1, day: 1 },
          to: { year: 2050, month: 11, day: 18 }
        }
      },
      runtimeNetwork: false
    });
  });

  it("pins the Korean lunar conversion dependency to an exact version", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.["korean-lunar-calendar"]).toBe("0.4.0");
  });

  it("fails loudly when solar-term data is missing", async () => {
    await expect(calculateSaju(baseInput({ birthDate: "1948-01-01" }))).rejects.toMatchObject({
      code: "SOLAR_TERM_DATA_MISSING"
    });
  });

  it("fails loudly outside the certified solar-term range", async () => {
    await expect(calculateSaju(baseInput({ birthDate: "2051-02-04" }))).rejects.toMatchObject({
      code: "SOLAR_TERM_DATA_MISSING",
      detail: {
        dataVersion: "solar-terms-v0.2.2",
        supportedGregorianYears: { from: 1950, to: 2050 }
      }
    });
  });

  it("rejects invalid or offset timezones", async () => {
    await expect(calculateSaju(baseInput({ timezone: "+09:00" }))).rejects.toMatchObject({
      code: "INVALID_TIMEZONE"
    });
  });

  it("returns engineVersion, policyVersion, dataVersion, normalized date, and applied options", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2015-09-22" }));

    expect(result.metadata.engineVersion).toBe("0.4.1");
    expect(result.metadata.policyVersion).toBe("manse-policy-v0.1");
    expect(result.metadata.dataVersion).toContain("calendar:calendar-jdn-korean-lunar-0.3.1");
    expect(result.metadata.dataVersion).toContain("solarTerms:solar-terms-v0.2.2");
    expect(result.metadata.providers.solarTerms).toMatchObject({
      dataVersion: "solar-terms-v0.2.2",
      certificationLevel: "cross-checked",
      supportedGregorianYears: { from: 1950, to: 2050 },
      runtimeNetwork: false
    });
    expect(result.metadata.appliedOptions).toEqual(baseOptions());
    expect(result.normalizedDateTime.solarDate).toBe("2015-09-22");
  });

  it("keeps the v0.2.2 solar-term dataset cross-checked until production evidence is complete", () => {
    expect(SOLAR_TERM_DATASET.dataVersion).toBe("solar-terms-v0.2.2");
    expect(SOLAR_TERM_DATASET.certificationLevel).toBe("cross-checked");
    expect(SOLAR_TERM_DATASET.supportedGregorianYears).toEqual({ from: 1950, to: 2050 });
    expect(SOLAR_TERM_DATASET.terms).toHaveLength(1213);
  });

  it("warns clearly for accepted but unsupported forward-compatible policies", async () => {
    const result = await calculateSaju(baseInput({
      options: {
        ...baseOptions(),
        dayBoundaryPolicy: "split_zi",
        solarTimePolicy: "true_solar_time"
      }
    }));

    expect(result.normalizedDateTime.solarTimeApplied).toBe(false);
    expect(result.basis.day.requestedDayBoundaryPolicy).toBe("split_zi");
    expect(result.basis.day.appliedDayBoundaryPolicy).toBe("midnight");
    expect(result.metadata.warnings).toEqual([
      expect.objectContaining({
        code: "DAY_BOUNDARY_POLICY_NOT_IMPLEMENTED",
        detail: { requested: "split_zi", applied: "midnight" }
      }),
      expect.objectContaining({
        code: "SOLAR_TIME_POLICY_NOT_IMPLEMENTED",
        detail: { requested: "true_solar_time", applied: "civil_time" }
      })
    ]);
  });

  it("uses previous year's daeseol for dates before current year's sohan", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2026-01-01", birthTime: "12:00" }));

    expect(result.basis.month.activeBoundary).toMatchObject({ key: "daeseol", monthOrder: 10 });
    expect(result.basis.month.activeTerm).toMatchObject({
      key: "daeseol",
      at: "2025-12-06T21:04:39Z",
      dateTime: "2025-12-06T21:04:39"
    });
  });

  it("uses the 1949 daeseol carryover for early January in the first certified year", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "1950-01-01", birthTime: "12:00" }));

    expect(result.basis.month.activeBoundary).toMatchObject({ key: "daeseol", monthOrder: 10 });
    expect(result.basis.month.activeTerm).toMatchObject({
      key: "daeseol",
      at: "1949-12-07T10:33:34Z"
    });
    expect(result.basis.year.appliedYear).toBe(1949);
  });

  it("calculates inside the final certified year", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2050-12-31", birthTime: "12:00" }));

    expect(result.metadata.dataVersion).toContain("solarTerms:solar-terms-v0.2.2");
    expect(result.basis.month.activeTerm).toMatchObject({
      key: "daeseol",
      at: "2050-12-06T22:41:17Z"
    });
  });

  it("rejects certified datasets with missing, duplicated, or out-of-order solar terms", () => {
    const missing = cloneDataset();
    missing.terms = missing.terms.filter((term) => !(term.gregorianYear === 2020 && term.name === "hanro"));
    expectDatasetInvalid(missing, "missing hanro");

    const duplicated = cloneDataset();
    duplicated.terms = [...duplicated.terms, { ...duplicated.terms.find((term) => term.gregorianYear === 2020)! }];
    expectDatasetInvalid(duplicated, "duplicate solar term");

    const outOfOrder = cloneDataset();
    outOfOrder.terms = outOfOrder.terms.map((term) =>
      term.gregorianYear === 2020 && term.name === "gyeongchip"
        ? { ...term, at: "2020-04-05T00:00:00Z" }
        : term
    );
    expectDatasetInvalid(outOfOrder, "out-of-order solar-term datetimes");
  });
});

function cloneDataset(): SolarTermDataset {
  return JSON.parse(JSON.stringify(SOLAR_TERM_DATASET)) as SolarTermDataset;
}

function expectDatasetInvalid(dataset: SolarTermDataset, expectedDetail: string): void {
  try {
    new TableSolarTermProvider(dataset);
  } catch (error) {
    expect(error).toMatchObject({
      code: "SOLAR_TERM_DATA_INVALID",
      detail: {
        dataVersion: "solar-terms-v0.2.2",
        errors: expect.arrayContaining([expect.stringContaining(expectedDetail)])
      }
    });
    return;
  }

  throw new Error("Expected dataset to be invalid.");
}

function baseOptions(): NonNullable<Parameters<typeof calculateSaju>[0]["options"]> {
  return {
    yearBoundary: "lichun",
    monthBoundary: "solar_terms",
    dayBoundaryPolicy: "midnight",
    solarTimePolicy: "civil_time"
  };
}

function baseInput(overrides: Partial<Parameters<typeof calculateSaju>[0]> = {}): Parameters<typeof calculateSaju>[0] {
  return {
    calendarType: "solar",
    birthDate: "2015-09-22",
    birthTime: "09:30",
    birthTimeUnknown: false,
    timezone: "Asia/Seoul",
    gender: "unknown",
    options: baseOptions(),
    ...overrides
  };
}

const policyFixtureTerms = {
  "1984": [
    term("sohan", "소한", "小寒", 285, "1984-01-06T00:00:00"),
    term("lichun", "입춘", "立春", 315, "1984-02-04T00:00:00"),
    term("gyeongchip", "경칩", "驚蟄", 345, "1984-03-05T00:00:00"),
    term("cheongmyeong", "청명", "淸明", 15, "1984-04-04T00:00:00"),
    term("ipha", "입하", "立夏", 45, "1984-05-05T00:00:00"),
    term("mangjong", "망종", "芒種", 75, "1984-06-05T00:00:00"),
    term("soseo", "소서", "小暑", 105, "1984-07-07T00:00:00"),
    term("ipchu", "입추", "立秋", 135, "1984-08-07T00:00:00"),
    term("baengno", "백로", "白露", 165, "1984-09-07T00:00:00"),
    term("hanro", "한로", "寒露", 195, "1984-10-08T00:00:00"),
    term("ipdong", "입동", "立冬", 225, "1984-11-07T00:00:00"),
    term("daeseol", "대설", "大雪", 255, "1984-12-07T00:00:00")
  ]
};

function term(
  key: SolarTerm["key"],
  name: string,
  hanja: string,
  longitude: number,
  dateTime: string
): SolarTerm {
  return { key, name, hanja, longitude, dateTime, timezone: "UTC" };
}
