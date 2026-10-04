import { useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteRoundTeamException,
  getRoundReadiness,
  getRoundTeamAssignmentPage,
  getRoundTeamExceptions,
  saveRoundScrambleSeeding,
  saveRoundTeamException,
  saveRoundTeams,
  saveRoundTeeCorrections,
  updateRoundScorecardParticipation,
} from "../api/roundApi";
import type {
  RoundCapabilities,
  RoundReadinessResponse,
  RoundScrambleSeedingRound,
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
  RoundTeeCorrectionRequest,
  SaveRoundScrambleSeedingRequest,
  SaveRoundTeamsRequest,
} from "../types/round";
import {
  getActiveExceptionForTeam,
  getPlayerTeeId,
  getTeamCapacityLabel,
  mergeServerPlayerDetails,
  sortPlayers,
} from "../pages/roundTeamAssignmentLogic";

type Setter<T> = Dispatch<SetStateAction<T>>;

type Args = {
  roundId?: string;
  status: RoundStatus | null;
  capabilities: RoundCapabilities | null;
  setCapabilities: Setter<RoundCapabilities | null>;
  setReadiness: Setter<RoundReadinessResponse | null>;
  teams: RoundTeam[];
  setTeams: Setter<RoundTeam[]>;
  unassignedPlayers: RoundTeamPlayer[];
  setUnassignedPlayers: Setter<RoundTeamPlayer[]>;
  teamExceptions: RoundTeamExceptionResponse[];
  setTeamExceptions: Setter<RoundTeamExceptionResponse[]>;
  defaultRoundTeeId: number | null;
  originalTeeByScorecardId: Record<number, number>;
  setOriginalTeeByScorecardId: Setter<Record<number, number>>;
  scrambleTeamSize: number | null;
  setScrambleTeamSize: Setter<number | null>;
  scrambleSeedingMethod: string;
  setScrambleSeedingMethod: Setter<string>;
  scrambleHandicapDate: string;
  setScrambleHandicapDate: Setter<string>;
  scrambleSeedingRounds: RoundScrambleSeedingRound[];
  setScrambleSeedingRounds: Setter<RoundScrambleSeedingRound[]>;
  setSeedingLabel: Setter<string | null>;
  scrambleConfigDirty: boolean;
  setScrambleConfigDirty: Setter<boolean>;
  dirty: boolean;
  setDirty: Setter<boolean>;
  setError: Setter<string | null>;
  setMessage: Setter<string | null>;
  applyAssignmentPageResponse: (response: RoundTeamAssignmentPageResponse) => void;
  expectedTeamSize: number;
  hasScrambleEvent: boolean;
  hasTwoManLowNetEvent: boolean;
  tripIsLocked: boolean;
  canAssignTeams: boolean;
  canEditScrambleSetup: boolean;
  canCorrectTeeAfterFinalization: boolean;
};

function collectPlayers(
  teamList: RoundTeam[],
  unassignedList: RoundTeamPlayer[],
): RoundTeamPlayer[] {
  return [
    ...teamList.flatMap((team) => team.players),
    ...unassignedList,
  ];
}

