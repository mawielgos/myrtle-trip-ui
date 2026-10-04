import type {
  RoundScrambleSeedingRound,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
  RoundTeeOption,
} from "../types/round";

export function cloneTeams(teams: RoundTeam[]): RoundTeam[] {
  return teams.map((team) => ({
    ...team,
    players: (team.players ?? []).map((player) => ({ ...player })),
  }));
}

export function sortTeams(teams: RoundTeam[]): RoundTeam[] {
  return [...teams].sort((a, b) => {
    const aOrder = a.teamNumber ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.teamNumber ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

export function sortPlayers(players: RoundTeamPlayer[]): RoundTeamPlayer[] {
  return [...players].sort((a, b) => {
    const aOrder = a.playerOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.playerOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.playerName.localeCompare(b.playerName);
  });
}

export function getActiveExceptionForTeam(
  exceptions: RoundTeamExceptionResponse[],
  roundTeamId: number,
  exceptionType?: string,
): RoundTeamExceptionResponse | null {
  return (
    exceptions.find(
      (item) =>
        item.roundTeamId === roundTeamId &&
        item.active !== false &&
        (!exceptionType || item.exceptionType === exceptionType),
    ) ?? null
  );
}

export function teamHasAllowedShortTeamException(
  team: RoundTeam,
  exceptions: RoundTeamExceptionResponse[],
  expectedTeamSize: number,
  hasScrambleEvent: boolean,
): boolean {
  const playerCount = team.players?.length ?? 0;
  if (expectedTeamSize !== 4 || playerCount !== 3) return false;
  const exceptionType = hasScrambleEvent
    ? "EXTRA_SHOT_ROTATION"
    : "GHOST_PLAYER";
  return (
    getActiveExceptionForTeam(exceptions, team.roundTeamId, exceptionType) !=
    null
  );
}

export function buildPlayerDetailMap(
  page: RoundTeamAssignmentPageResponse,
): Map<number, RoundTeamPlayer> {
  const result = new Map<number, RoundTeamPlayer>();

  for (const team of page.teams ?? []) {
    for (const player of team.players ?? []) {
      result.set(player.scorecardId, player);
    }
  }

  for (const player of page.unassignedPlayers ?? []) {
    result.set(player.scorecardId, player);
  }

  for (const player of page.inactivePlayers ?? []) {
    result.set(player.scorecardId, player);
  }

  return result;
}

export function mergeServerPlayerDetails(
  currentTeams: RoundTeam[],
  currentUnassignedPlayers: RoundTeamPlayer[],
  page: RoundTeamAssignmentPageResponse,
): { teams: RoundTeam[]; unassignedPlayers: RoundTeamPlayer[] } {
  const playerDetailMap = buildPlayerDetailMap(page);

  function mergePlayer(player: RoundTeamPlayer): RoundTeamPlayer {
    const serverPlayer = playerDetailMap.get(player.scorecardId);
    if (!serverPlayer) return { ...player };

    return {
      ...player,
      playerId: serverPlayer.playerId,
      playerName: serverPlayer.playerName,
      gender: serverPlayer.gender,
      tripIndex: serverPlayer.tripIndex,
      roundTeeId: serverPlayer.roundTeeId,
      roundTeeName: serverPlayer.roundTeeName,
      teeOverride: serverPlayer.teeOverride,
    };
  }

  return {
    teams: currentTeams.map((team) => ({
      ...team,
      players: (team.players ?? []).map(mergePlayer),
    })),
    unassignedPlayers: currentUnassignedPlayers.map(mergePlayer),
  };
}

export function getRoundFormatLabel(
  format?: string | null,
  scrambleTeamSize?: number | null,
): string {
  switch (format) {
    case "MIDDLE_MAN":
      return "4-Man Middle Man";
    case "ONE_TWO_THREE":
      return "4-Man 1-2-3";
    case "TWO_MAN_LOW_NET":
    case "TEAM_TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "TEAM_TWO_LOW_NET":
      return "4-Man 2-Low Net";
    case "THREE_LOW_NET":
    case "TEAM_THREE_LOW_NET":
      return "4-Man 3 Low Net";
    case "TEAM_SCRAMBLE":
      return `${scrambleTeamSize ?? 4}-Man Scramble`;
    case "STROKE_PLAY":
      return "Stroke Play";
    default:
      return format ? format.replace(/_/g, " ") : "";
  }
}

export function getExpectedTeamSize(
  format?: string | null,
  scrambleTeamSize?: number | null,
): number {
  if (format === "TEAM_SCRAMBLE") {
    return scrambleTeamSize ?? 4;
  }
  if (format === "TWO_MAN_LOW_NET" || format === "TEAM_TWO_MAN_LOW_NET") {
    return 2;
  }

  return 4;
}

export function formatRequiresExactTeams(format?: string | null): boolean {
  return (
    format === "MIDDLE_MAN" ||
    format === "ONE_TWO_THREE" ||
    format === "TWO_MAN_LOW_NET" ||
    format === "TEAM_TWO_MAN_LOW_NET" ||
    format === "THREE_LOW_NET" ||
    format === "TEAM_TWO_LOW_NET" ||
    format === "TEAM_THREE_LOW_NET" ||
    format === "TEAM_SCRAMBLE"
  );
}

export function calculateLocalAssignmentsReady(
  teams: RoundTeam[],
  unassignedPlayers: RoundTeamPlayer[],
  format: string | null | undefined,
  expectedTeamSize = 4,
  exceptions: RoundTeamExceptionResponse[] = [],
  hasScrambleEvent = false,
): boolean {
  if ((unassignedPlayers?.length ?? 0) > 0) {
    return false;
  }

  const populatedTeams = (teams ?? []).filter(
    (team) => (team.players?.length ?? 0) > 0,
  );
  if (populatedTeams.length === 0) {
    return false;
  }

  if (formatRequiresExactTeams(format)) {
    return populatedTeams.every((team) => {
      const playerCount = team.players?.length ?? 0;
      return (
        playerCount === expectedTeamSize ||
        teamHasAllowedShortTeamException(
          team,
          exceptions,
          expectedTeamSize,
          hasScrambleEvent,
        )
      );
    });
  }

  return populatedTeams.every((team) => {
    const playerCount = team.players?.length ?? 0;
    return playerCount > 0 && playerCount <= 4;
  });
}

export function buildDefaultTeams(
  playerCount: number,
  format?: string | null,
  scrambleTeamSize?: number | null,
): RoundTeam[] {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  const teamCount = Math.max(1, Math.ceil(playerCount / expectedTeamSize));
  return Array.from({ length: teamCount }, (_, index) => ({
    roundTeamId: -(index + 1),
    teamNumber: index + 1,
    teamName: `Team ${index + 1}`,
    players: [],
  }));
}

export function comparePlayersForSeeding(
  a: RoundTeamPlayer,
  b: RoundTeamPlayer,
): number {
  const aIndex = a.tripIndex;
  const bIndex = b.tripIndex;

  if (aIndex == null && bIndex == null) {
    return a.playerName.localeCompare(b.playerName);
  }
  if (aIndex == null) {
    return 1;
  }
  if (bIndex == null) {
    return -1;
  }

  const indexCompare = Number(aIndex) - Number(bIndex);
  if (indexCompare !== 0) {
    return indexCompare;
  }

  return a.playerName.localeCompare(b.playerName);
}

export function buildSerpentineTeams(
  players: RoundTeamPlayer[],
  format?: string | null,
  scrambleTeamSize?: number | null,
): RoundTeam[] {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  const sortedPlayers = [...players].sort(comparePlayersForSeeding);
  const teamCount = Math.max(
    1,
    Math.ceil(sortedPlayers.length / expectedTeamSize),
  );
  const nextTeams = buildDefaultTeams(
    sortedPlayers.length,
    format,
    scrambleTeamSize,
  );

  sortedPlayers.forEach((player, index) => {
    const rowNumber = Math.floor(index / teamCount);
    const columnNumber = index % teamCount;
    const teamIndex =
      rowNumber % 2 === 0 ? columnNumber : teamCount - 1 - columnNumber;
    const targetTeam = nextTeams[teamIndex];

    targetTeam.players.push({
      ...player,
      playerOrder: targetTeam.players.length + 1,
    });
  });

  return nextTeams.map((team) => ({
    ...team,
    players: [...team.players]
      .sort(comparePlayersForSeeding)
      .map((player, index) => ({ ...player, playerOrder: index + 1 })),
  }));
}

export function getTeamCapacityLabel(
  format?: string | null,
  scrambleTeamSize?: number | null,
): string {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  return expectedTeamSize === 1 ? "1 player" : `${expectedTeamSize} players`;
}

export function normalizeGender(gender?: string | null): "M" | "F" {
  return gender?.trim().toUpperCase() === "F" ? "F" : "M";
}

export function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === "F") return tee.womenCourseRating ?? -999;
  return tee.menCourseRating ?? -999;
}

export function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === "F")
    return tee.displayNameForWomen || tee.displayName || tee.teeName;
  return tee.displayNameForMen || tee.displayName || tee.teeName;
}

