import { describe, expect, it } from "vitest";
import * as logic from "./courseTeeEditLogic";
import type { CourseHole, CourseTee, CourseTeeComboHole } from "../types/courseAdmin";

function tee(overrides: Partial<CourseTee> = {}): CourseTee {
  return {
    teeId: 1,
    courseId: 7,
    teeName: "Blue",
    teeType: "REGULAR",
    effectiveDate: "2026-01-01",
    retiredDate: null,
    courseRating: 72.1,
    slope: 130,
    parTotal: 72,
    yardageTotal: 6500,
    womenCourseRating: null,
    womenSlope: null,
    womenParTotal: null,
    active: true,
    ...overrides,
  };
}

function fullHoles() {
  return logic.defaultHoleForms().map((hole) => ({
    ...hole,
    yardage: String(300 + hole.holeNumber * 10),
    womenPar: hole.par,
    womenHandicap: hole.handicap,
  }));
}

describe("Course tee edit logic", () => {
  it("formats course ratings to one decimal and blanks invalid values", () => {
    expect(logic.formatCourseRatingInput(72)).toBe("72.0");
    expect(logic.formatCourseRatingInput(72.16)).toBe("72.2");
    expect(logic.formatCourseRatingInput(null)).toBe("");
  });

  it("creates 18 default holes and combo source mappings", () => {
    const holes = logic.defaultHoleForms();
    expect(holes).toHaveLength(18);
    expect(holes[0]).toMatchObject({ holeNumber: 1, par: "4", handicap: "1" });
    expect(holes[17]).toMatchObject({ holeNumber: 18, par: "4", handicap: "18" });
    expect(logic.defaultComboHoleSources("42")).toEqual(Array(18).fill("42"));
  });

  it("normalizes tee and hole form whitespace", () => {
    const form = logic.normalizeForm({
      ...logic.emptyForm(),
      teeName: " Blue ",
      effectiveDate: " 2026-01-01 ",
      courseRating: " 72.1 ",
    });
    expect(form.teeName).toBe("Blue");
    expect(form.effectiveDate).toBe("2026-01-01");
    expect(form.courseRating).toBe("72.1");

    const holes = logic.normalizeHoleForms([{ ...logic.defaultHoleForms()[0], yardage: " 410 " }]);
    expect(holes[0].yardage).toBe("410");
  });

  it("parses numbers and totals hole fields while ignoring blanks", () => {
    expect(logic.parseNumber(" 72.1 ")).toBe(72.1);
    expect(logic.parseNumber(" ")).toBeNull();
    expect(logic.parseNumber("abc")).toBeNull();
    const holes = fullHoles();
    expect(logic.calculateHoleTotal(holes, "par")).toBe(72);
    expect(logic.calculateHoleTotal(holes, "yardage")).toBeGreaterThan(0);
  });

  it("infers men's and women's tee-data availability from ratings or hole structure", () => {
    const form = logic.emptyForm();
    const holes = logic.defaultHoleForms();
    expect(logic.inferHasMenData(form, holes)).toBe(true);
    expect(logic.inferHasWomenData(form, holes)).toBe(false);
    expect(logic.inferHasWomenData({ ...form, womenSlope: "125" }, holes)).toBe(true);
  });

  it("sorts tees by descending yardage then name", () => {
    const sorted = logic.sortTeesByYardageDesc([
      tee({ teeId: 1, teeName: "White", yardageTotal: 6100 }),
      tee({ teeId: 2, teeName: "Gold", yardageTotal: 6500 }),
      tee({ teeId: 3, teeName: "Blue", yardageTotal: 6500 }),
      tee({ teeId: 4, teeName: "Red", yardageTotal: null }),
    ]);
    expect(sorted.map((item) => item.teeName)).toEqual(["Blue", "Gold", "White", "Red"]);
  });

  it("normalizes sparse hole API responses into a complete 18-hole form", () => {
    const apiHoles: CourseHole[] = [
      { holeId: 1, holeNumber: 1, par: 5, handicap: 3, yardage: 510, womenPar: 5, womenHandicap: 5 },
      { holeId: 18, holeNumber: 18, par: 4, handicap: 2, yardage: 430, womenPar: null, womenHandicap: null },
    ];
    const holes = logic.holesFromResponse(apiHoles);
    expect(holes).toHaveLength(18);
    expect(holes[0]).toMatchObject({ par: "5", handicap: "3", yardage: "510", womenPar: "5" });
    expect(holes[1]).toMatchObject({ holeNumber: 2, par: "4", handicap: "2", yardage: "" });
    expect(holes[17]).toMatchObject({ par: "4", handicap: "2", yardage: "430", womenPar: "" });
  });

  it("builds and validates combo tee source mappings", () => {
    const comboHoles: CourseTeeComboHole[] = [
      { comboHoleId: 1, holeNumber: 1, sourceTeeId: 11, sourceTeeName: "Blue" },
      { comboHoleId: 2, holeNumber: 2, sourceTeeId: 22, sourceTeeName: "White" },
    ];
    expect(logic.comboSourcesFromResponse(comboHoles).slice(0, 3)).toEqual(["11", "22", ""]);
    expect(logic.getDistinctComboSourceIds(comboHoles)).toEqual(["11", "22"]);
    const payload = logic.buildComboHolePayload(Array.from({ length: 18 }, (_, index) => (index < 9 ? "11" : "22")));
    expect(payload).toHaveLength(18);
    expect(payload[0]).toEqual({ holeNumber: 1, sourceTeeId: 11 });
    expect(payload[17]).toEqual({ holeNumber: 18, sourceTeeId: 22 });
    expect(() => logic.buildComboHolePayload(Array(17).fill("11"))).toThrow(/18 combo tee hole mappings/);
  });

  it("builds validated tee and hole save payloads", () => {
    const holes = fullHoles();
    const teePayload = logic.buildTeePayload(
      {
        ...logic.emptyForm(),
        teeName: " Blue ",
        effectiveDate: "2026-01-01",
        courseRating: "72.1",
        slope: "130",
        womenCourseRating: "75.2",
        womenSlope: "128",
      },
      holes,
      "REGULAR",
      true,
      true,
    );
    expect(teePayload).toMatchObject({
      teeName: "Blue",
      teeType: "REGULAR",
      courseRating: 72.1,
      slope: 130,
      parTotal: 72,
      womenCourseRating: 75.2,
      womenSlope: 128,
      womenParTotal: 72,
    });
    expect(teePayload.yardageTotal).toBeGreaterThan(0);

    const holePayload = logic.buildHolePayload(holes, true, true);
    expect(holePayload).toHaveLength(18);
    expect(holePayload[0]).toMatchObject({ holeNumber: 1, par: 4, handicap: 1, womenPar: 4, womenHandicap: 1 });

    expect(() =>
      logic.buildTeePayload({ ...logic.emptyForm(), teeName: "Blue", courseRating: "72.1", slope: "130" }, holes, "REGULAR", true, false),
    ).not.toThrow();
    expect(() => logic.buildHolePayload(holes.map((hole) => ({ ...hole, handicap: "1" })), true, false)).toThrow(/duplicated/);
  });
});
