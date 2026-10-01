import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  TeamGameResult,
  RoundTeamExceptionResponse,
} from "../types/round";
import type { PrizeWinningResponse, TripRoundListItem } from "../types/trip";
import type { IndividualEventResult, RoundEventResultResponse, RoundEventSnapshotRow, RoundEventsResultResponse } from "../types/roundEvent";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import ScoreGrid from "../components/results/ScoreGrid";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import { buildScoreEntryAction } from "../utils/roundNavigation";
import { formatCurrencyCents } from "../utils/moneyFormat";
import { formatGameDescription } from "../utils/gameFormat";
import { downloadCsv, sanitizeFileName } from "../utils/exportUtils";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import {
  buildScoreGridData,
  type TeamPlayerResult,
  type TeamValidationGroup,
} from "../components/results/scoreGridBuilders";
import { calculateTeamParTotal } from "../components/results/scoreGridBuilders";

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

function getTeeSummary(status: RoundStatus | null): string {
  if (!status) {
    return "";
  }

  return status.teeName?.trim() ?? "";
}

function normalizeScoreGridFormat(format?: string | null): string | null | undefined {
  switch (format) {
    case "TEAM_MIDDLE_MAN":
      return "MIDDLE_MAN";
    case "TEAM_ONE_TWO_THREE":
      return "ONE_TWO_THREE";
    case "TEAM_TWO_MAN_LOW_NET":
      return "TWO_MAN_LOW_NET";
    case "TEAM_THREE_LOW_NET":
      return "THREE_LOW_NET";
    default:
      return format;
  }
}

function isScoreGridFormat(format?: string | null): boolean {
  const normalizedFormat = normalizeScoreGridFormat(format);
  return (
    normalizedFormat === "MIDDLE_MAN" ||
    normalizedFormat === "ONE_TWO_THREE" ||
    normalizedFormat === "THREE_LOW_NET" ||
    normalizedFormat === "TEAM_TWO_LOW_NET" ||
    normalizedFormat === "TWO_MAN_LOW_NET"
  );
}

function isScrambleFormat(format?: string | null): boolean {
  return format === "TEAM_SCRAMBLE";
}

function isIndividualFormat(format?: string | null): boolean {
  return (
    format === "STROKE_PLAY" ||
    format === "INDIVIDUAL_LOW_NET" ||
    format === "INDIVIDUAL_LOW_GROSS"
  );
}

function getResultEntityLabel(format?: string | null): "Player" | "Team" {
  return isIndividualFormat(format) ? "Player" : "Team";
}

function getResultEntityPluralLabel(format?: string | null): "Players" | "Teams" {
  return isIndividualFormat(format) ? "Players" : "Teams";
}

function getTeamDisplayTotal(team: TeamGameResult, format?: string | null): number | null {
  if (isScrambleFormat(format)) {
    return team.totalGross ?? team.totalNet ?? null;
  }

  return team.totalNet ?? team.totalGross ?? null;
}

function formatEventResultScore(event: RoundEventResultResponse, result: IndividualEventResult): number | null {
  return event.eventType === "INDIVIDUAL_LOW_GROSS" ? result.grossTotal : result.netTotal;
}

function isScrambleEventType(eventType?: string | null): boolean {
  return eventType === "TEAM_SCRAMBLE";
}

