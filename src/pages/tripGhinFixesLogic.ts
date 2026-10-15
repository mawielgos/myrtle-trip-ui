import type { GhinFixRow } from "../types/ghinFix";

export function formatNullableNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

export function buildRowHint(row: GhinFixRow): string {
  const parts: string[] = [];
  if (row.scoreType) parts.push(`Type ${row.scoreType}`);
  if (row.holesPlayed != null) parts.push(`${row.holesPlayed} holes`);
  if (row.postingOrder != null) parts.push(`Posting ${row.postingOrder}`);
  return parts.length > 0 ? parts.join(" • ") : "Manual differential required";
}

export function sortGhinFixRows(rows: readonly GhinFixRow[]): GhinFixRow[] {
  return [...rows].sort((a, b) => {
    const playerCompare = a.playerName.localeCompare(b.playerName, undefined, { sensitivity: "base" });
    if (playerCompare !== 0) return playerCompare;
    const postingA = a.postingOrder ?? 9999;
    const postingB = b.postingOrder ?? 9999;
    if (postingA !== postingB) return postingA - postingB;
    return a.scoreHistoryEntryId - b.scoreHistoryEntryId;
  });
}

export function buildGhinFixDrafts(rows: readonly GhinFixRow[]): Record<number, string> {
  const drafts: Record<number, string> = {};
  for (const row of rows) {
    drafts[row.scoreHistoryEntryId] = row.differential != null ? row.differential.toFixed(3) : "";
  }
  return drafts;
}

export function ghinDraftSnapshot(drafts: Record<number, string>): string {
  return JSON.stringify(
    Object.keys(drafts)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => [Number(key), (drafts[Number(key)] ?? "").trim()])
  );
}

export function rowsWithEnteredDifferentials(
  sortedRows: readonly GhinFixRow[],
  drafts: Record<number, string>
): GhinFixRow[] {
  return sortedRows.filter((row) => (drafts[row.scoreHistoryEntryId] ?? "").trim().length > 0);
}
