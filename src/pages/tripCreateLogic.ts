import type { PlayerListItem } from "../types/player";

export type TripSetupFields = {
  tripName: string;
  tripYear: string;
  tripCode: string;
  entryFee: string;
  tripStartDate: string;
  tripEndDate: string;
  plannedRoundCount: string;
  handicapsEnabled: boolean;
  handicapMethod: string;
  frozenIndexes: Record<number, string>;
  selectedPlayerIds: number[];
};

export function buildTripCode(name: string, year: string): string {
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const cleanYear = year.trim();

  if (!cleanName && !cleanYear) {
    return "";
  }

  if (!cleanName) {
    return cleanYear;
  }

  if (!cleanYear) {
    return cleanName;
  }

  return `${cleanName}_${cleanYear}`;
}

export function sortPlayers(players: PlayerListItem[]): PlayerListItem[] {
  return [...players].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    })
  );
}

export function normalizeTripHandicapMethod(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "FROZEN_GHIN_INDEX") {
    return "FROZEN_GHIN_INDEX";
  }

  if (normalized === "GHIN_HISTORY" || normalized === "GHIN") {
    return "GHIN_HISTORY";
  }

  if (
    normalized === "GHIN_PLUS_DB_SCORE_HISTORY" ||
    normalized === "DB_SCORE_HISTORY" ||
    normalized === "MYRTLE_BEACH"
  ) {
    return "GHIN_PLUS_DB_SCORE_HISTORY";
  }

  return "GHIN_PLUS_DB_SCORE_HISTORY";
}

export function validateTripSetup(fields: TripSetupFields): string | null {
  const { tripName, tripYear, tripCode, entryFee, tripStartDate, tripEndDate, plannedRoundCount, handicapsEnabled, handicapMethod, selectedPlayerIds, frozenIndexes } = fields;
  if (!tripName.trim()) {
    return "Event name is required.";
  }

  if (!tripYear.trim()) {
    return "Event year is required.";
  }

  const numericYear = Number(tripYear);
  if (!Number.isInteger(numericYear)) {
    return "Event year must be a whole number.";
  }

  if (!tripCode.trim()) {
    return "Event code is required.";
  }

  if (entryFee.trim()) {
    const numericEntryFee = Number(entryFee);
    if (!Number.isInteger(numericEntryFee) || numericEntryFee < 0) {
      return "Entry fee must be a whole number 0 or greater.";
    }
  }

  if (!tripStartDate) {
    return "Event start date is required.";
  }

  if (!tripEndDate) {
    return "Event end date is required.";
  }

  if (tripEndDate < tripStartDate) {
    return "Event end date cannot be before event start date.";
  }

  const numericPlannedRoundCount = Number(plannedRoundCount);
  if (!Number.isInteger(numericPlannedRoundCount) || numericPlannedRoundCount < 1 || numericPlannedRoundCount > 12) {
    return "Number of rounds must be a whole number between 1 and 12.";
  }

  if (handicapsEnabled && handicapMethod === "FROZEN_GHIN_INDEX") {
    for (const playerId of selectedPlayerIds) {
      const rawIndex = frozenIndexes[playerId]?.trim() ?? "";
      if (!rawIndex) {
        return "Frozen GHIN Index is required for every selected player.";
      }

      const numericIndex = Number(rawIndex);
      if (!Number.isFinite(numericIndex) || numericIndex < -10 || numericIndex > 54) {
        return "Frozen GHIN Index must be a number between -10.0 and 54.0.";
      }
    }
  }

  return null;
}

