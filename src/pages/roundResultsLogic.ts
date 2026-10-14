import type { TeamGameResult } from "../types/round";
import type { PrizeWinningResponse } from "../types/trip";
import type { IndividualEventResult, RoundEventResultResponse, RoundEventSnapshotRow } from "../types/roundEvent";
import { formatGameDescription } from "../utils/gameFormat";

export type PrizePayoutEntry = {
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

export type PrizePayoutGroup = {
  key: string;
  eventName: string;
  eventType: string | null;
  totalAmount: number;
  entries: PrizePayoutEntry[];
};

export function normalizeScoreGridFormat(format?: string | null): string | null | undefined {
  switch (format) {
    case "TEAM_MIDDLE_MAN": return "MIDDLE_MAN";
    case "TEAM_ONE_TWO_THREE": return "ONE_TWO_THREE";
    case "TEAM_TWO_MAN_LOW_NET": return "TWO_MAN_LOW_NET";
    case "TEAM_THREE_LOW_NET": return "THREE_LOW_NET";
    default: return format;
  }
}

export function isScoreGridFormat(format?: string | null): boolean {
  const normalizedFormat = normalizeScoreGridFormat(format);
  return normalizedFormat === "MIDDLE_MAN" || normalizedFormat === "ONE_TWO_THREE" || normalizedFormat === "THREE_LOW_NET" || normalizedFormat === "TEAM_TWO_LOW_NET" || normalizedFormat === "TWO_MAN_LOW_NET";
}

export function isScrambleFormat(format?: string | null): boolean {
  return format === "TEAM_SCRAMBLE";
}

export function isIndividualFormat(format?: string | null): boolean {
  return format === "STROKE_PLAY" || format === "INDIVIDUAL_LOW_NET" || format === "INDIVIDUAL_LOW_GROSS";
}

export function getResultEntityLabel(format?: string | null): "Player" | "Team" {
  return isIndividualFormat(format) ? "Player" : "Team";
}

export function getResultEntityPluralLabel(format?: string | null): "Players" | "Teams" {
  return isIndividualFormat(format) ? "Players" : "Teams";
}

export function getTeamDisplayTotal(team: TeamGameResult, format?: string | null): number | null {
  return isScrambleFormat(format) ? team.totalGross ?? team.totalNet ?? null : team.totalNet ?? team.totalGross ?? null;
}

export function formatEventResultScore(event: RoundEventResultResponse, result: IndividualEventResult): number | null {
  return event.eventType === "INDIVIDUAL_LOW_GROSS" ? result.grossTotal : result.netTotal;
}

function isScrambleEventType(eventType?: string | null): boolean {
  return eventType === "TEAM_SCRAMBLE";
}

export function getTeamEventDisplayTotal(team: TeamGameResult, eventType?: string | null): number | null {
  return isScrambleEventType(eventType) ? team.totalGross ?? team.totalNet ?? null : team.totalNet ?? team.totalGross ?? null;
}

export function formatEventSummary(events: RoundEventResultResponse[]): string {
  return events.map((event) => event.eventName?.trim()).filter((label): label is string => Boolean(label)).join(" + ");
}

function getPrimaryTeamEventType(events: RoundEventResultResponse[]): string | null {
  for (const event of events) {
    if (event.resultKind === "TEAM") return event.eventType;
  }
  return null;
}

export function getEffectiveScoreGridFormat(resultsFormat: string | null | undefined, events: RoundEventResultResponse[]): string | null | undefined {
  return normalizeScoreGridFormat(getPrimaryTeamEventType(events) ?? resultsFormat);
}

export function getPrimaryScoringLabel(resultsFormat: string | null | undefined, events: RoundEventResultResponse[], scrambleTeamSize?: number | null): string {
  const primaryTeamEvent = events.find((event) => event.resultKind === "TEAM");
  if (primaryTeamEvent?.eventName?.trim()) return primaryTeamEvent.eventName.trim();
  return formatGameDescription(resultsFormat, scrambleTeamSize);
}

export function getEventPlacementLabel(rank?: number | null, tied?: boolean): string {
  if (rank == null) return "";
  return tied ? `T${rank}` : String(rank);
}

export function formatOrdinal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const absolute = Math.abs(value);
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  switch (absolute % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export function getEventSnapshotPlacementLabel(rank?: number | null, tied?: boolean): string {
  if (rank == null) return "";
  const ordinal = formatOrdinal(rank);
  return tied ? `Tie for ${ordinal}` : `${ordinal} Place`;
}

export function isIndividualResultTie(row: IndividualEventResult, rows: IndividualEventResult[]): boolean {
  if (row.rank == null) return false;
  return rows.filter((candidate) => candidate.rank === row.rank).length > 1;
}

export function isTeamEventResultTie(team: TeamGameResult, teams: TeamGameResult[]): boolean {
  if (team.placement == null) return false;
  return teams.filter((candidate) => candidate.placement === team.placement).length > 1;
}

export function buildFallbackEventSnapshotRows(events: RoundEventResultResponse[]): RoundEventSnapshotRow[] {
  const rows: RoundEventSnapshotRow[] = [];
  for (const event of events) {
    if (event.resultKind === "INDIVIDUAL") {
      if (event.individualResults.length === 0) continue;
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
      const winnerNames = ordered.filter((row) => row.rank === winner.rank).map((row) => row.playerName);
      rows.push({ eventId: event.eventId, eventType: event.eventType, eventName: event.eventName, resultKind: event.resultKind, winnerName: winnerNames.join(" / "), winnerNames, winningTotal: formatEventResultScore(event, winner), rank: winner.rank, tied: winnerNames.length > 1 });
    } else {
      if (event.teamResults.length === 0) continue;
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
      const winnerNames = ordered.filter((row) => row.placement === winner.placement).map((row) => row.teamName ?? "");
      rows.push({ eventId: event.eventId, eventType: event.eventType, eventName: event.eventName, resultKind: event.resultKind, winnerName: winnerNames.join(" / "), winnerNames, winningTotal: getTeamEventDisplayTotal(winner, event.eventType), rank: winner.placement, tied: winnerNames.length > 1 });
    }
  }
  return rows;
}

export function hasHoleByHoleScrambleScores(team: TeamGameResult): boolean {
  return Boolean(team.holeResults?.some((hole) => hole.grossScore != null && Number(hole.grossScore) > 0));
}

export function formatScoreVsPar(score: number | null, par: number): string {
  if (score == null || par <= 0) return "";
  const diff = score - par;
  if (diff === 0) return "E";
  return diff < 0 ? String(diff) : `+${diff}`;
}

function getWinningEventKey(winning: PrizeWinningResponse): string {
  return `${winning.gameKey || "unknown"}|${winning.eventType || ""}|${winning.gameName || "Prize Event"}`;
}

function getWinningResultName(winning: PrizeWinningResponse): string {
  const teamName = winning.teamName?.trim();
  if (teamName) return teamName;
  const sourceName = winning.sourceName?.trim();
  if (sourceName) return sourceName;
  const playerName = winning.playerName?.trim();
  if (playerName) return playerName;
  return winning.gameName || "Prize result";
}

function isTeamWinning(winning: PrizeWinningResponse): boolean {
  if (winning.teamId != null || winning.teamName) return true;
  const sourceName = winning.sourceName?.trim();
  const playerName = winning.playerName?.trim();
  return Boolean(sourceName && playerName && sourceName !== playerName);
}

export function buildPrizePayoutGroups(winnings: PrizeWinningResponse[]): PrizePayoutGroup[] {
  const groupMap = new Map<string, PrizePayoutGroup>();
  for (let i = 0; i < winnings.length; i += 1) {
    const winning = winnings[i];
    const eventKey = getWinningEventKey(winning);
    let group = groupMap.get(eventKey);
    if (!group) {
      group = { key: eventKey, eventName: winning.gameName || "Prize Event", eventType: winning.eventType ?? null, totalAmount: 0, entries: [] };
      groupMap.set(eventKey, group);
    }
    const amount = Number(winning.amount ?? 0);
    group.totalAmount += amount;
    if (isTeamWinning(winning)) {
      const resultName = getWinningResultName(winning);
      const teamKey = `TEAM|${winning.sourceRank ?? ""}|${winning.teamId ?? resultName}|${resultName}`;
      let entry = group.entries.find((candidate) => candidate.key === teamKey);
      if (!entry) {
        entry = { key: teamKey, kind: "TEAM", place: winning.sourceRank ?? winning.finishingPlace ?? null, resultName, playerName: "", amount, memberNames: [], totalAmount: 0, perPlayerAmount: null };
        group.entries.push(entry);
      }
      const memberName = winning.playerName?.trim();
      if (memberName && !entry.memberNames.includes(memberName)) entry.memberNames.push(memberName);
      entry.totalAmount += amount;
      entry.amount = amount;
      entry.perPlayerAmount = entry.memberNames.length > 0 ? entry.totalAmount / entry.memberNames.length : amount;
    } else {
      const playerName = winning.playerName?.trim() || getWinningResultName(winning);
      group.entries.push({ key: `PLAYER|${winning.sourceRank ?? ""}|${winning.playerId ?? playerName}|${i}`, kind: "INDIVIDUAL", place: winning.sourceRank ?? winning.finishingPlace ?? null, resultName: getWinningResultName(winning), playerName, amount, memberNames: [], totalAmount: amount, perPlayerAmount: amount });
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
