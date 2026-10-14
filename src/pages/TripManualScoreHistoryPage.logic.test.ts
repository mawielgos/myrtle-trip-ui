import { describe, expect, it } from "vitest";
import * as logic from "./tripManualScoreHistoryLogic";
import type { TripPlayer } from "../types/trip";
import type { ManualScoreHistoryEntry } from "../types/manualScoreHistory";

function player(playerId: number, displayName: string): TripPlayer {
  return {
    playerId,
    displayName,
    ghinNumber: null,
    handicapIndex: null,
    frozenHandicapIndex: null,
    active: true,
    ghinHistoryCount: 0,
    dbScoreHistoryCount: 0,
    tripScoreCount: 0,
    usableHandicapIndex: true,
  };
}

describe("Trip manual score history logic", () => {
  it("normalizes headers and player names for tolerant CSV matching", () => {
    expect(logic.normalizeHeader(" Course Rating ")).toBe("courserating");
    expect(logic.normalizeHeader("included_in_myrtle_calc")).toBe("includedinmyrtlecalc");
    expect(logic.normalizeName("  Mike   Wielgos  ")).toBe("mike wielgos");
  });

  it("splits quoted CSV fields, including commas and escaped quotes", () => {
    expect(logic.splitCsvLine('"Smith, John","The ""Blue"" Course",82')).toEqual([
      "Smith, John",
      'The "Blue" Course',
      "82",
    ]);
  });

  it("parses include flags with blank values defaulting to included", () => {
    expect(logic.parseBooleanText("")).toBe(true);
    expect(logic.parseBooleanText("Yes")).toBe(true);
    expect(logic.parseBooleanText("1")).toBe(true);
    expect(logic.parseBooleanText("No")).toBe(false);
    expect(logic.parseBooleanText("0")).toBe(false);
  });

  it("validates required and optional numeric fields", () => {
    expect(logic.parseRequiredNumber(" 72.5 ", "Score", 3)).toBe(72.5);
    expect(logic.parseOptionalNumber("", "Diff", 3)).toBeNull();
    expect(logic.parseOptionalNumber(" 8.4 ", "Diff", 3)).toBe(8.4);
    expect(() => logic.parseRequiredNumber("", "Score", 3)).toThrow(
      "Row 3: Score is required.",
    );
    expect(() => logic.parseOptionalNumber("abc", "Diff", 4)).toThrow(
      "Row 4: Diff must be numeric.",
    );
  });

  it("normalizes score dates from MM/YY, MM/YYYY, and ISO input", () => {
    expect(logic.parseScoreMonthYear("04/26", 2)).toBe("2026-04-01");
    expect(logic.parseScoreMonthYear("4/2025", 2)).toBe("2025-04-01");
    expect(logic.parseScoreMonthYear("2024-11-19", 2)).toBe("2024-11-01");
    expect(logic.formatScoreMonthYear("2026-04-01")).toBe("04/26");
  });

  it("rejects invalid score month/year input with row-specific errors", () => {
    expect(() => logic.parseScoreMonthYear("13/26", 7)).toThrow(
      "Row 7: Month must be between 1 and 12.",
    );
    expect(() => logic.parseScoreMonthYear("April 2026", 8)).toThrow(
      "Row 8: Score Date must be MM/YY, for example 04/26.",
    );
  });

  it("parses CSV aliases, matches players case-insensitively, and supplies defaults", () => {
    const csv = [
      "Player Name,Score Date,Course,Score,CR,Slope,Diff,Include In Event,Seq",
      '"Mike Wielgos",04/26,"Pine, Lakes",81,71.2,128,8.7,yes,2',
    ].join("\n");

    const [row] = logic.parseCsvRows(csv, [player(11, "  MIKE   WIELGOS ")]);
    expect(row).toMatchObject({
      playerId: "11",
      playerName: "Mike Wielgos",
      scoreDate: "04/26",
      courseName: "Pine, Lakes",
      score: "81",
      courseRating: "71.2",
      slope: "128",
      differential: "8.7",
      includedInMyrtleCalc: true,
      holesPlayed: "18",
      postingOrder: "2",
    });
  });

  it("keeps unmatched CSV player names visible but leaves player id blank", () => {
    const csv = [
      "Golfer,date,course,gross,rating,slope,holes,include",
      "Unknown Golfer,05/26,Test Course,90,70.0,120,9,no",
    ].join("\n");

    const [row] = logic.parseCsvRows(csv, [player(1, "Known Golfer")]);
    expect(row.playerName).toBe("Unknown Golfer");
    expect(row.playerId).toBe("");
    expect(row.holesPlayed).toBe("9");
    expect(row.includedInMyrtleCalc).toBe(false);
  });

  it("returns unique player ids in first-seen entry order", () => {
    const entries = [
      { playerId: 4 },
      { playerId: 2 },
      { playerId: 4 },
      { playerId: 9 },
    ] as ManualScoreHistoryEntry[];
    expect(logic.getPlayerIdsForEntries(entries)).toEqual([4, 2, 9]);
  });
});
