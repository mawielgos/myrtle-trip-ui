import { describe, expect, it } from "vitest";
import type {
  RoundGroupPageResponse,
  RoundPlayerStatusResponse,
  RoundReadinessResponse,
  RoundTeeOption,
} from "../types/round";
import * as logic from "./roundGroupsLogic";

const tee = (
  roundTeeId: number,
  teeName: string,
  overrides: Partial<RoundTeeOption> = {},
): RoundTeeOption =>
  ({
    roundTeeId,
    teeName,
    displayName: teeName,
    eligibleForMen: true,
    eligibleForWomen: true,
    menCourseRating: 70,
    womenCourseRating: 72,
    ...overrides,
  }) as RoundTeeOption;

const player = (
  playerId: number,
  playerName: string,
  overrides: Partial<RoundPlayerStatusResponse> = {},
): RoundPlayerStatusResponse =>
  ({
    scorecardId: playerId * 10,
    playerId,
    playerName,
    courseHandicap: null,
    playingHandicap: null,
    participationStatus: "ACTIVE",
    ...overrides,
  }) as RoundPlayerStatusResponse;

describe("Round groups characterization", () => {
  it("normalizes female aliases and defaults unknown gender values to male", () => {
    expect(logic.normalizeGender("female")).toBe("F");
    expect(logic.normalizeGender("W")).toBe("F");
    expect(logic.normalizeGender("M")).toBe("M");
    expect(logic.normalizeGender(null)).toBe("M");
  });

  it("filters tee choices by gender and sorts them by gender-specific rating", () => {
    const tees = [
      tee(1, "Blue", { womenCourseRating: 73.1 }),
      tee(2, "White", { womenCourseRating: 75.2 }),
      tee(3, "Red", { eligibleForWomen: false, womenCourseRating: 77.0 }),
    ];

    expect(
      logic
        .getEligibleSortedTeesForPlayer(tees, "F")
        .map((item) => item.roundTeeId),
    ).toEqual([2, 1]);
  });

  it("uses the preferred default tee when eligible and otherwise chooses the highest-rated eligible tee", () => {
    const tees = [
      tee(1, "Blue", { menCourseRating: 72.4 }),
      tee(2, "White", { menCourseRating: 70.1 }),
      tee(3, "Gold", { eligibleForMen: false, menCourseRating: 74.0 }),
    ];

    expect(logic.getDefaultTeeForGender(tees, 2, "M")).toBe(2);
    expect(logic.getDefaultTeeForGender(tees, 3, "M")).toBe(1);
  });

  it("sorts players by seat order and then by name when seat order matches", () => {
    const sorted = logic.sortPlayers([
      { playerName: "Zulu", seatOrder: null } as never,
      { playerName: "Bravo", seatOrder: 1 } as never,
      { playerName: "Alpha", seatOrder: 1 } as never,
      { playerName: "Echo", seatOrder: 2 } as never,
    ]);

    expect(sorted.map((item) => item.playerName)).toEqual([
      "Alpha",
      "Bravo",
      "Echo",
      "Zulu",
    ]);
  });

  it("normalizes groups by removing inactive players, hydrating round-player details, and sorting groups", () => {
    const roundPlayers = [
      player(1, "Alice", { tripIndex: 4, gender: "F", roundTeeId: 8 }),
      player(2, "Bob", { tripIndex: 2, gender: "M", roundTeeId: null }),
      player(3, "Carl", { participationStatus: "NO_SHOW" }),
    ];
    const response = {
      roundId: 99,
      groups: [
        {
          groupId: 20,
          groupNumber: 2,
          teeTime: "08:10",
          startingHole: 1,
          players: [
            { playerId: 3, playerName: "Carl", seatOrder: 1 },
            { playerId: 2, playerName: "Bob", seatOrder: 2 },
          ],
        },
        {
          groupId: 10,
          groupNumber: 1,
          teeTime: "08:00",
          startingHole: 1,
          players: [{ playerId: 1, playerName: "Alice", seatOrder: 1 }],
        },
      ],
    } as RoundGroupPageResponse;

    const groups = logic.normalizeGroups(response, roundPlayers, 5);

    expect(groups.map((group) => group.groupNumber)).toEqual([1, 2]);
    expect(groups[0].players[0]).toMatchObject({
      playerId: 1,
      tripIndex: 4,
      gender: "F",
      roundTeeId: 8,
    });
    expect(groups[1].players).toHaveLength(1);
    expect(groups[1].players[0]).toMatchObject({ playerId: 2, roundTeeId: 5 });
  });

  it("builds the unassigned list from active players only and excludes players already in groups", () => {
    const roundPlayers = [
      player(1, "Zed"),
      player(2, "Amy", { roundTeeId: null }),
      player(3, "No Show", { participationStatus: "NO_SHOW" }),
    ];
    const groups = [
      {
        groupId: 1,
        groupNumber: 1,
        teeTime: null,
        startingHole: null,
        players: [
          {
            scorecardId: 10,
            playerId: 1,
            playerName: "Zed",
            tripIndex: null,
            gender: null,
            seatOrder: 1,
            roundTeeId: 4,
            participationStatus: "ACTIVE",
          },
        ],
      },
    ];

    const unassigned = logic.buildUnassignedPlayers(roundPlayers, groups, 6);
    expect(unassigned.map((item) => item.playerName)).toEqual(["Amy"]);
    expect(unassigned[0].roundTeeId).toBe(6);
  });

  it("uses readiness capability flags before legacy format when choosing the continuation step", () => {
    const readiness = {
      hasTwoManLowNetEvent: true,
      roundId: 1,
      groupsReady: false,
      teamsReady: false,
      teesReady: false,
      scorecardsReady: false,
      readyForScoring: false,
      ready: false,
      blockingIssues: [],
      warnings: [],
    } as RoundReadinessResponse;

    expect(logic.getContinueLabel(readiness, "STROKE_PLAY")).toBe("Continue to Teams");
    expect(logic.getContinueLabel(null, "STROKE_PLAY")).toBe("Continue to Scoring");
  });

  it("adds tee-time intervals across midnight and rejects invalid times", () => {
    expect(logic.addMinutesToTime("23:55", 10)).toBe("00:05");
    expect(logic.addMinutesToTime("08:00", -15)).toBe("07:45");
    expect(logic.addMinutesToTime("bad", 10)).toBeNull();
  });

  it("formats helper values and falls back for invalid positive-integer input", () => {
    expect(logic.formatIndex(8.26)).toBe("8.3");
    expect(logic.formatIndex(null)).toBe("No index");
    expect(logic.formatParticipationStatus("NO_SHOW")).toBe("No-Show");
    expect(logic.parsePositiveInteger("9.8", 4)).toBe(9);
    expect(logic.parsePositiveInteger("-1", 4)).toBe(4);
    expect(logic.parsePositiveInteger("oops", 4)).toBe(4);
  });
});
