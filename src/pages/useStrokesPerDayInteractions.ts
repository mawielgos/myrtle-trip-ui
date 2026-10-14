import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { StrokesPerDayResponse } from "../types/strokes";
import {
  buildPlayerRoundKey,
  findTeeOption,
} from "./strokesPerDayLogic";

type ConfirmDialog = (options: {
  title: string;
  message: string;
  severity?: "info" | "warning" | "danger" | "success";
  confirmText?: string;
  cancelText?: string;
}) => Promise<boolean>;

type UseStrokesPerDayInteractionsArgs = {
  setData: Dispatch<SetStateAction<StrokesPerDayResponse | null>>;
  initialSelectedTeeIds: Record<string, number | null>;
  hydrationRevision: number;
  confirmDialog: ConfirmDialog;
};

export function useStrokesPerDayInteractions({
  setData,
  initialSelectedTeeIds,
  hydrationRevision,
  confirmDialog,
}: UseStrokesPerDayInteractionsArgs) {
  const [changedTeeKeys, setChangedTeeKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChangedTeeKeys(new Set());
  }, [hydrationRevision]);

  function changePlanningTee(
    playerId: number,
    roundId: number,
    selectedValue: string,
  ): void {
    const selectedRoundTeeId = Number(selectedValue);

    if (!Number.isFinite(selectedRoundTeeId)) {
      return;
    }

    const key = buildPlayerRoundKey(playerId, roundId);

    setData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        players: currentData.players.map((player) => {
          if (player.playerId !== playerId) {
            return player;
          }

          return {
            ...player,
            rounds: player.rounds.map((playerRound) => {
              if (playerRound.roundId !== roundId) {
                return playerRound;
              }

              const option = findTeeOption(playerRound, selectedRoundTeeId);
              if (!option) {
                return playerRound;
              }

              return {
                ...playerRound,
                selectedRoundTeeId: option.roundTeeId,
                selectedTeeName: option.teeName,
                selectedCourseRating: option.courseRating,
                selectedSlope: option.slope,
                selectedYardage: option.yardage,
                selectedCourseHandicap: option.courseHandicap,
                selectedPlayingHandicap: option.playingHandicap,
              };
            }),
          };
        }),
      };
    });

    setChangedTeeKeys((previous) => {
      const next = new Set(previous);
      const originalRoundTeeId = initialSelectedTeeIds[key] ?? null;

      if (originalRoundTeeId === selectedRoundTeeId) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  const changedTeeCount = changedTeeKeys.size;
  const hasUnsavedTeeChanges = changedTeeCount > 0;

  async function confirmDiscardUnsavedTeeChanges(): Promise<boolean> {
    if (!hasUnsavedTeeChanges) {
      return true;
    }

    return confirmDialog({
      title: "Discard Tee Changes?",
      message:
        "You have unsaved tee changes. Leave this page and discard those changes?",
      severity: "warning",
      confirmText: "Discard Changes",
    });
  }

  return {
    changedTeeKeys,
    setChangedTeeKeys,
    changedTeeCount,
    hasUnsavedTeeChanges,
    changePlanningTee,
    confirmDiscardUnsavedTeeChanges,
  };
}
