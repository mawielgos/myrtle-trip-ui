import { useCallback, useEffect, useState } from "react";
import {
  getManualScoreHistory,
  getTripDetail,
  getTripPlayers,
} from "../api/tripApi";
import type { ManualScoreHistoryEntry } from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";

function getApiMessage(error: unknown): string | null {
  const err = error as any;
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null)
  );
}

export function useTripManualScoreHistoryPageData(numericTripId: number) {
  const [tripName, setTripName] = useState("Event");
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [entries, setEntries] = useState<ManualScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCommittedEntries = useCallback(async (): Promise<ManualScoreHistoryEntry[]> => {
    const manualEntries = await getManualScoreHistory(numericTripId);
    setEntries(manualEntries);
    return manualEntries;
  }, [numericTripId]);

  const loadPage = useCallback(async (): Promise<void> => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [trip, tripPlayers, manualEntries] = await Promise.all([
        getTripDetail(numericTripId),
        getTripPlayers(numericTripId),
        getManualScoreHistory(numericTripId),
      ]);
      setTripName(trip.tripName);
      setPlayers(tripPlayers);
      setEntries(manualEntries);
    } catch (err: unknown) {
      const apiMessage = getApiMessage(err);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to load manual score history.",
      );
    } finally {
      setLoading(false);
    }
  }, [numericTripId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  return {
    tripName,
    players,
    entries,
    loading,
    error,
    setError,
    loadPage,
    refreshCommittedEntries,
  };
}
