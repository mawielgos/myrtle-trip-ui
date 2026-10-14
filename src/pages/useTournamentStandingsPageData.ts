import { useEffect, useState } from "react";
import {
  getTournamentStandings,
  getTripPrizeSchedules,
  getTripRounds,
  getTripTournamentSetup,
} from "../api/tripApi";
import type {
  PrizeSchedule,
  TournamentStandings,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

export type TournamentCompetition = "LOW_NET" | "LOW_GROSS";

export type TournamentStandingsPageData = {
  standings: TournamentStandings | null;
  prizeSchedules: PrizeSchedule[];
  tripRounds: TripRoundListItem[];
  tournamentSetup: TripTournamentSetup | null;
  loading: boolean;
  error: string | null;
};

export function useTournamentStandingsPageData(
  tripId: string | undefined,
  competition: TournamentCompetition,
): TournamentStandingsPageData {
  const [standings, setStandings] = useState<TournamentStandings | null>(null);
  const [prizeSchedules, setPrizeSchedules] = useState<PrizeSchedule[]>([]);
  const [tripRounds, setTripRounds] = useState<TripRoundListItem[]>([]);
  const [tournamentSetup, setTournamentSetup] =
    useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const numericTripId = Number(tripId);
        const response = await getTournamentStandings(
          numericTripId,
          competition,
        );
        setStandings(response);

        try {
          const schedules = await getTripPrizeSchedules(numericTripId);
          setPrizeSchedules(schedules ?? []);
        } catch (prizeErr) {
          console.error(
            "Failed to load prize schedules for tournament standings title",
            prizeErr,
          );
          setPrizeSchedules([]);
        }

        try {
          const [rounds, setup] = await Promise.all([
            getTripRounds(numericTripId),
            getTripTournamentSetup(numericTripId),
          ]);
          setTripRounds(rounds ?? []);
          setTournamentSetup(setup);
        } catch (roundErr) {
          console.error(
            "Failed to load event rounds/tournament setup for print date range",
            roundErr,
          );
          setTripRounds([]);
          setTournamentSetup(null);
        }
      } catch (err) {
        console.error("Failed to load tournament standings", err);
        setError("Unable to load tournament standings.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tripId, competition]);

  return {
    standings,
    prizeSchedules,
    tripRounds,
    tournamentSetup,
    loading,
    error,
  };
}
