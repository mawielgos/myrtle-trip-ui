import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { TripPlannedRound } from "../types/trip";

type RoundFormatOption = {
  value: string;
  label: string;
};

type RoundEventOption = {
  value: string;
  label: string;
};

const eventMetadata: Record<string, { label: string; mode: string; teamBased: boolean; usesHandicap: boolean; payoutEligible: boolean; tournamentEligible: boolean }> = {
  INDIVIDUAL_LOW_NET: { label: "Individual Low Net", mode: "Individual net", teamBased: false, usesHandicap: true, payoutEligible: true, tournamentEligible: true },
  INDIVIDUAL_LOW_GROSS: { label: "Individual Low Gross", mode: "Individual gross", teamBased: false, usesHandicap: false, payoutEligible: true, tournamentEligible: false },
  TEAM_MIDDLE_MAN: { label: "Middle Man", mode: "Team net", teamBased: true, usesHandicap: true, payoutEligible: true, tournamentEligible: false },
  TEAM_ONE_TWO_THREE: { label: "One-Two-Three", mode: "Team net", teamBased: true, usesHandicap: true, payoutEligible: true, tournamentEligible: false },
  TEAM_TWO_MAN_LOW_NET: { label: "2-Man Low Net", mode: "Team net", teamBased: true, usesHandicap: true, payoutEligible: true, tournamentEligible: false },
  TEAM_TWO_LOW_NET: { label: "4-Man 2-Low Net", mode: "Team net", teamBased: true, usesHandicap: true, payoutEligible: true, tournamentEligible: false },
  TEAM_THREE_LOW_NET: { label: "Three Low Net", mode: "Team net", teamBased: true, usesHandicap: true, payoutEligible: true, tournamentEligible: false },
  TEAM_SCRAMBLE: { label: "Scramble", mode: "Team gross", teamBased: true, usesHandicap: false, payoutEligible: true, tournamentEligible: false },
};

export const individualEventOptions: RoundEventOption[] = [
  { value: "INDIVIDUAL_LOW_NET", label: "Individual Low Net" },
  { value: "INDIVIDUAL_LOW_GROSS", label: "Individual Low Gross" },
];

export const FOUR_MAN_TWO_LOW_NET_OPTION = "FOUR_MAN_TWO_LOW_NET";
export const MAX_PLANNED_ROUND_COUNT = 12;

export const formatOptions: RoundFormatOption[] = [
  { value: "MIDDLE_MAN", label: "4-Man Middle Man" },
  { value: "ONE_TWO_THREE", label: "4-Man 1-2-3" },
  { value: "TWO_MAN_LOW_NET", label: "2-Man Low Net" },
  { value: FOUR_MAN_TWO_LOW_NET_OPTION, label: "4-Man 2-Low Net" },
  { value: "THREE_LOW_NET", label: "4-Man 3 Low Net" },
  { value: "TEAM_SCRAMBLE", label: "Scramble" },
  { value: "STROKE_PLAY", label: "Individual Stroke Play" },
];

export function optionValueToLegacyFormat(optionValue: string | null | undefined): string | null {
  if (!optionValue) {
    return null;
  }

  if (optionValue === FOUR_MAN_TWO_LOW_NET_OPTION) {
    return "THREE_LOW_NET";
  }

  return optionValue;
}

export function legacyFormatToPrimaryEventType(format: string | null | undefined): string {
  switch (format) {
    case FOUR_MAN_TWO_LOW_NET_OPTION:
      return "TEAM_TWO_LOW_NET";
    case "MIDDLE_MAN":
      return "TEAM_MIDDLE_MAN";
    case "ONE_TWO_THREE":
      return "TEAM_ONE_TWO_THREE";
    case "TWO_MAN_LOW_NET":
      return "TEAM_TWO_MAN_LOW_NET";
    case "THREE_LOW_NET":
      return "TEAM_THREE_LOW_NET";
    case "TEAM_SCRAMBLE":
      return "TEAM_SCRAMBLE";
    case "STROKE_PLAY":
    default:
      return "INDIVIDUAL_LOW_NET";
  }
}

export function primaryGameSelectValue(round: TripPlannedRound): string {
  if (hasEvent(round, "TEAM_TWO_LOW_NET")) {
    return FOUR_MAN_TWO_LOW_NET_OPTION;
  }

  return round.format ?? "";
}