export function playerCanUseTee(
  player: RoundTeamPlayer,
  tee: RoundTeeOption,
): boolean {
  const gender = normalizeGender(player.gender);
  if (gender === "F") return tee.eligibleForWomen === true;
  return tee.eligibleForMen !== false;
}

export function getEligibleSortedTeesForPlayer(
  teeOptions: RoundTeeOption[],
  player: RoundTeamPlayer,
): RoundTeeOption[] {
  return [...teeOptions]
    .filter((tee) => playerCanUseTee(player, tee))
    .sort((a, b) => {
      const ratingCompare =
        getTeeRatingForPlayer(b, player.gender) -
        getTeeRatingForPlayer(a, player.gender);
      if (ratingCompare !== 0) return ratingCompare;
      return (a.teeName || "").localeCompare(b.teeName || "");
    });
}

export function getPlayerTeeId(
  player: RoundTeamPlayer,
  defaultRoundTeeId?: number | null,
): number | "" {
  return player.roundTeeId ?? defaultRoundTeeId ?? "";
}

export function getScrambleSeedingMethodLabel(method?: string | null): string {
  switch (method) {
    case "AVERAGE_GROSS_SCORE":
      return "Average Gross";
    case "AVERAGE_NET_SCORE":
      return "Average Net";
    default:
      return "Current Handicap Index";
  }
}

export function formatSeedingRoundLabel(round: RoundScrambleSeedingRound): string {
  const pieces: string[] = [];
  pieces.push(`Round ${round.roundNumber ?? "?"}`);
  if (round.roundDate) pieces.push(round.roundDate);
  if (round.courseName) pieces.push(round.courseName);
  if (round.format) pieces.push(getRoundFormatLabel(round.format));
  return pieces.join(" • ");
}
