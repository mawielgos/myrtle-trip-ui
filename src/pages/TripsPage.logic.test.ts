import { describe, expect, it } from "vitest";
import type { TripDetail, TripListItem } from "../types/trip";
import { getApiErrorMessage, getStatusWeight, sortTrips, summarizeTrips } from "./tripsPageLogic";

const trip = (tripId: number, overrides: Partial<TripListItem> = {}): TripListItem => ({
  tripId, tripName: `Event ${tripId}`, tripCode: `E${tripId}`, tripYear: 2026,
  playerCount: 0, roundCount: 0, plannedRoundCount: 0, ...overrides,
});
const detail = (status: string, canStartTrip = false): TripDetail => ({
  tripId: 1, tripName: "Event", tripCode: "E", tripYear: 2026,
  entryFee: null, tripStartDate: null, tripEndDate: null, plannedRoundCount: 0,
  handicapsEnabled: true, handicapMethod: "GHIN_HISTORY", initialized: false,
  status, correctionMode: false, archived: false, currentRound: null,
  readiness: { canStartTrip } as TripDetail["readiness"], hasFemalePlayers: false,
});

describe("Events listing pure logic", () => {
  it("prioritizes underway, ready-to-start, planning, complete, and unknown events", () => {
    expect(getStatusWeight("IN_PROGRESS")).toBe(0);
    expect(getStatusWeight("PLANNING", detail("PLANNING", true))).toBe(1);
    expect(getStatusWeight("PLANNING")).toBe(2);
    expect(getStatusWeight("NOT_STARTED")).toBe(2);
    expect(getStatusWeight("COMPLETE")).toBe(3);
    expect(getStatusWeight(null)).toBe(4);
  });
  it("sorts active before archived, applies status and readiness, then newest year and name", () => {
    const trips = [
      trip(1, { status: "COMPLETE" }), trip(2, { status: "PLANNING" }),
      trip(3, { status: "PLANNING", tripYear: 2025 }),
      trip(4, { status: "IN_PROGRESS", archived: true }),
      trip(5, { status: "IN_PROGRESS" }),
      trip(6, { status: "PLANNING", tripName: "Alpha" }),
      trip(7, { status: "PLANNING", tripName: "Beta" }),
    ];
    const result = sortTrips(trips, { 3: detail("PLANNING", true) });
    expect(result.map(x => x.tripId)).toEqual([5, 3, 6, 7, 2, 1, 4]);
    expect(trips.map(x => x.tripId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("uses fetched detail status for ordering and summaries, but counts archived independently", () => {
    const trips = [trip(1, { status: "PLANNING" }), trip(2, { status: "COMPLETE", archived: true }), trip(3, { status: "UNKNOWN" })];
    const details = { 1: detail("IN_PROGRESS") };
    expect(sortTrips(trips, details)[0].tripId).toBe(1);
    expect(summarizeTrips(trips, details)).toEqual({ total: 3, planning: 1, inProgress: 1, complete: 1, archived: 1 });
    expect(summarizeTrips([], {})).toEqual({ total: 0, planning: 0, inProgress: 0, complete: 0, archived: 0 });
  });
  it("extracts a usable API error string or uses fallback", () => {
    expect(getApiErrorMessage({ response: { data: { message: "Cannot archive" } } }, "Default")).toBe("Cannot archive");
    expect(getApiErrorMessage({ response: { data: { error: "Denied" } } }, "Default")).toBe("Denied");
    expect(getApiErrorMessage({ response: { data: "Server error" } }, "Default")).toBe("Server error");
    expect(getApiErrorMessage({ response: { data: { message: "   " } } }, "Default")).toBe("Default");
    expect(getApiErrorMessage(null, "Default")).toBe("Default");
  });
});
