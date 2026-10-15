import type { HandicapCardDetailResponse, HandicapCardsResponse, HandicapCardPlayerSummary } from "../types/handicapCard";
import { formatHandicapMethod } from "../utils/handicapMethod";

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

export function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function sanitizeFilePart(value: string | null | undefined): string {
  return (
    (value ?? "handicap-cards")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "handicap-cards"
  );
}

export function formatScoreValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }
  return String(value);
}

export function buildDetailedHandicapCardsCsv(
  data: HandicapCardsResponse,
  details: HandicapCardDetailResponse[],
): Array<Array<string | number | null | undefined>> {
  const rows: Array<Array<string | number | null | undefined>> = [];
  rows.push(["Handicap Cards"]);
  rows.push(["Event", data.tripName]);
  rows.push(["As Of", data.asOfDate ?? ""]);
  rows.push([]);

  for (const detail of details) {
    rows.push(["Player", detail.playerName]);
    rows.push(["Event Index", formatDecimal(detail.tripIndex)]);
    rows.push(["Pending Index", formatDecimal(detail.pendingTripIndex)]);
    rows.push(["Method", formatHandicapMethod(detail.handicapMethod)]);
    rows.push(["Eligible", detail.eligibleScoreCount ?? ""]);
    rows.push(["Window", detail.windowScoreCount ?? ""]);
    rows.push(["Used", detail.usedScoreCount ?? ""]);
    rows.push([
      "Date",
      "Course",
      "Gross",
      "Adjusted Gross",
      "CR",
      "Slope",
      "Differential",
      "Holes",
      "Source",
      "Used",
      "Pending",
      "Reason",
    ]);
    for (const score of detail.scores ?? []) {
      rows.push([
        score.scoreDate ?? "",
        score.courseName ?? "",
        formatScoreValue(score.grossScore),
        formatScoreValue(score.adjustedGrossScore),
        formatDecimal(score.courseRating),
        score.slope ?? "",
        formatDecimal(score.differential),
        score.holesPlayed ?? "",
        score.sourceType ?? "",
        score.usedInIndex ? "Y" : "",
        score.pendingForCalculationDate ? "Y" : "",
        score.exclusionReason ?? "",
      ]);
    }
    rows.push([]);
  }

  return rows;
}

export function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value;
}

export function buildSubtitle(data: HandicapCardsResponse | null): string {
  if (!data) {
    return "Review each player’s handicap calculation card.";
  }

  const asOf = data.asOfDate ? ` as of ${data.asOfDate}` : "";
  return `${data.tripName}${asOf} • ${data.players.length} player${data.players.length === 1 ? "" : "s"}`;
}

export function sortHandicapCardPlayers(players: HandicapCardPlayerSummary[]): HandicapCardPlayerSummary[] {
  return [...players].sort((a, b) => {
    const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.playerName.localeCompare(b.playerName);
  });
}
