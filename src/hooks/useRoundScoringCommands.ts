import { useState } from "react";
import {
  finalizeRound,
  refreshRoundHandicaps,
  saveBulkScores,
  saveRoundScrambleScores,
  setScorecardParticipation,
  setScorecardTee,
} from "../api/roundApi";
import { saveRoundCorrections } from "../api/roundCorrectionApi";
import type {
  BulkScoreEntryRequest,
  RoundStatus,
  ScrambleScoreEntryMode,
} from "../types/round";
import type { ScoreRow } from "../pages/roundScoringLogic";
import {
  isHoleOpenForRow,
  normalizeParticipationStatus,
} from "../pages/roundScoringLogic";
import {
  buildScrambleSaveRequest,
  type ScrambleTeamRow,
} from "../pages/roundScrambleScoringLogic";

interface UseRoundScoringCommandsArgs {
  status: RoundStatus | null;
  rows: ScoreRow[];
  scrambleRows: ScrambleTeamRow[];
  scrambleEntryMode: ScrambleScoreEntryMode;
  initialRowsSnapshot: string;
  hasChanges: boolean;
  canFinalize: boolean;
  readinessReadyForScoring: boolean;
  isScramble: boolean;
  roundLockedByCompleteTrip: boolean;
  loadPage: (roundId: number) => Promise<void>;
  setMessage: (message: string | null) => void;
  setError: (message: string | null) => void;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as any;
  const responseError = anyErr?.response?.data?.error;
  if (typeof responseError === "string" && responseError.trim() !== "") {
    return responseError;
  }

  if (err instanceof Error && err.message.trim() !== "") {
    return err.message;
  }

  return fallback;
}

export function useRoundScoringCommands({
  status,
  rows,
  scrambleRows,
  scrambleEntryMode,
  initialRowsSnapshot,
  hasChanges,
  canFinalize,
  readinessReadyForScoring,
  isScramble,
  roundLockedByCompleteTrip,
  loadPage,
  setMessage,
  setError,
}: UseRoundScoringCommandsArgs) {
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [refreshingHandicaps, setRefreshingHandicaps] = useState(false);

  async function handleSaveScores(): Promise<void> {
    if (!status) {
      return;
    }

    if (roundLockedByCompleteTrip) {
      setError(
        "Event is complete and locked. Enter Correction Mode from Event Detail before changing scores or tees.",
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (isScramble) {
        await saveRoundScrambleScores(
          status.roundId,
          buildScrambleSaveRequest(scrambleEntryMode, scrambleRows),
        );

        await loadPage(status.roundId);
        setMessage(
          status.finalized
            ? "Scramble corrections saved."
            : "Scramble scores saved.",
        );
        return;
      }

      const initialSnapshotRows = JSON.parse(initialRowsSnapshot) as Array<{
        scorecardId: number;
        roundTeeId?: number | null;
        participationStatus?: string | null;
        withdrawalHoleNumber?: number | null;
      }>;

      const initialTeeByScorecard = new Map(
        initialSnapshotRows.map((row) => [
          row.scorecardId,
          row.roundTeeId ?? null,
        ]),
      );

      const initialParticipationByScorecard = new Map(
        initialSnapshotRows.map((row) => [
          row.scorecardId,
          {
            participationStatus: normalizeParticipationStatus(
              row.participationStatus,
            ),
            withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
          },
        ]),
      );

      const teeChanges = rows.filter(
        (row) =>
          (initialTeeByScorecard.get(row.scorecardId) ?? null) !==
          (row.roundTeeId ?? null),
      );

      const participationChanges = rows.filter((row) => {
        const before = initialParticipationByScorecard.get(row.scorecardId);
        const nextStatus = normalizeParticipationStatus(
          row.participationStatus,
        );
        const nextWithdrawalHoleNumber =
          nextStatus === "WITHDRAWN"
            ? (row.withdrawalHoleNumber ?? null)
            : null;
        return (
          !before ||
          before.participationStatus !== nextStatus ||
          (before.withdrawalHoleNumber ?? null) !== nextWithdrawalHoleNumber
        );
      });

      const scoreRows = rows.map((row) => ({
        playerId: row.playerId,
        holes: row.holes.map((value, index) =>
          isHoleOpenForRow(row, index) && value !== "" ? Number(value) : null,
        ),
      }));

      if (status.finalized) {
        await saveRoundCorrections(status.roundId, {
          playerCorrections: scoreRows,
          teeCorrections: teeChanges
            .filter((row) => row.roundTeeId != null)
            .map((row) => ({
              scorecardId: row.scorecardId,
              roundTeeId: row.roundTeeId,
            })),
          participationCorrections: participationChanges.map((row) => {
            const nextStatus = normalizeParticipationStatus(
              row.participationStatus,
            );
            return {
              scorecardId: row.scorecardId,
              participationStatus: nextStatus,
              withdrawalHoleNumber:
                nextStatus === "WITHDRAWN"
                  ? (row.withdrawalHoleNumber ?? null)
                  : null,
            };
          }),
          refreshHandicaps: false,
        });
      } else {
        for (const row of participationChanges) {
          const nextStatus = normalizeParticipationStatus(
            row.participationStatus,
          );
          await setScorecardParticipation(
            row.scorecardId,
            nextStatus,
            nextStatus === "WITHDRAWN"
              ? (row.withdrawalHoleNumber ?? null)
              : null,
          );
        }

        await Promise.all(
          teeChanges
            .filter((row) => row.roundTeeId != null)
            .map((row) =>
              setScorecardTee(row.scorecardId, Number(row.roundTeeId)),
            ),
        );

        const request: BulkScoreEntryRequest = {
          scorecards: scoreRows,
        };

        await saveBulkScores(status.roundId, request);
      }

      await loadPage(status.roundId);
      setMessage(status.finalized ? "Corrections saved." : "Scores saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save score changes."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshHandicaps(): Promise<void> {
    if (!status) {
      return;
    }

    if (hasChanges) {
      setError("Save or discard score changes before refreshing handicaps.");
      setMessage(null);
      return;
    }

    try {
      setRefreshingHandicaps(true);
      setError(null);
      setMessage(null);

      await refreshRoundHandicaps(status.roundId);
      await loadPage(status.roundId);
      setMessage("Course handicaps refreshed from the frozen round tee data.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to refresh course handicaps."));
    } finally {
      setRefreshingHandicaps(false);
    }
  }

  async function handleFinalizeRound(): Promise<void> {
    if (!status) {
      return;
    }

    if (!canFinalize) {
      if (!readinessReadyForScoring) {
        setError(
          "Round is not ready to finalize. Fix the blocking readiness issues first.",
        );
        setMessage(null);
        return;
      }

      setError(
        isScramble
          ? "Every scramble team must have a complete score before finalizing."
          : "Every active player must have required holes entered before finalizing. For a mid-round withdrawal, mark WD after the player's last completed hole.",
      );
      setMessage(null);
      return;
    }

    try {
      setFinalizing(true);
      setError(null);
      setMessage(null);

      await finalizeRound(status.roundId);
      await loadPage(status.roundId);
      setMessage("Round finalized.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to finalize round."));
    } finally {
      setFinalizing(false);
    }
  }


  return {
    saving,
    finalizing,
    refreshingHandicaps,
    handleSaveScores,
    handleRefreshHandicaps,
    handleFinalizeRound,
  };
}
