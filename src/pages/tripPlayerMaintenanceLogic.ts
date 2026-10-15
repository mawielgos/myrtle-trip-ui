import type { TripDetail, TripPlayer, TripRoundListItem } from "../types/trip";

/** Match the roster's existing active-player definition. */
export function getActiveTripPlayers(players: TripPlayer[]): TripPlayer[] {
  return players.filter(
    (player) => player.active !== false && (player.participationStatus ?? "ACTIVE") === "ACTIVE"
  );
}

export function countFinalizedTripRounds(rounds: TripRoundListItem[]): number {
  return rounds.filter((round) => round.finalized === true).length;
}

/** All created rounds being finalized takes precedence over the completed-event reason. */
export function getTripPlayerParticipationLock(
  trip: TripDetail | null,
  roundCount: number,
  finalizedRoundCount: number
): { playerStatusLocked: boolean; playerStatusLockReason: string } {
  const allCreatedRoundsFinalized = roundCount > 0 && finalizedRoundCount === roundCount;
  return {
    playerStatusLocked:
      (trip?.status === "COMPLETE" && trip?.correctionMode !== true) || allCreatedRoundsFinalized,
    playerStatusLockReason: allCreatedRoundsFinalized
      ? "Event player status is locked because all created rounds are finalized. Use round corrections for finalized-round changes."
      : "Event player status is locked because this event is complete.",
  };
}
