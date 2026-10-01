import type { TripRoundListItem } from "../types/trip";

export function formatGameDescription(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();

  switch (normalized) {
    case "MIDDLE_MAN":
      return "4-Man Middle Man";
    case "ONE_TWO_THREE":
      return "4-Man 1-2-3";
    case "TWO_MAN_LOW_NET":
    case "TEAM_TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "TEAM_TWO_LOW_NET":
      return "4-Man 2-Low Net";
    case "THREE_LOW_NET":
    case "TEAM_THREE_LOW_NET":
      return "4-Man 3 Low Net";
    case "TEAM_SCRAMBLE":
      return "Team Scramble";
    case "STROKE_PLAY":
      return "Stroke Play";
    default:
      return normalized
        .toLowerCase()
        .split("_")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
        .join(" ") || "—";
  }
}

export function formatRoundDateShort(value: string | null | undefined): string {
  if (!value) {
    return "TBD";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRoundEventDescription(eventType: string | null | undefined, fallbackName?: string | null): string {
  const fallback = fallbackName?.trim();
  if (fallback) {
    return fallback;
  }

  switch ((eventType ?? "").trim()) {
    case "INDIVIDUAL_LOW_NET":
      return "Individual Low Net";
    case "INDIVIDUAL_LOW_GROSS":
      return "Individual Low Gross";
    case "TEAM_TWO_MAN_LOW_NET":
    case "TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "TEAM_MIDDLE_MAN":
    case "MIDDLE_MAN":
      return "Middle Man";
    case "TEAM_ONE_TWO_THREE":
    case "ONE_TWO_THREE":
      return "1-2-3";
    case "TEAM_TWO_LOW_NET":
      return "4-Man 2-Low Net";
    case "TEAM_THREE_LOW_NET":
    case "THREE_LOW_NET":
      return "Three Low Net";
    case "TEAM_SCRAMBLE":
      return "Team Scramble";
    default:
      return formatGameDescription(eventType);
  }
}

export function formatRoundEventsSummary(round: TripRoundListItem): string {
  const eventLabels = (round.events ?? [])
    .map((event) => formatRoundEventDescription(event.eventType, event.eventName))
    .filter((label) => label && label !== "—");

  if (eventLabels.length > 0) {
    return eventLabels.join(" + ");
  }

  return formatGameDescription(round.gameFormat);
}

export function formatRoundDisplay(round: TripRoundListItem): string {
  const parts = [
    round.roundNumber != null ? `Round ${round.roundNumber}` : "Round",
    formatRoundDateShort(round.roundDate),
    formatRoundEventsSummary(round),
    round.courseName?.trim() || null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" - ");
}
