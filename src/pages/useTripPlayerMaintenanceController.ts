import { useCallback, useEffect, useMemo, useState } from "react";
import { getTripDetail, getTripPlayers, getTripRounds } from "../api/tripApi";
import type { TripDetail, TripPlayer, TripRoundListItem } from "../types/trip";
import {
  countFinalizedTripRounds,
  getActiveTripPlayers,
  getTripPlayerParticipationLock,
} from "./tripPlayerMaintenanceLogic";

function readApiError(err: any, fallback: string): string {
  const apiMessage =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  return typeof apiMessage === "string" ? apiMessage : fallback;
}

export function useTripPlayerMaintenanceController(parsedTripId: number) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (): Promise<void> => {
    if (!Number.isFinite(parsedTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tripResponse, playersResponse, roundsResponse] = await Promise.all([
        getTripDetail(parsedTripId),
        getTripPlayers(parsedTripId),
        getTripRounds(parsedTripId),
      ]);

      setTrip(tripResponse);
      setPlayers(playersResponse);
      setRounds(roundsResponse);
    } catch (err: any) {
      console.error("Failed to load event player maintenance", err);
      setError(readApiError(err, "Unable to load event player maintenance."));
    } finally {
      setLoading(false);
    }
  }, [parsedTripId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const activePlayers = useMemo(() => getActiveTripPlayers(players), [players]);
  const finalizedRoundCount = useMemo(() => countFinalizedTripRounds(rounds), [rounds]);
  const { playerStatusLocked, playerStatusLockReason } = getTripPlayerParticipationLock(
    trip,
    rounds.length,
    finalizedRoundCount
  );

  return {
    trip,
    players,
    activePlayers,
    loading,
    error,
    playerStatusLocked,
    playerStatusLockReason,
    loadPage,
    setPlayers,
  };
}
