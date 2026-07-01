export const ENGINE_VERSION = "0.2.2";
export const POLICY_VERSION = "manse-policy-v0.1";
export const DEFAULT_TIMEZONE = "Asia/Seoul";

export const STEMS = [
  { hangul: "갑", hanja: "甲", romanization: "gap" },
  { hangul: "을", hanja: "乙", romanization: "eul" },
  { hangul: "병", hanja: "丙", romanization: "byeong" },
  { hangul: "정", hanja: "丁", romanization: "jeong" },
  { hangul: "무", hanja: "戊", romanization: "mu" },
  { hangul: "기", hanja: "己", romanization: "gi" },
  { hangul: "경", hanja: "庚", romanization: "gyeong" },
  { hangul: "신", hanja: "辛", romanization: "sin" },
  { hangul: "임", hanja: "壬", romanization: "im" },
  { hangul: "계", hanja: "癸", romanization: "gye" }
] as const;

export const BRANCHES = [
  { hangul: "자", hanja: "子", romanization: "ja" },
  { hangul: "축", hanja: "丑", romanization: "chuk" },
  { hangul: "인", hanja: "寅", romanization: "in" },
  { hangul: "묘", hanja: "卯", romanization: "myo" },
  { hangul: "진", hanja: "辰", romanization: "jin" },
  { hangul: "사", hanja: "巳", romanization: "sa" },
  { hangul: "오", hanja: "午", romanization: "o" },
  { hangul: "미", hanja: "未", romanization: "mi" },
  { hangul: "신", hanja: "申", romanization: "sin" },
  { hangul: "유", hanja: "酉", romanization: "yu" },
  { hangul: "술", hanja: "戌", romanization: "sul" },
  { hangul: "해", hanja: "亥", romanization: "hae" }
] as const;

export const MONTH_BOUNDARIES = [
  { key: "lichun", name: "입춘", hanja: "立春", longitude: 315, monthOrder: 0, branchIndex: 2 },
  { key: "gyeongchip", name: "경칩", hanja: "驚蟄", longitude: 345, monthOrder: 1, branchIndex: 3 },
  { key: "cheongmyeong", name: "청명", hanja: "淸明", longitude: 15, monthOrder: 2, branchIndex: 4 },
  { key: "ipha", name: "입하", hanja: "立夏", longitude: 45, monthOrder: 3, branchIndex: 5 },
  { key: "mangjong", name: "망종", hanja: "芒種", longitude: 75, monthOrder: 4, branchIndex: 6 },
  { key: "soseo", name: "소서", hanja: "小暑", longitude: 105, monthOrder: 5, branchIndex: 7 },
  { key: "ipchu", name: "입추", hanja: "立秋", longitude: 135, monthOrder: 6, branchIndex: 8 },
  { key: "baengno", name: "백로", hanja: "白露", longitude: 165, monthOrder: 7, branchIndex: 9 },
  { key: "hanro", name: "한로", hanja: "寒露", longitude: 195, monthOrder: 8, branchIndex: 10 },
  { key: "ipdong", name: "입동", hanja: "立冬", longitude: 225, monthOrder: 9, branchIndex: 11 },
  { key: "daeseol", name: "대설", hanja: "大雪", longitude: 255, monthOrder: 10, branchIndex: 0 },
  { key: "sohan", name: "소한", hanja: "小寒", longitude: 285, monthOrder: 11, branchIndex: 1 }
] as const;

export type SolarTermKey = (typeof MONTH_BOUNDARIES)[number]["key"];
