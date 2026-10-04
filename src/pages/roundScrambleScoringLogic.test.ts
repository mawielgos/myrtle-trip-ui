import { describe, expect, it } from "vitest";
import type { RoundScorecardSummary, RoundStatus } from "../types/round";
import {
  buildScrambleRows,
  buildScrambleSaveRequest,
  buildScrambleSnapshot,
  isScrambleTeamComplete,
  resolveScrambleEntryMode,
  type ScrambleTeamRow,
} from "./roundScrambleScoringLogic";

function row(overrides: Partial<ScrambleTeamRow> = {}): ScrambleTeamRow {
  return {
    roundTeamId: 10,
    teamNumber: 1,
    teamName: "Team One",
    playerNames: ["Alpha", "Beta"],
    totalScore: "72",
    holes: Array.from({ length: 18 }, () => "4"),
    ...overrides,
  };
}

describe("round scramble scoring logic", () => {
  it("builds 18-hole rows and resolves player names by team id then team name", () => {
    const status = {
      roundId: 44,
      players: [{ playerName: "Fallback Player", teamName: "Team Two" }],
    } as RoundStatus;
    const scorecards = [
      { teamId: 10, teamName: "Team One", playerName: "Alpha" },
      { teamId: 10, teamName: "Team One", playerName: "Beta" },
    ] as RoundScorecardSummary[];

    const rows = buildScrambleRows(
      [
        { roundTeamId: 10, teamNumber: 1, teamName: "Team One", totalScore: 70, holes: [3, null, 5] },
        { roundTeamId: 20, teamNumber: 2, teamName: "Team Two", totalScore: null, holes: [] },
      ],
      status,
      scorecards,
    );

    expect(rows[0].playerNames).toEqual(["Alpha", "Beta"]);
    expect(rows[0].holes).toHaveLength(18);
    expect(rows[0].holes.slice(0, 4)).toEqual(["3", "", "5", ""]);
    expect(rows[0].totalScore).toBe("70");
    expect(rows[1].playerNames).toEqual(["Fallback Player"]);
    expect(rows[1].totalScore).toBe("");
  });

  it("uses response mode before round mode and otherwise infers mode from hole scores", () => {
    expect(resolveScrambleEntryMode("TOTAL", "HOLES", [row()])).toBe("TOTAL");
    expect(resolveScrambleEntryMode(null, "HOLES", [row({ holes: Array(18).fill("") })])).toBe("HOLES");
    expect(resolveScrambleEntryMode(null, null, [row({ holes: ["4", ...Array(17).fill("")] })])).toBe("HOLES");
    expect(resolveScrambleEntryMode(undefined, undefined, [row({ holes: Array(18).fill("") })])).toBe("TOTAL");
  });

  it("normalizes snapshots by trimming entered values", () => {
    const snapshot = buildScrambleSnapshot("HOLES", [
      row({ totalScore: " 72 ", holes: [" 4 ", ...Array(17).fill("")] }),
    ]);

    expect(JSON.parse(snapshot)).toEqual({
      entryMode: "HOLES",
      teams: [{
        roundTeamId: 10,
        totalScore: "72",
        holes: ["4", ...Array(17).fill("")],
      }],
    });
  });

  it("builds total and hole-entry save requests with blank values mapped to null", () => {
    const team = row({ totalScore: "71", holes: ["4", "", ...Array(16).fill("5")] });

    expect(buildScrambleSaveRequest("TOTAL", [team])).toEqual({
      entryMode: "TOTAL",
      teams: [{ roundTeamId: 10, totalScore: 71, holes: [] }],
    });
    expect(buildScrambleSaveRequest("HOLES", [team]).teams[0]).toEqual({
      roundTeamId: 10,
      totalScore: 71,
      holes: [4, null, ...Array(16).fill(5)],
    });
  });

  it("requires a total in total mode and all 18 holes in hole mode", () => {
    expect(isScrambleTeamComplete(row({ totalScore: "72" }), "TOTAL")).toBe(true);
    expect(isScrambleTeamComplete(row({ totalScore: "" }), "TOTAL")).toBe(false);
    expect(isScrambleTeamComplete(row(), "HOLES")).toBe(true);
    expect(isScrambleTeamComplete(row({ holes: ["", ...Array(17).fill("4")] }), "HOLES")).toBe(false);
  });
});
