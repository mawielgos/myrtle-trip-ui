import { describe, expect, it } from "vitest";
import type {
  StrokesPerDayPlayer,
  StrokesPerDayPlayerRound,
  StrokesPerDayResponse,
  StrokesPerDayRound,
  StrokesPerDayTeeOption,
} from "../types/strokes";
import * as logic from "./strokesPerDayLogic";

const round = (
  roundId: number,
  roundNumber: number,
  overrides: Partial<StrokesPerDayRound> = {},
): StrokesPerDayRound => ({
  roundId,
  roundNumber,
  roundDate: `2026-10-${String(roundNumber).padStart(2, "0")}`,
  dayName: `Day ${roundNumber}`,
  courseName: `Course ${roundNumber}`,
  courseWebsiteUrl: null,
  standardTeeName: "Blue",
  alternateTeeName: "White",
  standardCourseRating: 72,
  alternateCourseRating: 70,
  standardSlope: 125,
  alternateSlope: 120,
  standardYardage: 6500,
  alternateYardage: 6100,
  statusCode: "PLANNING",
  statusLabel: null,
  teePlanningLocked: false,
  ...overrides,
});

const tee = (
  roundTeeId: number,
  overrides: Partial<StrokesPerDayTeeOption> = {},
): StrokesPerDayTeeOption => ({
  roundTeeId,
  sourceCourseTeeId: roundTeeId + 100,
  teeName: `Tee ${roundTeeId}`,
  displayName: `Display ${roundTeeId}`,
  courseRating: 71.4,
  slope: 123,
  parTotal: 72,
  yardage: 6325,
  courseHandicap: 8,
  playingHandicap: 7,
  selected: false,
  ...overrides,
});

const playerRound = (
  roundId: number,
  roundNumber: number,
  overrides: Partial<StrokesPerDayPlayerRound> = {},
): StrokesPerDayPlayerRound => ({
  roundId,
  roundNumber,
  tripIndex: 8.4,
  standardCourseHandicap: 9,
  alternateCourseHandicap: 7,
  standardTeeSelected: true,
  alternateTeeSelected: false,
  selectedRoundTeeId: 11,
  selectedTeeName: "Blue",
  selectedCourseRating: 71.4,
  selectedSlope: 123,
  selectedYardage: 6325,
  selectedCourseHandicap: 8,
  selectedPlayingHandicap: 7,
  eligibleTeeOptions: [tee(11), tee(12)],
  ...overrides,
});

const player = (
  playerId: number,
  name: string,
  rounds: StrokesPerDayPlayerRound[],
): StrokesPerDayPlayer => ({
  playerId,
  playerName: name,
  displayOrder: playerId,
  rounds,
});

