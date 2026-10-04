import { useMemo } from "react";
import type {
  RoundReadinessResponse,
  RoundStatus,
  ScrambleScoreEntryMode,
} from "../types/round";
import { roundHasScrambleEvent } from "../utils/roundEventCapabilities";
import {
  normalizeParticipationStatus,
  rowHasRequiredScores,
  type ScoreRow,
} from "../pages/roundScoringLogic";
import {
  buildScrambleSnapshot,
  isScrambleTeamComplete,
  type ScrambleTeamRow,
} from "../pages/roundScrambleScoringLogic";

interface UseRoundScoringViewStateArgs {
  status: RoundStatus | null;
  readiness: RoundReadinessResponse | null;
  rows: ScoreRow[];
  scrambleRows: ScrambleTeamRow[];
  scrambleEntryMode: ScrambleScoreEntryMode;
  initialRowsSnapshot: string;
  loading: boolean;
  viewOnlyMode: boolean;
}

export function useRoundScoringViewState({
  status,
  readiness,
  rows,
  scrambleRows,
  scrambleEntryMode,
  initialRowsSnapshot,
  loading,
  viewOnlyMode,
}: UseRoundScoringViewStateArgs) {
  const isScramble = roundHasScrambleEvent(readiness, status?.format);

  const comparableRowsSnapshot = useMemo(() => {
    if (isScramble) {
      return buildScrambleSnapshot(scrambleEntryMode, scrambleRows);
    }

    return JSON.stringify(
      rows.map((row) => ({
        scorecardId: row.scorecardId,
        roundTeeId: row.roundTeeId ?? null,
        participationStatus: normalizeParticipationStatus(
          row.participationStatus,
        ),
        withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
        holes: row.holes.map((value) => value.trim()),
      })),
    );
  }, [isScramble, rows, scrambleEntryMode, scrambleRows]);

  const hasChanges =
    !loading &&
    initialRowsSnapshot.length > 0 &&
    comparableRowsSnapshot !== initialRowsSnapshot;

  const summary = useMemo(() => {
    if (isScramble) {
      const completedTeams = scrambleRows.filter((team) =>
        isScrambleTeamComplete(team, scrambleEntryMode),
      );

      return {
        playerCount: scrambleRows.length,
        completedCount: completedTeams.length,
        incompleteCount: scrambleRows.length - completedTeams.length,
        unassignedCount: 0,
        unassignedPlayers: [] as ScoreRow[],
      };
    }

    const completedPlayers = rows.filter(rowHasRequiredScores);
    const incompletePlayers = rows.filter((row) => !rowHasRequiredScores(row));
    const unassignedPlayers = rows.filter((row) => !row.teamId);

    return {
      playerCount: rows.length,
      completedCount: completedPlayers.length,
      incompleteCount: incompletePlayers.length,
      unassignedCount: unassignedPlayers.length,
      unassignedPlayers,
    };
  }, [isScramble, rows, scrambleEntryMode, scrambleRows]);

  const hasIncompleteScorecards = summary.incompleteCount > 0;
  const roundLockedByCompleteTrip = Boolean(status?.tripLocked);
  const tripCorrectionMode = Boolean(status?.tripCorrectionMode);
  const scoringReadOnly = roundLockedByCompleteTrip || viewOnlyMode;
  const readinessReadyForScoring =
    readiness?.ready ?? readiness?.readyForScoring ?? false;
  const readinessReadyForFinalization =
    readiness?.readyForFinalization ??
    (readinessReadyForScoring && !hasIncompleteScorecards);
  const readinessBlocksScoring = Boolean(
    status && !status.finalized && !readinessReadyForScoring,
  );
  const canFinalize =
    !status?.finalized &&
    readinessReadyForFinalization &&
    !hasIncompleteScorecards &&
    summary.playerCount > 0;


  return {
    isScramble,
    hasChanges,
    summary,
    hasIncompleteScorecards,
    roundLockedByCompleteTrip,
    tripCorrectionMode,
    scoringReadOnly,
    readinessReadyForScoring,
    readinessReadyForFinalization,
    readinessBlocksScoring,
    canFinalize,
  };
}


interface DeriveRoundScoringActionStateArgs {
  status: RoundStatus | null;
  saving: boolean;
  finalizing: boolean;
  refreshingHandicaps: boolean;
  scoringReadOnly: boolean;
  hasChanges: boolean;
  canFinalize: boolean;
}

export function deriveRoundScoringActionState({
  status,
  saving,
  finalizing,
  refreshingHandicaps,
  scoringReadOnly,
  hasChanges,
  canFinalize,
}: DeriveRoundScoringActionStateArgs) {
  return {
    saveDisabled:
      saving ||
      finalizing ||
      refreshingHandicaps ||
      scoringReadOnly ||
      !hasChanges,
    finalizeDisabled:
      !!status?.finalized ||
      finalizing ||
      saving ||
      refreshingHandicaps ||
      scoringReadOnly ||
      !canFinalize,
    refreshHandicapsDisabled:
      !status ||
      status.finalized ||
      saving ||
      finalizing ||
      refreshingHandicaps ||
      scoringReadOnly ||
      hasChanges,
    showSaveButton: !scoringReadOnly,
    saveButtonLabel: status?.finalized ? "Save Corrections" : "Save Scores",
  };
}
