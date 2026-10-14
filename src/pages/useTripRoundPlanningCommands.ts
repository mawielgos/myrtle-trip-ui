import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { savePlannedRounds } from "../api/tripApi";
import type { TripPlannedRound } from "../types/trip";
import {
  MAX_PLANNED_ROUND_COUNT,
  createBlankPlannedRound,
  defaultEventName,
  isConfiguredEnoughToWarnBeforeRemove,
  normalizeEvents,
  roundKey,
  sortRoundsByPlaySequence,
} from "./tripRoundPlanningLogic";

export interface UseTripRoundPlanningCommandsArgs {
  tripId: number;
  rounds: TripPlannedRound[];
  setRounds: Dispatch<SetStateAction<TripPlannedRound[]>>;
  setPlannedRoundCount: Dispatch<SetStateAction<number>>;
  setExpandedRoundKey: Dispatch<SetStateAction<string | null>>;
  tripStartDate: string | null;
  tripEndDate: string | null;
  hasFemalePlayers: boolean;
  multiRoundTournamentEnabled: boolean;
  isReadOnly: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  applySavedRounds: (savedRounds: TripPlannedRound[]) => void;
  onShowMessage: () => void;
}

export function useTripRoundPlanningCommands({
  tripId,
  rounds,
  setRounds,
  setPlannedRoundCount,
  setExpandedRoundKey,
  tripStartDate,
  tripEndDate,
  hasFemalePlayers,
  multiRoundTournamentEnabled,
  isReadOnly,
  setError,
  applySavedRounds,
  onShowMessage,
}: UseTripRoundPlanningCommandsArgs) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingRemoveRoundKey, setPendingRemoveRoundKey] = useState<string | null>(null);

  const pendingRemoveRound = useMemo(
    () => rounds.find((round) => roundKey(round) === pendingRemoveRoundKey) ?? null,
    [pendingRemoveRoundKey, rounds],
  );

  const isBusy = saving;

  function handleAddRound(): void {
    if (isReadOnly || isBusy) {
      return;
    }

    if (rounds.length >= MAX_PLANNED_ROUND_COUNT) {
      setError(`An event can have at most ${MAX_PLANNED_ROUND_COUNT} planned rounds.`);
      setMessage(null);
      onShowMessage();
      return;
    }

    const nextRoundNumber =
      rounds.reduce((maxRoundNumber, round) => Math.max(maxRoundNumber, round.roundNumber ?? 0), 0) + 1;
    const nextRound = createBlankPlannedRound(nextRoundNumber);

    setRounds((current) => [...current, nextRound]);
    setPlannedRoundCount((current) => Math.max(current, rounds.length + 1));
    setExpandedRoundKey(roundKey(nextRound));
    setError(null);
    setMessage(null);
  }

  function removeRoundByKey(targetKey: string): void {
    const remainingRounds = sortRoundsByPlaySequence(
      rounds.filter((round) => roundKey(round) !== targetKey),
    );
    setRounds(remainingRounds);
    setPlannedRoundCount(remainingRounds.length);
    setExpandedRoundKey(remainingRounds.length > 0 ? roundKey(remainingRounds[0]) : null);
    setPendingRemoveRoundKey(null);
    setError(null);
    setMessage(null);
  }

  function handleRemoveRound(targetKey: string): void {
    if (isReadOnly || isBusy) {
      return;
    }

    if (rounds.length <= 1) {
      setError("An event must have at least one planned round.");
      setMessage(null);
      onShowMessage();
      return;
    }

    const targetRound = rounds.find((round) => roundKey(round) === targetKey);
    if (!targetRound) {
      return;
    }

    if (isConfiguredEnoughToWarnBeforeRemove(targetRound)) {
      setPendingRemoveRoundKey(targetKey);
      return;
    }

    removeRoundByKey(targetKey);
  }

  function confirmRemoveRound(): void {
    if (!pendingRemoveRoundKey || isReadOnly || isBusy) {
      setPendingRemoveRoundKey(null);
      return;
    }

    removeRoundByKey(pendingRemoveRoundKey);
  }

  function cancelRemoveRound(): void {
    setPendingRemoveRoundKey(null);
  }

  function validate(): string | null {
    if (rounds.length === 0) {
      return "At least one planned round is required.";
    }

    if (rounds.length > MAX_PLANNED_ROUND_COUNT) {
      return `An event can have at most ${MAX_PLANNED_ROUND_COUNT} planned rounds.`;
    }

    const roundsInPlaySequence = sortRoundsByPlaySequence(rounds);
    for (let index = 0; index < roundsInPlaySequence.length; index += 1) {
      const displayRoundNumber = index + 1;
      const round = roundsInPlaySequence[index];

      if (!round.roundDate) {
        return `Round ${displayRoundNumber} must have a date.`;
      }

      if (tripStartDate && round.roundDate < tripStartDate) {
        return `Round ${displayRoundNumber} date must be on or after the event start date.`;
      }

      if (tripEndDate && round.roundDate > tripEndDate) {
        return `Round ${displayRoundNumber} date must be on or before the event end date.`;
      }

      if (!round.format) {
        return `Round ${displayRoundNumber} must have a format.`;
      }

      if (normalizeEvents(round).length === 0) {
        return `Round ${displayRoundNumber} must have at least one event.`;
      }

      if (round.courseId == null) {
        return `Round ${displayRoundNumber} must have a course.`;
      }

      if (round.defaultTeeId == null) {
        return `Round ${displayRoundNumber} must have a men's default tee.`;
      }

      if (hasFemalePlayers && round.womenDefaultTeeId == null) {
        return `Round ${displayRoundNumber} must have a women's default tee because this event has female players.`;
      }
    }

    if (multiRoundTournamentEnabled && rounds.length < 2) {
      return "A multi-round tournament requires at least two planned rounds.";
    }

    return null;
  }

  function buildSavePayload() {
    return {
      rounds: sortRoundsByPlaySequence(rounds).map((round, index) => ({
        roundNumber: index + 1,
        roundDate: round.roundDate,
        courseId: round.courseId,
        defaultTeeId: round.defaultTeeId,
        womenDefaultTeeId: round.womenDefaultTeeId ?? null,
        format: round.format,
        includeInFourDayStandings: round.includeInFourDayStandings,
        scrambleTeamSize: round.format === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : 4,
        events: normalizeEvents(round).map((event, eventIndex) => ({
          eventType: event.eventType,
          eventName: event.eventName || defaultEventName(event.eventType, event.teamSize),
          eventOrder: eventIndex + 1,
          teamSize: event.teamSize ?? null,
          handicapPercent: event.handicapPercent ?? null,
        })),
      })),
    };
  }

  async function handleSave(): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      setMessage(null);
      onShowMessage();
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedRounds = await savePlannedRounds(tripId, buildSavePayload());
      applySavedRounds(savedRounds);
      setMessage("Planned rounds saved. Round count and round numbers were updated from the current planning grid.");
      onShowMessage();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to save planned rounds.",
      );
      setMessage(null);
      onShowMessage();
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    isBusy,
    message,
    setMessage,
    pendingRemoveRound,
    handleAddRound,
    handleRemoveRound,
    confirmRemoveRound,
    cancelRemoveRound,
    handleSave,
  };
}
