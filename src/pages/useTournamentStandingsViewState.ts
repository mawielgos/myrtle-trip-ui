import { useMemo } from "react";
import type {
  PrizeSchedule,
  TournamentStandingRow,
  TournamentStandings,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import type { TournamentCompetition } from "./useTournamentStandingsPageData";
import {
  formatGeneratedTimestamp,
  getConfiguredCompetitionName,
  getConfiguredPurse,
  getPaidPlaces,
  getShownWinningsTotal,
  getTournamentName,
  getTripDateRange,
  isCompetitionEnabled,
} from "./tournamentStandingsLogic";

export type TournamentStandingsViewState = {
  generatedTimestamp: string;
  tripDateRange: string;
  tournamentName: string;
  lowNetButtonLabel: string;
  lowGrossButtonLabel: string;
  showLowNetButton: boolean;
  showLowGrossButton: boolean;
  configuredPurse: number;
  paidPlaces: number;
  sortedRows: TournamentStandingRow[];
  shownWinningsTotal: number;
};

type Params = {
  standings: TournamentStandings | null;
  prizeSchedules: PrizeSchedule[];
  tripRounds: TripRoundListItem[];
  tournamentSetup: TripTournamentSetup | null;
  competition: TournamentCompetition;
};

export function useTournamentStandingsViewState({
  standings,
  prizeSchedules,
  tripRounds,
  tournamentSetup,
  competition,
}: Params): TournamentStandingsViewState {
  const generatedTimestamp = useMemo(() => formatGeneratedTimestamp(), []);

  const tripDateRange = useMemo(() => getTripDateRange(tripRounds), [tripRounds]);

  const tournamentName = useMemo(() => {
    const configuredName = getConfiguredCompetitionName(
      tournamentSetup,
      competition,
    );
    if (configuredName) {
      return configuredName;
    }

    const baseName = getTournamentName(standings, prizeSchedules, competition);
    const label =
      standings?.competitionLabel ||
      (competition === "LOW_GROSS" ? "Low Gross" : "Low Net");
    return baseName.includes(label) ? baseName : `${baseName} - ${label}`;
  }, [standings, prizeSchedules, competition, tournamentSetup]);

  const lowNetButtonLabel = getConfiguredCompetitionName(
    tournamentSetup,
    "LOW_NET",
  );
  const lowGrossButtonLabel = getConfiguredCompetitionName(
    tournamentSetup,
    "LOW_GROSS",
  );
  const showLowNetButton = isCompetitionEnabled(tournamentSetup, "LOW_NET");
  const showLowGrossButton = isCompetitionEnabled(tournamentSetup, "LOW_GROSS");

  const configuredPurse = useMemo(
    () => getConfiguredPurse(prizeSchedules, competition),
    [prizeSchedules, competition],
  );

  const paidPlaces = useMemo(
    () => getPaidPlaces(prizeSchedules, competition),
    [prizeSchedules, competition],
  );

  const sortedRows = useMemo(() => {
    if (!standings) {
      return [];
    }

    return [...standings.rows].sort((a, b) => {
      const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
      const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
      if (aPosition !== bPosition) {
        return aPosition - bPosition;
      }
      if (a.totalScore !== b.totalScore) {
        return a.totalScore - b.totalScore;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [standings]);

  const shownWinningsTotal = useMemo(() => {
    if (!standings) {
      return 0;
    }
    return getShownWinningsTotal(sortedRows, standings.leaderboardFinal);
  }, [standings, sortedRows]);

  return {
    generatedTimestamp,
    tripDateRange,
    tournamentName,
    lowNetButtonLabel,
    lowGrossButtonLabel,
    showLowNetButton,
    showLowGrossButton,
    configuredPurse,
    paidPlaces,
    sortedRows,
    shownWinningsTotal,
  };
}
