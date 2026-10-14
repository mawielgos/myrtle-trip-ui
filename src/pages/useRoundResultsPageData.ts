import { useCallback, useEffect, useState } from "react";
import { getTripDetail, getTripPrizeWinnings, getTripRounds } from "../api/tripApi";
import { getRoundEventResults } from "../api/roundEventApi";
import {
  getRoundGameResults,
  getRoundScorecards,
  getRoundStatus,
  getScorecardDetail,
  getRoundTeamExceptions,
} from "../api/roundApi";
import type {
  HoleScoreDto,
  RoundGameResult,
  RoundScorecardSummary,
  RoundStatus,
  ScorecardDetail,
  RoundTeamExceptionResponse,
} from "../types/round";
import type { PrizeWinningResponse, TripRoundListItem } from "../types/trip";
import type { RoundEventsResultResponse } from "../types/roundEvent";
import { getTeamDisplayTotal } from "./roundResultsLogic";

function formatRoundDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getTripDateRange(rounds: TripRoundListItem[]): string {
  const dates: string[] = [];

  for (let i = 0; i < rounds.length; i += 1) {
    const roundDate = rounds[i].roundDate;
    if (roundDate) {
      dates.push(roundDate);
    }
  }

  if (dates.length === 0) {
    return "";
  }

  dates.sort();
  const start = formatRoundDate(dates[0]);
  const end = formatRoundDate(dates[dates.length - 1]);

  if (!start || !end || start === end) {
    return start || end;
  }

  return `${start} – ${end}`;
}

export interface RoundResultsPageData {
  status: RoundStatus | null;
  results: RoundGameResult | null;
  eventResults: RoundEventsResultResponse | null;
  scorecards: RoundScorecardSummary[];
  scorecardDetails: Record<number, ScorecardDetail>;
  holeMeta: HoleScoreDto[];
  roundPrizeWinnings: PrizeWinningResponse[];
  teamExceptions: RoundTeamExceptionResponse[];
  tripName: string;
  tripDateRange: string;
  tripRounds: TripRoundListItem[];
  loading: boolean;
  error: string | null;
  reload: (targetRoundId?: number) => Promise<void>;
}

export function useRoundResultsPageData(roundId: number): RoundResultsPageData {
  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [results, setResults] = useState<RoundGameResult | null>(null);
  const [eventResults, setEventResults] = useState<RoundEventsResultResponse | null>(null);
  const [scorecards, setScorecards] = useState<RoundScorecardSummary[]>([]);
  const [scorecardDetails, setScorecardDetails] = useState<Record<number, ScorecardDetail>>({});
  const [holeMeta, setHoleMeta] = useState<HoleScoreDto[]>([]);
  const [roundPrizeWinnings, setRoundPrizeWinnings] = useState<PrizeWinningResponse[]>([]);
  const [teamExceptions, setTeamExceptions] = useState<RoundTeamExceptionResponse[]>([]);
  const [tripName, setTripName] = useState("");
  const [tripDateRange, setTripDateRange] = useState("");
  const [tripRounds, setTripRounds] = useState<TripRoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [roundStatus, roundResults, roundScorecards, roundEventResults, roundTeamExceptionPage] = await Promise.all([
        getRoundStatus(id),
        getRoundGameResults(id),
        getRoundScorecards(id),
        getRoundEventResults(id),
        getRoundTeamExceptions(id),
      ]);

      const orderedTeams = [...roundResults.teams].sort((a, b) => {
        const placementA = a.placement ?? Number.MAX_SAFE_INTEGER;
        const placementB = b.placement ?? Number.MAX_SAFE_INTEGER;
        if (placementA !== placementB) {
          return placementA - placementB;
        }

        const scoreA = getTeamDisplayTotal(a, roundResults.format) ?? Number.MAX_SAFE_INTEGER;
        const scoreB = getTeamDisplayTotal(b, roundResults.format) ?? Number.MAX_SAFE_INTEGER;
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        const netA = a.totalNet ?? Number.MAX_SAFE_INTEGER;
        const netB = b.totalNet ?? Number.MAX_SAFE_INTEGER;
        if (netA !== netB) {
          return netA - netB;
        }

        const grossA = a.totalGross ?? Number.MAX_SAFE_INTEGER;
        const grossB = b.totalGross ?? Number.MAX_SAFE_INTEGER;
        if (grossA !== grossB) {
          return grossA - grossB;
        }

        return (a.teamName ?? "").localeCompare(b.teamName ?? "");
      });

      const detailResults = await Promise.all(
        roundScorecards.map(async (scorecard) => {
          try {
            return await getScorecardDetail(scorecard.scorecardId);
          } catch (detailError) {
            console.error(
              "Failed to load scorecard detail",
              scorecard.scorecardId,
              detailError,
            );
            return null;
          }
        }),
      );

      const detailMap: Record<number, ScorecardDetail> = {};
      for (let i = 0; i < detailResults.length; i += 1) {
        const detail = detailResults[i];
        if (detail) {
          detailMap[detail.scorecardId] = detail;
        }
      }

      let metaSource: HoleScoreDto[] = [];
      for (let i = 0; i < detailResults.length; i += 1) {
        const detail = detailResults[i];
        if (detail) {
          metaSource = [...detail.holes].sort((a, b) => a.holeNumber - b.holeNumber);
          break;
        }
      }

      let currentRoundPrizeWinnings: PrizeWinningResponse[] = [];
      let currentTripName = "";
      let currentTripDateRange = "";
      let currentTripRounds: TripRoundListItem[] = [];
      if (roundStatus.tripId != null) {
        try {
          const [prizeResponse, tripDetail, tripRoundList] = await Promise.all([
            getTripPrizeWinnings(roundStatus.tripId),
            getTripDetail(roundStatus.tripId),
            getTripRounds(roundStatus.tripId),
          ]);
          currentRoundPrizeWinnings = (prizeResponse.winnings ?? []).filter(
            (winning) => winning.roundId === id,
          );
          currentTripName = tripDetail.tripName;
          currentTripRounds = tripRoundList;
          currentTripDateRange = getTripDateRange(tripRoundList);
        } catch (tripError) {
          console.error("Failed to load event context for round results", tripError);
        }
      }

      setStatus(roundStatus);
      setResults({ ...roundResults, teams: orderedTeams });
      setScorecards(roundScorecards);
      setEventResults(roundEventResults);
      setTeamExceptions(roundTeamExceptionPage.exceptions ?? []);
      setScorecardDetails(detailMap);
      setHoleMeta(metaSource);
      setRoundPrizeWinnings(currentRoundPrizeWinnings);
      setTripName(currentTripName);
      setTripDateRange(currentTripDateRange);
      setTripRounds(currentTripRounds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load round results.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async (targetRoundId = roundId): Promise<void> => {
    if (!Number.isFinite(targetRoundId) || targetRoundId <= 0) {
      setError("Invalid round id.");
      setLoading(false);
      return;
    }

    await loadPage(targetRoundId);
  }, [loadPage, roundId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    status,
    results,
    eventResults,
    scorecards,
    scorecardDetails,
    holeMeta,
    roundPrizeWinnings,
    teamExceptions,
    tripName,
    tripDateRange,
    tripRounds,
    loading,
    error,
    reload,
  };
}