function getTeamEventDisplayTotal(team: TeamGameResult, eventType?: string | null): number | null {
  if (isScrambleEventType(eventType)) {
    return team.totalGross ?? team.totalNet ?? null;
  }

  return team.totalNet ?? team.totalGross ?? null;
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

function isGhostPlayerName(name?: string | null): boolean {
  return (name ?? "").trim().toLowerCase() === "ghost player";
}

function getEventTeamPlayers(team: TeamGameResult, validationGroups: TeamValidationGroup[]): string {
  const group = validationGroups.find((candidate) => candidate.teamId === team.teamId);
  if (!group || group.players.length === 0) {
    return "";
  }

  return group.players.map((player) => getTeamPlayerDisplayLabel(player)).join(" / ");
}

function renderEventTeamPlayers(team: TeamGameResult, validationGroups: TeamValidationGroup[]): ReactNode {
  const group = validationGroups.find((candidate) => candidate.teamId === team.teamId);
  if (!group || group.players.length === 0) {
    return null;
  }

  const nodes: ReactNode[] = [];
  for (let i = 0; i < group.players.length; i += 1) {
    const player = group.players[i];
    if (i > 0) {
      nodes.push(<span key={`sep-${player.summary.scorecardId}`}> / </span>);
    }
    const label = getTeamPlayerDisplayLabel(player);
    const ghost = isGhostPlayerName(player.summary.playerName);
    nodes.push(
      <span key={player.summary.scorecardId} style={ghost ? ghostPlayerInlineStyle : undefined}>
        {label}
      </span>,
    );
  }
  return nodes;
}

function teamHasWithdrawnPlayer(team: TeamGameResult | TeamValidationGroup, validationGroups?: TeamValidationGroup[]): boolean {
  const group = "players" in team
    ? team
    : validationGroups?.find((candidate) => candidate.teamId === team.teamId);

  if (!group || group.players.length === 0) {
    return false;
  }

  for (let i = 0; i < group.players.length; i += 1) {
    const player = group.players[i];
    const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
    if (status === "WITHDRAWN") {
      return true;
    }
  }

  return false;
}

function renderWithdrawnTeamBadge(show: boolean): ReactNode {
  return show ? (
    <span style={withdrawnTeamBadgeStyle} title="This team includes at least one withdrawn player.">
      WD
    </span>
  ) : null;
}

function snapshotWinnerIncludesWithdrawnTeam(row: RoundEventSnapshotRow, validationGroups: TeamValidationGroup[]): boolean {
  if (row.resultKind !== "TEAM") {
    return false;
  }

  const winnerNames = row.winnerNames && row.winnerNames.length > 0
    ? row.winnerNames
    : row.winnerName
      ? [row.winnerName]
      : [];

  for (let i = 0; i < winnerNames.length; i += 1) {
    const winnerName = winnerNames[i].trim().toLowerCase();
    const group = validationGroups.find((candidate) => candidate.teamName.trim().toLowerCase() === winnerName);
    if (group && teamHasWithdrawnPlayer(group)) {
      return true;
    }
  }

  return false;
}

function getPrizeMemberDisplayName(memberName: string, validationGroups: TeamValidationGroup[]): string {
  const normalizedMemberName = memberName.trim().toLowerCase();
  if (!normalizedMemberName) {
    return memberName;
  }

  for (let i = 0; i < validationGroups.length; i += 1) {
    const group = validationGroups[i];
    for (let j = 0; j < group.players.length; j += 1) {
      const player = group.players[j];
      if ((player.summary.playerName ?? "").trim().toLowerCase() === normalizedMemberName) {
        return getTeamPlayerDisplayLabel(player);
      }
    }
  }

  return memberName;
}

function renderPrizeMemberNames(memberNames: string[], validationGroups: TeamValidationGroup[]): ReactNode {
  if (memberNames.length === 0) {
    return "Team payout";
  }

  const nodes: ReactNode[] = [];
  for (let i = 0; i < memberNames.length; i += 1) {
    const memberName = memberNames[i];
    if (i > 0) {
      nodes.push(<span key={`sep-${memberName}-${i}`}> / </span>);
    }

    const label = getPrizeMemberDisplayName(memberName, validationGroups);
    const ghost = isGhostPlayerName(memberName);
    nodes.push(
      <span key={`${memberName}-${i}`} style={ghost ? ghostPlayerInlineStyle : undefined}>
        {label}
      </span>,
    );
  }

  return nodes;
}

function formatEventSummary(events: RoundEventResultResponse[]): string {
  const labels = events
    .map((event) => event.eventName?.trim())
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return "";
  }

  return labels.join(" + ");
}


function getPrimaryTeamEventType(events: RoundEventResultResponse[]): string | null {
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (event.resultKind === "TEAM") {
      return event.eventType;
    }
  }
  return null;
}

function getEffectiveScoreGridFormat(resultsFormat: string | null | undefined, events: RoundEventResultResponse[]): string | null | undefined {
  const primaryTeamEventType = getPrimaryTeamEventType(events);
  return normalizeScoreGridFormat(primaryTeamEventType ?? resultsFormat);
}

function getPrimaryScoringLabel(resultsFormat: string | null | undefined, events: RoundEventResultResponse[], scrambleTeamSize?: number | null): string {
  const primaryTeamEvent = events.find((event) => event.resultKind === "TEAM");
  if (primaryTeamEvent?.eventName?.trim()) {
    return primaryTeamEvent.eventName.trim();
  }
  return formatLabel(resultsFormat, scrambleTeamSize);
}

function getEventPlacementLabel(rank?: number | null, tied?: boolean): string {
  if (rank == null) {
    return "";
  }
  return tied ? `T${rank}` : String(rank);
}

