import { useCallback, useEffect, useState } from "react";
import {
  getRoundReadiness,
  getRoundStatus,
  getRoundTeamAssignmentPage,
  getRoundTeamExceptions,
} from "../api/roundApi";
import { getTripRounds } from "../api/tripApi";
import type {
  RoundCapabilities,
  RoundReadinessResponse,
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
  RoundScrambleSeedingRound,
  RoundTeeOption,
} from "../types/round";
import {
  buildDefaultTeams,
  cloneTeams,
  getPlayerTeeId,
  sortPlayers,
  sortTeams,
} from "../pages/roundTeamAssignmentLogic";

async function loadEventRoundNumber(status: RoundStatus): Promise<number | null> {
  if (
    typeof status.roundNumber === "number" &&
    Number.isFinite(status.roundNumber)
  ) {
    return status.roundNumber;
  }

  if (status.tripId == null) {
    return null;
  }

  try {
    const rounds = await getTripRounds(status.tripId);
    const matchedRound = rounds.find((round) => round.roundId === status.roundId);
    return matchedRound?.roundNumber ?? null;
  } catch (err) {
    console.error(
      "Failed to load event round number for team assignment page",
      err,
    );
    return null;
  }
}

function collectPlayers(
  teamList: RoundTeam[],
  unassignedList: RoundTeamPlayer[],
): RoundTeamPlayer[] {
  const players: RoundTeamPlayer[] = [];
  for (const team of teamList) {
    for (const player of team.players) players.push(player);
  }
  for (const player of unassignedList) players.push(player);
  return players;
}

function buildTeeSnapshot(
  teamList: RoundTeam[],
  unassignedList: RoundTeamPlayer[],
  defaultRoundTeeId: number | null,
): Record<number, number> {
  const teeSnapshot: Record<number, number> = {};
  for (const player of collectPlayers(teamList, unassignedList)) {
    const teeId = getPlayerTeeId(player, defaultRoundTeeId);
    if (teeId !== "") teeSnapshot[player.scorecardId] = Number(teeId);
  }
  return teeSnapshot;
}

