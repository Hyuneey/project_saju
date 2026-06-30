import type { SolarTerm } from "./types";

export const SOLAR_TERM_DATA_VERSION = "solar-terms-seed-0.1.0";
export const SOLAR_TERM_SOURCE =
  "JPL Horizons published UTC tables on Wikipedia solar-term pages, manually transcribed for v0.1 seed fixtures.";

export const SOLAR_TERM_TABLE = {
  "2014": [
    term("daeseol", "대설", "大雪", 255, "2014-12-07T05:04:00")
  ],
  "2015": [
    term("sohan", "소한", "小寒", 285, "2015-01-05T16:20:00"),
    term("lichun", "입춘", "立春", 315, "2015-02-04T03:58:00"),
    term("gyeongchip", "경칩", "驚蟄", 345, "2015-03-05T21:55:00"),
    term("cheongmyeong", "청명", "淸明", 15, "2015-04-05T02:39:00"),
    term("ipha", "입하", "立夏", 45, "2015-05-05T19:52:00"),
    term("mangjong", "망종", "芒種", 75, "2015-06-05T23:58:00"),
    term("soseo", "소서", "小暑", 105, "2015-07-07T10:12:00"),
    term("ipchu", "입추", "立秋", 135, "2015-08-07T20:01:00"),
    term("baengno", "백로", "白露", 165, "2015-09-07T22:59:00"),
    term("hanro", "한로", "寒露", 195, "2015-10-08T14:42:00"),
    term("ipdong", "입동", "立冬", 225, "2015-11-07T17:58:00"),
    term("daeseol", "대설", "大雪", 255, "2015-12-07T10:53:00")
  ],
  "2025": [
    term("daeseol", "대설", "大雪", 255, "2025-12-06T21:04:00")
  ],
  "2026": [
    term("sohan", "소한", "小寒", 285, "2026-01-05T08:23:00"),
    term("lichun", "입춘", "立春", 315, "2026-02-03T20:02:00"),
    term("gyeongchip", "경칩", "驚蟄", 345, "2026-03-05T13:59:00"),
    term("cheongmyeong", "청명", "淸明", 15, "2026-04-04T18:40:00"),
    term("ipha", "입하", "立夏", 45, "2026-05-05T11:48:00"),
    term("mangjong", "망종", "芒種", 75, "2026-06-05T15:48:00"),
    term("soseo", "소서", "小暑", 105, "2026-07-07T01:56:00"),
    term("ipchu", "입추", "立秋", 135, "2026-08-07T11:42:00"),
    term("baengno", "백로", "白露", 165, "2026-09-07T14:41:00"),
    term("hanro", "한로", "寒露", 195, "2026-10-08T06:29:00"),
    term("ipdong", "입동", "立冬", 225, "2026-11-07T09:52:00"),
    term("daeseol", "대설", "大雪", 255, "2026-12-07T02:52:00")
  ]
} satisfies Record<string, SolarTerm[]>;

function term(
  key: SolarTerm["key"],
  name: string,
  hanja: string,
  longitude: number,
  dateTime: string
): SolarTerm {
  return {
    key,
    name,
    hanja,
    longitude,
    dateTime,
    timezone: "UTC",
    source: SOLAR_TERM_SOURCE
  };
}
