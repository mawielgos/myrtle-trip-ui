import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  RoundStatus,
  RoundTeam,
  RoundTeamPlayer,
  RoundScrambleSeedingRound,
  RoundTeeOption,
} from "../types/round";
import {
  buildSerpentineTeams,
  getTeamCapacityLabel,
  sortPlayers,
} from "../pages/roundTeamAssignmentLogic";

type Setter<T> = Dispatch<SetStateAction<T>>;

type Args = {
  status: RoundStatus | null;
  teams: RoundTeam[];
  setTeams: Setter<RoundTeam[]>;
  unassignedPlayers: RoundTeamPlayer[];
  setUnassignedPlayers: Setter<RoundTeamPlayer[]>;
  teeOptions: RoundTeeOption[];
  defaultRoundTeeId: number | null;
  scrambleTeamSize: number | null;
  setScrambleTeamSize: Setter<number | null>;
  setScrambleSeedingMethod: Setter<string>;
  setScrambleHandicapDate: Setter<string>;
  setScrambleSeedingRounds: Setter<RoundScrambleSeedingRound[]>;
  scrambleConfigDirty: boolean;
  setScrambleConfigDirty: Setter<boolean>;
  setError: Setter<string | null>;
  setMessage: Setter<string | null>;
  expectedTeamSize: number;
  canAssignTeams: boolean;
  hasScrambleEvent: boolean;
  canUseTee: (player: RoundTeamPlayer, tee: RoundTeeOption) => boolean;
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

export function useRoundTeamAssignmentInteractions({
  status,
  teams,
  setTeams,
  unassignedPlayers,
  setUnassignedPlayers,
  teeOptions,
  defaultRoundTeeId,
  scrambleTeamSize,
  setScrambleTeamSize,
  setScrambleSeedingMethod,
  setScrambleHandicapDate,
  setScrambleSeedingRounds,
  scrambleConfigDirty,
  setScrambleConfigDirty,
  setError,
  setMessage,
  expectedTeamSize,
  canAssignTeams,
  hasScrambleEvent,
  canUseTee,
}: Args) {
  const [dirty, setDirty] = useState(false);
  const [confirmSuggestTeams, setConfirmSuggestTeams] = useState(false);

  function markDirty(): void {
    setDirty(true);
    setConfirmSuggestTeams(false);
    setMessage(null);
    setError(null);
  }

  function markScrambleConfigDirty(): void {
    setScrambleConfigDirty(true);
    setMessage(null);
    setError(null);
  }

  function updatePlayerTee(scorecardId: number, roundTeeId: number): void {
    const targetPlayer = collectPlayers(teams, unassignedPlayers).find(
      (player) => player.scorecardId === scorecardId,
    );
    const targetTee = teeOptions.find((tee) => tee.roundTeeId === roundTeeId);

    if (!targetPlayer || !targetTee) return;
    if (!canUseTee(targetPlayer, targetTee)) {
      setError(
        `${targetPlayer.playerName} is not eligible for ${targetTee.teeName}.`,
      );
      return;
    }

    const nextTeeName = targetTee.teeName;
    const isOverride =
      defaultRoundTeeId != null && roundTeeId !== defaultRoundTeeId;

    markDirty();
    setTeams((prevTeams) =>
      prevTeams.map((team) => ({
        ...team,
        players: team.players.map((player) =>
          player.scorecardId === scorecardId
            ? {
                ...player,
                roundTeeId,
                roundTeeName: nextTeeName,
                teeOverride: isOverride,
              }
            : player,
        ),
      })),
    );
    setUnassignedPlayers((prev) =>
      prev.map((player) =>
        player.scorecardId === scorecardId
          ? {
              ...player,
              roundTeeId,
              roundTeeName: nextTeeName,
              teeOverride: isOverride,
            }
          : player,
      ),
    );
  }

  function moveUnassignedPlayerToTeam(
    player: RoundTeamPlayer,
    roundTeamId: number,
  ): void {
    const targetTeam = teams.find((team) => team.roundTeamId === roundTeamId);

    if (!targetTeam) {
      setError("Team not found.");
      setMessage(null);
      return;
    }

    if (
      targetTeam.players.some(
        (existing) => existing.scorecardId === player.scorecardId,
      )
    ) {
      return;
    }

    if (targetTeam.players.length >= expectedTeamSize) {
      setError(
        `${targetTeam.teamName} is full. This format allows ${getTeamCapacityLabel(status?.format, scrambleTeamSize)} per team.`,
      );
      setMessage(null);
      return;
    }

    markDirty();
    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;
        const nextPlayers = [
          ...team.players,
          { ...player, playerOrder: team.players.length + 1 },
        ];
        return { ...team, players: sortPlayers(nextPlayers) };
      }),
    );
    setUnassignedPlayers((prev) =>
      prev.filter((candidate) => candidate.scorecardId !== player.scorecardId),
    );
  }

  function removePlayerFromTeam(
    scorecardId: number,
    roundTeamId: number,
  ): void {
    const sourceTeam = teams.find((team) => team.roundTeamId === roundTeamId);
    const playerToRemove = sourceTeam?.players.find(
      (player) => player.scorecardId === scorecardId,
    );
    if (!playerToRemove) return;

    markDirty();
    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;
        const nextPlayers = team.players
          .filter((player) => player.scorecardId !== scorecardId)
          .map((player, index) => ({ ...player, playerOrder: index + 1 }));
        return { ...team, players: nextPlayers };
      }),
    );
    setUnassignedPlayers((prev) =>
      sortPlayers([...prev, { ...playerToRemove, playerOrder: null }]),
    );
  }

  function movePlayerWithinTeam(
    roundTeamId: number,
    scorecardId: number,
    direction: "up" | "down",
  ): void {
    markDirty();
    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;
        const index = team.players.findIndex(
          (player) => player.scorecardId === scorecardId,
        );
        if (index === -1) return team;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= team.players.length) return team;

        const nextPlayers = [...team.players];
        const temp = nextPlayers[index];
        nextPlayers[index] = nextPlayers[targetIndex];
        nextPlayers[targetIndex] = temp;

        return {
          ...team,
          players: nextPlayers.map((player, idx) => ({
            ...player,
            playerOrder: idx + 1,
          })),
        };
      }),
    );
  }

  function updateScrambleSeedingRound(
    plannedRoundId: number,
    included: boolean,
  ): void {
    setScrambleSeedingRounds((prev) =>
      prev.map((round) =>
        round.plannedRoundId === plannedRoundId
          ? { ...round, included }
          : round,
      ),
    );
    markScrambleConfigDirty();
  }

  function updateScrambleTeamSize(nextSize: number): void {
    setScrambleTeamSize(nextSize);
    markScrambleConfigDirty();
  }

  function updateScrambleSeedingMethod(nextMethod: string): void {
    setScrambleSeedingMethod(nextMethod);
    markScrambleConfigDirty();
  }

  function updateScrambleHandicapDate(nextDate: string): void {
    setScrambleHandicapDate(nextDate);
    markScrambleConfigDirty();
  }

  function applySuggestedScrambleTeams(): void {
    const allPlayers = collectPlayers(teams, unassignedPlayers);
    if (allPlayers.length === 0) return;

    setTeams(
      buildSerpentineTeams(allPlayers, status?.format, scrambleTeamSize),
    );
    setUnassignedPlayers([]);
    setConfirmSuggestTeams(false);
    markDirty();
    setMessage(
      hasScrambleEvent
        ? "Suggested scramble teams by serpentine seeding using the current Scramble setup. Review and save assignments."
        : "Suggested teams by serpentine seeding using current player indexes. Review and save assignments.",
    );
  }

  function suggestScrambleTeams(assignTeamsReason?: string | null): void {
    if (!canAssignTeams) {
      setError(assignTeamsReason ?? "Team suggestions are not allowed for this round.");
      return;
    }
    if (hasScrambleEvent && scrambleConfigDirty) {
      setError("Save Scramble Setup before suggesting teams.");
      return;
    }

    const allPlayers = collectPlayers(teams, unassignedPlayers);
    if (allPlayers.length === 0) return;

    if (teams.some((team) => team.players.length > 0)) {
      setConfirmSuggestTeams(true);
      setMessage(null);
      setError(null);
      return;
    }

    applySuggestedScrambleTeams();
  }

  return {
    dirty,
    setDirty,
    confirmSuggestTeams,
    setConfirmSuggestTeams,
    updatePlayerTee,
    moveUnassignedPlayerToTeam,
    removePlayerFromTeam,
    movePlayerWithinTeam,
    updateScrambleSeedingRound,
    updateScrambleTeamSize,
    updateScrambleSeedingMethod,
    updateScrambleHandicapDate,
    applySuggestedScrambleTeams,
    suggestScrambleTeams,
  };
}