function formatOrdinal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }

  const absolute = Math.abs(value);
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${value}th`;
  }

  switch (absolute % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function getEventSnapshotPlacementLabel(rank?: number | null, tied?: boolean): string {
  if (rank == null) {
    return "";
  }

  const ordinal = formatOrdinal(rank);
  return tied ? `Tie for ${ordinal}` : `${ordinal} Place`;
}

function isIndividualResultTie(row: IndividualEventResult, rows: IndividualEventResult[]): boolean {
  if (row.rank == null) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].rank === row.rank) {
      count += 1;
    }
  }
  return count > 1;
}

function isTeamEventResultTie(team: TeamGameResult, teams: TeamGameResult[]): boolean {
  return isTieForPlacement(team, teams);
}

function buildFallbackEventSnapshotRows(events: RoundEventResultResponse[]): RoundEventSnapshotRow[] {
  const rows: RoundEventSnapshotRow[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (event.resultKind === "INDIVIDUAL") {
      if (event.individualResults.length === 0) {
        continue;
      }
      const ordered = [...event.individualResults].sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        const scoreA = formatEventResultScore(event, a) ?? Number.MAX_SAFE_INTEGER;
        const scoreB = formatEventResultScore(event, b) ?? Number.MAX_SAFE_INTEGER;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.playerName.localeCompare(b.playerName);
      });
      const winner = ordered[0];
      const winningRank = winner.rank;
      const winningTotal = formatEventResultScore(event, winner);
      const winnerNames: string[] = [];
      for (let j = 0; j < ordered.length; j += 1) {
        if (ordered[j].rank === winningRank) {
          winnerNames.push(ordered[j].playerName);
        }
      }
      rows.push({
        eventId: event.eventId,
        eventType: event.eventType,
        eventName: event.eventName,
        resultKind: event.resultKind,
        winnerName: winnerNames.join(" / "),
        winnerNames,
        winningTotal,
        rank: winningRank,
        tied: winnerNames.length > 1,
      });
    } else {
      if (event.teamResults.length === 0) {
        continue;
      }
      const ordered = [...event.teamResults].sort((a, b) => {
        const rankA = a.placement ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.placement ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        const scoreA = getTeamEventDisplayTotal(a, event.eventType) ?? Number.MAX_SAFE_INTEGER;
        const scoreB = getTeamEventDisplayTotal(b, event.eventType) ?? Number.MAX_SAFE_INTEGER;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.teamName ?? "").localeCompare(b.teamName ?? "");
      });
      const winner = ordered[0];
      const winningPlacement = winner.placement;
      const winningTotal = getTeamEventDisplayTotal(winner, event.eventType);
      const winnerNames: string[] = [];
      for (let j = 0; j < ordered.length; j += 1) {
        if (ordered[j].placement === winningPlacement) {
          winnerNames.push(ordered[j].teamName ?? "");
        }
      }
      rows.push({
        eventId: event.eventId,
        eventType: event.eventType,
        eventName: event.eventName,
        resultKind: event.resultKind,
        winnerName: winnerNames.join(" / "),
        winnerNames,
        winningTotal,
        rank: winningPlacement,
        tied: winnerNames.length > 1,
      });
    }
  }

  return rows;
}

function hasHoleByHoleScrambleScores(team: TeamGameResult): boolean {
  if (!team.holeResults || team.holeResults.length === 0) {
    return false;
  }

  for (let i = 0; i < team.holeResults.length; i += 1) {
    const hole = team.holeResults[i];
    if (hole.grossScore != null && Number(hole.grossScore) > 0) {
      return true;
    }
  }

  return false;
}

function formatScoreVsPar(score: number | null, par: number): string {
  if (score == null || par <= 0) {
    return "";
  }

  const diff = score - par;
  if (diff === 0) {
    return "E";
  }
  if (diff < 0) {
    return String(diff);
  }
  return `+${diff}`;
}

const headerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const titleMetaStyle: CSSProperties = {
  marginTop: "8px",
  color: "#555",
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  fontSize: "14px",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: "30px",
  padding: "0 10px",
  borderRadius: "999px",
  border: "1px solid #d5d9de",
  background: "#f7f8fa",
  fontSize: "13px",
  fontWeight: 600,
  color: "#333",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
};

const summaryCardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fafafa",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
  fontWeight: 600,
};

const summaryValueStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: 1.15,
};

const summarySubValueStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#666",
};


const eventWinnerListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const eventWinnerRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(160px, 1.2fr) minmax(140px, 1fr) 72px",
  gap: "10px",
  alignItems: "baseline",
};

const eventWinnerNameStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.2,
};

const eventWinnerTotalStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  textAlign: "right",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const standingsTableStyle: CSSProperties = {
  width: "auto",
  borderCollapse: "collapse",
  tableLayout: "auto",
};

const standingsNumberCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "center",
  whiteSpace: "nowrap",
  fontWeight: 600,
};

const standingsNameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
};

const eventTeamCellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: "300px",
};

const eventTeamNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  marginBottom: "4px",
};

const eventTeamPlayersStyle: CSSProperties = {
  ...summarySubValueStyle,
  lineHeight: 1.35,
  fontWeight: 500,
};

const ghostPlayerInlineStyle: CSSProperties = {
  color: "#6b7280",
  fontStyle: "italic",
};

const withdrawnTeamBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginLeft: "6px",
  padding: "1px 6px",
  borderRadius: "999px",
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  fontSize: "11px",
  fontWeight: 800,
  lineHeight: 1.4,
  verticalAlign: "middle",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
};

const standingsPrizePanelStyle: CSSProperties = {
  display: "flex",
  gap: "18px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const standingsColumnStyle: CSSProperties = {
  flex: "1 1 560px",
  minWidth: 0,
};

const prizeColumnStyle: CSSProperties = {
  flex: "1 1 420px",
  minWidth: 0,
};

const compactSectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "10px",
  fontSize: "18px",
  minHeight: "22px",
  lineHeight: 1.2,
};

const prizeTitleRowStyle: CSSProperties = {
  ...compactSectionTitleStyle,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
};

const prizeTitleMetaStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "#666",
  whiteSpace: "nowrap",
};

const scrambleSummaryStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const scrambleTeamCardStyle: CSSProperties = {
  border: "1px solid #d6d6d6",
  borderRadius: "8px",
  background: "#fff",
  overflow: "hidden",
};

const scrambleTeamHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "baseline",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e5e5",
  background: "#fafafa",
};

const scrambleTeamNameStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
};

const scrambleTeamTotalStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const scrambleCardBodyStyle: CSSProperties = {
  padding: "10px 12px",
};

const mutedTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#666",
};

const holeScorePillRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "10px",
};

const holeScorePillStyle: CSSProperties = {
  minWidth: "42px",
  border: "1px solid #d5d9de",
  borderRadius: "6px",
  padding: "4px 6px",
  textAlign: "center",
  fontSize: "12px",
  background: "#fff",
};


type PrizePayoutEntry = {
  key: string;
  kind: "INDIVIDUAL" | "TEAM";
  place: number | null;
  resultName: string;
  playerName: string;
  amount: number;
  memberNames: string[];
  totalAmount: number;
  perPlayerAmount: number | null;
};

type PrizePayoutGroup = {
  key: string;
  eventName: string;
  eventType: string | null;
  totalAmount: number;
  entries: PrizePayoutEntry[];
};

function getWinningEventKey(winning: PrizeWinningResponse): string {
  return `${winning.gameKey || "unknown"}|${winning.eventType || ""}|${winning.gameName || "Prize Event"}`;
}

function getWinningResultName(winning: PrizeWinningResponse): string {
  const teamName = winning.teamName?.trim();
  if (teamName) {
    return teamName;
  }

  const sourceName = winning.sourceName?.trim();
  if (sourceName) {
    return sourceName;
  }

  const playerName = winning.playerName?.trim();
  if (playerName) {
    return playerName;
  }

  return winning.gameName || "Prize result";
}

function isTeamWinning(winning: PrizeWinningResponse): boolean {
  if (winning.teamId != null || winning.teamName) {
    return true;
  }

  const sourceName = winning.sourceName?.trim();
  const playerName = winning.playerName?.trim();
  return Boolean(sourceName && playerName && sourceName !== playerName);
}

function buildPrizePayoutGroups(winnings: PrizeWinningResponse[]): PrizePayoutGroup[] {
  const groupMap = new Map<string, PrizePayoutGroup>();

  for (let i = 0; i < winnings.length; i += 1) {
    const winning = winnings[i];
    const eventKey = getWinningEventKey(winning);
    let group = groupMap.get(eventKey);
    if (!group) {
      group = {
        key: eventKey,
        eventName: winning.gameName || "Prize Event",
        eventType: winning.eventType ?? null,
        totalAmount: 0,
        entries: [],
      };
      groupMap.set(eventKey, group);
    }

    const amount = Number(winning.amount ?? 0);
    group.totalAmount += amount;

    if (isTeamWinning(winning)) {
      const resultName = getWinningResultName(winning);
      const teamKey = `TEAM|${winning.sourceRank ?? ""}|${winning.teamId ?? resultName}|${resultName}`;
      let entry = group.entries.find((candidate) => candidate.key === teamKey);
      if (!entry) {
        entry = {
          key: teamKey,
          kind: "TEAM",
          place: winning.sourceRank ?? winning.finishingPlace ?? null,
          resultName,
          playerName: "",
          amount,
          memberNames: [],
          totalAmount: 0,
          perPlayerAmount: null,
        };
        group.entries.push(entry);
      }

      const memberName = winning.playerName?.trim();
      if (memberName && !entry.memberNames.includes(memberName)) {
        entry.memberNames.push(memberName);
      }
      entry.totalAmount += amount;
      entry.amount = amount;
      entry.perPlayerAmount = entry.memberNames.length > 0 ? entry.totalAmount / entry.memberNames.length : amount;
    } else {
      const playerName = winning.playerName?.trim() || getWinningResultName(winning);
      group.entries.push({
        key: `PLAYER|${winning.sourceRank ?? ""}|${winning.playerId ?? playerName}|${i}`,
        kind: "INDIVIDUAL",
        place: winning.sourceRank ?? winning.finishingPlace ?? null,
        resultName: getWinningResultName(winning),
        playerName,
        amount,
        memberNames: [],
        totalAmount: amount,
        perPlayerAmount: amount,
      });
    }
  }

  return Array.from(groupMap.values()).map((group) => ({
    ...group,
    entries: group.entries.sort((a, b) => {
      const placeA = a.place ?? Number.MAX_SAFE_INTEGER;
      const placeB = b.place ?? Number.MAX_SAFE_INTEGER;
      if (placeA !== placeB) return placeA - placeB;
      if (a.kind !== b.kind) return a.kind === "TEAM" ? -1 : 1;
      return a.resultName.localeCompare(b.resultName);
    }),
  })).sort((a, b) => a.eventName.localeCompare(b.eventName));
}

const prizeSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const prizeSummaryCardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#f8fafc",
};

const prizeEventBlockStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  overflow: "hidden",
  background: "#fff",
  marginTop: "12px",
};

const prizeEventHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "12px",
  padding: "10px 12px",
  background: "#fafafa",
  borderBottom: "1px solid #e5e5e5",
};

const prizeEventTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
};

const prizeEntryCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "10px",
  padding: "12px",
};

const prizeEntryCardStyle: CSSProperties = {
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fff",
};

const prizeEntryTopLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "baseline",
};

const prizeEntryNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
};

const prizeEntryAmountStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

export default function RoundResultsPage() {
  const navigate = useNavigate();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [results, setResults] = useState<RoundGameResult | null>(null);
  const [eventResults, setEventResults] = useState<RoundEventsResultResponse | null>(null);
  const [scorecards, setScorecards] = useState<RoundScorecardSummary[]>([]);
  const [scorecardDetails, setScorecardDetails] = useState<
    Record<number, ScorecardDetail>
  >({});
  const [holeMeta, setHoleMeta] = useState<HoleScoreDto[]>([]);
  const [roundPrizeWinnings, setRoundPrizeWinnings] = useState<PrizeWinningResponse[]>([]);
  const [teamExceptions, setTeamExceptions] = useState<RoundTeamExceptionResponse[]>([]);
  const [tripName, setTripName] = useState("");
  const [tripDateRange, setTripDateRange] = useState("");
  const [tripRounds, setTripRounds] = useState<TripRoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericRoundId) || numericRoundId <= 0) {
      setError("Invalid round id.");
      setLoading(false);
      return;
    }

    void loadPage(numericRoundId);
  }, [numericRoundId]);

  async function loadPage(id: number): Promise<void> {
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
          metaSource = [...detail.holes].sort(
            (a, b) => a.holeNumber - b.holeNumber,
          );
          break;
        }
      }

      setStatus(roundStatus);
      setResults({
        ...roundResults,
        teams: orderedTeams,
      });
      setScorecards(roundScorecards);
      setEventResults(roundEventResults);
      setTeamExceptions(roundTeamExceptionPage.exceptions ?? []);
      setScorecardDetails(detailMap);
      let currentRoundPrizeWinnings: PrizeWinningResponse[] = [];
      let currentTripName = "";
      let currentTripDateRange = "";
      let currentTripRounds: TripRoundListItem[] = [];
      if (roundStatus.tripId != null) {
        try {
          const [prizeResponse, tripDetail, tripRounds] = await Promise.all([
            getTripPrizeWinnings(roundStatus.tripId),
            getTripDetail(roundStatus.tripId),
            getTripRounds(roundStatus.tripId),
          ]);
          currentRoundPrizeWinnings = (prizeResponse.winnings ?? []).filter(
            (winning) => winning.roundId === id,
          );
          currentTripName = tripDetail.tripName;
          currentTripRounds = tripRounds;
          currentTripDateRange = getTripDateRange(tripRounds);
        } catch (tripError) {
          console.error("Failed to load event context for round results", tripError);
        }
      }

      setHoleMeta(metaSource);
      setRoundPrizeWinnings(currentRoundPrizeWinnings);
      setTripName(currentTripName);
      setTripDateRange(currentTripDateRange);
      setTripRounds(currentTripRounds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load round results.",
      );
    } finally {
      setLoading(false);
    }
  }

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

  const holePars = useMemo(() => {
    return holeMeta.map((hole) => hole.par ?? 0);
  }, [holeMeta]);

  const effectiveScoreGridFormat = useMemo(() => {
    return getEffectiveScoreGridFormat(results?.format, eventResults?.events ?? []);
  }, [results, eventResults]);

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

  const eventSnapshotRows = useMemo(() => {
    // Build this from the detailed event results so the snapshot always reflects
    // the true winning placement after corrections/recalculation, even if an
    // older backend snapshot row is stale or ordered by team id.
    return buildFallbackEventSnapshotRows(eventResults?.events ?? []);
  }, [eventResults]);

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
    results && !scoreGridData && !isScrambleFormat(effectiveScoreGridFormat) && !isIndividualFormat(effectiveScoreGridFormat),
  );

  const roundPrizeTotal = useMemo(() => {
    return roundPrizeWinnings.reduce((sum, winning) => sum + Number(winning.amount ?? 0), 0);
  }, [roundPrizeWinnings]);

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

  const groupedRoundPrizeWinnings = useMemo(() => {
    return buildPrizePayoutGroups(sortedRoundPrizeWinnings);
  }, [sortedRoundPrizeWinnings]);

  function renderGroupedPrizeMoneyWon(compact = false) {
    return (
      <>
        <h2 style={prizeTitleRowStyle}>
          <span>Prize Money Won</span>
          {sortedRoundPrizeWinnings.length > 0 ? (
            <span style={prizeTitleMetaStyle}>
              Round prize total: <strong>{formatCurrencyCents(roundPrizeTotal)}</strong>
            </span>
          ) : null}
        </h2>

        {sortedRoundPrizeWinnings.length > 0 ? (
          <>
            {!compact ? (
              <div style={prizeSummaryGridStyle}>
                <div style={prizeSummaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Distributed This Round</div>
                  <div style={summaryValueStyle}>{formatCurrencyCents(roundPrizeTotal)}</div>
                  <div style={summarySubValueStyle}>Grouped by event and result</div>
                </div>
              </div>
            ) : null}

            {groupedRoundPrizeWinnings.map((group) => (
              <div key={group.key} style={prizeEventBlockStyle} className="round-results-prize-event-block">
                <div style={prizeEventHeaderStyle}>
                  <div>
                    <div style={prizeEventTitleStyle}>{group.eventName}</div>
                    {group.eventType ? <div style={summarySubValueStyle}>{formatLabel(group.eventType)}</div> : null}
                  </div>
                  <div style={{ ...prizeEntryAmountStyle, textAlign: "right" }}>
                    {formatCurrencyCents(group.totalAmount)}
                  </div>
                </div>

                <div style={prizeEntryCardGridStyle}>
                  {group.entries.map((entry) => (
                    <div key={entry.key} style={prizeEntryCardStyle}>
                      <div style={prizeEntryTopLineStyle}>
                        <div>
                          <div style={summarySubValueStyle}>
                            {entry.place != null ? `Place ${entry.place}` : "Place —"}
                          </div>
                          <div style={prizeEntryNameStyle}>
                            {entry.kind === "TEAM" ? entry.resultName : entry.playerName}
                          </div>
                        </div>
                        <div style={prizeEntryAmountStyle}>
                          {formatCurrencyCents(entry.totalAmount)}
                        </div>
                      </div>

                      {entry.kind === "TEAM" ? (
                        <>
                          <div style={{ ...summarySubValueStyle, marginTop: "6px" }}>
                            {renderPrizeMemberNames(entry.memberNames, validationGroups)}
                          </div>
                          <div style={{ ...summarySubValueStyle, marginTop: "4px" }}>
                            {entry.memberNames.length > 0 && entry.perPlayerAmount != null
                              ? `${formatCurrencyCents(entry.perPlayerAmount)} per player`
                              : "Team payout total"}
                          </div>
                        </>
                      ) : (
                        <div style={{ ...summarySubValueStyle, marginTop: "6px" }}>
                          {entry.resultName !== entry.playerName ? entry.resultName : "Individual payout"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={summarySubValueStyle}>
            No prize money has been calculated for this round.
          </div>
        )}
      </>
    );
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

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !status || !results) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div style={errorBoxStyle}>{error ?? "Round results not found."}</div>
      </div>
    );
  }

  const scoreEntryAction = buildScoreEntryAction(status.roundId, status);
  const showViewScoresButton = Boolean(status.finalized && !status.tripLocked);
  const gridMode = isScoreGridFormat(effectiveScoreGridFormat);
  const scrambleMode = isScrambleFormat(effectiveScoreGridFormat);
  const individualMode = isIndividualFormat(results.format);
  const resultEntityLabel = getResultEntityLabel(results.format);
  const resultEntityPluralLabel = getResultEntityPluralLabel(results.format);
  const scrambleHasHoleScores = scrambleMode
    ? results.teams.some((team) => hasHoleByHoleScrambleScores(team))
    : false;
  const displayEventResults = eventResults?.events ?? [];
  const hasEventDrivenResults = displayEventResults.length > 0;
  const eventSummaryLabel = formatEventSummary(displayEventResults);
  const primaryScoringLabel = getPrimaryScoringLabel(results.format, displayEventResults, status?.scrambleTeamSize);
  const eventRoundNumber = getEventRoundNumber(status, tripRounds);
  const eventRoundLabel = formatEventRoundLabel(eventRoundNumber, status.roundId);
  const printTitle = buildReportFileTitle(tripName || "Event", "Round Results", status.courseName, status.roundDate || eventRoundLabel);

  function handlePrint(): void {
    printWithReportTitle(printTitle);
  }

  return (
    <div style={pageContainerWideStyle} className="round-results-print-root">
      <PageHeader
        title="Round Results"
        className="round-results-no-print"
        subtitle={
          <>
            <div style={titleMetaStyle}>
              <span>{eventRoundLabel}</span>
              {status.courseName ? <span>{status.courseName}</span> : null}
              {teeSummary ? <span>{teeSummary}</span> : null}
              {status.roundDate ? <span>{formatRoundDate(status.roundDate)}</span> : null}
            </div>
            <div style={badgeRowStyle}>
              {eventSummaryLabel ? <div style={badgeStyle}>{eventSummaryLabel}</div> : null}
              <div style={badgeStyle}>Primary scoring: {primaryScoringLabel}</div>
              <div style={badgeStyle}>
                {status.finalized ? "Finalized" : "Not Finalized"}
              </div>
              <div style={badgeStyle}>
                {gridMode ? "Score Grid View" : scrambleMode ? "Scramble Summary" : "Summary View"}
              </div>
            </div>
          </>
        }
        actions={
          <>
            <TripDetailButton tripId={status.tripId} />
            <ReportsButton tripId={status.tripId} />
            {showViewScoresButton ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${status.roundId}/scoring?mode=view`)}
              >
                View Scores
              </button>
            ) : null}
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(scoreEntryAction.path)}
            >
              {scoreEntryAction.label}
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={handlePrint}
            >
              Print
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void loadPage(status.roundId)}
            >
              Refresh
            </button>
          </>
        }
      />

      <div
        className="round-results-print-header print-only"
        style={{ display: "none", marginBottom: "12px" }}
      >
        <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}>
          {tripName || "Golf Event"}
        </div>
        {tripDateRange ? (
          <div style={{ fontSize: "13px", color: "#555", marginTop: "3px" }}>
            {tripDateRange}
          </div>
        ) : null}
        <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "10px" }}>
          {buildRoundPrintTitle(status, results, eventRoundLabel)}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
          Game Results
        </div>
      </div>

      {!status.finalized ? (
        <div style={warningBoxStyle} className="round-results-no-print">
          This round is not finalized yet. Results are shown from the current
          saved scores, but placement and game totals can still change.
        </div>
      ) : status.tripLocked ? (
        <div style={warningBoxStyle} className="round-results-no-print">
          This round is finalized and the event is locked. Scores are view-only unless Correction Mode is enabled from Event Detail.
        </div>
      ) : (
        <div style={warningBoxStyle} className="round-results-no-print">
          This round is finalized. Use Edit Corrections to make post-finalization
          score or tee updates and then refresh this page to verify the recalculated
          results.
        </div>
      )}

      <div className="round-results-no-print">
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="results"
          format={status.format}
          finalized={status.finalized}
        />
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Round Snapshot</h2>

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{eventSummaryLabel ? "Events" : "Primary Scoring"}</div>
            <div style={summaryValueStyle}>{eventSummaryLabel || primaryScoringLabel}</div>
            {eventSummaryLabel ? (
              <div style={summarySubValueStyle}>Primary scoring: {primaryScoringLabel}</div>
            ) : null}
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Course</div>
            <div style={summaryValueStyle}>{status.courseName || "—"}</div>
            <div style={summarySubValueStyle}>{teeSummary || ""}</div>
          </div>

          {eventSnapshotRows.length > 0 ? (
            <div style={{ ...summaryCardStyle, gridColumn: "span 2" }}>
              <div style={summaryLabelStyle}>Event Winners</div>
              <div style={eventWinnerListStyle}>
                {eventSnapshotRows.map((row) => (
                  <div key={`${row.eventId ?? row.eventType}-${row.eventName}`} style={eventWinnerRowStyle}>
                    <div>
                      <div style={summarySubValueStyle}>{row.eventName}</div>
                      <div style={eventWinnerNameStyle}>
                        {row.winnerNames && row.winnerNames.length > 0
                          ? row.winnerNames.filter(Boolean).join(" / ")
                          : row.winnerName || "—"}
                        {renderWithdrawnTeamBadge(snapshotWinnerIncludesWithdrawnTeam(row, validationGroups))}
                      </div>
                    </div>
                    <div style={summarySubValueStyle}>
                      {getEventSnapshotPlacementLabel(row.rank, row.tied)}
                    </div>
                    <div style={eventWinnerTotalStyle}>{row.winningTotal ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Leader</div>
                <div style={summaryValueStyle}>{leader?.teamName ?? "—"}</div>
                <div style={summarySubValueStyle}>
                  {leader
                    ? `Place ${placementLabel(leader.placement, isTieForPlacement(leader, results.teams))}`
                    : ""}
                </div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Winning Total</div>
                <div style={summaryValueStyle}>{leader ? getTeamDisplayTotal(leader, results.format) ?? "—" : "—"}</div>
                <div style={summarySubValueStyle}>
                  {scrambleMode && leader
                    ? formatScoreVsPar(getTeamDisplayTotal(leader, results.format), totalPar)
                    : ""}
                </div>
              </div>
            </>
          )}

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{resultEntityPluralLabel}</div>
            <div style={summaryValueStyle}>{results.teams.length}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Par</div>
            <div style={summaryValueStyle}>{totalPar > 0 ? totalPar : "—"}</div>
            <div style={summarySubValueStyle}>
              {frontNinePar > 0 || backNinePar > 0
                ? `Out ${frontNinePar} / In ${backNinePar}`
                : ""}
            </div>
          </div>
        </div>
      </section>

      {hasEventDrivenResults ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Event Results</h2>
          <div style={{ display: "grid", gap: "18px" }}>
            {displayEventResults.map((event) => (
              <div
                key={`${event.eventId ?? event.eventType}-${event.eventOrder}`}
                className="round-results-event-result-block"
              >
                <h3 style={{ margin: "0 0 10px", fontSize: "17px" }}>{event.eventName}</h3>

                {event.resultKind === "INDIVIDUAL" ? (
                  <div style={tableWrapStyle}>
                    <table style={{ ...standingsTableStyle, width: "100%" }}>
                      <colgroup>
                        <col style={{ width: "72px" }} />
                        <col style={{ width: "160px" }} />
                        <col />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "96px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                          <th style={thStyle}>Player</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Event Total</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Gross</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.individualResults.map((row) => (
                          <tr key={`${event.eventType}-${row.playerId}`}>
                            <td style={standingsNumberCellStyle}>{getEventPlacementLabel(row.rank, isIndividualResultTie(row, event.individualResults))}</td>
                            <td style={standingsNameCellStyle}>{row.playerName}</td>
                            <td style={standingsNumberCellStyle}>{formatEventResultScore(event, row) ?? ""}</td>
                            <td style={standingsNumberCellStyle}>{row.grossTotal ?? ""}</td>
                            <td style={standingsNumberCellStyle}>{row.netTotal ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={{ ...standingsTableStyle, width: "100%" }}>
                      <colgroup>
                        <col style={{ width: "72px" }} />
                        <col />
                        <col style={{ width: "96px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                          <th style={thStyle}>Team</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.teamResults.map((team) => {
                          const players = renderEventTeamPlayers(team, validationGroups);
                          return (
                            <tr key={`${event.eventType}-${team.teamId}`}>
                              <td style={standingsNumberCellStyle}>{placementLabel(team.placement, isTeamEventResultTie(team, event.teamResults))}</td>
                              <td style={eventTeamCellStyle}>
                                <div style={eventTeamNameStyle}>
                                  {team.teamName}
                                  {renderWithdrawnTeamBadge(teamHasWithdrawnPlayer(team, validationGroups))}
                                </div>
                                {players ? <div style={eventTeamPlayersStyle}>{players}</div> : null}
                              </td>
                              <td style={standingsNumberCellStyle}>{getTeamEventDisplayTotal(team, event.eventType) ?? ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasEventDrivenResults ? (
        <section className="round-results-prize-section" style={sectionStyle}>
          {renderGroupedPrizeMoneyWon(false)}
        </section>
      ) : null}

      {!hasEventDrivenResults ? (
      <section style={sectionStyle}>
        <div className="round-results-standings-prize-panel" style={standingsPrizePanelStyle}>
          <div style={standingsColumnStyle}>
            <h2 style={compactSectionTitleStyle}>Standings</h2>

            <div style={tableWrapStyle}>
              <table style={{ ...standingsTableStyle, width: "100%" }}>
                <colgroup>
                  <col style={{ width: "72px" }} />
                  <col />
                  <col style={{ width: "96px" }} />
                  <col style={{ width: "96px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                    <th style={thStyle}>{resultEntityLabel}</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Total</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {results.teams.map((team) => (
                    <tr key={team.teamId}>
                      <td style={standingsNumberCellStyle}>
                        {placementLabel(
                          team.placement,
                          isTieForPlacement(team, results.teams),
                        )}
                      </td>
                      <td style={standingsNameCellStyle}>
                        <div>
                          {team.teamName}
                          {!individualMode ? renderWithdrawnTeamBadge(teamHasWithdrawnPlayer(team, validationGroups)) : null}
                        </div>

                        {!individualMode ? (() => {
                          const group = validationGroups.find(
                            (g) => g.teamId === team.teamId,
                          );
                          if (!group) return null;

                          return (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "2px",
                              }}
                            >
                              {group.players
                                .map((p) => getTeamPlayerDisplayLabel(p))
                                .join(" / ")}
                            </div>
                          );
                        })() : null}
                      </td>
                      <td style={standingsNumberCellStyle}>
                        {getTeamDisplayTotal(team, results.format) ?? ""}
                      </td>
                      <td style={standingsNumberCellStyle}>
                        {prizeBySourceName[team.teamName] != null
                          ? formatCurrencyCents(prizeBySourceName[team.teamName])
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="round-results-prize-section" style={prizeColumnStyle}>
            {renderGroupedPrizeMoneyWon(true)}
          </div>
        </div>
      </section>
      ) : null}

      {scrambleMode && !hasEventDrivenResults ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Scramble Results</h2>

          <div style={{ ...summarySubValueStyle, marginBottom: "12px" }}>
            {scrambleHasHoleScores
              ? "Hole-by-hole scramble scores are shown below."
              : "Total-score entry mode: team totals are shown without the unused hole-by-hole grid."}
          </div>

          <div style={scrambleSummaryStyle}>
            {results.teams.map((team) => {
              const group = validationGroups.find((g) => g.teamId === team.teamId);
              const teamTotal = getTeamDisplayTotal(team, results.format);
              const vsPar = formatScoreVsPar(teamTotal, totalPar);
              const isTied = isTieForPlacement(team, results.teams);

              return (
                <div key={team.teamId} style={scrambleTeamCardStyle}>
                  <div style={scrambleTeamHeaderStyle}>
                    <div>
                      <div style={scrambleTeamNameStyle}>
                        {team.teamName}
                        {renderWithdrawnTeamBadge(group ? teamHasWithdrawnPlayer(group) : false)}
                      </div>
                      <div style={mutedTextStyle}>
                        Place {placementLabel(team.placement, isTied) || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={scrambleTeamTotalStyle}>{teamTotal ?? "—"}</div>
                      <div style={mutedTextStyle}>{vsPar}</div>
                    </div>
                  </div>

                  <div style={scrambleCardBodyStyle}>
                    <div style={summaryLabelStyle}>Players</div>
                    <div style={{ fontSize: "14px", lineHeight: 1.35 }}>
                      {group && group.players.length > 0
                        ? group.players.map((p) => getTeamPlayerDisplayLabel(p)).join(" / ")
                        : "—"}
                    </div>

                    {scrambleHasHoleScores ? (
                      <div style={holeScorePillRowStyle}>
                        {[...team.holeResults]
                          .sort((a, b) => a.holeNumber - b.holeNumber)
                          .map((hole) => (
                            <div key={`${team.teamId}-${hole.holeNumber}`} style={holeScorePillStyle}>
                              <div style={mutedTextStyle}>H{hole.holeNumber}</div>
                              <div style={{ fontWeight: 700 }}>{hole.grossScore || "—"}</div>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {scoreGridData ? (
        <section className="round-results-score-grid-section" style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {scoreGridData.title}
            {teamParTotal > 0 ? ` (Team Par - ${teamParTotal})` : ""}
          </h2>

          <div style={tableWrapStyle}>
            <ScoreGrid data={scoreGridData} />
          </div>
        </section>
      ) : null}

      {showUnsupportedScoreGridMessage ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Format-Specific Layout Still Needed</h2>
          <div style={warningBoxStyle}>
            This round format is not yet using the reusable score-grid layout.
          </div>
        </section>
      ) : null}
    </div>
  );
}
