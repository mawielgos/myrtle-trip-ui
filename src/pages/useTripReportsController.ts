import { useEffect, useMemo, useState } from "react";
import { getTripDetail, getTripRounds, getTripTournamentSetup } from "../api/tripApi";
import type { TripDetail, TripRoundListItem, TripTournamentSetup } from "../types/trip";
import {
  getFinalizedRounds,
  getTournamentCompetitionLinks,
  shouldShowTournamentReports,
} from "./tripReportsLogic";

/** Loads report inputs and derives the available report sections for one event. */
export function useTripReportsController(numericTripId: number) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [tournamentSetup, setTournamentSetup] =
    useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [tripDetail, tripRounds, setup] = await Promise.all([
          getTripDetail(numericTripId),
          getTripRounds(numericTripId),
          getTripTournamentSetup(numericTripId),
        ]);
        setTrip(tripDetail);
        setRounds(tripRounds);
        setTournamentSetup(setup);
      } catch (err) {
        console.error(err);
        setError("Failed to load event reports.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [numericTripId]);

  const finalizedRounds = useMemo(
    () => getFinalizedRounds(rounds),
    [rounds],
  );
  const tournamentCompetitionLinks = useMemo(
    () => getTournamentCompetitionLinks(tournamentSetup),
    [tournamentSetup],
  );

  const showTournament = useMemo(
    () => shouldShowTournamentReports(tournamentSetup, tournamentCompetitionLinks),
    [tournamentSetup, tournamentCompetitionLinks],
  );

  return {
    trip,
    rounds,
    loading,
    error,
    finalizedRounds,
    tournamentCompetitionLinks,
    showTournament,
  };
}
