import { useMemo } from "react";
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
import {
  buildScoreGridData,
  calculateTeamParTotal,
  type TeamPlayerResult,
  type TeamValidationGroup,
} from "../components/results/scoreGridBuilders";
import {
  buildFallbackEventSnapshotRows,
  buildPrizePayoutGroups,
  formatEventSummary,
  getEffectiveScoreGridFormat,
  getPrimaryScoringLabel,
  getResultEntityLabel,
  getResultEntityPluralLabel,
  hasHoleByHoleScrambleScores,
  isIndividualFormat,
  isScoreGridFormat,
  isScrambleFormat,
} from "./roundResultsLogic";

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

function getTeeSummary(status: RoundStatus | null): string {
  if (!status) {
    return "";
  }

  return status.teeName?.trim() ?? "";
}

function getEventRoundNumber(
  status: RoundStatus | null,
  tripRounds: TripRoundListItem[],
): number | null {
  if (!status) {
    return null;
  }

  if (typeof status.roundNumber === "number" && Number.isFinite(status.roundNumber)) {
    return status.roundNumber;
  }

  const matchedRound = tripRounds.find((round) => round.roundId === status.roundId);
  return matchedRound?.roundNumber ?? null;
}

function formatEventRoundLabel(roundNumber?: number | null, fallbackRoundId?: number | null): string {
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    return `Round ${roundNumber}`;
  }

  if (typeof fallbackRoundId === "number" && Number.isFinite(fallbackRoundId)) {
    return `Round ${fallbackRoundId}`;
  }

  return "Round";
}

interface UseRoundResultsViewStateArgs {
  status: RoundStatus | null;
  results: RoundGameResult | null;
  eventResults: RoundEventsResultResponse | null;
  scorecards: RoundScorecardSummary[];
  scorecardDetails: Record<number, ScorecardDetail>;
  holeMeta: HoleScoreDto[];
  roundPrizeWinnings: PrizeWinningResponse[];
  teamExceptions: RoundTeamExceptionResponse[];
  tripRounds: TripRoundListItem[];
}

