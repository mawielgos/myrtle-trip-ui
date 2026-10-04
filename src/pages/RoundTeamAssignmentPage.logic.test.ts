import { describe, expect, it } from "vitest";
import type {
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
  RoundTeeOption,
} from "../types/round";
import * as logic from "./roundTeamAssignmentLogic";

const player = (
  scorecardId: number,
  playerName: string,
  tripIndex: number | null,
  overrides: Partial<RoundTeamPlayer> = {},
): RoundTeamPlayer =>
  ({
    scorecardId,
    playerId: scorecardId,
    playerName,
    tripIndex,
    playerOrder: scorecardId,
    ...overrides,
  }) as RoundTeamPlayer;

const team = (
  roundTeamId: number,
  teamNumber: number,
  players: RoundTeamPlayer[],
): RoundTeam =>
  ({
    roundTeamId,
    teamNumber,
    teamName: `Team ${teamNumber}`,
    players,
  }) as RoundTeam;

const exception = (
  roundTeamId: number,
  exceptionType: string,
  active = true,
): RoundTeamExceptionResponse =>
  ({ roundTeamId, exceptionType, active }) as RoundTeamExceptionResponse;

describe("Round team assignment characterization", () => {
  it("requires every player to be assigned before exact-format teams are ready", () => {
    const teams = [
      team(1, 1, [player(1, "A", 1), player(2, "B", 2)]),
    ];

    expect(
      logic.calculateLocalAssignmentsReady(
        teams,
        [player(3, "C", 3)],
        "TWO_MAN_LOW_NET",
        2,
      ),
    ).toBe(false);
  });

  it("accepts a three-player four-man team only with the correct active exception", () => {
    const teams = [
      team(10, 1, [
        player(1, "A", 1),
        player(2, "B", 2),
        player(3, "C", 3),
      ]),
    ];

    expect(
      logic.calculateLocalAssignmentsReady(
        teams,
        [],
        "MIDDLE_MAN",
        4,
        [exception(10, "GHOST_PLAYER")],
        false,
      ),
    ).toBe(true);

    expect(
      logic.calculateLocalAssignmentsReady(
        teams,
        [],
        "TEAM_SCRAMBLE",
        4,
        [exception(10, "EXTRA_SHOT_ROTATION")],
        true,
      ),
    ).toBe(true);

    expect(
      logic.calculateLocalAssignmentsReady(
        teams,
        [],
        "TEAM_SCRAMBLE",
        4,
        [exception(10, "GHOST_PLAYER")],
        true,
      ),
    ).toBe(false);
  });

  it("builds the expected number and size target for default teams", () => {
    const twoManTeams = logic.buildDefaultTeams(7, "TWO_MAN_LOW_NET");
    expect(twoManTeams).toHaveLength(4);
    expect(twoManTeams.map((item) => item.teamNumber)).toEqual([1, 2, 3, 4]);

    const scrambleTeams = logic.buildDefaultTeams(9, "TEAM_SCRAMBLE", 3);
    expect(scrambleTeams).toHaveLength(3);
    expect(logic.getExpectedTeamSize("TEAM_SCRAMBLE", 3)).toBe(3);
  });

  it("serpentine-seeds players by trip index and reorders each team consistently", () => {
    const players = [
      player(1, "P1", 1),
      player(2, "P2", 2),
      player(3, "P3", 3),
      player(4, "P4", 4),
      player(5, "P5", 5),
      player(6, "P6", 6),
      player(7, "P7", 7),
      player(8, "P8", 8),
    ];

    const teams = logic.buildSerpentineTeams(players, "MIDDLE_MAN");

    expect(teams).toHaveLength(2);
    expect(teams[0].players.map((item) => item.playerName)).toEqual([
      "P1",
      "P4",
      "P5",
      "P8",
    ]);
    expect(teams[1].players.map((item) => item.playerName)).toEqual([
      "P2",
      "P3",
      "P6",
      "P7",
    ]);
    expect(teams[0].players.map((item) => item.playerOrder)).toEqual([1, 2, 3, 4]);
  });

  it("sorts null trip indexes after indexed players and breaks ties by name", () => {
    const players = [
      player(1, "Zulu", null),
      player(2, "Bravo", 5),
      player(3, "Alpha", 5),
      player(4, "Echo", 2),
    ];

    const sorted = [...players].sort(logic.comparePlayersForSeeding);
    expect(sorted.map((item) => item.playerName)).toEqual([
      "Echo",
      "Alpha",
      "Bravo",
      "Zulu",
    ]);
  });

  it("merges refreshed server player details without replacing local assignment order", () => {
    const localTeams = [
      team(1, 1, [player(1, "Old Name", 9, { playerOrder: 2 })]),
    ];
    const page = {
      teams: [
        team(99, 9, [
          player(1, "Fresh Name", 3, {
            playerId: 101,
            gender: "F",
            roundTeeId: 77,
            roundTeeName: "Green",
            teeOverride: true,
          }),
        ]),
      ],
      unassignedPlayers: [],
      inactivePlayers: [],
    } as unknown as RoundTeamAssignmentPageResponse;

    const merged = logic.mergeServerPlayerDetails(localTeams, [], page);
    expect(merged.teams[0].roundTeamId).toBe(1);
    expect(merged.teams[0].players[0]).toMatchObject({
      playerOrder: 2,
      playerId: 101,
      playerName: "Fresh Name",
      tripIndex: 3,
      gender: "F",
      roundTeeId: 77,
      roundTeeName: "Green",
      teeOverride: true,
    });
  });

  it("filters and sorts tee choices using gender-specific eligibility and ratings", () => {
    const female = player(1, "Jane", 1, { gender: "F" });
    const tees = [
      {
        teeId: 1,
        teeName: "Blue",
        eligibleForWomen: true,
        womenCourseRating: 72.1,
      },
      {
        teeId: 2,
        teeName: "White",
        eligibleForWomen: true,
        womenCourseRating: 74.3,
      },
      {
        teeId: 3,
        teeName: "Red",
        eligibleForWomen: false,
        womenCourseRating: 76.0,
      },
    ] as unknown as RoundTeeOption[];

    expect(
      logic
        .getEligibleSortedTeesForPlayer(tees, female)
        .map((item) => item.teeName),
    ).toEqual(["White", "Blue"]);
  });

  it("preserves current format labels, capacity labels, and tee fallback behavior", () => {
    expect(logic.getRoundFormatLabel("TEAM_SCRAMBLE", 3)).toBe("3-Man Scramble");
    expect(logic.getRoundFormatLabel("TEAM_TWO_MAN_LOW_NET")).toBe("2-Man Low Net");
    expect(logic.getTeamCapacityLabel("TWO_MAN_LOW_NET")).toBe("2 players");
    expect(logic.getPlayerTeeId(player(1, "A", 1, { roundTeeId: null }), 42)).toBe(42);
  });
});
