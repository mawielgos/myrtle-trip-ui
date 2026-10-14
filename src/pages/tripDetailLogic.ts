import type {
  PrizeSchedule,
  TripDetail,
  TripPlannedRound,
  TripPlayer,
  TripReadiness,
  TripRoundListItem,
} from "../types/trip";

export function isPrizeScheduleConfigured(schedule: PrizeSchedule): boolean {
  return (schedule.payouts ?? []).some((payout) => Number(payout.amountPerPlayer ?? 0) > 0);
}

export function hasConfiguredPrizeMoney(schedules: PrizeSchedule[]): boolean {
  return schedules.some(isPrizeScheduleConfigured);
}

export function isTripStarted(status: string | null | undefined): boolean {
  return status === "IN_PROGRESS" || status === "COMPLETE";
}

export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildDateRange(rounds: TripPlannedRound[]): string {
  const datedRounds = rounds
    .map((round) => round.roundDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  if (datedRounds.length === 0) {
    return "Dates TBD";
  }

  const first = formatShortDate(datedRounds[0]);
  const last = formatShortDate(datedRounds[datedRounds.length - 1]);

  if (!first && !last) {
    return "Dates TBD";
  }

  if (first && last) {
    return first === last ? first : `${first} – ${last}`;
  }

  return first ?? last ?? "Dates TBD";
}

export function getActivePlayers(players: TripPlayer[]): TripPlayer[] {
  return players.filter(
    (player) => player.active !== false && (player.participationStatus ?? "ACTIVE") === "ACTIVE",
  );
}

export function getSortedPlannedRounds(
  plannedRounds: TripPlannedRound[],
  plannedRoundCount: number | null | undefined,
): TripPlannedRound[] {
  const activeRoundCount = plannedRoundCount ?? plannedRounds.length;
  return [...plannedRounds]
    .filter((round) => round.roundNumber <= activeRoundCount)
    .sort((a, b) => a.roundNumber - b.roundNumber);
}

export function getSortedRounds(rounds: TripRoundListItem[]): TripRoundListItem[] {
  return [...rounds].sort((a, b) => {
    const aNumber = a.roundNumber ?? 999;
    const bNumber = b.roundNumber ?? 999;
    return aNumber - bNumber;
  });
}

export function getRoundsByRoundNumber(rounds: TripRoundListItem[]): Map<number, TripRoundListItem> {
  const map = new Map<number, TripRoundListItem>();
  for (const round of rounds) {
    if (round.roundNumber != null) {
      map.set(round.roundNumber, round);
    }
  }
  return map;
}

export function canStartTrip(trip: TripDetail | null, readiness: TripReadiness | null): boolean {
  if (!trip || isTripStarted(trip.status) || trip.currentRound) {
    return false;
  }
  return readiness?.canStartTrip === true;
}

export function canLoadGhin(trip: TripDetail | null, playerCount: number): boolean {
  if (!trip || trip.initialized === true || isTripStarted(trip.status)) {
    return false;
  }
  return Boolean(trip.tripCode) && playerCount > 0;
}

export function getFinalizedRoundCount(rounds: TripRoundListItem[]): number {
  return rounds.filter((round) => round.finalized === true).length;
}

export function canResetTripStart(trip: TripDetail | null, roundCount: number, finalizedRoundCount: number): boolean {
  return Boolean(trip && trip.status === "IN_PROGRESS" && roundCount > 0 && finalizedRoundCount === 0);
}

export function canCompleteTrip(trip: TripDetail | null, roundCount: number, finalizedRoundCount: number): boolean {
  return Boolean(
    trip &&
      trip.status === "IN_PROGRESS" &&
      roundCount > 0 &&
      finalizedRoundCount === roundCount,
  );
}

export function getParticipationLockState(
  trip: TripDetail | null,
  roundCount: number,
  finalizedRoundCount: number,
): { locked: boolean; reason: string } {
  const allCreatedRoundsFinalized = roundCount > 0 && finalizedRoundCount === roundCount;
  const locked =
    (trip?.status === "COMPLETE" && trip?.correctionMode !== true) || allCreatedRoundsFinalized;
  const reason = allCreatedRoundsFinalized
    ? "Event player status is locked because all created rounds are finalized. Use round corrections for finalized-round changes."
    : "Event player status is locked because this event is complete.";
  return { locked, reason };
}