export function useRoundTeamAssignmentPageData(roundId?: string) {
  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [eventRoundNumber, setEventRoundNumber] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<RoundReadinessResponse | null>(null);
  const [capabilities, setCapabilities] = useState<RoundCapabilities | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [defaultRoundTeeId, setDefaultRoundTeeId] = useState<number | null>(
    null,
  );
  const [teeOptions, setTeeOptions] = useState<RoundTeeOption[]>([]);
  const [teams, setTeams] = useState<RoundTeam[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<RoundTeamPlayer[]>(
    [],
  );
  const [inactivePlayers, setInactivePlayers] = useState<RoundTeamPlayer[]>([]);
  const [teamExceptions, setTeamExceptions] = useState<
    RoundTeamExceptionResponse[]
  >([]);
  const [originalTeeByScorecardId, setOriginalTeeByScorecardId] = useState<
    Record<number, number>
  >({});
  const [seedingLabel, setSeedingLabel] = useState<string | null>(null);
  const [scrambleTeamSize, setScrambleTeamSize] = useState<number | null>(null);
  const [scrambleSeedingMethod, setScrambleSeedingMethod] = useState<string>(
    "CURRENT_HANDICAP_INDEX",
  );
  const [scrambleHandicapDate, setScrambleHandicapDate] = useState<string>("");
  const [scrambleSeedingRounds, setScrambleSeedingRounds] = useState<
    RoundScrambleSeedingRound[]
  >([]);
  const [scrambleConfigDirty, setScrambleConfigDirty] = useState(false);

  const applyAssignmentPageResponse = useCallback(
    (response: RoundTeamAssignmentPageResponse): void => {
      setCapabilities((current) => response.capabilities ?? current);
      setDefaultRoundTeeId((current) => response.defaultRoundTeeId ?? current);
      setTeeOptions((current) => response.teeOptions ?? current);
      setSeedingLabel((current) => response.seedingLabel ?? current);
      setScrambleTeamSize((current) => response.scrambleTeamSize ?? current);
      setScrambleSeedingMethod(
        (current) => response.scrambleSeedingMethod ?? current,
      );
      setScrambleHandicapDate(
        (current) =>
          response.scrambleHandicapDate ?? response.seedingAsOfDate ?? current,
      );
      setScrambleSeedingRounds(
        (current) => response.scrambleSeedingRounds ?? current,
      );

      const nextTeams = cloneTeams(sortTeams(response.teams ?? []));
      const nextUnassignedPlayers = sortPlayers(response.unassignedPlayers ?? []);
      setTeams(nextTeams);
      setUnassignedPlayers(nextUnassignedPlayers);
      setInactivePlayers(sortPlayers(response.inactivePlayers ?? []));

      const snapshotDefaultTeeId = response.defaultRoundTeeId ?? defaultRoundTeeId;
      setOriginalTeeByScorecardId(
        buildTeeSnapshot(
          response.teams ?? [],
          response.unassignedPlayers ?? [],
          snapshotDefaultTeeId,
        ),
      );
    },
    [defaultRoundTeeId],
  );

  const loadPage = useCallback(async (): Promise<void> => {
    if (!roundId) {
      setError("Missing round id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const numericRoundId = Number(roundId);
      const [
        statusResponse,
        readinessResponse,
        teamAssignmentResponse,
        teamExceptionResponse,
      ] = await Promise.all([
        getRoundStatus(numericRoundId),
        getRoundReadiness(numericRoundId),
        getRoundTeamAssignmentPage(numericRoundId),
        getRoundTeamExceptions(numericRoundId),
      ]);

      setStatus(statusResponse);
      setEventRoundNumber(await loadEventRoundNumber(statusResponse));
      setReadiness(readinessResponse);

      const response: RoundTeamAssignmentPageResponse = teamAssignmentResponse;
      setCapabilities(response.capabilities ?? statusResponse.capabilities ?? null);
      const nextDefaultRoundTeeId = response.defaultRoundTeeId ?? null;
      setDefaultRoundTeeId(nextDefaultRoundTeeId);
      setTeeOptions(response.teeOptions ?? []);
      setSeedingLabel(response.seedingLabel ?? null);
      setScrambleTeamSize(
        response.scrambleTeamSize ?? statusResponse.scrambleTeamSize ?? 4,
      );
      setScrambleSeedingMethod(
        response.scrambleSeedingMethod ?? "CURRENT_HANDICAP_INDEX",
      );
      setScrambleHandicapDate(
        response.scrambleHandicapDate ??
          response.seedingAsOfDate ??
          statusResponse.roundDate ??
          "",
      );
      setScrambleSeedingRounds(response.scrambleSeedingRounds ?? []);
      setScrambleConfigDirty(false);

      const normalizedUnassignedPlayers = sortPlayers(
        response.unassignedPlayers ?? [],
      );
      const normalizedInactivePlayers = sortPlayers(
        response.inactivePlayers ?? [],
      );
      const hasSavedPlayerAssignments = Boolean(
        response.teams &&
          response.teams.some((team) => (team.players ?? []).length > 0),
      );
      const normalizedTeams = hasSavedPlayerAssignments
        ? cloneTeams(sortTeams(response.teams))
        : buildDefaultTeams(
            statusResponse.players?.length ?? normalizedUnassignedPlayers.length,
            statusResponse.format,
            response.scrambleTeamSize ?? statusResponse.scrambleTeamSize ?? 4,
          );

      setTeams(normalizedTeams);
      setUnassignedPlayers(normalizedUnassignedPlayers);
      setInactivePlayers(normalizedInactivePlayers);
      setTeamExceptions(teamExceptionResponse.exceptions ?? []);
      setOriginalTeeByScorecardId(
        buildTeeSnapshot(
          normalizedTeams,
          normalizedUnassignedPlayers,
          nextDefaultRoundTeeId,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load team assignment page.",
      );
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  return {
    status,
    eventRoundNumber,
    readiness,
    setReadiness,
    capabilities,
    setCapabilities,
    loading,
    error,
    setError,
    message,
    setMessage,
    defaultRoundTeeId,
    setDefaultRoundTeeId,
    teeOptions,
    setTeeOptions,
    teams,
    setTeams,
    unassignedPlayers,
    setUnassignedPlayers,
    inactivePlayers,
    setInactivePlayers,
    teamExceptions,
    setTeamExceptions,
    originalTeeByScorecardId,
    setOriginalTeeByScorecardId,
    seedingLabel,
    setSeedingLabel,
    scrambleTeamSize,
    setScrambleTeamSize,
    scrambleSeedingMethod,
    setScrambleSeedingMethod,
    scrambleHandicapDate,
    setScrambleHandicapDate,
    scrambleSeedingRounds,
    setScrambleSeedingRounds,
    scrambleConfigDirty,
    setScrambleConfigDirty,
    applyAssignmentPageResponse,
    loadPage,
  };
}
