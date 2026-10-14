import { describe, expect, it } from "vitest";
import * as logic from "./tournamentStandingsLogic";
import type {
  PrizeSchedule,
  TournamentStandingRow,
  TournamentStandings,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

function standings(overrides: Partial<TournamentStandings> = {}): TournamentStandings {
  return {
    tripId: 7,
    tripName: "Myrtle 2026",
    tournamentName: "Trip Championship",
    completedRounds: 2,
    requiredRounds: 4,
    leaderboardFinal: false,
    leaderboardParTotal: 144,
    roundLabels: ["Round 1 - Oct 10, 2026 - Pine Lakes"],
    rows: [],
    ...overrides,
  };
}

function row(overrides: Partial<TournamentStandingRow> = {}): TournamentStandingRow {
  return {
    playerId: 1,
    tripNumber: 1,
    position: 1,
    playerName: "Mike Player",
    totalScore: 71,
    totalToPar: -1,
    completedRounds: 1,
    tournamentComplete: false,
    money: null,
    rounds: [
      {
        roundId: 10,
        roundNumber: 1,
        label: "Round 1 - Oct 10, 2026 - Pine Lakes",
        score: 71,
        toPar: -1,
      },
    ],
    ...overrides,
  };
}

function schedule(overrides: Partial<PrizeSchedule> = {}): PrizeSchedule {
  return {
    scheduleId: 1,
    tripId: 7,
    roundId: null,
    roundNumber: null,
    gameKey: "TOURNAMENT_LOW_NET",
    gameName: "Low Net Championship",
    resultScope: "PLAYER",
    payoutUnit: "PLAYER",
    payouts: [
      { payoutId: 1, finishingPlace: 1, amountPerPlayer: 100 },
      { payoutId: 2, finishingPlace: 2, amountPerPlayer: 50 },
      { payoutId: 3, finishingPlace: 3, amountPerPlayer: 0 },
    ],
    ...overrides,
  };
}

describe("Tournament standings logic", () => {
  it("formats to-par and final-only money values", () => {
    expect(logic.formatToPar(null)).toBe("—");
    expect(logic.formatToPar(0)).toBe("E");
    expect(logic.formatToPar(3)).toBe("+3");
    expect(logic.formatToPar(-2)).toBe("-2");
    expect(logic.formatMoney(1250, false)).toBe("");
    expect(logic.formatMoney(null, true)).toBe("");
    expect(logic.formatMoney(1250, true)).not.toBe("");
  });

  it("builds a sorted trip date range and preserves a single-date range", () => {
    const rounds = [
      { roundId: 2, roundNumber: 2, roundDate: "2026-10-12", courseName: null, teeName: null, gameFormat: null, finalized: false },
      { roundId: 1, roundNumber: 1, roundDate: "2026-10-10", courseName: null, teeName: null, gameFormat: null, finalized: false },
    ] as TripRoundListItem[];
    const range = logic.getTripDateRange(rounds);
    expect(range).toContain("Oct");
    expect(range).toContain("10");
    expect(range).toContain("12");
    expect(logic.getTripDateRange([rounds[0]])).toBe(logic.formatDisplayDate("2026-10-12"));
  });

  it("normalizes report labels and splits round/date/course header parts", () => {
    expect(logic.normalizeReportText("Round 1 — Oct 10, 2026 • Pine Lakes")).toBe(
      "Round 1 - Oct 10, 2026 - Pine Lakes",
    );
    expect(logic.getRoundHeaderParts("Round 2 - Oct 11, 2026 - Barefoot - Dye")).toEqual({
      round: "Round 2",
      date: "Oct 11, 2026",
      course: "Barefoot - Dye",
    });
  });

  it("finds the matching per-round standing by its label", () => {
    const standingRow = row();
    expect(logic.getRoundForLabel(standingRow, standingRow.rounds[0].label)?.score).toBe(71);
    expect(logic.getRoundForLabel(standingRow, "Missing Round")).toBeNull();
  });

  it("selects the direct tournament prize schedule and low-net legacy fallback", () => {
    const direct = schedule();
    const legacy = schedule({ scheduleId: 2, gameKey: "FOUR_DAY_INDIVIDUAL", gameName: "Legacy" });
    expect(logic.getTournamentPrizeSchedule([legacy, direct], "LOW_NET")?.scheduleId).toBe(1);
    expect(logic.getTournamentPrizeSchedule([legacy], "LOW_NET")?.scheduleId).toBe(2);
    expect(logic.getTournamentPrizeSchedule([direct], "LOW_GROSS")).toBeNull();
  });

  it("uses configured competition names and honors tournament enable flags", () => {
    const setup = {
      tournamentId: 1,
      tripId: 7,
      enabled: true,
      name: "Championship",
      standingsLabel: "Standings",
      lowNetEnabled: true,
      lowGrossEnabled: false,
      lowNetName: "Net Cup",
      lowGrossName: "Gross Cup",
      readOnly: false,
      rounds: [],
    } as TripTournamentSetup;
    expect(logic.getConfiguredCompetitionName(setup, "LOW_NET")).toBe("Net Cup");
    expect(logic.getConfiguredCompetitionName(setup, "LOW_GROSS")).toBe("Gross Cup");
    expect(logic.isCompetitionEnabled(setup, "LOW_NET")).toBe(true);
    expect(logic.isCompetitionEnabled(setup, "LOW_GROSS")).toBe(false);
    expect(logic.isCompetitionEnabled({ ...setup, enabled: false }, "LOW_NET")).toBe(false);
  });

  it("calculates configured purse, paid places, and final shown winnings", () => {
    const schedules = [schedule()];
    expect(logic.getConfiguredPurse(schedules, "LOW_NET")).toBe(150);
    expect(logic.getPaidPlaces(schedules, "LOW_NET")).toBe(2);
    const rows = [row({ money: 100 }), row({ playerId: 2, money: 50 })];
    expect(logic.getShownWinningsTotal(rows, false)).toBe(0);
    expect(logic.getShownWinningsTotal(rows, true)).toBe(150);
  });

  it("prefixes tied positions with T and leaves unique positions numeric", () => {
    const tied = [row({ playerId: 1, position: 1 }), row({ playerId: 2, position: 1 })];
    expect(logic.isTiedPosition(tied[0], tied)).toBe(true);
    expect(logic.formatPosition(tied[0], tied)).toBe("T1");
    const unique = [row({ position: 1 }), row({ playerId: 2, position: 2 })];
    expect(logic.formatPosition(unique[0], unique)).toBe("1");
    expect(logic.formatPosition(row({ position: null }), unique)).toBe("—");
  });

  it("builds a final leaderboard CSV with normalized headers, totals, and quoted player names", () => {
    const finalStandings = standings({ leaderboardFinal: true, completedRounds: 4, requiredRounds: 4 });
    const rows = [row({ playerName: 'Wielgos, Mike', money: 125, tournamentComplete: true })];
    const csv = logic.buildTournamentStandingsCsv(finalStandings, rows, "Trip Championship", 175);
    expect(csv).toContain("Trip Championship");
    expect(csv).toContain("Final leaderboard");
    expect(csv).toContain("Total Purse");
    expect(csv).toContain("Final Winnings Total");
    expect(csv).toContain('"Wielgos, Mike"');
    expect(csv).toContain("Round 1 - Oct 10, 2026 - Pine Lakes Net");
  });
});
