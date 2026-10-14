import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { saveStrokesPerDayTeePlan } from "../api/strokesApi";
import type { StrokesPerDayResponse } from "../types/strokes";
import {
  buildPlayerRoundKey,
  findTeeOption,
} from "./strokesPerDayLogic";
import { formatStrokesPerDayError } from "./useStrokesPerDayPageData";

type ConfirmDialog = (options: {
  title: string;
  message: string;
  severity?: "info" | "warning" | "danger" | "success";
  confirmText?: string;
  cancelText?: string;
}) => Promise<boolean>;

type UseStrokesPerDayCommandsArgs = {
  tripId: string | undefined;
  data: StrokesPerDayResponse | null;
  setData: Dispatch<SetStateAction<StrokesPerDayResponse | null>>;
  initialSelectedTeeIds: Record<string, number | null>;
  changedTeeKeys: Set<string>;
  setChangedTeeKeys: Dispatch<SetStateAction<Set<string>>>;
  hydrateData: (response: StrokesPerDayResponse) => void;
  confirmDialog: ConfirmDialog;
};

export function useStrokesPerDayCommands({
  tripId,
  data,
  setData,
  initialSelectedTeeIds,
  changedTeeKeys,
  setChangedTeeKeys,
  hydrateData,
  confirmDialog,
}: UseStrokesPerDayCommandsArgs) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveMessage]);

  async function saveTeePlan(): Promise<void> {
    if (!tripId || !data || changedTeeKeys.size === 0) {
      return;
    }

    const changes = [];
    for (const key of changedTeeKeys) {
      const [playerIdText, roundIdText] = key.split(":");
      const playerId = Number(playerIdText);
      const roundId = Number(roundIdText);

      if (!Number.isFinite(playerId) || !Number.isFinite(roundId)) {
        continue;
      }

      const player = data.players.find(
        (candidate) => candidate.playerId === playerId,
      );
      const playerRound = player?.rounds.find(
        (candidate) => candidate.roundId === roundId,
      );
      const roundTeeId = playerRound?.selectedRoundTeeId;

      if (roundTeeId == null) {
        continue;
      }

      changes.push({
        playerId,
        roundId,
        roundTeeId,
      });
    }

    if (changes.length === 0) {
      setSaveError("No valid tee changes were found to save.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const savedCount = changes.length;
      const response = await saveStrokesPerDayTeePlan(Number(tripId), {
        changes,
      });
      hydrateData(response);
      setChangedTeeKeys(new Set());
      setSaveMessage(
        `Tee plan saved — ${savedCount} change${savedCount === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      console.error("Failed to save tee plan", err);
      setSaveError(formatStrokesPerDayError(err, "Unable to save tee plan."));
    } finally {
      setSaving(false);
    }
  }

  async function resetTeeChanges(): Promise<void> {
    if (!data || changedTeeKeys.size === 0) {
      return;
    }

    const confirmed = await confirmDialog({
      title: "Reset Tee Changes",
      message: `Reset ${changedTeeKeys.size} unsaved tee change${changedTeeKeys.size === 1 ? "" : "s"}?`,
      severity: "warning",
      confirmText: "Reset Changes",
    });

    if (!confirmed) {
      return;
    }

    setSaveMessage(null);
    setSaveError(null);

    setData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        players: currentData.players.map((player) => ({
          ...player,
          rounds: player.rounds.map((playerRound) => {
            const key = buildPlayerRoundKey(
              player.playerId,
              playerRound.roundId,
            );
            if (!changedTeeKeys.has(key)) {
              return playerRound;
            }

            const originalRoundTeeId = initialSelectedTeeIds[key];
            if (originalRoundTeeId == null) {
              return playerRound;
            }

            const option = findTeeOption(playerRound, originalRoundTeeId);
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
        })),
      };
    });

    setChangedTeeKeys(new Set());
  }

  function clearFeedback(): void {
    setSaveMessage(null);
    setSaveError(null);
  }

  return {
    saving,
    saveMessage,
    saveError,
    saveTeePlan,
    resetTeeChanges,
    clearFeedback,
  };
}