export function defaultTeamSizeForEventType(eventType: string, scrambleTeamSize?: number | null): number | null {
  switch (eventType) {
    case "TEAM_SCRAMBLE":
      return scrambleTeamSize ?? 4;
    case "TEAM_MIDDLE_MAN":
    case "TEAM_ONE_TWO_THREE":
    case "TEAM_TWO_LOW_NET":
    case "TEAM_THREE_LOW_NET":
      return 4;
    case "TEAM_TWO_MAN_LOW_NET":
      return 2;
    default:
      return null;
  }
}

export function defaultEventName(eventType: string, teamSize?: number | null): string {
  switch (eventType) {
    case "INDIVIDUAL_LOW_GROSS":
      return "Individual Low Gross";
    case "TEAM_MIDDLE_MAN":
      return "Middle Man";
    case "TEAM_ONE_TWO_THREE":
      return "One-Two-Three";
    case "TEAM_TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "TEAM_TWO_LOW_NET":
      return "4-Man 2-Low Net";
    case "TEAM_THREE_LOW_NET":
      return "Three Low Net";
    case "TEAM_SCRAMBLE":
      return `${teamSize ?? 4}-Man Scramble`;
    case "INDIVIDUAL_LOW_NET":
    default:
      return "Individual Low Net";
  }
}

export function normalizeEvents(round: TripPlannedRound): NonNullable<TripPlannedRound["events"]> {
  if (round.events && round.events.length > 0) {
    return [...round.events].sort((a, b) => (a.eventOrder ?? 999) - (b.eventOrder ?? 999));
  }

  const eventType = legacyFormatToPrimaryEventType(round.format);
  return [{
    eventType,
    eventName: defaultEventName(eventType, round.scrambleTeamSize),
    eventOrder: 1,
    teamSize: defaultTeamSizeForEventType(eventType, round.scrambleTeamSize),
    handicapPercent: null,
  }];
}

export function hasEvent(round: TripPlannedRound, eventType: string): boolean {
  return normalizeEvents(round).some((event) => event.eventType === eventType);
}

export function eventSummary(round: TripPlannedRound): string {
  const events = normalizeEvents(round);
  return events.map((event) => event.eventName || defaultEventName(event.eventType, event.teamSize)).join(" + ");
}

export function eventModeLabel(eventType: string): string {
  return eventMetadata[eventType]?.mode ?? "Configured event";
}

export function eventBadges(event: NonNullable<TripPlannedRound["events"]>[number]): string[] {
  const metadata = eventMetadata[event.eventType];
  const badges: string[] = [];
  badges.push(metadata?.teamBased ? `Team${event.teamSize ? ` (${event.teamSize})` : ""}` : "Individual");
  badges.push(metadata?.usesHandicap ? "Handicap" : "Gross");
  if (metadata?.payoutEligible) {
    badges.push("Payout eligible");
  }
  if (metadata?.tournamentEligible) {
    badges.push("Tournament candidate");
  }
  return badges;
}

export function formatCourseLabel(course: CourseListItem): string {
  return course.location
    ? `${course.courseName} — ${course.location}`
    : course.courseName;
}

