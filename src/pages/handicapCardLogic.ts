import type { HandicapCardDetailResponse, HandicapCardScore } from "../types/handicapCard";

export function csvValue(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('\"', '\"\"')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function safeFilePart(value: string | null | undefined): string {
  return (value || "handicap-card")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "handicap-card";
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(value: string, days: number): string {
  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function clampToToday(value: string): string {
  const today = getTodayIsoDate();
  if (!value) {
    return today;
  }
  return value > today ? today : value;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  return `${month}/${day}/${year}`;
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

export function getPendingIndexDelta(data: HandicapCardDetailResponse | null): number | null {
  if (!data || data.pendingTripIndex == null || data.tripIndex == null) {
    return null;
  }

  const backendDelta = data.pendingIndexDelta;
  if (backendDelta != null && Number.isFinite(Number(backendDelta))) {
    return Number(backendDelta);
  }

  return Number(data.pendingTripIndex) - Number(data.tripIndex);
}

export function formatSignedDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  const rounded = Number(value).toFixed(digits);
  return Number(value) > 0 ? `+${rounded}` : rounded;
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return String(value);
}


export function formatSource(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  if (value === "TRIP_ROUND") {
    return "Event";
  }
  if (value === "GHIN_FROZEN") {
    return "GHIN";
  }
  if (value === "DB_HISTORY_FROZEN") {
    return "DB History";
  }
  return value.replaceAll("_", " ");
}

export function buildRecencyLabel(score: HandicapCardScore): string {
  if (score.sourceType === "GHIN_FROZEN" && score.postingOrder != null) {
    return `GHIN #${score.postingOrder}`;
  }

  if (score.sourceType === "TRIP_ROUND") {
    return `Event ${formatDate(score.scoreDate)}`;
  }

  return formatDate(score.scoreDate);
}
