import type { ManualScoreHistoryEntry } from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";

export interface ScoreRowForm {
  rowKey: number;
  playerId: string;
  playerName: string;
  scoreDate: string;
  courseName: string;
  courseRating: string;
  slope: string;
  score: string;
  differential: string;
  includedInMyrtleCalc: boolean;
  holesPlayed: string;
  postingOrder: string;
}

let nextRowKey = 1;

export function allocateScoreRowKey(): number {
  const rowKey = nextRowKey;
  nextRowKey += 1;
  return rowKey;
}

export function createEmptyScoreRow(): ScoreRowForm {
  const row: ScoreRowForm = {
    rowKey: allocateScoreRowKey(),
    playerId: "",
    playerName: "",
    scoreDate: "",
    courseName: "",
    courseRating: "",
    slope: "",
    score: "",
    differential: "",
    includedInMyrtleCalc: true,
    holesPlayed: "18",
    postingOrder: "",
  };
  return row;
}

export function createEmptyRows(count: number): ScoreRowForm[] {
  const rows: ScoreRowForm[] = [];
  for (let i = 0; i < count; i += 1) rows.push(createEmptyScoreRow());
  return rows;
}

export function formatNumber(
  value: number | null | undefined,
  digits: number,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function pickValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized] != null) return row[normalized];
  }
  return "";
}

export function parseBooleanText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "y" ||
    normalized === "1"
  );
}

export function parseRequiredNumber(
  value: string,
  label: string,
  rowNumber: number,
): number {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Row ${rowNumber}: ${label} is required.`);
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed))
    throw new Error(`Row ${rowNumber}: ${label} must be numeric.`);
  return parsed;
}

export function parseOptionalNumber(
  value: string,
  label: string,
  rowNumber: number,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed))
    throw new Error(`Row ${rowNumber}: ${label} must be numeric.`);
  return parsed;
}

export function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseScoreMonthYear(value: string, rowNumber: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Row ${rowNumber}: Score Date is required.`);

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-01`;

  const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!monthYearMatch)
    throw new Error(
      `Row ${rowNumber}: Score Date must be MM/YY, for example 04/26.`,
    );

  const month = Number(monthYearMatch[1]);
  if (month < 1 || month > 12)
    throw new Error(`Row ${rowNumber}: Month must be between 1 and 12.`);

  let year = Number(monthYearMatch[2]);
  if (year < 100) year += 2000;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function formatScoreMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) return value;
  return `${match[2]}/${match[1].slice(2)}`;
}

export function parseCsvRows(text: string, players: TripPlayer[]): ScoreRowForm[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2)
    throw new Error(
      "Upload file must include a header row and at least one score row.",
    );

  const playerByName: Record<string, TripPlayer> = {};
  for (const player of players)
    playerByName[normalizeName(player.displayName)] = player;

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows: ScoreRowForm[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const rowMap: Record<string, string> = {};
    for (let h = 0; h < headers.length; h += 1)
      rowMap[headers[h]] = values[h] ?? "";

    const playerName = pickValue(rowMap, [
      "Player",
      "Player Name",
      "Golfer",
      "Name",
      "displayName",
    ]);
    const matchedPlayer = playerByName[normalizeName(playerName)];

    rows.push({
      rowKey: allocateScoreRowKey(),
      playerId: matchedPlayer ? String(matchedPlayer.playerId) : "",
      playerName,
      scoreDate: pickValue(rowMap, [
        "Score Date",
        "scoreDate",
        "date",
        "score_date",
      ]),
      courseName: pickValue(rowMap, [
        "Course Name",
        "courseName",
        "course",
        "course_name",
      ]),
      score: pickValue(rowMap, [
        "Score",
        "grossScore",
        "gross",
        "adjustedGrossScore",
        "adjusted_gross_score",
      ]),
      courseRating: pickValue(rowMap, [
        "CR",
        "courseRating",
        "rating",
        "course_rating",
      ]),
      slope: pickValue(rowMap, ["Slope"]),
      differential: pickValue(rowMap, ["Diff", "differential"]),
      holesPlayed:
        pickValue(rowMap, ["Holes", "holesPlayed", "holes_played"]) || "18",
      includedInMyrtleCalc: parseBooleanText(
        pickValue(rowMap, [
          "Include In Event",
          "includedInMyrtleCalc",
          "included",
          "include",
          "myrtle",
          "included_in_myrtle_calc",
        ]),
      ),
      postingOrder: pickValue(rowMap, [
        "Seq",
        "Sequence",
        "Posting Order",
        "postingOrder",
        "posting_order",
      ]),
    });
  }

  return rows;
}

export function getPlayerIdsForEntries(entries: ManualScoreHistoryEntry[]): number[] {
  const playerIds: number[] = [];
  for (const entry of entries) {
    if (!playerIds.includes(entry.playerId)) {
      playerIds.push(entry.playerId);
    }
  }
  return playerIds;
}