export function formatCourseRating(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

export function formatMenTeeLabel(tee: CourseTeeListItem): string {
  if (tee.courseRating != null && tee.slope != null) {
    return `${tee.teeName} (Rating ${formatCourseRating(tee.courseRating)} / Slope ${tee.slope})`;
  }

  return tee.teeName;
}

export function formatWomenTeeLabel(tee: CourseTeeListItem): string {
  if (tee.womenCourseRating != null && tee.womenSlope != null) {
    return `${tee.teeName} (Rating ${formatCourseRating(tee.womenCourseRating)} / Slope ${tee.womenSlope})`;
  }

  return tee.teeName;
}

export function formatGameLabel(format: string | null): string {
  if (!format) {
    return "Select game";
  }

  return formatOptions.find((option) => option.value === format)?.label ?? format;
}

export function menTeeRating(tee: CourseTeeListItem): number {
  return tee.courseRating ?? -999;
}

export function womenTeeRating(tee: CourseTeeListItem): number {
  return tee.womenCourseRating ?? -999;
}

export function sortTeesByRatingDesc(tees: CourseTeeListItem[], gender: "M" | "F"): CourseTeeListItem[] {
  return [...tees].sort((a, b) => {
    const left = gender === "F" ? womenTeeRating(a) : menTeeRating(a);
    const right = gender === "F" ? womenTeeRating(b) : menTeeRating(b);
    if (right !== left) {
      return right - left;
    }
    return a.teeName.localeCompare(b.teeName);
  });
}

export function hasCompleteHoleSetup(tee: CourseTeeListItem): boolean {
  return tee.holeCount == null || tee.holeCount === 18;
}

export function isMenTeeEligible(tee: CourseTeeListItem): boolean {
  return tee.courseRating != null && tee.slope != null && tee.parTotal != null && hasCompleteHoleSetup(tee);
}

export function isWomenTeeEligible(tee: CourseTeeListItem): boolean {
  return tee.womenCourseRating != null && tee.womenSlope != null && tee.womenParTotal != null && hasCompleteHoleSetup(tee);
}

export function sortRoundsByPlaySequence(rounds: TripPlannedRound[]): TripPlannedRound[] {
  return [...rounds].sort((a, b) => {
    const aDate = a.roundDate ?? "9999-12-31";
    const bDate = b.roundDate ?? "9999-12-31";
    if (aDate !== bDate) {
      return aDate.localeCompare(bDate);
    }
    return a.roundNumber - b.roundNumber;
  });
}

export function snapshotRounds(rounds: TripPlannedRound[]): string {
  return JSON.stringify(
    sortRoundsByPlaySequence(rounds).map((round, index) => ({
      roundId: round.roundId,
      roundNumber: index + 1,
      roundDate: round.roundDate,
      format: round.format,
      courseId: round.courseId,
      defaultTeeId: round.defaultTeeId,
      womenDefaultTeeId: round.womenDefaultTeeId ?? null,
      includeInFourDayStandings: round.includeInFourDayStandings,
      scrambleTeamSize: round.format === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : 4,
      events: normalizeEvents(round).map((event, eventIndex) => ({
        eventType: event.eventType,
        eventName: event.eventName || defaultEventName(event.eventType, event.teamSize),
        eventOrder: eventIndex + 1,
        teamSize: event.teamSize ?? null,
        handicapPercent: event.handicapPercent ?? null,
      })),
    })),
  );
}

export function formatDisplayDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return value;
  }

  const [year, month, day] = parts;
  const localDate = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(localDate);
}

export function formatTripDateRange(startDate: string | null, endDate: string | null): string {
  const formattedStartDate = formatDisplayDate(startDate);
  const formattedEndDate = formatDisplayDate(endDate);

  if (formattedStartDate && formattedEndDate) {
    return `${formattedStartDate} through ${formattedEndDate}`;
  }
  if (formattedStartDate) {
    return `Starts ${formattedStartDate}`;
  }
  if (formattedEndDate) {
    return `Ends ${formattedEndDate}`;
  }
  return "Event dates not set";
}

export function roundKey(round: TripPlannedRound): string {
  return round.roundId != null ? `id-${round.roundId}` : `number-${round.roundNumber}`;
}

export function selectInitialExpandedRoundKey(
  rounds: TripPlannedRound[],
  requestedRoundNumber: number,
): string | null {
  if (rounds.length === 0) {
    return null;
  }

  if (Number.isFinite(requestedRoundNumber) && requestedRoundNumber > 0) {
    const requestedRound = rounds.find((round) => round.roundNumber === requestedRoundNumber);
    if (requestedRound) {
      return roundKey(requestedRound);
    }
  }

  return roundKey(rounds[0]);
}

export function teeSummary(label: string | null | undefined, fallback: string): string {
  if (!label || label.trim().length === 0) {
    return fallback;
  }
  return label;
}

export function createBlankPlannedRound(roundNumber: number): TripPlannedRound {
  return {
    roundId: null,
    roundNumber,
    roundDate: null,
    format: null,
    courseId: null,
    courseName: null,
    defaultTeeId: null,
    defaultTeeName: null,
    womenDefaultTeeId: null,
    womenDefaultTeeName: null,
    standardTeeName: null,
    includeInFourDayStandings: false,
    scrambleTeamSize: 4,
    events: [],
    finalized: false,
  };
}

export function isConfiguredEnoughToWarnBeforeRemove(round: TripPlannedRound): boolean {
  return Boolean(
    round.roundDate ||
    round.format ||
    round.courseId != null ||
    round.defaultTeeId != null ||
    round.womenDefaultTeeId != null ||
    (round.events && round.events.length > 0),
  );
}
