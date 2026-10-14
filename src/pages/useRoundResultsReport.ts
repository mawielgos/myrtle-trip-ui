import { useEffect } from "react";
import type { RoundGameResult, RoundStatus, TeamGameResult } from "../types/round";
import type { RoundEventResultResponse } from "../types/roundEvent";
import type { TeamPlayerResult, TeamValidationGroup } from "../components/results/scoreGridBuilders";
import { formatCurrencyCents } from "../utils/moneyFormat";
import { formatGameDescription } from "../utils/gameFormat";
import { downloadCsv, sanitizeFileName } from "../utils/exportUtils";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import {
  formatEventResultScore,
  formatScoreVsPar,
  getEventPlacementLabel,
  getResultEntityLabel,
  getResultEntityPluralLabel,
  getTeamDisplayTotal,
  getTeamEventDisplayTotal,
  isIndividualFormat,
  isIndividualResultTie,
  isTeamEventResultTie,
} from "./roundResultsLogic";
import type { RoundResultsPageData } from "./useRoundResultsPageData";
import { useRoundResultsViewState } from "./useRoundResultsViewState";

type RoundResultsViewState = ReturnType<typeof useRoundResultsViewState>;
function formatLabel(value?: string | null, scrambleTeamSize?: number | null): string {
  return formatGameDescription(value, scrambleTeamSize);
}

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

function buildRoundPrintTitle(
  status: RoundStatus,
  results: RoundGameResult,
  roundLabel: string,
): string {
  const parts: string[] = [];
  parts.push(roundLabel);

  const date = formatRoundDate(status.roundDate);
  if (date) {
    parts.push(date);
  }

  const format = formatLabel(results.format, status.scrambleTeamSize);
  if (format) {
    parts.push(format);
  }

  if (status.courseName) {
    parts.push(status.courseName);
  }

  return parts.join(" • ");
}

function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) {
    return "";
  }

  return tied ? `T${value}` : String(value);
}

function isTieForPlacement(
  team: TeamGameResult,
  teams: TeamGameResult[],
): boolean {
  if (team.placement == null) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < teams.length; i += 1) {
    if (teams[i].placement === team.placement) {
      count += 1;
    }
  }
  return count > 1;
}

function getEventEntityLabel(event: RoundEventResultResponse): "Player" | "Team" {
  return event.resultKind === "INDIVIDUAL" ? "Player" : "Team";
}

function getTeamPlayerDisplayLabel(player: TeamPlayerResult): string {
  const name = player.summary.playerName;
  const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
  const withdrawalHoleNumber = player.detail?.withdrawalHoleNumber ?? player.summary.withdrawalHoleNumber ?? null;

  if (status === "WITHDRAWN" && withdrawalHoleNumber != null) {
    return `${name} (WD after ${withdrawalHoleNumber})`;
  }
  if (status === "WITHDRAWN") {
    return `${name} (WD)`;
  }
  if (status === "NO_SHOW") {
    return `${name} (NS)`;
  }
  return name;
}

function getEventTeamPlayers(team: TeamGameResult, validationGroups: TeamValidationGroup[]): string {
  const group = validationGroups.find((candidate) => candidate.teamId === team.teamId);
  if (!group || group.players.length === 0) {
    return "";
  }

  return group.players.map((player) => getTeamPlayerDisplayLabel(player)).join(" / ");
}


interface UseRoundResultsReportArgs {
  status: RoundStatus | null;
  results: RoundGameResult | null;
  tripName: string;
  tripDateRange: string;
  scorecards: RoundResultsPageData["scorecards"];
  scorecardDetails: RoundResultsPageData["scorecardDetails"];
  viewState: RoundResultsViewState;
}