export function useRoundResultsViewState({
  status,
  results,
  eventResults,
  scorecards,
  scorecardDetails,
  holeMeta,
  roundPrizeWinnings,
  teamExceptions,
  tripRounds,
}: UseRoundResultsViewStateArgs) {
  const holes = useMemo(() => {
    if (holeMeta.length > 0) {
      return holeMeta.map((hole) => hole.holeNumber);
    }

    return Array.from({ length: 18 }, (_, index) => index + 1);
  }, [holeMeta]);

  const validationGroups = useMemo<TeamValidationGroup[]>(() => {
    if (!results) {
      return [];
    }

    const groups: TeamValidationGroup[] = [];

    for (let i = 0; i < results.teams.length; i += 1) {
      const team = results.teams[i];
      const teamPlayers: TeamPlayerResult[] = [];

      for (let j = 0; j < scorecards.length; j += 1) {
        const summary = scorecards[j];
        if (summary.teamId === team.teamId) {
          teamPlayers.push({
            summary,
            detail: scorecardDetails[summary.scorecardId] ?? null,
          });
        }
      }

      for (let j = 0; j < teamExceptions.length; j += 1) {
        const exception = teamExceptions[j];
        if (
          exception.exceptionType !== "GHOST_PLAYER" ||
          exception.roundTeamId !== team.teamId ||
          exception.ghostPlayerId == null
        ) {
          continue;
        }

        const ghostSummary = scorecards.find((summary) => summary.playerId === exception.ghostPlayerId);
        if (!ghostSummary) {
          continue;
        }

        const alreadyListed = teamPlayers.some((player) => player.summary.playerId === exception.ghostPlayerId);
        if (alreadyListed) {
          continue;
        }

        teamPlayers.push({
          summary: {
            ...ghostSummary,
            teamId: team.teamId,
            teamName: team.teamName,
            playerName: "Ghost Player",
          },
          detail: scorecardDetails[ghostSummary.scorecardId] ?? null,
        });
      }

      groups.push({
        teamId: team.teamId,
        teamName: team.teamName,
        placement: team.placement,
        totalGross: team.totalGross,
        totalNet: team.totalNet,
        totalPoints: team.totalPoints,
        holeResults: team.holeResults,
        players: teamPlayers,
      });
    }

    return groups;
  }, [results, scorecards, scorecardDetails, teamExceptions]);

  const frontNinePar = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < holeMeta.length; i += 1) {
      const hole = holeMeta[i];
      if (hole.holeNumber >= 1 && hole.holeNumber <= 9) {
        sum += hole.par ?? 0;
      }
    }
    return sum;
  }, [holeMeta]);

  const backNinePar = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < holeMeta.length; i += 1) {
      const hole = holeMeta[i];
      if (hole.holeNumber >= 10 && hole.holeNumber <= 18) {
        sum += hole.par ?? 0;
      }
    }
    return sum;
  }, [holeMeta]);

  const totalPar = frontNinePar + backNinePar;

  const holePars = useMemo(() => holeMeta.map((hole) => hole.par ?? 0), [holeMeta]);

  const effectiveScoreGridFormat = useMemo(
    () => getEffectiveScoreGridFormat(results?.format, eventResults?.events ?? []),
    [results, eventResults],
  );

  const teamParTotal = useMemo(() => {
    if (!results) {
      return 0;
    }
    return calculateTeamParTotal(effectiveScoreGridFormat ?? results.format, holePars);
  }, [results, effectiveScoreGridFormat, holePars]);

  const leader = useMemo(() => {
    if (!results || results.teams.length === 0) {
      return null;
    }
    return results.teams[0];
  }, [results]);

  const eventSnapshotRows = useMemo(
    () => buildFallbackEventSnapshotRows(eventResults?.events ?? []),
    [eventResults],
  );

  const teeSummary = getTeeSummary(status);

  const scoreGridData = useMemo(() => {
    if (!results || !isScoreGridFormat(effectiveScoreGridFormat)) {
      return null;
    }

    const subtitleParts: string[] = [];
    if (status?.roundDate) {
      subtitleParts.push(formatRoundDate(status.roundDate));
    }
    if (status?.courseName) {
      subtitleParts.push(status.courseName);
    }
    if (teeSummary) {
      subtitleParts.push(teeSummary);
    }

    return buildScoreGridData(
      {
        format: effectiveScoreGridFormat,
        holes,
        holeMeta,
      },
      validationGroups,
      results.teams,
      subtitleParts.join(" — "),
    );
  }, [results, effectiveScoreGridFormat, status, teeSummary, holes, holeMeta, validationGroups]);

  const showUnsupportedScoreGridMessage = Boolean(
    results &&
      !scoreGridData &&
      !isScrambleFormat(effectiveScoreGridFormat) &&
      !isIndividualFormat(effectiveScoreGridFormat),
  );

  const roundPrizeTotal = useMemo(
    () => roundPrizeWinnings.reduce((sum, winning) => sum + Number(winning.amount ?? 0), 0),
    [roundPrizeWinnings],
  );

  const prizeBySourceName = useMemo(() => {
    const totals: Record<string, number> = {};

    for (let i = 0; i < roundPrizeWinnings.length; i += 1) {
      const winning = roundPrizeWinnings[i];
      const sourceName = winning.sourceName?.trim();
      if (!sourceName) {
        continue;
      }
      totals[sourceName] = (totals[sourceName] ?? 0) + Number(winning.amount ?? 0);
    }

    return totals;
  }, [roundPrizeWinnings]);

  const sortedRoundPrizeWinnings = useMemo(() => {
    return [...roundPrizeWinnings].sort((a, b) => {
      const rankA = a.sourceRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.sourceRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const sourceCompare = (a.sourceName ?? "").localeCompare(b.sourceName ?? "");
      if (sourceCompare !== 0) {
        return sourceCompare;
      }

      return (a.playerName ?? "").localeCompare(b.playerName ?? "");
    });
  }, [roundPrizeWinnings]);

  const groupedRoundPrizeWinnings = useMemo(
    () => buildPrizePayoutGroups(sortedRoundPrizeWinnings),
    [sortedRoundPrizeWinnings],
  );

  const gridMode = isScoreGridFormat(effectiveScoreGridFormat);
  const scrambleMode = isScrambleFormat(effectiveScoreGridFormat);
  const individualMode = isIndividualFormat(results?.format);
  const resultEntityLabel = getResultEntityLabel(results?.format);
  const resultEntityPluralLabel = getResultEntityPluralLabel(results?.format);
  const scrambleHasHoleScores = Boolean(
    scrambleMode && results?.teams.some((team) => hasHoleByHoleScrambleScores(team)),
  );
  const displayEventResults = eventResults?.events ?? [];
  const hasEventDrivenResults = displayEventResults.length > 0;
  const eventSummaryLabel = formatEventSummary(displayEventResults);
  const primaryScoringLabel = getPrimaryScoringLabel(
    results?.format,
    displayEventResults,
    status?.scrambleTeamSize,
  );
  const eventRoundNumber = getEventRoundNumber(status, tripRounds);
  const eventRoundLabel = formatEventRoundLabel(eventRoundNumber, status?.roundId);

  return {
    holes,
    validationGroups,
    frontNinePar,
    backNinePar,
    totalPar,
    effectiveScoreGridFormat,
    teamParTotal,
    leader,
    eventSnapshotRows,
    teeSummary,
    scoreGridData,
    showUnsupportedScoreGridMessage,
    roundPrizeTotal,
    prizeBySourceName,
    sortedRoundPrizeWinnings,
    groupedRoundPrizeWinnings,
    gridMode,
    scrambleMode,
    individualMode,
    resultEntityLabel,
    resultEntityPluralLabel,
    scrambleHasHoleScores,
    displayEventResults,
    hasEventDrivenResults,
    eventSummaryLabel,
    primaryScoringLabel,
    eventRoundLabel,
  };
}
