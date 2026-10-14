import { describe, expect, it } from "vitest";
import type { TeamGameResult } from "../types/round";
import type { IndividualEventResult, RoundEventResultResponse } from "../types/roundEvent";
import type { PrizeWinningResponse } from "../types/trip";
import * as logic from "./roundResultsLogic";

const team = (overrides: Partial<TeamGameResult> = {}): TeamGameResult => ({
  teamId: 1,
  teamName: "Team 1",
  placement: 1,
  totalGross: 72,
  totalNet: 68,
  totalPoints: null,
  holeResults: [],
  ...overrides,
});

const individual = (
  playerId: number,
  playerName: string,
  rank: number | null,
  grossTotal: number | null,
  netTotal: number | null,
): IndividualEventResult => ({ playerId, playerName, rank, grossTotal, netTotal });

const event = (overrides: Partial<RoundEventResultResponse> = {}): RoundEventResultResponse => ({
  eventId: 1,
  roundId: 10,
  eventType: "INDIVIDUAL_LOW_NET",
  eventName: "Low Net",
  eventOrder: 1,
  resultKind: "INDIVIDUAL",
  individualResults: [],
  teamResults: [],
  ...overrides,
});

describe("Round results characterization", () => {
  it("normalizes legacy team formats for the score grid", () => {
    expect(logic.normalizeScoreGridFormat("TEAM_MIDDLE_MAN")).toBe("MIDDLE_MAN");
    expect(logic.normalizeScoreGridFormat("TEAM_ONE_TWO_THREE")).toBe("ONE_TWO_THREE");
    expect(logic.normalizeScoreGridFormat("TEAM_TWO_MAN_LOW_NET")).toBe("TWO_MAN_LOW_NET");
    expect(logic.isScoreGridFormat("TEAM_THREE_LOW_NET")).toBe(true);
    expect(logic.isScoreGridFormat("STROKE_PLAY")).toBe(false);
  });

  it("uses player labels only for individual formats", () => {
    expect(logic.getResultEntityLabel("INDIVIDUAL_LOW_NET")).toBe("Player");
    expect(logic.getResultEntityPluralLabel("STROKE_PLAY")).toBe("Players");
    expect(logic.getResultEntityLabel("TEAM_SCRAMBLE")).toBe("Team");
    expect(logic.getResultEntityPluralLabel("MIDDLE_MAN")).toBe("Teams");
  });

  it("prefers gross for scramble totals and net for non-scramble team totals", () => {
    const result = team({ totalGross: 73, totalNet: 69 });
    expect(logic.getTeamDisplayTotal(result, "TEAM_SCRAMBLE")).toBe(73);
    expect(logic.getTeamDisplayTotal(result, "MIDDLE_MAN")).toBe(69);
    expect(logic.getTeamEventDisplayTotal(result, "TEAM_SCRAMBLE")).toBe(73);
    expect(logic.getTeamEventDisplayTotal(result, "TEAM_TWO_MAN_LOW_NET")).toBe(69);
  });

  it("uses gross only for individual low-gross event scoring", () => {
    const row = individual(1, "A", 1, 74, 68);
    expect(logic.formatEventResultScore(event({ eventType: "INDIVIDUAL_LOW_GROSS" }), row)).toBe(74);
    expect(logic.formatEventResultScore(event({ eventType: "INDIVIDUAL_LOW_NET" }), row)).toBe(68);
  });

  it("lets the primary team event drive score-grid format and scoring label", () => {
    const events = [
      event({ eventId: 2, eventName: "Closest", resultKind: "INDIVIDUAL" }),
      event({
        eventId: 3,
        eventType: "TEAM_ONE_TWO_THREE",
        eventName: "1-2-3 Best Ball",
        resultKind: "TEAM",
      }),
    ];

    expect(logic.getEffectiveScoreGridFormat("STROKE_PLAY", events)).toBe("ONE_TWO_THREE");
    expect(logic.getPrimaryScoringLabel("STROKE_PLAY", events, null)).toBe("1-2-3 Best Ball");
    expect(logic.formatEventSummary(events)).toBe("Closest + 1-2-3 Best Ball");
  });

  it("formats placements and ordinals including ties and teen suffix exceptions", () => {
    expect(logic.formatOrdinal(1)).toBe("1st");
    expect(logic.formatOrdinal(2)).toBe("2nd");
    expect(logic.formatOrdinal(3)).toBe("3rd");
    expect(logic.formatOrdinal(11)).toBe("11th");
    expect(logic.formatOrdinal(22)).toBe("22nd");
    expect(logic.getEventPlacementLabel(2, true)).toBe("T2");
    expect(logic.getEventSnapshotPlacementLabel(3, true)).toBe("Tie for 3rd");
  });

  it("builds tied fallback snapshot winners for individual and team events", () => {
    const rows = logic.buildFallbackEventSnapshotRows([
      event({
        eventId: 11,
        individualResults: [
          individual(1, "Alice", 1, 80, 70),
          individual(2, "Beth", 1, 82, 70),
          individual(3, "Cara", 3, 83, 72),
        ],
      }),
      event({
        eventId: 12,
        eventType: "TEAM_SCRAMBLE",
        eventName: "Scramble",
        resultKind: "TEAM",
        individualResults: [],
        teamResults: [
          team({ teamId: 10, teamName: "Alpha", placement: 1, totalGross: 65, totalNet: 61 }),
          team({ teamId: 20, teamName: "Bravo", placement: 1, totalGross: 65, totalNet: 60 }),
        ],
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ winnerName: "Alice / Beth", winningTotal: 70, rank: 1, tied: true });
    expect(rows[1]).toMatchObject({ winnerName: "Alpha / Bravo", winningTotal: 65, rank: 1, tied: true });
  });

  it("recognizes real scramble hole scores and formats score-to-par values", () => {
    expect(logic.hasHoleByHoleScrambleScores(team({ holeResults: [{ holeNumber: 1, grossScore: 0 } as never] }))).toBe(false);
    expect(logic.hasHoleByHoleScrambleScores(team({ holeResults: [{ holeNumber: 1, grossScore: 4 } as never] }))).toBe(true);
    expect(logic.formatScoreVsPar(72, 72)).toBe("E");
    expect(logic.formatScoreVsPar(69, 72)).toBe("-3");
    expect(logic.formatScoreVsPar(75, 72)).toBe("+3");
  });

  it("groups team prize winnings into one payout entry while preserving member amounts", () => {
    const winnings: PrizeWinningResponse[] = [
      {
        gameKey: "round-1",
        gameName: "Scramble",
        eventType: "TEAM_SCRAMBLE",
        teamId: 7,
        teamName: "Team Seven",
        playerId: 1,
        playerName: "Alice",
        sourceRank: 1,
        amount: 2500,
      },
      {
        gameKey: "round-1",
        gameName: "Scramble",
        eventType: "TEAM_SCRAMBLE",
        teamId: 7,
        teamName: "Team Seven",
        playerId: 2,
        playerName: "Bob",
        sourceRank: 1,
        amount: 2500,
      },
      {
        gameKey: "round-1",
        gameName: "Low Net",
        eventType: "INDIVIDUAL_LOW_NET",
        playerId: 3,
        playerName: "Cara",
        sourceRank: 1,
        amount: 1500,
      },
    ];

    const groups = logic.buildPrizePayoutGroups(winnings);
    expect(groups).toHaveLength(2);
    const scramble = groups.find((group) => group.eventName === "Scramble");
    expect(scramble?.totalAmount).toBe(5000);
    expect(scramble?.entries).toHaveLength(1);
    expect(scramble?.entries[0]).toMatchObject({
      kind: "TEAM",
      resultName: "Team Seven",
      memberNames: ["Alice", "Bob"],
      totalAmount: 5000,
      perPlayerAmount: 2500,
    });
  });
});
