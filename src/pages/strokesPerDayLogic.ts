import type {
  StrokesPerDayPlayer,
  StrokesPerDayPlayerRound,
  StrokesPerDayResponse,
  StrokesPerDayRound,
  StrokesPerDayTeeOption,
} from "../types/strokes";

export function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return value;
  }

  return `${month}/${day}/${year}`;
}

export function formatDecimal(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }
  return Number(value).toFixed(digits);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }
  return Number(value).toLocaleString();
}

export function normalizeWebsiteUrl(
  value: string | null | undefined,
): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function formatStrokes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }

  const numericValue = Number(value);
  if (numericValue < 0) {
    return `+${Math.abs(numericValue)}`;
  }

  return String(numericValue);
}

export function buildTeeDetail(
  playerRound: StrokesPerDayPlayerRound | null,
): string {
  if (!playerRound) {
    return "";
  }

  const details: string[] = [];
  if (
    playerRound.selectedCourseRating != null &&
    playerRound.selectedSlope != null
  ) {
    details.push(
      `${formatDecimal(playerRound.selectedCourseRating)} / ${playerRound.selectedSlope}`,
    );
  }
  if (playerRound.selectedYardage != null) {
    details.push(`${formatNumber(playerRound.selectedYardage)} yds`);
  }
  return details.join(" - ");
}

export function findPlayerRound(
  player: StrokesPerDayPlayer,
  round: StrokesPerDayRound,
): StrokesPerDayPlayerRound | null {
  for (const playerRound of player.rounds) {
    if (playerRound.roundId === round.roundId) {
      return playerRound;
    }
  }
  return null;
}

export function buildPlayerRoundKey(playerId: number, roundId: number): string {
  return `${playerId}:${roundId}`;
}

export function isPlanningRound(round: StrokesPerDayRound): boolean {
  return round.statusCode === "PLANNING" && round.teePlanningLocked !== true;
}

export function findTeeOption(
  playerRound: StrokesPerDayPlayerRound,
  roundTeeId: number,
): StrokesPerDayTeeOption | null {
  for (const option of playerRound.eligibleTeeOptions ?? []) {
    if (option.roundTeeId === roundTeeId) {
      return option;
    }
  }

  return null;
}

export function buildInitialSelectedTeeIds(
  response: StrokesPerDayResponse,
): Record<string, number | null> {
  const result: Record<string, number | null> = {};

  for (const player of response.players) {
    for (const playerRound of player.rounds) {
      result[buildPlayerRoundKey(player.playerId, playerRound.roundId)] =
        playerRound.selectedRoundTeeId ?? null;
    }
  }

  return result;
}

export function chunkRounds(
  rounds: StrokesPerDayRound[],
  chunkSize: number,
): StrokesPerDayRound[][] {
  const chunks: StrokesPerDayRound[][] = [];

  for (let index = 0; index < rounds.length; index += chunkSize) {
    chunks.push(rounds.slice(index, index + chunkSize));
  }

  return chunks;
}

export function getRoundStatusLabel(round: StrokesPerDayRound): string {
  if (round.statusLabel && round.statusLabel.trim()) {
    return round.statusLabel;
  }

  if (round.statusCode === "FINALIZED") {
    return "Finalized";
  }

  if (round.statusCode === "IN_PROGRESS") {
    return "In Progress";
  }

  return "Planning";
}

export function buildTeeMeta(
  playerRound: StrokesPerDayPlayerRound | null,
): string {
  const rating = formatDecimal(playerRound?.selectedCourseRating);
  const slope = formatNumber(playerRound?.selectedSlope);
  const yardage = formatNumber(playerRound?.selectedYardage);

  const metaParts: string[] = [];
  if (rating || slope) {
    metaParts.push(`${rating || "—"} / ${slope || "—"}`);
  }
  if (yardage) {
    metaParts.push(`${yardage} yds`);
  }

  return metaParts.join(" • ");
}

export function buildDailyHandicapsCsv(
  data: StrokesPerDayResponse,
): Array<Array<string | number | null | undefined>> {
  const rows: Array<Array<string | number | null | undefined>> = [];
  rows.push(["Daily Handicaps"]);
  rows.push(["Event", data.tripName]);
  rows.push([]);
  rows.push([
    "Player",
    "Round",
    "Date",
    "Day",
    "Course",
    "Status",
    "Index",
    "Tee",
    "Tee Detail",
    "Course Handicap",
    "Playing Handicap",
  ]);

  for (const player of data.players ?? []) {
    for (const round of data.rounds ?? []) {
      const playerRound = findPlayerRound(player, round);
      rows.push([
        player.playerName,
        round.roundNumber,
        round.roundDate,
        round.dayName ?? "",
        round.courseName ?? "",
        getRoundStatusLabel(round),
        formatDecimal(playerRound?.tripIndex),
        playerRound?.selectedTeeName ?? "",
        buildTeeDetail(playerRound),
        formatStrokes(playerRound?.selectedCourseHandicap),
        formatStrokes(playerRound?.selectedPlayingHandicap),
      ]);
    }
  }

  return rows;
}
