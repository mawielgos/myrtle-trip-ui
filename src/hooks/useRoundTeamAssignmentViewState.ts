import { useMemo } from "react";
import type {
  RoundCapabilities,
  RoundReadinessResponse,
  RoundStatus,
  RoundTeam,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
} from "../types/round";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
} from "../utils/roundEventCapabilities";
import {
  calculateLocalAssignmentsReady,
  getExpectedTeamSize,
  teamHasAllowedShortTeamException,
} from "../pages/roundTeamAssignmentLogic";

type BaseArgs = {
  status: RoundStatus | null;
  readiness: RoundReadinessResponse | null;
  capabilities: RoundCapabilities | null;
  teams: RoundTeam[];
  unassignedPlayers: RoundTeamPlayer[];
  inactivePlayers: RoundTeamPlayer[];
  scrambleTeamSize: number | null;
};

export function useRoundTeamAssignmentBaseViewState({
  status,
  readiness,
  capabilities,
  teams,
  unassignedPlayers,
  inactivePlayers,
  scrambleTeamSize,
}: BaseArgs) {
  return useMemo(() => {
    const assignedCount = teams.reduce(
      (sum, team) => sum + team.players.length,
      0,
    );
    const totalPlayers = assignedCount + unassignedPlayers.length;
    const inactiveCount = inactivePlayers.length;
    const hasScrambleEvent = roundHasScrambleEvent(readiness, status?.format);
    const hasTwoManLowNetEvent = roundHasTwoManLowNetEvent(
      readiness,
      status?.format,
    );
    const expectedTeamSize = getExpectedTeamSize(
      hasScrambleEvent
        ? "TEAM_SCRAMBLE"
        : hasTwoManLowNetEvent
          ? "TWO_MAN_LOW_NET"
          : status?.format,
      scrambleTeamSize,
    );
    const expectedTeamCount = Math.max(
      1,
      Math.ceil(totalPlayers / expectedTeamSize),
    );
    const isFinalizedRound =
      capabilities?.roundFinalized === true || status?.finalized === true;
    const tripIsLocked =
      capabilities?.tripLocked === true || status?.tripLocked === true;
    const canAssignTeams =
      capabilities?.canAssignTeams ?? (!isFinalizedRound && !tripIsLocked);
    const canSuggestTeamAssignments = canAssignTeams && expectedTeamSize > 1;
    const canEditScrambleSetup =
      capabilities?.canEditScrambleSetup ?? canAssignTeams;
    const canCorrectTeeAfterFinalization =
      capabilities?.canCorrectTeeAfterFinalization ??
      (isFinalizedRound && !tripIsLocked);

    return {
      assignedCount,
      totalPlayers,
      inactiveCount,
      hasScrambleEvent,
      hasTwoManLowNetEvent,
      expectedTeamSize,
      expectedTeamCount,
      isFinalizedRound,
      tripIsLocked,
      canAssignTeams,
      canSuggestTeamAssignments,
      canEditScrambleSetup,
      canCorrectTeeAfterFinalization,
      teeCorrectionsAllowed: canCorrectTeeAfterFinalization,
      teamStructureLocked: !canAssignTeams,
    };
  }, [
    capabilities,
    inactivePlayers.length,
    readiness,
    scrambleTeamSize,
    status,
    teams,
    unassignedPlayers.length,
  ]);
}

type CompletionArgs = {
  status: RoundStatus | null;
  readiness: RoundReadinessResponse | null;
  teams: RoundTeam[];
  unassignedPlayers: RoundTeamPlayer[];
  teamExceptions: RoundTeamExceptionResponse[];
  expectedTeamSize: number;
  hasScrambleEvent: boolean;
  hasTwoManLowNetEvent: boolean;
  isFinalizedRound: boolean;
  dirty: boolean;
  scrambleConfigDirty: boolean;
  saving: boolean;
};

export function getRoundTeamAssignmentCompletionState({
  status,
  readiness,
  teams,
  unassignedPlayers,
  teamExceptions,
  expectedTeamSize,
  hasScrambleEvent,
  hasTwoManLowNetEvent,
  isFinalizedRound,
  dirty,
  scrambleConfigDirty,
  saving,
}: CompletionArgs) {
  const shortFourManTeams = teams.filter(
    (team) => expectedTeamSize === 4 && team.players.length === 3,
  );
  const shortFourManTeamsNeedingException = shortFourManTeams.filter(
    (team) =>
      !teamHasAllowedShortTeamException(
        team,
        teamExceptions,
        expectedTeamSize,
        hasScrambleEvent,
      ),
  );
  const localAssignmentsReady = calculateLocalAssignmentsReady(
    teams,
    unassignedPlayers,
    status?.format,
    expectedTeamSize,
    teamExceptions,
    hasScrambleEvent,
  );
  const serverReadinessReady =
    readiness?.ready ?? readiness?.readyForScoring ?? false;
  const isReadyForScoring =
    (isFinalizedRound || (serverReadinessReady && localAssignmentsReady)) &&
    !dirty &&
    !scrambleConfigDirty;
  const scoringBlockedReason = isFinalizedRound
    ? null
    : dirty || scrambleConfigDirty
      ? "Save assignments before going to scoring."
      : !localAssignmentsReady
        ? "Finish all team/group assignments before going to scoring."
        : !serverReadinessReady
          ? "Round is not ready for scoring. Fix the blocking readiness issues first."
          : null;

  return {
    shortFourManTeams,
    shortFourManTeamsNeedingException,
    localAssignmentsReady,
    serverReadinessReady,
    isReadyForScoring,
    scoringBlockedReason,
    usesDerivedTeeSheetGroups: hasTwoManLowNetEvent || hasScrambleEvent,
    derivedGroupsButtonLabel: dirty
      ? "Save & Set Tee Times"
      : "Set Tee Times / Derived Groups",
    saveButtonLabel: saving
      ? "Saving..."
      : dirty
        ? isFinalizedRound
          ? "Save Tee Corrections"
          : "Save Assignments"
        : "Saved",
  };
}
