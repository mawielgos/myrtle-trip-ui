import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TripPlannedRound } from "../types/trip";
import {
  defaultEventName,
  defaultTeamSizeForEventType,
  legacyFormatToPrimaryEventType,
  normalizeEvents,
  optionValueToLegacyFormat,
  roundKey,
  snapshotRounds,
  sortRoundsByPlaySequence,
} from "./tripRoundPlanningLogic";

export interface UseTripRoundPlanningInteractionsArgs {
  rounds: TripPlannedRound[];
  setRounds: Dispatch<SetStateAction<TripPlannedRound[]>>;
  expandedRoundKey: string | null;
  setExpandedRoundKey: Dispatch<SetStateAction<string | null>>;
  plannedRoundCount: number;
  loading: boolean;
  initialSnapshot: string;
  isReadOnly: boolean;
  ensureTeesLoaded: (courseId: number) => Promise<void>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function useTripRoundPlanningInteractions({
  rounds,
  setRounds,
  expandedRoundKey,
  setExpandedRoundKey,
  plannedRoundCount,
  loading,
  initialSnapshot,
  isReadOnly,
  ensureTeesLoaded,
  setError,
}: UseTripRoundPlanningInteractionsArgs) {
  const sortedRounds = useMemo(
    () => sortRoundsByPlaySequence(rounds),
    [rounds],
  );

  const comparableSnapshot = useMemo(() => snapshotRounds(rounds), [rounds]);

  const hasChanges =
    !loading &&
    !isReadOnly &&
    initialSnapshot.length > 0 &&
    comparableSnapshot !== initialSnapshot;

  const multiRoundTournamentEnabled = useMemo(
    () => rounds.some((round) => round.includeInFourDayStandings),
    [rounds],
  );

  const supportsMultiRoundTournament = useMemo(
    () => sortedRounds.length >= 2 || plannedRoundCount >= 2,
    [plannedRoundCount, sortedRounds.length],
  );

  function updateRound(targetKey: string, updates: Partial<TripPlannedRound>): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) =>
        roundKey(round) === targetKey ? { ...round, ...updates } : round,
      ),
    );
  }

  function updateRoundEvent(
    targetKey: string,
    eventIndex: number,
    updates: Partial<NonNullable<TripPlannedRound["events"]>[number]>,
  ): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const events = normalizeEvents(round).map((event, index) =>
          index === eventIndex ? { ...event, ...updates } : event,
        );

        return { ...round, events };
      }),
    );
  }

  function removeRoundEvent(targetKey: string, eventIndex: number): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const currentEvents = normalizeEvents(round);
        if (currentEvents.length <= 1) {
          return round;
        }

        const events = currentEvents
          .filter((_, index) => index !== eventIndex)
          .map((event, index) => ({ ...event, eventOrder: index + 1 }));

        return {
          ...round,
          format: events.some((event) => event.eventType.startsWith("TEAM_"))
            ? round.format
            : "STROKE_PLAY",
          events,
        };
      }),
    );
  }

  function moveRoundEvent(targetKey: string, eventIndex: number, direction: -1 | 1): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const events = normalizeEvents(round);
        const nextIndex = eventIndex + direction;
        if (nextIndex < 0 || nextIndex >= events.length) {
          return round;
        }

        const reordered = [...events];
        const [moved] = reordered.splice(eventIndex, 1);
        reordered.splice(nextIndex, 0, moved);

        return {
          ...round,
          events: reordered.map((event, index) => ({
            ...event,
            eventOrder: index + 1,
          })),
        };
      }),
    );
  }

  async function handleCourseChange(targetKey: string, courseIdValue: string): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const courseId = courseIdValue ? Number(courseIdValue) : null;

    updateRound(targetKey, {
      courseId,
      defaultTeeId: null,
      defaultTeeName: null,
      womenDefaultTeeId: null,
      womenDefaultTeeName: null,
      standardTeeName: null,
    });

    if (courseId != null) {
      try {
        await ensureTeesLoaded(courseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course tees.");
      }
    }
  }

  function handlePrimaryGameChange(
    targetKey: string,
    round: TripPlannedRound,
    optionValue: string,
  ): void {
    const nextOptionValue = optionValue || null;
    const nextFormat = optionValueToLegacyFormat(nextOptionValue);
    const nextEventType = legacyFormatToPrimaryEventType(nextOptionValue);
    const nextTeamSize = defaultTeamSizeForEventType(
      nextEventType,
      nextFormat === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : null,
    );

    updateRound(targetKey, {
      format: nextFormat,
      scrambleTeamSize: nextFormat === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : 4,
      events: nextOptionValue
        ? [
            {
              eventType: nextEventType,
              eventName: defaultEventName(nextEventType, nextTeamSize),
              eventOrder: 1,
              teamSize: nextTeamSize,
              handicapPercent: null,
            },
          ]
        : [],
    });
  }

  function toggleIndividualEvent(targetKey: string, eventType: string, checked: boolean): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const currentEvents = normalizeEvents(round).filter(
          (event) => event.eventType !== eventType,
        );

        if (checked) {
          currentEvents.push({
            eventType,
            eventName: defaultEventName(eventType, null),
            eventOrder: currentEvents.length + 1,
            teamSize: null,
            handicapPercent: null,
          });
        }

        if (currentEvents.length === 0) {
          currentEvents.push({
            eventType: "INDIVIDUAL_LOW_NET",
            eventName: defaultEventName("INDIVIDUAL_LOW_NET", null),
            eventOrder: 1,
            teamSize: null,
            handicapPercent: null,
          });
        }

        const renumberedEvents = currentEvents.map((event, index) => ({
          ...event,
          eventOrder: index + 1,
        }));

        return {
          ...round,
          format: renumberedEvents.some((event) => event.eventType.startsWith("TEAM_"))
            ? round.format
            : "STROKE_PLAY",
          events: renumberedEvents,
        };
      }),
    );
  }

  function toggleExpandedRound(targetKey: string): void {
    setExpandedRoundKey((current) => (current === targetKey ? null : targetKey));
  }

  return {
    sortedRounds,
    hasChanges,
    multiRoundTournamentEnabled,
    supportsMultiRoundTournament,
    expandedRoundKey,
    updateRound,
    updateRoundEvent,
    removeRoundEvent,
    moveRoundEvent,
    handleCourseChange,
    handlePrimaryGameChange,
    toggleIndividualEvent,
    toggleExpandedRound,
  };
}
