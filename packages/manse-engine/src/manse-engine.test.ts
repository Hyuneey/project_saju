import { describe, expect, it } from "vitest";
import {
  TableSolarTermProvider,
  calculateHourPillar,
  calculateSaju,
  ganjiIndexToResult,
  getHourBranchIndex,
  julianDayNumber,
  mod
} from ".";
import type { SolarTerm } from "./types";

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
    const before = await calculateSaju(baseInput({ birthDate: "2015-02-04", birthTime: "12:57" }));
    const atBoundary = await calculateSaju(baseInput({ birthDate: "2015-02-04", birthTime: "12:58" }));

    expect(before.pillars.year.ganji).toBe("갑오");
    expect(before.basis.year.appliedYear).toBe(2014);
    expect(atBoundary.pillars.year.ganji).toBe("을미");
    expect(atBoundary.basis.year.appliedYear).toBe(2015);
  });
});

describe("month pillar", () => {
  it("changes at the cheongmyeong solar-term boundary", async () => {
    const before = await calculateSaju(baseInput({ birthDate: "2015-04-05", birthTime: "11:38" }));
    const atBoundary = await calculateSaju(baseInput({ birthDate: "2015-04-05", birthTime: "11:39" }));

    expect(before.pillars.month.ganji).toBe("기묘");
    expect(before.basis.month.monthOrder).toBe(1);
    expect(atBoundary.pillars.month.ganji).toBe("경진");
    expect(atBoundary.basis.month.monthOrder).toBe(2);
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
  });
});

describe("validation and missing data", () => {
  it("requires lunarLeapMonth for lunar input", async () => {
    await expect(calculateSaju({
      ...baseInput({ birthDate: "2015-09-22" }),
      calendarType: "lunar"
    })).rejects.toMatchObject({ code: "LUNAR_LEAP_MONTH_REQUIRED" });
  });

  it("fails loudly when solar-term data is missing", async () => {
    await expect(calculateSaju(baseInput({ birthDate: "2035-01-01" }))).rejects.toMatchObject({
      code: "SOLAR_TERM_DATA_MISSING"
    });
  });

  it("rejects invalid or offset timezones", async () => {
    await expect(calculateSaju(baseInput({ timezone: "+09:00" }))).rejects.toMatchObject({
      code: "INVALID_TIMEZONE"
    });
  });

  it("returns policyVersion and dataVersion", async () => {
    const result = await calculateSaju(baseInput({ birthDate: "2015-09-22" }));

    expect(result.metadata.policyVersion).toBe("manse-policy-v0.1");
    expect(result.metadata.dataVersion).toContain("solarTerms:solar-terms-seed-0.1.0");
  });
});

function baseInput(overrides: Partial<Parameters<typeof calculateSaju>[0]> = {}): Parameters<typeof calculateSaju>[0] {
  return {
    calendarType: "solar",
    birthDate: "2015-09-22",
    birthTime: "09:30",
    birthTimeUnknown: false,
    timezone: "Asia/Seoul",
    gender: "unknown",
    options: {
      yearBoundary: "lichun",
      monthBoundary: "solar_terms",
      dayBoundaryPolicy: "midnight",
      solarTimePolicy: "civil_time"
    },
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