describe("Strokes per day characterization", () => {
  it("formats dates and numeric display values while preserving invalid or missing values", () => {
    expect(logic.formatDate("2026-10-14")).toBe("10/14/2026");
    expect(logic.formatDate("not-a-date")).toBe("not-a-date");
    expect(logic.formatDate(null)).toBe("");
    expect(logic.formatDecimal(8.46)).toBe("8.5");
    expect(logic.formatDecimal(null)).toBe("");
    expect(logic.formatNumber(6325)).toBe((6325).toLocaleString());
  });

  it("normalizes course website URLs without changing explicit http or https URLs", () => {
    expect(logic.normalizeWebsiteUrl("example.com/course")).toBe("https://example.com/course");
    expect(logic.normalizeWebsiteUrl(" http://example.com ")).toBe("http://example.com");
    expect(logic.normalizeWebsiteUrl("https://example.com")).toBe("https://example.com");
    expect(logic.normalizeWebsiteUrl("   ")).toBeNull();
  });

  it("formats negative stroke values as plus strokes and nonnegative values normally", () => {
    expect(logic.formatStrokes(-3)).toBe("+3");
    expect(logic.formatStrokes(0)).toBe("0");
    expect(logic.formatStrokes(6)).toBe("6");
    expect(logic.formatStrokes(null)).toBe("");
  });

  it("builds tee detail and compact tee metadata from rating, slope, and yardage", () => {
    const value = playerRound(1, 1);
    expect(logic.buildTeeDetail(value)).toBe(`71.4 / 123 - ${(6325).toLocaleString()} yds`);
    expect(logic.buildTeeMeta(value)).toBe(`71.4 / 123 • ${(6325).toLocaleString()} yds`);
    expect(logic.buildTeeDetail(null)).toBe("");
    expect(logic.buildTeeMeta(playerRound(1, 1, {
      selectedCourseRating: null,
      selectedSlope: null,
      selectedYardage: null,
    }))).toBe("");
  });

  it("finds player rounds and tee options by id and returns null when absent", () => {
    const p = player(1, "Alpha", [playerRound(10, 1), playerRound(20, 2)]);
    expect(logic.findPlayerRound(p, round(20, 2))?.roundNumber).toBe(2);
    expect(logic.findPlayerRound(p, round(99, 9))).toBeNull();
    expect(logic.findTeeOption(p.rounds[0], 12)?.roundTeeId).toBe(12);
    expect(logic.findTeeOption(p.rounds[0], 999)).toBeNull();
  });

  it("builds stable player-round keys and initial tee selection snapshots", () => {
    const response: StrokesPerDayResponse = {
      tripId: 1,
      tripName: "Trip",
      tripCode: "T26",
      tripYear: 2026,
      rounds: [round(10, 1), round(20, 2)],
      players: [
        player(7, "Alpha", [
          playerRound(10, 1, { selectedRoundTeeId: 11 }),
          playerRound(20, 2, { selectedRoundTeeId: null }),
        ]),
      ],
    };
    expect(logic.buildPlayerRoundKey(7, 10)).toBe("7:10");
    expect(logic.buildInitialSelectedTeeIds(response)).toEqual({ "7:10": 11, "7:20": null });
  });

  it("chunks rounds without reordering them and keeps a final partial chunk", () => {
    const rounds = [round(1, 1), round(2, 2), round(3, 3), round(4, 4), round(5, 5)];
    expect(logic.chunkRounds(rounds, 2).map((chunk) => chunk.map((item) => item.roundNumber))).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });

  it("derives planning eligibility and fallback round status labels", () => {
    expect(logic.isPlanningRound(round(1, 1, { statusCode: "PLANNING", teePlanningLocked: false }))).toBe(true);
    expect(logic.isPlanningRound(round(1, 1, { statusCode: "PLANNING", teePlanningLocked: true }))).toBe(false);
    expect(logic.isPlanningRound(round(1, 1, { statusCode: "FINALIZED" }))).toBe(false);
    expect(logic.getRoundStatusLabel(round(1, 1, { statusCode: "FINALIZED", statusLabel: null }))).toBe("Finalized");
    expect(logic.getRoundStatusLabel(round(1, 1, { statusCode: "IN_PROGRESS", statusLabel: null }))).toBe("In Progress");
    expect(logic.getRoundStatusLabel(round(1, 1, { statusCode: "PLANNING", statusLabel: "Open for changes" }))).toBe("Open for changes");
  });

  it("builds the daily-handicap CSV in player-by-round order with status and selected tee values", () => {
    const response: StrokesPerDayResponse = {
      tripId: 1,
      tripName: "Fall Trip",
      tripCode: "F26",
      tripYear: 2026,
      rounds: [
        round(10, 1, { roundDate: "2026-10-14", dayName: "Wednesday", courseName: "North", statusCode: "PLANNING" }),
        round(20, 2, { roundDate: "2026-10-15", dayName: "Thursday", courseName: "South", statusCode: "FINALIZED" }),
      ],
      players: [
        player(1, "Alpha", [
          playerRound(10, 1, { tripIndex: 8.4, selectedTeeName: "Blue", selectedCourseHandicap: -2, selectedPlayingHandicap: 3 }),
          playerRound(20, 2, { tripIndex: 8.1, selectedTeeName: "White", selectedCourseHandicap: 4, selectedPlayingHandicap: 4 }),
        ]),
      ],
    };

    const rows = logic.buildDailyHandicapsCsv(response);
    expect(rows.slice(0, 4)).toEqual([
      ["Daily Handicaps"],
      ["Event", "Fall Trip"],
      [],
      ["Player", "Round", "Date", "Day", "Course", "Status", "Index", "Tee", "Tee Detail", "Course Handicap", "Playing Handicap"],
    ]);
    expect(rows[4]).toEqual([
      "Alpha",
      1,
      "2026-10-14",
      "Wednesday",
      "North",
      "Planning",
      "8.4",
      "Blue",
      `71.4 / 123 - ${(6325).toLocaleString()} yds`,
      "+2",
      "3",
    ]);
    expect(rows[5][5]).toBe("Finalized");
  });
});
