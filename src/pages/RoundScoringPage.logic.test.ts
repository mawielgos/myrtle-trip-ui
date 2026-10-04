import { describe, expect, it } from "vitest";
import type {
  RoundScorecardSummary,
  RoundStatus,
  RoundTeeOption,
  ScorecardDetail,
} from "../types/round";
import {
  buildRows,
  formatPostingAdjustedScore,
  getEligibleSortedTeesForPlayer,
  getHandicapStrokesForHole,
  getPostingAdjustedScore,
  isHoleOpenForRow,
  isVisibleOnScoringPage,
  normalizeParticipationStatus,
  rowHasRequiredScores,
  scrubScoreInput,
  shouldAutoAdvanceScoreInput,
  type ScoreRow,
} from "./roundScoringLogic";

function scoreRow(overrides: Partial<ScoreRow> = {}): ScoreRow {
  return {
    scorecardId: 1,
    playerId: 1,
    playerName: "Player One",
    participationStatus: "ACTIVE",
    withdrawalHoleNumber: null,
    courseHandicap: 0,
    holes: Array(18).fill(""),
    holeMeta: Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      handicap: index + 1,
      strokes: null,
    })),
    ...overrides,
  };
}

describe("RoundScoringPage scoring logic", () => {
  it("normalizes participation and applies withdrawal visibility/hole rules", () => {
    expect(normalizeParticipationStatus(" withdrawn ")).toBe("WITHDRAWN");
    expect(normalizeParticipationStatus("unexpected")).toBe("ACTIVE");
    expect(isVisibleOnScoringPage("NO_SHOW", null)).toBe(false);
    expect(isVisibleOnScoringPage("WITHDRAWN", null)).toBe(false);
    expect(isVisibleOnScoringPage("WITHDRAWN", 7)).toBe(true);

    const row = scoreRow({ participationStatus: "WITHDRAWN", withdrawalHoleNumber: 7 });
    expect(isHoleOpenForRow(row, 6)).toBe(true);
    expect(isHoleOpenForRow(row, 7)).toBe(false);

    row.holes = ["4", "4", "4", "4", "4", "4", "4", ...Array(11).fill("")];
    expect(rowHasRequiredScores(row)).toBe(true);
  });

  it("allocates handicap strokes and caps posting-adjusted scores at net double bogey", () => {
    expect(getHandicapStrokesForHole(20, 1)).toBe(2);
    expect(getHandicapStrokesForHole(20, 2)).toBe(2);
    expect(getHandicapStrokesForHole(20, 3)).toBe(1);
    expect(getHandicapStrokesForHole(0, 1)).toBe(0);

    const row = scoreRow({
      courseHandicap: 20,
      holes: Array(18).fill("8"),
    });

    const posting = getPostingAdjustedScore(row);
    // SI 1-2 cap at 4 + 2 + 2 = 8; the other 16 cap at 4 + 2 + 1 = 7.
    expect(posting).toEqual({
      adjustedTotal: 128,
      playedHoleCount: 18,
      completeForCurrentStatus: true,
    });
    expect(formatPostingAdjustedScore(row)).toBe("128");

    const withdrawn = scoreRow({
      participationStatus: "WITHDRAWN",
      withdrawalHoleNumber: 2,
      holes: ["5", "5", ...Array(16).fill("")],
    });
    expect(formatPostingAdjustedScore(withdrawn)).toBe("");
  });

  it("filters and sorts tee choices using player gender and rating", () => {
    const tees: RoundTeeOption[] = [
      {
        roundTeeId: 1,
        teeName: "Gold",
        displayName: "Gold",
        displayNameForMen: "Gold M",
        displayNameForWomen: "Gold W",
        eligibleForMen: true,
        eligibleForWomen: false,
        menCourseRating: 73.2,
        womenCourseRating: 78.1,
      },
      {
        roundTeeId: 2,
        teeName: "Blue",
        displayName: "Blue",
        eligibleForMen: true,
        eligibleForWomen: true,
        menCourseRating: 71.4,
        womenCourseRating: 76.5,
      },
      {
        roundTeeId: 3,
        teeName: "Red",
        displayName: "Red",
        eligibleForMen: false,
        eligibleForWomen: true,
        menCourseRating: 68.0,
        womenCourseRating: 72.1,
      },
    ];

    expect(getEligibleSortedTeesForPlayer(tees, "M").map((tee) => tee.teeName)).toEqual([
      "Gold",
      "Blue",
    ]);
    expect(getEligibleSortedTeesForPlayer(tees, "female").map((tee) => tee.teeName)).toEqual([
      "Blue",
      "Red",
    ]);
    expect(tees.map((tee) => tee.teeName)).toEqual(["Gold", "Blue", "Red"]);
  });

  it("scrubs score input and auto-advances only at the intended thresholds", () => {
    expect(scrubScoreInput("a12b3", 2)).toBe("12");
    expect(scrubScoreInput(" 7 ", 2)).toBe("7");
    expect(shouldAutoAdvanceScoreInput("1")).toBe(false);
    expect(shouldAutoAdvanceScoreInput("2")).toBe(true);
    expect(shouldAutoAdvanceScoreInput("9")).toBe(true);
    expect(shouldAutoAdvanceScoreInput("10")).toBe(true);
  });

  it("builds rows with detail/status precedence, excludes no-shows, and sorts by team/player order", () => {
    const summaries: RoundScorecardSummary[] = [
      {
        scorecardId: 10,
        playerId: 100,
        playerName: "Zulu",
        teamNumber: 2,
        playerOrder: 1,
        teeName: "Summary Tee",
        participationStatus: "ACTIVE",
      },
      {
        scorecardId: 11,
        playerId: 101,
        playerName: "Alpha",
        teamNumber: 1,
        playerOrder: 2,
        participationStatus: "ACTIVE",
      },
      {
        scorecardId: 12,
        playerId: 102,
        playerName: "Hidden",
        teamNumber: 1,
        playerOrder: 1,
        participationStatus: "ACTIVE",
      },
    ];

    const details: ScorecardDetail[] = [
      {
        scorecardId: 10,
        playerId: 100,
        playerName: "Zulu",
        teeName: "Detail Tee",
        roundTeeId: 55,
        participationStatus: "WITHDRAWN",
        withdrawalHoleNumber: 3,
        holes: [
          { holeNumber: 1, par: 4, handicap: 1, strokes: 5 },
          { holeNumber: 3, par: 3, handicap: 17, strokes: 4 },
        ],
      },
    ];

    const roundStatus = {
      players: [
        { playerId: 100, playerName: "Zulu", teamNumber: 9, playerOrder: 9, roundTeeId: 99 },
        { playerId: 101, playerName: "Alpha", teamNumber: 1, playerOrder: 2, roundTeeId: 77 },
        {
          playerId: 102,
          playerName: "Hidden",
          teamNumber: 1,
          playerOrder: 1,
          participationStatus: "NO_SHOW",
        },
      ],
    } as RoundStatus;

    const rows = buildRows(summaries, details, roundStatus, 44);

    expect(rows.map((row) => row.playerName)).toEqual(["Hidden", "Alpha", "Zulu"]);
    // Summary participation status takes precedence over the round-status fallback.
    expect(rows[0].participationStatus).toBe("ACTIVE");
    expect(rows[1].roundTeeId).toBe(77);
    expect(rows[2].teeName).toBe("Detail Tee");
    expect(rows[2].roundTeeId).toBe(55);
    expect(rows[2].participationStatus).toBe("WITHDRAWN");
    expect(rows[2].withdrawalHoleNumber).toBe(3);
    expect(rows[2].holes[0]).toBe("5");
    expect(rows[2].holes[1]).toBe("");
    expect(rows[2].holes[2]).toBe("4");
    expect(rows[2].holes).toHaveLength(18);
  });
});
