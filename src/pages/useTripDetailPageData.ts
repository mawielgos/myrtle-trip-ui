import { useCallback, useEffect, useState } from "react";
import {
  getPlannedRounds,
  getTripDetail,
  getTripPlayers,
  getTripPrizeSchedules,
  getTripRounds,
  getTripTournamentSetup,
} from "../api/tripApi";
import type {
  PrizeSchedule,
  TripDetail,
  TripPlannedRound,
  TripPlayer,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

export function useTripDetailPageData(tripId: string | undefined) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [plannedRounds, setPlannedRounds] = useState<TripPlannedRound[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [prizeSchedules, setPrizeSchedules] = useState<PrizeSchedule[]>([]);
  const [tournamentSetup, setTournamentSetup] = useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTripPage = useCallback(async (numericTripId: number): Promise<TripDetail> => {
    const [
      tripResponse,
      playersResponse,
      plannedRoundsResponse,
      roundsResponse,
      prizeSchedulesResponse,
      tournamentSetupResponse,
    ] = await Promise.all([
      getTripDetail(numericTripId),
      getTripPlayers(numericTripId),
      getPlannedRounds(numericTripId),
      getTripRounds(numericTripId),
      getTripPrizeSchedules(numericTripId).catch((err) => {
        console.warn("Unable to load prize setup reminder state", err);
        return [] as PrizeSchedule[];
      }),
      getTripTournamentSetup(numericTripId).catch((err) => {
        console.warn("Unable to load tournament setup state", err);
        return null as TripTournamentSetup | null;
      }),
    ]);

    setTrip(tripResponse);
    setPlayers(playersResponse);
    setPlannedRounds(plannedRoundsResponse);
    setRounds(roundsResponse);
    setPrizeSchedules(prizeSchedulesResponse);
    setTournamentSetup(tournamentSetupResponse);

    return tripResponse;
  }, []);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!tripId) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await loadTripPage(Number(tripId));
      } catch (err) {
        console.error("Failed to load event detail page", err);
        setError("Unable to load event details.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tripId, loadTripPage]);

  return {
    trip,
    players,
    plannedRounds,
    rounds,
    prizeSchedules,
    tournamentSetup,
    loading,
    error,
    setError,
    setPlayers,
    loadTripPage,
  };
}