export function useRoundTeamAssignmentCommands({
  roundId,
  status,
  capabilities,
  setCapabilities,
  setReadiness,
  teams,
  setTeams,
  unassignedPlayers,
  setUnassignedPlayers,
  teamExceptions,
  setTeamExceptions,
  defaultRoundTeeId,
  originalTeeByScorecardId,
  setOriginalTeeByScorecardId,
  scrambleTeamSize,
  setScrambleTeamSize,
  scrambleSeedingMethod,
  setScrambleSeedingMethod,
  scrambleHandicapDate,
  setScrambleHandicapDate,
  scrambleSeedingRounds,
  setScrambleSeedingRounds,
  setSeedingLabel,
  scrambleConfigDirty,
  setScrambleConfigDirty,
  dirty,
  setDirty,
  setError,
  setMessage,
  applyAssignmentPageResponse,
  expectedTeamSize,
  hasScrambleEvent,
  hasTwoManLowNetEvent,
  tripIsLocked,
  canAssignTeams,
  canEditScrambleSetup,
  canCorrectTeeAfterFinalization,
}: Args) {
  const [saving, setSaving] = useState(false);

  async function handleParticipationChange(
    player: RoundTeamPlayer,
    participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN",
  ): Promise<void> {
    if (!roundId) return;
    if (dirty || scrambleConfigDirty) {
      setError(
        "Save current team changes before marking a player unavailable or active.",
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const response = await updateRoundScorecardParticipation(
        Number(roundId),
        player.scorecardId,
        participationStatus,
      );
      applyAssignmentPageResponse(response);
      setReadiness(await getRoundReadiness(Number(roundId)));
      setDirty(false);
      setMessage(
        participationStatus === "ACTIVE"
          ? `${player.playerName} marked active for this round.`
          : `${player.playerName} marked ${participationStatus === "NO_SHOW" ? "No-Show" : "Withdrawn"} for this round.`,
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update player availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveScrambleConfig(): Promise<void> {
    if (!roundId) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      if (!canEditScrambleSetup) {
        throw new Error(
          capabilities?.editScrambleSetupReason ??
            "Scramble setup changes are not allowed.",
        );
      }

      const payload: SaveRoundScrambleSeedingRequest = {
        scrambleTeamSize: scrambleTeamSize ?? 4,
        seedingMethod: scrambleSeedingMethod,
        scrambleHandicapDate: scrambleHandicapDate || null,
        includedPlannedRoundIds: scrambleSeedingRounds
          .filter((round) => Boolean(round.included) && Boolean(round.eligible))
          .map((round) => round.plannedRoundId),
      };
      const response = await saveRoundScrambleSeeding(Number(roundId), payload);
      setCapabilities(response.capabilities ?? capabilities);
      setScrambleTeamSize(response.scrambleTeamSize ?? scrambleTeamSize ?? 4);
      setScrambleSeedingMethod(
        response.scrambleSeedingMethod ?? "CURRENT_HANDICAP_INDEX",
      );
      setScrambleHandicapDate(
        response.scrambleHandicapDate ??
          response.seedingAsOfDate ??
          scrambleHandicapDate,
      );
      setScrambleSeedingRounds(response.scrambleSeedingRounds ?? []);
      setSeedingLabel(response.seedingLabel ?? null);

      const mergedPlayers = mergeServerPlayerDetails(
        teams,
        unassignedPlayers,
        response,
      );
      setTeams(mergedPlayers.teams);
      setUnassignedPlayers(mergedPlayers.unassignedPlayers);

      const teeSnapshot: Record<number, number> = {};
      for (const player of collectPlayers(
        mergedPlayers.teams,
        mergedPlayers.unassignedPlayers,
      )) {
        const teeId = getPlayerTeeId(
          player,
          response.defaultRoundTeeId ?? defaultRoundTeeId,
        );
        if (teeId !== "") teeSnapshot[player.scorecardId] = Number(teeId);
      }
      setOriginalTeeByScorecardId(teeSnapshot);
      setScrambleConfigDirty(false);
      setMessage(
        "Scramble setup saved. Seed values were refreshed. Use Suggest Teams to reseed with the updated setup.",
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save Scramble setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveFinalizedRoundTeeCorrections(): Promise<void> {
    const changedPlayers = collectPlayers(teams, unassignedPlayers).filter(
      (player) => {
        const currentTeeId = getPlayerTeeId(player, defaultRoundTeeId);
        if (currentTeeId === "") return false;
        return (
          originalTeeByScorecardId[player.scorecardId] !== Number(currentTeeId)
        );
      },
    );
    const payload: RoundTeeCorrectionRequest[] = changedPlayers.map((player) => ({
      scorecardId: player.scorecardId,
      roundTeeId: Number(getPlayerTeeId(player, defaultRoundTeeId)),
    }));
    await saveRoundTeeCorrections(Number(roundId), payload);

    const nextSnapshot = { ...originalTeeByScorecardId };
    for (const player of changedPlayers) {
      nextSnapshot[player.scorecardId] = Number(
        getPlayerTeeId(player, defaultRoundTeeId),
      );
    }
    setOriginalTeeByScorecardId(nextSnapshot);
    setMessage(
      changedPlayers.length === 1
        ? "Tee correction saved. Recalculation completed."
        : `Tee corrections saved for ${changedPlayers.length} players. Recalculation completed.`,
    );
  }

  async function saveEditableRoundTeamAssignments(): Promise<void> {
    const overfilledTeam = teams.find(
      (team) => team.players.length > expectedTeamSize,
    );
    if (overfilledTeam) {
      throw new Error(
        `${overfilledTeam.teamName} has ${overfilledTeam.players.length} players. This format allows ${getTeamCapacityLabel(status?.format, scrambleTeamSize)} per team.`,
      );
    }

    const payload: SaveRoundTeamsRequest = {
      teams: teams
        .filter((team) => team.players.length > 0)
        .map((team) => ({
          teamNumber: team.teamNumber ?? 0,
          teamName: team.teamName,
          players: team.players.map((player, index) => ({
            scorecardId: player.scorecardId,
            playerId: player.playerId,
            playerOrder: player.playerOrder ?? index + 1,
            roundTeeId: Number(getPlayerTeeId(player, defaultRoundTeeId)),
          })),
        })),
    };
    await saveRoundTeams(Number(roundId), payload);
    applyAssignmentPageResponse(
      await getRoundTeamAssignmentPage(Number(roundId)),
    );
    setMessage(
      hasTwoManLowNetEvent
        ? "Team assignments saved. Tee-sheet groups were rebuilt from team order. Open Derived Groups to generate or adjust tee times."
        : hasScrambleEvent
          ? "Scramble teams saved. Tee-sheet groups were rebuilt from team order. Open Derived Groups to generate or adjust tee times."
          : "Team assignments saved.",
    );
  }

  async function handleSave(): Promise<boolean> {
    if (!roundId) return false;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      if (tripIsLocked) {
        throw new Error(
          "This event is complete and locked. Team assignment and tee correction changes are not allowed.",
        );
      }
      if (status?.finalized) {
        if (!canCorrectTeeAfterFinalization) {
          throw new Error(
            capabilities?.correctTeeAfterFinalizationReason ??
              "Tee corrections are not allowed for this round.",
          );
        }
        await saveFinalizedRoundTeeCorrections();
      } else {
        if (!canAssignTeams) {
          throw new Error(
            capabilities?.assignTeamsReason ??
              "Team assignments are not allowed for this round.",
          );
        }
        await saveEditableRoundTeamAssignments();
      }
      setReadiness(await getRoundReadiness(Number(roundId)));
      setDirty(false);
      return true;
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save team assignments.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function reloadReadinessAndExceptions(): Promise<void> {
    if (!roundId) return;
    const [nextReadiness, nextExceptions] = await Promise.all([
      getRoundReadiness(Number(roundId)),
      getRoundTeamExceptions(Number(roundId)),
    ]);
    setReadiness(nextReadiness);
    setTeamExceptions(nextExceptions.exceptions ?? []);
  }

  async function handleSaveGhostException(
    team: RoundTeam,
    ghostPlayerIdValue: string,
    indexMinValue: string,
    indexMaxValue: string,
  ): Promise<void> {
    if (!roundId) return;
    if (team.roundTeamId < 1) {
      setError(
        "Save team assignments before configuring a ghost player for this team.",
      );
      return;
    }
    const ghostPlayerId = Number(ghostPlayerIdValue);
    if (!ghostPlayerId) {
      setError("Select a ghost player before saving the exception.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const existing = getActiveExceptionForTeam(
        teamExceptions,
        team.roundTeamId,
        "GHOST_PLAYER",
      );
      await saveRoundTeamException(Number(roundId), {
        id: existing?.id ?? null,
        roundTeamId: team.roundTeamId,
        exceptionType: "GHOST_PLAYER",
        ghostPlayerId,
        indexMin: indexMinValue.trim() === "" ? null : Number(indexMinValue),
        indexMax: indexMaxValue.trim() === "" ? null : Number(indexMaxValue),
        selectionMethod: "MANUAL",
        active: true,
      });
      await reloadReadinessAndExceptions();
      setMessage(`${team.teamName} ghost player exception saved.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save ghost player exception.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRotationException(team: RoundTeam): Promise<void> {
    if (!roundId) return;
    if (team.roundTeamId < 1) {
      setError(
        "Save team assignments before configuring an extra-shot rotation for this team.",
      );
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const playerNames = sortPlayers(team.players).map(
        (player) => player.playerName,
      );
      const rotationPattern =
        playerNames.length === 3
          ? `${playerNames[0]}: holes 1,4,7,10,13,16; ${playerNames[1]}: holes 2,5,8,11,14,17; ${playerNames[2]}: holes 3,6,9,12,15,18`
          : "Extra shot rotates by player order every hole.";
      const existing = getActiveExceptionForTeam(
        teamExceptions,
        team.roundTeamId,
        "EXTRA_SHOT_ROTATION",
      );
      await saveRoundTeamException(Number(roundId), {
        id: existing?.id ?? null,
        roundTeamId: team.roundTeamId,
        exceptionType: "EXTRA_SHOT_ROTATION",
        rotationPattern,
        active: true,
      });
      await reloadReadinessAndExceptions();
      setMessage(`${team.teamName} extra-shot rotation saved.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save extra-shot rotation.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteException(exceptionId: number): Promise<void> {
    if (!roundId) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await deleteRoundTeamException(Number(roundId), exceptionId);
      await reloadReadinessAndExceptions();
      setMessage("Team exception removed.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to remove team exception.",
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    handleParticipationChange,
    handleSaveScrambleConfig,
    handleSave,
    handleSaveGhostException,
    handleSaveRotationException,
    handleDeleteException,
  };
}