export function useRoundResultsReport({
  status,
  results,
  tripName,
  tripDateRange,
  scorecards,
  scorecardDetails,
  viewState,
}: UseRoundResultsReportArgs) {
  const {
    holes,
    validationGroups,
    frontNinePar,
    backNinePar,
    totalPar,
    teamParTotal,
    leader,
    eventSnapshotRows,
    teeSummary,
    scoreGridData,
    roundPrizeTotal,
    prizeBySourceName,
    sortedRoundPrizeWinnings,
    scrambleMode,
    scrambleHasHoleScores,
    displayEventResults,
    hasEventDrivenResults,
    eventSummaryLabel,
    primaryScoringLabel,
    eventRoundLabel,
  } = viewState;
  function handleExportCsv(): void {
    if (!status || !results) {
      return;
    }

    const rows: Array<Array<string | number | null | undefined>> = [];
    const roundTitle = buildRoundPrintTitle(status, results, eventRoundLabel).replace(/\s*•\s*/g, " - ");
    const statusText = status.finalized ? "Finalized" : "Not Finalized";

    rows.push(["Round Results"]);
    rows.push([]);
    rows.push(["Event", tripName || ""]);
    rows.push(["Event Dates", tripDateRange || ""]);
    rows.push(["Round", roundTitle]);
    rows.push(["Events", eventSummaryLabel || primaryScoringLabel]);
    if (eventSummaryLabel) {
      rows.push(["Primary Scoring", primaryScoringLabel]);
    }
    rows.push(["Course", status.courseName || ""]);
    rows.push(["Tee", teeSummary || ""]);
    rows.push(["Round Date", status.roundDate || ""]);
    rows.push(["Status", statusText]);
    rows.push([]);

    rows.push(["Round Snapshot"]);
    if (eventSnapshotRows.length > 0) {
      rows.push(["Event", "Winner", "Winning Total", "Place"]);
      eventSnapshotRows.forEach((row) => {
        rows.push([
          row.eventName,
          (row.winnerNames && row.winnerNames.length > 0) ? row.winnerNames.join(" / ") : row.winnerName,
          row.winningTotal ?? "",
          getEventPlacementLabel(row.rank, row.tied),
        ]);
      });
    } else {
      rows.push(["Leader", leader?.teamName ?? ""]);
      rows.push(["Winning Total", leader ? getTeamDisplayTotal(leader, results.format) ?? "" : ""]);
    }
    if (hasEventDrivenResults) {
      rows.push(["Events", displayEventResults.length]);
    } else {
      rows.push([getResultEntityPluralLabel(results.format), results.teams.length]);
    }
    rows.push(["Par", totalPar > 0 ? totalPar : ""]);
    rows.push(["Out Par", frontNinePar > 0 ? frontNinePar : ""]);
    rows.push(["In Par", backNinePar > 0 ? backNinePar : ""]);
    rows.push([]);

    if (hasEventDrivenResults) {
      rows.push(["Event Results"]);
      for (let i = 0; i < displayEventResults.length; i += 1) {
        const event = displayEventResults[i];
        rows.push([]);
        rows.push([event.eventName || formatLabel(event.eventType)]);

        if (event.resultKind === "INDIVIDUAL") {
          rows.push(["Place", "Player", "Event Total", "Gross", "Net"]);
          event.individualResults.forEach((row) => {
            rows.push([
              getEventPlacementLabel(row.rank, isIndividualResultTie(row, event.individualResults)),
              row.playerName,
              formatEventResultScore(event, row) ?? "",
              row.grossTotal ?? "",
              row.netTotal ?? "",
            ]);
          });
        } else {
          rows.push(["Place", getEventEntityLabel(event), "Players", "Total"]);
          event.teamResults.forEach((team) => {
            rows.push([
              placementLabel(team.placement, isTeamEventResultTie(team, event.teamResults)),
              team.teamName,
              getEventTeamPlayers(team, validationGroups),
              getTeamEventDisplayTotal(team, event.eventType) ?? "",
            ]);
          });
        }
      }
      rows.push([]);
    } else {
      rows.push(["Standings"]);
      rows.push(["Place", getResultEntityLabel(results.format), isIndividualFormat(results.format) ? "" : "Players", "Total", "Prize"]);
      results.teams.forEach((team) => {
        const group = validationGroups.find((g) => g.teamId === team.teamId);
        rows.push([
          placementLabel(team.placement, isTieForPlacement(team, results.teams)),
          team.teamName,
          isIndividualFormat(results.format) ? "" : group ? group.players.map((p) => p.summary.playerName).join(" / ") : "",
          getTeamDisplayTotal(team, results.format) ?? "",
          prizeBySourceName[team.teamName] != null ? formatCurrencyCents(prizeBySourceName[team.teamName]) : "",
        ]);
      });
      rows.push([]);
    }

    rows.push(["Prize Money Won"]);
    if (sortedRoundPrizeWinnings.length > 0) {
      rows.push(["Round Prize Total", formatCurrencyCents(roundPrizeTotal)]);
      rows.push(["Place", "Result", "Player", "Amount"]);
      sortedRoundPrizeWinnings.forEach((winning) => {
        rows.push([
          winning.sourceRank ?? "",
          winning.sourceName || winning.gameName || "",
          winning.playerName || "",
          formatCurrencyCents(Number(winning.amount ?? 0)),
        ]);
      });
    } else {
      rows.push(["No prize money has been calculated for this round."]);
    }
    rows.push([]);

    rows.push(["Player Scores Summary"]);
    rows.push([getResultEntityLabel(results.format), "Place", "Player", "Gross", "Adjusted Gross", "Net", "Tee", "Course Handicap", "Playing Handicap"]);
    results.teams.forEach((team) => {
      const teamScorecards = scorecards.filter((scorecard) => scorecard.teamId === team.teamId);
      teamScorecards.forEach((summary) => {
        const detail = scorecardDetails[summary.scorecardId];
        rows.push([
          team.teamName,
          placementLabel(team.placement, isTieForPlacement(team, results.teams)),
          summary.playerName,
          detail?.grossScore ?? summary.grossScore ?? "",
          detail?.adjustedGrossScore ?? summary.adjustedGrossScore ?? "",
          detail?.netScore ?? summary.netScore ?? "",
          detail?.roundTeeName ?? summary.roundTeeName ?? summary.currentTeeName ?? summary.teeName ?? "",
          detail?.courseHandicap ?? summary.courseHandicap ?? "",
          detail?.playingHandicap ?? summary.playingHandicap ?? "",
        ]);
      });
    });
    rows.push([]);

    if (scoreGridData) {
      rows.push([scoreGridData.title + (teamParTotal > 0 ? ` (Team Par - ${teamParTotal})` : "")]);
      if (scoreGridData.subtitle) {
        rows.push([scoreGridData.subtitle.replace(/\s*—\s*/g, " - ")]);
      }

      const scoreHeader = ["Team / Player", "Row", ...scoreGridData.holes.map((hole) => String(hole)), "Out", "In", "Total", "Rank"];
      rows.push(scoreHeader);

      scoreGridData.metaRows.forEach((metaRow) => {
        rows.push([
          metaRow.label,
          "",
          ...metaRow.values,
          metaRow.out ?? "",
          metaRow.in ?? "",
          metaRow.total ?? "",
          "",
        ]);
      });

      scoreGridData.sections.forEach((section) => {
        rows.push([]);
        rows.push([section.teamName, "", ...scoreGridData.holes.map(() => ""), "", "", "", ""]);

        section.players.forEach((player) => {
          rows.push([
            player.playerName,
            "Gross",
            ...player.grossValues,
            player.grossOut ?? "",
            player.grossIn ?? "",
            player.grossTotal ?? "",
            "",
          ]);
          rows.push([
            "",
            "Net",
            ...player.netValues,
            player.netOut ?? "",
            player.netIn ?? "",
            player.netTotal ?? "",
            "",
          ]);
        });

        rows.push([
          section.aggregate.label,
          "Team",
          ...section.aggregate.values,
          section.aggregate.out ?? "",
          section.aggregate.in ?? "",
          section.aggregate.total ?? "",
          section.aggregate.rankLabel ?? "",
        ]);
      });
    } else if (scrambleMode) {
      rows.push(["Scramble Results"]);
      rows.push(["Team", "Place", "Players", "Total", "To Par"]);
      results.teams.forEach((team) => {
        const group = validationGroups.find((g) => g.teamId === team.teamId);
        const teamTotal = getTeamDisplayTotal(team, results.format);
        rows.push([
          team.teamName,
          placementLabel(team.placement, isTieForPlacement(team, results.teams)),
          isIndividualFormat(results.format) ? "" : group ? group.players.map((p) => p.summary.playerName).join(" / ") : "",
          teamTotal ?? "",
          formatScoreVsPar(teamTotal, totalPar),
        ]);
      });

      if (scrambleHasHoleScores) {
        rows.push([]);
        rows.push(["Scramble Hole Scores"]);
        rows.push(["Team", ...holes.map((hole) => String(hole)), "Out", "In", "Total"]);
        results.teams.forEach((team) => {
          const sortedHoles = [...team.holeResults].sort((a, b) => a.holeNumber - b.holeNumber);
          const values = holes.map((holeNumber) => {
            const match = sortedHoles.find((hole) => hole.holeNumber === holeNumber);
            return match?.grossScore ?? "";
          });
          const numericValues = values.map((value) => (typeof value === "number" ? value : null));
          rows.push([
            team.teamName,
            ...values,
            numericValues.slice(0, 9).reduce((sum, value) => sum + (value ?? 0), 0),
            numericValues.slice(9, 18).reduce((sum, value) => sum + (value ?? 0), 0),
            getTeamDisplayTotal(team, results.format) ?? "",
          ]);
        });
      }
    }

    const baseName = sanitizeFileName(`${tripName || "event"}-${status.courseName || "round"}-${status.roundDate || status.roundId}-results`);
    downloadCsv(`${baseName}.csv`, rows);
  }

  useEffect(() => {
    const styleId = "round-results-print-style";

    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.innerHTML = `
      @page {
        size: landscape;
        margin: 0.65in 0.6in;
      }

      @media print {
        html, body {
          background: #fff !important;
        }

        .no-print,
        .app-shell-no-print,
        .round-results-no-print {
          display: none !important;
        }

        body * {
          visibility: hidden;
        }

        .round-results-print-root,
        .round-results-print-root * {
          visibility: visible;
        }

        .round-results-print-root {
          position: static !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #fff !important;
          box-sizing: border-box !important;
        }

        .round-results-print-header {
          display: block !important;
          visibility: visible !important;
          margin-bottom: 10px !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid #bbb !important;
        }

        .round-results-print-root section {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin-bottom: 14px !important;
          background: #fff !important;
          break-inside: auto;
          page-break-inside: auto;
        }

        .round-results-standings-prize-panel {
          display: block !important;
        }

        .round-results-event-result-block,
        .round-results-prize-event-block,
        .score-grid-team-section {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }

        .round-results-event-result-block,
        .round-results-prize-event-block {
          margin-bottom: 16px !important;
        }

        .score-grid-team-section tr:first-child td,
        .score-grid-team-section tr:first-child th {
          break-before: auto !important;
          page-break-before: auto !important;
        }

        .round-results-prize-section,
        .round-results-score-grid-section {
          break-before: page !important;
          page-break-before: always !important;
          margin-top: 0 !important;
        }

        .round-results-prize-section h2,
        .round-results-score-grid-section h2 {
          margin-top: 0 !important;
        }

        .round-results-print-root table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 10px !important;
        }

        .round-results-print-root thead {
          display: table-header-group;
        }

        .round-results-print-root tr,
        .round-results-print-root td,
        .round-results-print-root th {
          page-break-inside: avoid !important;
        }
      }
    `;

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  const printTitle = status
    ? buildReportFileTitle(tripName || "Event", "Round Results", status.courseName, status.roundDate || eventRoundLabel)
    : "Round Results";

  function handlePrint(): void {
    printWithReportTitle(printTitle);
  }

  return { handleExportCsv, handlePrint, buildRoundPrintTitle };
}
