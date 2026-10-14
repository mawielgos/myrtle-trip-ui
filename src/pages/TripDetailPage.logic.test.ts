import { describe, expect, it } from "vitest";
import * as tripDetailLogic from "./tripDetailLogic";
import type { PrizeSchedule, TripDetail, TripPlannedRound, TripPlayer, TripRoundListItem } from "../types/trip";

const api = tripDetailLogic;

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    tripId: 7,
    tripName: "Fall Trip",
    tripCode: "FALL",
    tripYear: 2026,
    entryFee: 100,
    tripStartDate: null,
    tripEndDate: null,
    plannedRoundCount: 3,
    handicapsEnabled: true,
    handicapMethod: "INDEX",
    initialized: false,
    status: "PLANNING",
    correctionMode: false,
    archived: false,
    currentRound: null,
    readiness: null,
    hasFemalePlayers: false,
    ...overrides,
  };
}

function planned(roundNumber: number, roundDate: string | null): TripPlannedRound {
  return {
    roundId: roundNumber,
    roundNumber,
    roundDate,
    format: null,
    courseId: null,
    courseName: null,
    defaultTeeId: null,
    defaultTeeName: null,
    womenDefaultTeeId: null,
    womenDefaultTeeName: null,
    includeInFourDayStandings: false,
    finalized: false,
  };
}

function created(roundNumber: number | null, finalized = false): TripRoundListItem {
  return {
    roundId: roundNumber ?? 99,
    roundNumber,
    roundDate: null,
    courseName: null,
    teeName: null,
    gameFormat: null,
    finalized,
  };
}

describe("Trip detail pure logic", () => {
  it("detects whether any prize schedule has positive configured money", () => {
    const empty: PrizeSchedule = { scheduleId: 1, tripId: 7, roundId: null, roundNumber: null, gameKey: "A", gameName: "A", resultScope: "PLAYER", payoutUnit: "PLAYER", payouts: [{ payoutId: 1, finishingPlace: 1, amountPerPlayer: 0 }] };
    const funded: PrizeSchedule = { ...empty, scheduleId: 2, payouts: [{ payoutId: 2, finishingPlace: 1, amountPerPlayer: 25 }] };
    expect(api.isPrizeScheduleConfigured(empty)).toBe(false);
    expect(api.hasConfiguredPrizeMoney([empty, funded])).toBe(true);
  });

  it("recognizes started and completed trips", () => {
    expect(api.isTripStarted("PLANNING")).toBe(false);
    expect(api.isTripStarted("IN_PROGRESS")).toBe(true);
    expect(api.isTripStarted("COMPLETE")).toBe(true);
  });

  it("builds a sorted planned-round date range and ignores undated rounds", () => {
    const value = api.buildDateRange([
      planned(2, "2026-10-05"),
      planned(1, "2026-10-03"),
      planned(3, null),
    ]);
    expect(value).toContain("Oct");
    expect(value).toContain("3");
    expect(value).toContain("5");
    expect(api.buildDateRange([planned(1, null)])).toBe("Dates TBD");
  });

  it("keeps only active participating players", () => {
    const players = [
      { playerId: 1, displayName: "A", active: true, participationStatus: "ACTIVE" },
      { playerId: 2, displayName: "B", active: false, participationStatus: "ACTIVE" },
      { playerId: 3, displayName: "C", active: true, participationStatus: "WITHDRAWN" },
      { playerId: 4, displayName: "D", active: null, participationStatus: null },
    ] as TripPlayer[];
    expect(api.getActivePlayers(players).map((player) => player.playerId)).toEqual([1, 4]);
  });

  it("filters planned rounds to the configured count and sorts them", () => {
    const result = api.getSortedPlannedRounds([
      planned(3, null),
      planned(1, null),
      planned(2, null),
    ], 2);
    expect(result.map((round) => round.roundNumber)).toEqual([1, 2]);
  });

  it("sorts created rounds and builds a round-number lookup", () => {
    const result = api.getSortedRounds([created(null), created(3), created(1), created(2)]);
    expect(result.map((round) => round.roundNumber)).toEqual([1, 2, 3, null]);
    const lookup = api.getRoundsByRoundNumber(result);
    expect(lookup.get(2)?.roundId).toBe(2);
    expect(lookup.has(99)).toBe(false);
  });

  it("enables Start Event only for a ready planning trip without a current round", () => {
    expect(api.canStartTrip(trip(), { canStartTrip: true } as any)).toBe(true);
    expect(api.canStartTrip(trip({ status: "IN_PROGRESS" }), { canStartTrip: true } as any)).toBe(false);
    expect(api.canStartTrip(trip({ currentRound: { roundId: 1, roundNumber: 1, format: null, courseName: null, teeName: null, finalized: false } }), { canStartTrip: true } as any)).toBe(false);
  });

  it("enables GHIN loading only before initialization with a code and players", () => {
    expect(api.canLoadGhin(trip(), 4)).toBe(true);
    expect(api.canLoadGhin(trip({ initialized: true }), 4)).toBe(false);
    expect(api.canLoadGhin(trip({ tripCode: "" }), 4)).toBe(false);
    expect(api.canLoadGhin(trip(), 0)).toBe(false);
  });

  it("derives reset/complete visibility and participation locking from round finalization", () => {
    expect(api.canResetTripStart(trip({ status: "IN_PROGRESS" }), 3, 0)).toBe(true);
    expect(api.canResetTripStart(trip({ status: "IN_PROGRESS" }), 3, 1)).toBe(false);
    expect(api.canCompleteTrip(trip({ status: "IN_PROGRESS" }), 3, 3)).toBe(true);
    expect(api.getParticipationLockState(trip({ status: "IN_PROGRESS" }), 3, 3)).toEqual({
      locked: true,
      reason: "Event player status is locked because all created rounds are finalized. Use round corrections for finalized-round changes.",
    });
    expect(api.getParticipationLockState(trip({ status: "COMPLETE", correctionMode: true }), 2, 1).locked).toBe(false);
    expect(api.getParticipationLockState(trip({ status: "COMPLETE", correctionMode: false }), 2, 1).locked).toBe(true);
  });
});
