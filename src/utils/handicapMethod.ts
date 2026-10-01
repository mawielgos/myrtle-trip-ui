export const HANDICAP_METHOD_GHIN = "GHIN";
export const HANDICAP_METHOD_DB_SCORE_HISTORY = "DB_SCORE_HISTORY";
export const HANDICAP_METHOD_LEGACY_MYRTLE_BEACH = "MYRTLE_BEACH";
export const HANDICAP_METHOD_FROZEN_GHIN_INDEX = "FROZEN_GHIN_INDEX";
export const HANDICAP_METHOD_GHIN_HISTORY = "GHIN_HISTORY";
export const HANDICAP_METHOD_GHIN_PLUS_DB_SCORE_HISTORY = "GHIN_PLUS_DB_SCORE_HISTORY";

export function normalizeHandicapMethod(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  if (normalized === HANDICAP_METHOD_GHIN) {
    return HANDICAP_METHOD_GHIN_HISTORY;
  }

  if (
    normalized === HANDICAP_METHOD_DB_SCORE_HISTORY ||
    normalized === HANDICAP_METHOD_LEGACY_MYRTLE_BEACH
  ) {
    return HANDICAP_METHOD_GHIN_PLUS_DB_SCORE_HISTORY;
  }

  return normalized;
}

export function formatHandicapMethod(value: string | null | undefined): string {
  const normalized = normalizeHandicapMethod(value);
  if (!normalized) {
    return "—";
  }
  if (normalized === HANDICAP_METHOD_FROZEN_GHIN_INDEX) {
    return "Frozen GHIN";
  }
  if (normalized === HANDICAP_METHOD_GHIN_HISTORY) {
    return "GHIN History";
  }
  if (normalized === HANDICAP_METHOD_GHIN_PLUS_DB_SCORE_HISTORY) {
    return "GHIN History + DB Score History";
  }
  return value ?? normalized;
}
