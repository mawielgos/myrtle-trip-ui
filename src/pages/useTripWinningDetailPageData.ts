import { useEffect, useState } from "react";
import {
  getTournamentStandings,
  getTripDetail,
  getTripPlayers,
  getTripPrizeSchedules,
  getTripPrizeWinnings,
  getTripRounds,
  getTripTournamentSetup,
} from "../api/tripApi";
import type {
  PrizeRecalculationResponse,
  PrizeSchedule,
  TournamentStandings,
  TripDetail,
  TripPlayer,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

type Competition = "LOW_NET" | "LOW_GROSS";

export function useTripWinningDetailPageData(numericTripId: number) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [schedules, setSchedules] = useState<PrizeSchedule[]>([]);
  const [winnings, setWinnings] = useState<PrizeRecalculationResponse | null>(null);
  const [standingsByCompetition, setStandingsByCompetition] = useState<
    Partial<Record<Competition, TournamentStandings>>
  >({});
  const [tournamentSetup, setTournamentSetup] = useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [
          tripResult,
          playerResult,
          roundResult,
          scheduleResult,
          prizeResult,
          setupResult,
        ] = await Promise.all([
          getTripDetail(numericTripId),
          getTripPlayers(numericTripId),
          getTripRounds(numericTripId),
          getTripPrizeSchedules(numericTripId),
          getTripPrizeWinnings(numericTripId),
          getTripTournamentSetup(numericTripId),
        ]);

        const standingsResults = await Promise.allSettled([
          getTournamentStandings(numericTripId, "LOW_NET"),
          getTournamentStandings(numericTripId, "LOW_GROSS"),
        ]);

        const nextStandingsByCompetition: Partial<
          Record<Competition, TournamentStandings>
        > = {};
        if (standingsResults[0].status === "fulfilled") {
          nextStandingsByCompetition.LOW_NET = standingsResults[0].value;
        }
        if (standingsResults[1].status === "fulfilled") {
          nextStandingsByCompetition.LOW_GROSS = standingsResults[1].value;
        }

        if (!cancelled) {
          setTrip(tripResult);
          setPlayers(playerResult);
          setRounds(roundResult);
          setSchedules(scheduleResult);
          setWinnings(prizeResult);
          setTournamentSetup(setupResult);
          setStandingsByCompetition(nextStandingsByCompetition);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Unable to load winning detail.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [numericTripId]);

  return {
    trip,
    players,
    rounds,
    schedules,
    winnings,
    setWinnings,
    standingsByCompetition,
    tournamentSetup,
    loading,
    error,
    setError,
  };
}
