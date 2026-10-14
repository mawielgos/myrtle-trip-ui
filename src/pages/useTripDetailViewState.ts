import { useMemo } from "react";
import {
  buildCurrentRoundAction,
  buildReadinessBanner,
} from "../components/trip/tripDetailUtils";
import type {
  TripDetail,
  TripPlannedRound,
  TripPlayer,
  TripReadiness,
  TripRoundListItem,
} from "../types/trip";
import {
  buildDateRange,
  canCompleteTrip,
  canLoadGhin,
  canResetTripStart,
  canStartTrip,
  getActivePlayers,
  getFinalizedRoundCount,
  getParticipationLockState,
  getRoundsByRoundNumber,
  getSortedPlannedRounds,
  getSortedRounds,
  isTripStarted,
} from "./tripDetailLogic";

export function useTripDetailViewState({
  trip,
  players,
  plannedRounds,
  rounds,
}: {
  trip: TripDetail | null;
  players: TripPlayer[];
  plannedRounds: TripPlannedRound[];
  rounds: TripRoundListItem[];
}) {
  const activePlayers = useMemo(() => getActivePlayers(players), [players]);

  const sortedPlannedRounds = useMemo(
    () => getSortedPlannedRounds(plannedRounds, trip?.plannedRoundCount),
    [plannedRounds, trip?.plannedRoundCount],
  );

  const sortedRounds = useMemo(() => getSortedRounds(rounds), [rounds]);
  const roundsByRoundNumber = useMemo(() => getRoundsByRoundNumber(rounds), [rounds]);

  const readiness: TripReadiness | null = trip?.readiness ?? null;
  const unresolvedGhinFixCount = trip?.unresolvedGhinFixCount ?? 0;

  const currentRoundAction = useMemo(() => {
    if (!trip) {
      return null;
    }
    return buildCurrentRoundAction(trip, rounds);
  }, [trip, rounds]);

  const currentRoundDetail = useMemo(() => {
    if (!trip?.currentRound) {
      return null;
    }
    return sortedRounds.find((round) => round.roundId === trip.currentRound?.roundId) ?? null;
  }, [trip?.currentRound, sortedRounds]);

  const canShowStartTripButton = useMemo(
    () => canStartTrip(trip, readiness),
    [trip, readiness],
  );

  const canShowLoadGhinButton = useMemo(
    () => canLoadGhin(trip, players.length),
    [trip, players.length],
  );

  const readinessBanner = useMemo(
    () => buildReadinessBanner(trip?.status, readiness),
    [trip?.status, readiness],
  );

  const tripDateRange = useMemo(
    () => buildDateRange(sortedPlannedRounds),
    [sortedPlannedRounds],
  );

  const finalizedRoundCount = useMemo(
    () => getFinalizedRoundCount(sortedRounds),
    [sortedRounds],
  );

  const canShowResetStartButton = useMemo(
    () => canResetTripStart(trip, sortedRounds.length, finalizedRoundCount),
    [trip, sortedRounds.length, finalizedRoundCount],
  );

  const canShowCompleteTripButton = useMemo(
    () => canCompleteTrip(trip, sortedRounds.length, finalizedRoundCount),
    [trip, sortedRounds.length, finalizedRoundCount],
  );

  const participationLockState = getParticipationLockState(
    trip,
    sortedRounds.length,
    finalizedRoundCount,
  );

  return {
    activePlayers,
    sortedPlannedRounds,
    sortedRounds,
    roundsByRoundNumber,
    readiness,
    unresolvedGhinFixCount,
    currentRoundAction,
    currentRoundDetail,
    canShowStartTripButton,
    canShowLoadGhinButton,
    readinessBanner,
    tripDateRange,
    finalizedRoundCount,
    canShowResetStartButton,
    canShowCompleteTripButton,
    eventPlayerStatusLocked: participationLockState.locked,
    eventPlayerStatusLockReason: participationLockState.reason,
    tripStarted: trip ? isTripStarted(trip.status) : false,
  };
}
