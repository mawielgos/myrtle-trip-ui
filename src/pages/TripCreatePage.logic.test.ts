import { describe, expect, it } from "vitest";
import {
  buildTripCode,
  normalizeTripHandicapMethod,
  sortPlayers,
  validateTripSetup,
  type TripSetupFields,
} from "./tripCreateLogic";

const valid = (changes: Partial<TripSetupFields> = {}): TripSetupFields => ({
  tripName: "Myrtle Beach",
  tripYear: "2026",
  tripCode: "MYRTLE_BEACH_2026",
  entryFee: "100",
  tripStartDate: "2026-10-01",
  tripEndDate: "2026-10-04",
  plannedRoundCount: "4",
  handicapsEnabled: true,
  handicapMethod: "GHIN_HISTORY",
  frozenIndexes: {},
  selectedPlayerIds: [2, 1],
  ...changes,
});

describe("Trip create pure logic", () => {
  it("builds normalized event codes and supports missing name or year", () => {
    expect(buildTripCode(" Myrtle Beach! ", " 2026 ")).toBe("MYRTLE_BEACH_2026");
    expect(buildTripCode("", "2026")).toBe("2026");
    expect(buildTripCode("Trip", "")).toBe("TRIP");
    expect(buildTripCode("", "")).toBe("");
  });

  it("normalizes historic handicap method aliases", () => {
    expect(normalizeTripHandicapMethod(" frozen_ghin_index ")).toBe("FROZEN_GHIN_INDEX");
    expect(normalizeTripHandicapMethod("GHIN")).toBe("GHIN_HISTORY");
    expect(normalizeTripHandicapMethod("db_score_history")).toBe("GHIN_PLUS_DB_SCORE_HISTORY");
    expect(normalizeTripHandicapMethod("MYRTLE_BEACH")).toBe("GHIN_PLUS_DB_SCORE_HISTORY");
    expect(normalizeTripHandicapMethod(null)).toBe("GHIN_PLUS_DB_SCORE_HISTORY");
  });

  it("sorts players by display name without mutating the source", () => {
    const players = [
      { playerId: 2, displayName: "Zoe", active: true },
      { playerId: 1, displayName: "alice", active: true },
    ];
    expect(sortPlayers(players).map((player) => player.playerId)).toEqual([1, 2]);
    expect(players[0].playerId).toBe(2);
  });

  it("accepts a complete valid event", () => {
    expect(validateTripSetup(valid())).toBeNull();
    expect(validateTripSetup(valid({ entryFee: "", selectedPlayerIds: [] }))).toBeNull();
  });

  it.each([
    [{ tripName: " " }, "Event name is required."],
    [{ tripYear: "" }, "Event year is required."],
    [{ tripYear: "2026.5" }, "Event year must be a whole number."],
    [{ tripCode: " " }, "Event code is required."],
    [{ entryFee: "-1" }, "Entry fee must be a whole number 0 or greater."],
    [{ entryFee: "2.5" }, "Entry fee must be a whole number 0 or greater."],
    [{ tripStartDate: "" }, "Event start date is required."],
    [{ tripEndDate: "" }, "Event end date is required."],
    [{ tripEndDate: "2026-09-30" }, "Event end date cannot be before event start date."],
    [{ plannedRoundCount: "0" }, "Number of rounds must be a whole number between 1 and 12."],
    [{ plannedRoundCount: "13" }, "Number of rounds must be a whole number between 1 and 12."],
    [{ plannedRoundCount: "2.5" }, "Number of rounds must be a whole number between 1 and 12."],
  ] as [Partial<TripSetupFields>, string][])("rejects invalid setup %j", (changes, error) => {
    expect(validateTripSetup(valid(changes))).toBe(error);
  });

  it("requires a valid frozen handicap index for every selected player only in frozen mode", () => {
    const frozen = { handicapMethod: "FROZEN_GHIN_INDEX", frozenIndexes: { 1: "12.5" } };
    expect(validateTripSetup(valid(frozen))).toBe("Frozen GHIN Index is required for every selected player.");
    expect(validateTripSetup(valid({ ...frozen, frozenIndexes: { 1: "12.5", 2: "54.1" } }))).toBe("Frozen GHIN Index must be a number between -10.0 and 54.0.");
    expect(validateTripSetup(valid({ ...frozen, frozenIndexes: { 1: "-10", 2: "54" } }))).toBeNull();
    expect(validateTripSetup(valid({ ...frozen, handicapsEnabled: false }))).toBeNull();
  });
});
