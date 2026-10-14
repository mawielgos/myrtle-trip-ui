import { describe, expect, it } from "vitest";
import * as logic from "./tripWinningDetailLogic";
import type {
  PrizeRecalculationResponse,
  PrizeSchedule,
  PrizeWinningResponse,
  TournamentStandings,
  TripPlayer,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

function round(overrides: Partial<TripRoundListItem> = {}): TripRoundListItem {
  return {
    roundId: 11,
    roundNumber: 1,
    roundDate: "2026-10-10",
    courseName: "Pine Lakes",
    teeName: "Blue",
    gameFormat: "TEAM_TWO_MAN_LOW_NET",
    finalized: true,
    ...overrides,
  };
}

function schedule(overrides: Partial<PrizeSchedule> = {}): PrizeSchedule {
  return {
    scheduleId: 1,
    tripId: 7,
    roundId: 11,
    roundNumber: 1,
    gameKey: "ROUND_1_EVENT_TEAM_TWO_MAN_LOW_NET",
    gameName: "Round 1 - Two Man Low Net",
    resultScope: "TEAM",
    payoutUnit: "PLAYER",
    payouts: [],
    ...overrides,
  };
}

function winning(overrides: Partial<PrizeWinningResponse> = {}): PrizeWinningResponse {
  return {
    gameKey: "ROUND_1_EVENT_TEAM_TWO_MAN_LOW_NET",
    gameName: "Round 1 - Two Man Low Net",
    eventType: "TEAM_TWO_MAN_LOW_NET",
    roundId: 11,
    roundNumber: 1,
    playerId: 1,
    playerName: "Mike Player",
    finishingPlace: 1,
    sourceRank: 1,
    amount: 50,
    ...overrides,
  };
}

function player(overrides: Partial<TripPlayer> = {}): TripPlayer {
  return {
    playerId: 1,
    displayName: "Mike Player",
    ghinNumber: null,
    handicapIndex: null,
    frozenHandicapIndex: null,
    active: true,
    ghinHistoryCount: 0,
    dbScoreHistoryCount: 0,
    tripScoreCount: 0,
    usableHandicapIndex: true,
    ...overrides,
  };
}

function standings(position: number, playerId = 1): TournamentStandings {
  return {
    tripId: 7,
    tripName: "Myrtle 2026",
    completedRounds: 4,
    requiredRounds: 4,
    leaderboardFinal: true,
    leaderboardParTotal: 288,
    roundLabels: [],
    rows: [
      {
        playerId,
        tripNumber: playerId,
        position,
        playerName: playerId === 1 ? "Mike Player" : "Adam Player",
        totalScore: 280,
        totalToPar: -8,
        completedRounds: 4,
        tournamentComplete: true,
        money: null,
        rounds: [],
      },
    ],
  };
}

describe("Trip winning detail logic", () => {
  it("formats ordinals and preserves invalid paid timestamps", () => {
    expect(logic.formatOrdinal(1)).toBe("1st");
    expect(logic.formatOrdinal(2)).toBe("2nd");
    expect(logic.formatOrdinal(3)).toBe("3rd");
    expect(logic.formatOrdinal(11)).toBe("11th");
    expect(logic.formatOrdinal(null)).toBe("");
    expect(logic.formatPaidAt("not-a-date")).toBe("not-a-date");
  });

  it("parses event types from game keys and normalizes result names", () => {
    expect(
      logic.parseRoundEventTypeFromGameKey(
        "ROUND_2_EVENT_TEAM_THREE_LOW_NET",
      ),
    ).toBe("TEAM_THREE_LOW_NET");
    expect(logic.parseRoundEventTypeFromGameKey("FOUR_DAY_INDIVIDUAL")).toBeNull();
    expect(logic.cleanGameName("Round 2 -   Three Low Net")).toBe("Three Low Net");
    expect(logic.formatResultGameName("Anything", "TEAM_SCRAMBLE")).toBe("Scramble");
    expect(logic.formatResultGameName("2-Man Best Ball", null)).toBe("Best Ball");
  });

  it("builds round-result labels from source rank and event type", () => {
    expect(logic.formatRoundResultLabel(winning())).toBe("1st Best Ball");
    expect(
      logic.formatRoundResultLabel(
        winning({ sourceRank: null, finishingPlace: 3, eventType: "TEAM_SCRAMBLE" }),
      ),
    ).toBe("3rd Scramble");
  });

  it("uses UTC round dates and stable player keys", () => {
    const r = round({ roundDate: "2026-10-10" });
    expect(logic.getDayLabel(r)).toBe("Saturday");
    expect(logic.getDateLabel(r)).toBe("10/10/2026");
    expect(logic.makePlayerKey(42, "Ignored")).toBe("id-42");
    expect(logic.makePlayerKey(null, "  Jane Doe  ")).toBe("name-jane doe");
  });

  it("builds sorted prize columns from schedules and fallback winnings", () => {
    const columns = logic.buildRoundPrizeColumns(
      [schedule({ roundNumber: 2, roundId: 22, gameKey: "ROUND_2_EVENT_TEAM_SCRAMBLE", gameName: "Round 2 - Scramble" })],
      {
        tripId: 7,
        winnings: [winning({ gameKey: "ROUND_1_EVENT_INDIVIDUAL_LOW_NET", gameName: "Low Net", eventType: "INDIVIDUAL_LOW_NET", roundId: 11, roundNumber: 1 })],
        playerTotals: [],
      },
      [round(), round({ roundId: 22, roundNumber: 2, roundDate: "2026-10-11", gameFormat: "TEAM_SCRAMBLE" })],
    );
    expect(columns.map((column) => column.roundNumber)).toEqual([1, 2]);
    expect(columns[0].roundName).toBe("Low Net");
    expect(columns[1].roundName).toBe("Scramble");
  });

  it("builds enabled tournament columns with configured labels", () => {
    const setup = {
      tournamentId: 1,
      tripId: 7,
      enabled: true,
      name: "Championship",
      standingsLabel: "Standings",
      lowNetEnabled: true,
      lowGrossEnabled: true,
      lowNetName: "Net Cup",
      lowGrossName: "Gross Cup",
      readOnly: false,
      rounds: [],
    } as TripTournamentSetup;
    expect(logic.buildTournamentPositionColumns(setup)).toEqual([
      { key: "LOW_NET", label: "Net Cup" },
      { key: "LOW_GROSS", label: "Gross Cup" },
    ]);
    expect(logic.buildTournamentPositionColumns({ ...setup, enabled: false })).toEqual([]);
  });

  it("builds player rows with payout totals, standings, round labels, and tie ranks", () => {
    const schedules = [schedule()];
    const columns = logic.buildRoundPrizeColumns(schedules, null, [round()]);
    const tournamentColumns = [
      { key: "LOW_NET" as const, label: "Low Net" },
    ];
    const winningsResponse: PrizeRecalculationResponse = {
      tripId: 7,
      winnings: [
        winning({ playerId: 1, playerName: "Mike Player", sourceRank: 1 }),
        winning({ playerId: 2, playerName: "Adam Player", sourceRank: 2 }),
      ],
      playerTotals: [
        { playerId: 1, playerName: "Mike Player", totalAmount: 100.9, paid: true, paidAt: "2026-10-14T12:00:00Z" },
        { playerId: 2, playerName: "Adam Player", totalAmount: 100.2, paid: false, paidAt: null },
      ],
    };
    const rows = logic.buildPlayerPublishRows(
      [player(), player({ playerId: 2, displayName: "Adam Player" })],
      columns,
      tournamentColumns,
      { LOW_NET: { ...standings(1, 1), rows: [...standings(1, 1).rows, ...standings(2, 2).rows] } },
      winningsResponse,
      schedules,
    );
    expect(rows.map((row) => row.playerName)).toEqual(["Adam Player", "Mike Player"]);
    expect(rows.map((row) => row.rank)).toEqual([1, 1]);
    expect(rows[1].paid).toBe(true);
    expect(rows[1].roundCells[columns[0].key]).toBe("1st Best Ball");
    expect(rows[1].tournamentPositions.LOW_NET).toBe(1);
  });

  it("calculates paid/unpaid payout totals and eligible unpaid rows", () => {
    const summary = logic.buildPayoutSummary([
      { playerKey: "id-1", playerId: 1, playerName: "A", totalMoney: 100, rank: 1, roundCells: {}, tournamentPositions: {}, paid: true, paidAt: null },
      { playerKey: "id-2", playerId: 2, playerName: "B", totalMoney: 75, rank: 2, roundCells: {}, tournamentPositions: {}, paid: false, paidAt: null },
      { playerKey: "name-c", playerId: null, playerName: "C", totalMoney: 25, rank: 3, roundCells: {}, tournamentPositions: {}, paid: false, paidAt: null },
    ]);
    expect(summary.totalPayout).toBe(200);
    expect(summary.totalPaid).toBe(100);
    expect(summary.totalUnpaid).toBe(100);
    expect(summary.unpaidRows.map((row) => row.playerName)).toEqual(["B"]);
  });

  it("builds winning-detail CSV rows with round and tournament columns", () => {
    const columns = logic.buildRoundPrizeColumns([schedule()], null, [round()]);
    const rows = [
      {
        playerKey: "id-1",
        playerId: 1,
        playerName: "Mike Player",
        totalMoney: 125,
        rank: 1,
        roundCells: { [columns[0].key]: "1st Best Ball" },
        tournamentPositions: { LOW_NET: 2 },
        paid: true,
        paidAt: null,
      },
    ];
    const csvRows = logic.buildWinningDetailCsvRows(
      rows,
      columns,
      [{ key: "LOW_NET", label: "Low Net" }],
      125,
    );
    expect(csvRows[0]).toEqual(["Winning Detail"]);
    expect(csvRows[2]).toEqual(
      expect.arrayContaining(["Name", "Money", "Paid", "Rank", "Low Net"]),
    );
    expect(csvRows[3]).toEqual(
      expect.arrayContaining(["Mike Player", "Paid", "1", "1st Best Ball", "2"]),
    );
    expect(csvRows.at(-1)?.[0]).toBe("Total Payout:");
  });
});
