import { useState } from "react";
import { saveRoundGroups } from "../api/roundGroupApi";
import { updateRoundScorecardParticipation } from "../api/roundApi";
import type {
  RoundGroupSaveRequest,
  RoundPlayerStatusResponse,
} from "../types/round";
import { getBackendErrorMessage, type UiGroup, type UiPlayer } from "./roundGroupsLogic";

type ParticipationStatus = "ACTIVE" | "NO_SHOW" | "WITHDRAWN";

type UseRoundGroupsCommandsArgs = {
  roundId?: string;
  groups: UiGroup[];
  defaultRoundTeeId: number | null;
  dirty: boolean;
  readOnly: boolean;
  readOnlyReason: string | null;
  reloadPageState: () => Promise<void>;
  setError: (message: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
};

export function useRoundGroupsCommands({
  roundId,
  groups,
  defaultRoundTeeId,
  dirty,
  readOnly,
  readOnlyReason,
  reloadPageState,
  setError,
  setSuccessMessage,
}: UseRoundGroupsCommandsArgs) {
  const [saving, setSaving] = useState(false);

  async function handleParticipationChange(
    player: UiPlayer | RoundPlayerStatusResponse,
    participationStatus: ParticipationStatus,
  ): Promise<void> {
    if (!roundId) {
      return;
    }

    if (dirty) {
      setError("Save current group changes before marking a player unavailable or active.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      await updateRoundScorecardParticipation(
        Number(roundId),
        player.scorecardId,
        participationStatus,
      );
      await reloadPageState();
      setSuccessMessage(
        participationStatus === "ACTIVE"
          ? `${player.playerName} marked active for this round.`
          : `${player.playerName} marked ${participationStatus === "NO_SHOW" ? "No-Show" : "Withdrawn"} for this round.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getBackendErrorMessage(err, "Failed to update player availability."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSave(showSuccessMessage = true): Promise<boolean> {
    if (!roundId) {
      return false;
    }

    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const assignments = groups.flatMap((group) =>
        group.players.map((player, index) => ({
          scorecardId: player.scorecardId,
          playerId: player.playerId,
          groupNumber: group.groupNumber,
          seatOrder: player.seatOrder ?? index + 1,
          roundTeeId: player.roundTeeId ?? defaultRoundTeeId,
        })),
      );

      const payload: RoundGroupSaveRequest = {
        assignments,
        groupTeeTimes: groups.map((group) => ({
          groupNumber: group.groupNumber,
          teeTime: group.teeTime,
          startingHole: group.startingHole,
        })),
      };

      await saveRoundGroups(Number(roundId), payload);
      await reloadPageState();

      if (showSuccessMessage) {
        setSuccessMessage("Group assignments and tee selections saved.");
      }

      return true;
    } catch (err) {
      setError(
        getBackendErrorMessage(
          err,
          "Failed to save round groups and tee selections.",
        ),
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    handleParticipationChange,
    handleSave,
  };
}
