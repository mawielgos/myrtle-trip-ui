import { describe, expect, it } from "vitest";
import type { CourseTeeListItem } from "../types/course";
import type { TripPlannedRound } from "../types/trip";
import * as logic from "./tripRoundPlanningLogic";

const round = (
  roundNumber: number,
  overrides: Partial<TripPlannedRound> = {},
): TripPlannedRound => ({
  roundId: roundNumber,
  roundNumber,
  roundDate: null,
  format: null,
  courseId: null,
  courseName: null,
  defaultTeeId: null,
  defaultTeeName: null,
  womenDefaultTeeId: null,
  womenDefaultTeeName: null,
  standardTeeName: null,
  includeInFourDayStandings: false,
  scrambleTeamSize: 4,
  events: [],
  finalized: false,
  ...overrides,
});

const tee = (
  courseTeeId: number,
  teeName: string,
  overrides: Partial<CourseTeeListItem> = {},
): CourseTeeListItem => ({
  courseTeeId,
  courseId: 1,
  teeName,
  courseRating: 70,
  slope: 120,
  parTotal: 72,
  womenCourseRating: 72,
  womenSlope: 125,
  womenParTotal: 72,
  holeCount: 18,
  ...overrides,
});

describe("Trip round planning characterization", () => {
  it("maps legacy format values to primary event types and preserves the 4-man 2-low-net compatibility value", () => {
    expect(logic.optionValueToLegacyFormat("FOUR_MAN_TWO_LOW_NET")).toBe("THREE_LOW_NET");
    expect(logic.optionValueToLegacyFormat("TEAM_SCRAMBLE")).toBe("TEAM_SCRAMBLE");
    expect(logic.legacyFormatToPrimaryEventType("FOUR_MAN_TWO_LOW_NET")).toBe("TEAM_TWO_LOW_NET");
    expect(logic.legacyFormatToPrimaryEventType("TWO_MAN_LOW_NET")).toBe("TEAM_TWO_MAN_LOW_NET");
    expect(logic.legacyFormatToPrimaryEventType("STROKE_PLAY")).toBe("INDIVIDUAL_LOW_NET");
  });

  it("derives default team sizes and names for team events", () => {
    expect(logic.defaultTeamSizeForEventType("TEAM_SCRAMBLE", 3)).toBe(3);
    expect(logic.defaultTeamSizeForEventType("TEAM_SCRAMBLE", null)).toBe(4);
    expect(logic.defaultTeamSizeForEventType("TEAM_TWO_MAN_LOW_NET")).toBe(2);
    expect(logic.defaultTeamSizeForEventType("INDIVIDUAL_LOW_NET")).toBeNull();
    expect(logic.defaultEventName("TEAM_SCRAMBLE", 3)).toBe("3-Man Scramble");
    expect(logic.defaultEventName("TEAM_TWO_LOW_NET")).toBe("4-Man 2-Low Net");
  });

  it("normalizes explicit events by order and synthesizes a legacy event when none exist", () => {
    const explicit = round(1, {
      events: [
        { eventType: "INDIVIDUAL_LOW_GROSS", eventName: "Gross", eventOrder: 2 },
        { eventType: "INDIVIDUAL_LOW_NET", eventName: "Net", eventOrder: 1 },
      ],
    });
    expect(logic.normalizeEvents(explicit).map((event) => event.eventName)).toEqual(["Net", "Gross"]);

    const legacy = round(2, { format: "TWO_MAN_LOW_NET", events: [] });
    expect(logic.normalizeEvents(legacy)).toEqual([
      expect.objectContaining({
        eventType: "TEAM_TWO_MAN_LOW_NET",
        eventName: "2-Man Low Net",
        eventOrder: 1,
        teamSize: 2,
      }),
    ]);
  });

  it("uses event presence for primary game selection and builds human-readable event summaries", () => {
    const configured = round(1, {
      format: "THREE_LOW_NET",
      events: [
        { eventType: "TEAM_TWO_LOW_NET", eventName: "Two Low", eventOrder: 1, teamSize: 4 },
        { eventType: "INDIVIDUAL_LOW_GROSS", eventName: null, eventOrder: 2 },
      ],
    });

    expect(logic.primaryGameSelectValue(configured)).toBe("FOUR_MAN_TWO_LOW_NET");
    expect(logic.eventSummary(configured)).toBe("Two Low + Individual Low Gross");
  });

  it("filters tee eligibility by complete rating/slope/par data and sorts by gender-specific rating", () => {
    const tees = [
      tee(1, "Blue", { courseRating: 72.1, womenCourseRating: 74.2 }),
      tee(2, "White", { courseRating: 70.4, womenCourseRating: 75.0 }),
      tee(3, "Gold", { womenCourseRating: null, womenSlope: null, womenParTotal: null }),
      tee(4, "Short", { holeCount: 9 }),
    ];

    expect(logic.sortTeesByRatingDesc(tees, "M").map((item) => item.courseTeeId)).toEqual([1, 2, 3, 4]);
    expect(logic.sortTeesByRatingDesc(tees, "F").map((item) => item.courseTeeId)).toEqual([2, 1, 4, 3]);
    expect(logic.isMenTeeEligible(tees[0])).toBe(true);
    expect(logic.isWomenTeeEligible(tees[2])).toBe(false);
    expect(logic.isMenTeeEligible(tees[3])).toBe(false);
  });

  it("sorts rounds by play date then round number while placing undated rounds last", () => {
    const sorted = logic.sortRoundsByPlaySequence([
      round(3, { roundDate: null }),
      round(2, { roundDate: "2026-05-02" }),
      round(1, { roundDate: "2026-05-02" }),
      round(4, { roundDate: "2026-05-01" }),
    ]);

    expect(sorted.map((item) => item.roundNumber)).toEqual([4, 1, 2, 3]);
  });

  it("creates stable round snapshots that normalize sequence, legacy events, and scramble defaults", () => {
    const value = JSON.parse(logic.snapshotRounds([
      round(2, { roundDate: "2026-05-02", format: "TEAM_SCRAMBLE", scrambleTeamSize: null }),
      round(1, { roundDate: "2026-05-01", format: "TWO_MAN_LOW_NET" }),
    ]));

    expect(value.map((item: { roundNumber: number }) => item.roundNumber)).toEqual([1, 2]);
    expect(value[0].events[0]).toMatchObject({ eventType: "TEAM_TWO_MAN_LOW_NET", teamSize: 2 });
    expect(value[1].scrambleTeamSize).toBe(4);
  });

  it("chooses the requested expanded round when available and otherwise falls back to the first round", () => {
    const rounds = [round(1, { roundId: 101 }), round(2, { roundId: 202 })];

    expect(logic.selectInitialExpandedRoundKey(rounds, 2)).toBe("id-202");
    expect(logic.selectInitialExpandedRoundKey(rounds, 99)).toBe("id-101");
    expect(logic.selectInitialExpandedRoundKey([], 1)).toBeNull();
  });

  it("creates blank rounds with safe defaults and warns only when a round has meaningful configuration", () => {
    const blank = logic.createBlankPlannedRound(5);
    expect(blank).toMatchObject({
      roundId: null,
      roundNumber: 5,
      format: null,
      courseId: null,
      includeInFourDayStandings: false,
      scrambleTeamSize: 4,
      events: [],
      finalized: false,
    });
    expect(logic.isConfiguredEnoughToWarnBeforeRemove(blank)).toBe(false);
    expect(logic.isConfiguredEnoughToWarnBeforeRemove({ ...blank, courseId: 9 })).toBe(true);
    expect(logic.isConfiguredEnoughToWarnBeforeRemove({
      ...blank,
      events: [{ eventType: "INDIVIDUAL_LOW_NET", eventName: "Net", eventOrder: 1 }],
    })).toBe(true);
  });
});
