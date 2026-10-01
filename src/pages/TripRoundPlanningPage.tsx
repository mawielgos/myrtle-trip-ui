import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCourses, getCourseTees } from "../api/courseApi";
import {
  getPlannedRounds,
  getTripDetail,
  savePlannedRounds,
} from "../api/tripApi";
import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { TripPlannedRound } from "../types/trip";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  pageContainerMediumStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";

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

const individualEventOptions: RoundEventOption[] = [
  { value: "INDIVIDUAL_LOW_NET", label: "Individual Low Net" },
  { value: "INDIVIDUAL_LOW_GROSS", label: "Individual Low Gross" },
];

const FOUR_MAN_TWO_LOW_NET_OPTION = "FOUR_MAN_TWO_LOW_NET";
const MAX_PLANNED_ROUND_COUNT = 12;

const formatOptions: RoundFormatOption[] = [
  { value: "MIDDLE_MAN", label: "4-Man Middle Man" },
  { value: "ONE_TWO_THREE", label: "4-Man 1-2-3" },
  { value: "TWO_MAN_LOW_NET", label: "2-Man Low Net" },
  { value: FOUR_MAN_TWO_LOW_NET_OPTION, label: "4-Man 2-Low Net" },
  { value: "THREE_LOW_NET", label: "4-Man 3 Low Net" },
  { value: "TEAM_SCRAMBLE", label: "Scramble" },
  { value: "STROKE_PLAY", label: "Individual Stroke Play" },
];

function optionValueToLegacyFormat(optionValue: string | null | undefined): string | null {
  if (!optionValue) {
    return null;
  }

  if (optionValue === FOUR_MAN_TWO_LOW_NET_OPTION) {
    return "THREE_LOW_NET";
  }

  return optionValue;
}

function legacyFormatToPrimaryEventType(format: string | null | undefined): string {
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

function primaryGameSelectValue(round: TripPlannedRound): string {
  if (hasEvent(round, "TEAM_TWO_LOW_NET")) {
    return FOUR_MAN_TWO_LOW_NET_OPTION;
  }

  return round.format ?? "";
}

function defaultTeamSizeForEventType(eventType: string, scrambleTeamSize?: number | null): number | null {
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

function defaultEventName(eventType: string, teamSize?: number | null): string {
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

function normalizeEvents(round: TripPlannedRound): NonNullable<TripPlannedRound["events"]> {
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

function hasEvent(round: TripPlannedRound, eventType: string): boolean {
  return normalizeEvents(round).some((event) => event.eventType === eventType);
}

function eventSummary(round: TripPlannedRound): string {
  const events = normalizeEvents(round);
  return events.map((event) => event.eventName || defaultEventName(event.eventType, event.teamSize)).join(" + ");
}

function eventModeLabel(eventType: string): string {
  return eventMetadata[eventType]?.mode ?? "Configured event";
}

function eventBadges(event: NonNullable<TripPlannedRound["events"]>[number]): string[] {
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

function formatCourseLabel(course: CourseListItem): string {
  return course.location
    ? `${course.courseName} — ${course.location}`
    : course.courseName;
}

function formatCourseRating(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function formatMenTeeLabel(tee: CourseTeeListItem): string {
  if (tee.courseRating != null && tee.slope != null) {
    return `${tee.teeName} (Rating ${formatCourseRating(tee.courseRating)} / Slope ${tee.slope})`;
  }

  return tee.teeName;
}

function formatWomenTeeLabel(tee: CourseTeeListItem): string {
  if (tee.womenCourseRating != null && tee.womenSlope != null) {
    return `${tee.teeName} (Rating ${formatCourseRating(tee.womenCourseRating)} / Slope ${tee.womenSlope})`;
  }

  return tee.teeName;
}

function formatGameLabel(format: string | null): string {
  if (!format) {
    return "Select game";
  }

  return formatOptions.find((option) => option.value === format)?.label ?? format;
}

function menTeeRating(tee: CourseTeeListItem): number {
  return tee.courseRating ?? -999;
}

function womenTeeRating(tee: CourseTeeListItem): number {
  return tee.womenCourseRating ?? -999;
}

function sortTeesByRatingDesc(tees: CourseTeeListItem[], gender: "M" | "F"): CourseTeeListItem[] {
  return [...tees].sort((a, b) => {
    const left = gender === "F" ? womenTeeRating(a) : menTeeRating(a);
    const right = gender === "F" ? womenTeeRating(b) : menTeeRating(b);
    if (right !== left) {
      return right - left;
    }
    return a.teeName.localeCompare(b.teeName);
  });
}

function hasCompleteHoleSetup(tee: CourseTeeListItem): boolean {
  return tee.holeCount == null || tee.holeCount === 18;
}

function isMenTeeEligible(tee: CourseTeeListItem): boolean {
  return tee.courseRating != null && tee.slope != null && tee.parTotal != null && hasCompleteHoleSetup(tee);
}

function isWomenTeeEligible(tee: CourseTeeListItem): boolean {
  return tee.womenCourseRating != null && tee.womenSlope != null && tee.womenParTotal != null && hasCompleteHoleSetup(tee);
}

function sortRoundsByPlaySequence(rounds: TripPlannedRound[]): TripPlannedRound[] {
  return [...rounds].sort((a, b) => {
    const aDate = a.roundDate ?? "9999-12-31";
    const bDate = b.roundDate ?? "9999-12-31";
    if (aDate !== bDate) {
      return aDate.localeCompare(bDate);
    }
    return a.roundNumber - b.roundNumber;
  });
}

function snapshotRounds(rounds: TripPlannedRound[]): string {
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

function formatDisplayDate(value: string | null): string | null {
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

function formatTripDateRange(startDate: string | null, endDate: string | null): string {
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

function roundKey(round: TripPlannedRound): string {
  return round.roundId != null ? `id-${round.roundId}` : `number-${round.roundNumber}`;
}

function selectInitialExpandedRoundKey(
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

function compactInputStyle(width: string): CSSProperties {
  return {
    ...formInputStyle,
    width,
    maxWidth: width,
    boxSizing: "border-box",
  };
}

function compactSelectStyle(width: string): CSSProperties {
  return {
    ...formSelectStyle,
    width,
    maxWidth: width,
    boxSizing: "border-box",
  };
}

function teeSummary(label: string | null | undefined, fallback: string): string {
  if (!label || label.trim().length === 0) {
    return fallback;
  }
  return label;
}

function createBlankPlannedRound(roundNumber: number): TripPlannedRound {
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

function isConfiguredEnoughToWarnBeforeRemove(round: TripPlannedRound): boolean {
  return Boolean(
    round.roundDate ||
    round.format ||
    round.courseId != null ||
    round.defaultTeeId != null ||
    round.womenDefaultTeeId != null ||
    (round.events && round.events.length > 0),
  );
}

export default function TripRoundPlanningPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const numericTripId = Number(tripId);
  const requestedRoundNumber = Number(searchParams.get("round"));

  const [rounds, setRounds] = useState<TripPlannedRound[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [teeOptionsByCourseId, setTeeOptionsByCourseId] = useState<Record<number, CourseTeeListItem[]>>({});
  const [expandedRoundKey, setExpandedRoundKey] = useState<string | null>(null);

  const [tripName, setTripName] = useState<string | null>(null);
  const [tripInitialized, setTripInitialized] = useState(false);
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);
  const [tripEndDate, setTripEndDate] = useState<string | null>(null);
  const [plannedRoundCount, setPlannedRoundCount] = useState<number>(0);
  const [hasFemalePlayers, setHasFemalePlayers] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [pendingRemoveRoundKey, setPendingRemoveRoundKey] = useState<string | null>(null);
  const topAnchorRef = useRef<HTMLDivElement | null>(null);

  const isReadOnly = tripInitialized;
  const isBusy = saving;

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId, requestedRoundNumber]);

  const sortedRounds = useMemo(
    () => sortRoundsByPlaySequence(rounds),
    [rounds],
  );

  const pendingRemoveRound = useMemo(
    () => rounds.find((round) => roundKey(round) === pendingRemoveRoundKey) ?? null,
    [pendingRemoveRoundKey, rounds],
  );

  const comparableSnapshot = useMemo(() => snapshotRounds(rounds), [rounds]);

  const hasChanges =
    !loading &&
    !isReadOnly &&
    initialSnapshot.length > 0 &&
    comparableSnapshot !== initialSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  const multiRoundTournamentEnabled = useMemo(
    () => rounds.some((round) => round.includeInFourDayStandings),
    [rounds],
  );

  function scrollToTopMessageArea(): void {
    window.setTimeout(() => {
      topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const supportsMultiRoundTournament = useMemo(
    () => sortedRounds.length >= 2 || plannedRoundCount >= 2,
    [plannedRoundCount, sortedRounds.length],
  );

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [plannedRounds, courseData, tripDetail] = await Promise.all([
        getPlannedRounds(numericTripId),
        getCourses(),
        getTripDetail(numericTripId),
      ]);

      const sequencedRounds = sortRoundsByPlaySequence(plannedRounds);
      setRounds(sequencedRounds);
      setExpandedRoundKey(selectInitialExpandedRoundKey(sequencedRounds, requestedRoundNumber));
      setInitialSnapshot(snapshotRounds(sequencedRounds));
      setCourses(courseData);
      setTripName(tripDetail.tripName ?? null);
      setTripInitialized(tripDetail.initialized === true);
      setTripStartDate(tripDetail.tripStartDate ?? null);
      setTripEndDate(tripDetail.tripEndDate ?? null);
      setPlannedRoundCount(tripDetail.plannedRoundCount ?? plannedRounds.length);
      setHasFemalePlayers(tripDetail.hasFemalePlayers === true);

      const distinctCourseIds = Array.from(
        new Set(
          plannedRounds
            .map((round) => round.courseId)
            .filter((courseId): courseId is number => courseId != null),
        ),
      );
      await preloadTees(distinctCourseIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load planned rounds.");
    } finally {
      setLoading(false);
    }
  }

  async function preloadTees(courseIds: number[]): Promise<void> {
    if (courseIds.length === 0) {
      return;
    }

    const results = await Promise.all(
      courseIds.map(async (courseId) => {
        const tees = await getCourseTees(courseId);
        return { courseId, tees };
      }),
    );

    setTeeOptionsByCourseId((current) => {
      const next = { ...current };
      for (const result of results) {
        next[result.courseId] = result.tees;
      }
      return next;
    });
  }

  async function ensureTeesLoaded(courseId: number): Promise<void> {
    if (teeOptionsByCourseId[courseId]) {
      return;
    }

    const tees = await getCourseTees(courseId);
    setTeeOptionsByCourseId((current) => ({
      ...current,
      [courseId]: tees,
    }));
  }

  function updateRound(targetKey: string, updates: Partial<TripPlannedRound>): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) =>
        roundKey(round) === targetKey ? { ...round, ...updates } : round,
      ),
    );
  }

  function handleAddRound(): void {
    if (isReadOnly || isBusy) {
      return;
    }

    if (rounds.length >= MAX_PLANNED_ROUND_COUNT) {
      setError(`An event can have at most ${MAX_PLANNED_ROUND_COUNT} planned rounds.`);
      setMessage(null);
      scrollToTopMessageArea();
      return;
    }

    const nextRoundNumber =
      rounds.reduce((maxRoundNumber, round) => Math.max(maxRoundNumber, round.roundNumber ?? 0), 0) + 1;
    const nextRound = createBlankPlannedRound(nextRoundNumber);

    setRounds((current) => [...current, nextRound]);
    setPlannedRoundCount((current) => Math.max(current, rounds.length + 1));
    setExpandedRoundKey(roundKey(nextRound));
    setError(null);
    setMessage(null);
  }

  function removeRoundByKey(targetKey: string): void {
    const remainingRounds = sortRoundsByPlaySequence(rounds.filter((round) => roundKey(round) !== targetKey));
    setRounds(remainingRounds);
    setPlannedRoundCount(remainingRounds.length);
    setExpandedRoundKey(remainingRounds.length > 0 ? roundKey(remainingRounds[0]) : null);
    setPendingRemoveRoundKey(null);
    setError(null);
    setMessage(null);
  }

  function handleRemoveRound(targetKey: string): void {
    if (isReadOnly || isBusy) {
      return;
    }

    if (rounds.length <= 1) {
      setError("An event must have at least one planned round.");
      setMessage(null);
      scrollToTopMessageArea();
      return;
    }

    const targetRound = rounds.find((round) => roundKey(round) === targetKey);
    if (!targetRound) {
      return;
    }

    if (isConfiguredEnoughToWarnBeforeRemove(targetRound)) {
      setPendingRemoveRoundKey(targetKey);
      return;
    }

    removeRoundByKey(targetKey);
  }

  function confirmRemoveRound(): void {
    if (!pendingRemoveRoundKey || isReadOnly || isBusy) {
      setPendingRemoveRoundKey(null);
      return;
    }

    removeRoundByKey(pendingRemoveRoundKey);
  }

  function cancelRemoveRound(): void {
    setPendingRemoveRoundKey(null);
  }


  function updateRoundEvent(
    targetKey: string,
    eventIndex: number,
    updates: Partial<NonNullable<TripPlannedRound["events"]>[number]>,
  ): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const events = normalizeEvents(round).map((event, index) =>
          index === eventIndex ? { ...event, ...updates } : event,
        );

        return { ...round, events };
      }),
    );
  }

  function removeRoundEvent(targetKey: string, eventIndex: number): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const currentEvents = normalizeEvents(round);
        if (currentEvents.length <= 1) {
          return round;
        }

        const events = currentEvents
          .filter((_, index) => index !== eventIndex)
          .map((event, index) => ({ ...event, eventOrder: index + 1 }));

        return {
          ...round,
          format: events.some((event) => event.eventType.startsWith("TEAM_")) ? round.format : "STROKE_PLAY",
          events,
        };
      }),
    );
  }

  function moveRoundEvent(targetKey: string, eventIndex: number, direction: -1 | 1): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const events = normalizeEvents(round);
        const nextIndex = eventIndex + direction;
        if (nextIndex < 0 || nextIndex >= events.length) {
          return round;
        }

        const reordered = [...events];
        const [moved] = reordered.splice(eventIndex, 1);
        reordered.splice(nextIndex, 0, moved);

        return {
          ...round,
          events: reordered.map((event, index) => ({ ...event, eventOrder: index + 1 })),
        };
      }),
    );
  }

  async function handleCourseChange(targetKey: string, courseIdValue: string): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const courseId = courseIdValue ? Number(courseIdValue) : null;

    updateRound(targetKey, {
      courseId,
      defaultTeeId: null,
      defaultTeeName: null,
      womenDefaultTeeId: null,
      womenDefaultTeeName: null,
      standardTeeName: null,
    });

    if (courseId != null) {
      try {
        await ensureTeesLoaded(courseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course tees.");
      }
    }
  }

  function toggleIndividualEvent(targetKey: string, eventType: string, checked: boolean): void {
    if (isReadOnly) {
      return;
    }

    setRounds((current) =>
      current.map((round) => {
        if (roundKey(round) !== targetKey) {
          return round;
        }

        const currentEvents = normalizeEvents(round).filter(
          (event) => event.eventType !== eventType,
        );

        if (checked) {
          currentEvents.push({
            eventType,
            eventName: defaultEventName(eventType, null),
            eventOrder: currentEvents.length + 1,
            teamSize: null,
            handicapPercent: null,
          });
        }

        if (currentEvents.length === 0) {
          currentEvents.push({
            eventType: "INDIVIDUAL_LOW_NET",
            eventName: defaultEventName("INDIVIDUAL_LOW_NET", null),
            eventOrder: 1,
            teamSize: null,
            handicapPercent: null,
          });
        }

        const renumberedEvents = currentEvents.map((event, index) => ({
          ...event,
          eventOrder: index + 1,
        }));

        return {
          ...round,
          format: renumberedEvents.some((event) => event.eventType.startsWith("TEAM_"))
            ? round.format
            : "STROKE_PLAY",
          events: renumberedEvents,
        };
      }),
    );
  }

  function validate(): string | null {
    if (rounds.length === 0) {
      return "At least one planned round is required.";
    }

    if (rounds.length > MAX_PLANNED_ROUND_COUNT) {
      return `An event can have at most ${MAX_PLANNED_ROUND_COUNT} planned rounds.`;
    }

    const roundsInPlaySequence = sortRoundsByPlaySequence(rounds);
    for (let index = 0; index < roundsInPlaySequence.length; index += 1) {
      const displayRoundNumber = index + 1;
      const round = roundsInPlaySequence[index];

      if (!round.roundDate) {
        return `Round ${displayRoundNumber} must have a date.`;
      }

      if (tripStartDate && round.roundDate < tripStartDate) {
        return `Round ${displayRoundNumber} date must be on or after the event start date.`;
      }

      if (tripEndDate && round.roundDate > tripEndDate) {
        return `Round ${displayRoundNumber} date must be on or before the event end date.`;
      }

      if (!round.format) {
        return `Round ${displayRoundNumber} must have a format.`;
      }

      if (normalizeEvents(round).length === 0) {
        return `Round ${displayRoundNumber} must have at least one event.`;
      }

      if (round.courseId == null) {
        return `Round ${displayRoundNumber} must have a course.`;
      }

      if (round.defaultTeeId == null) {
        return `Round ${displayRoundNumber} must have a men's default tee.`;
      }

      if (hasFemalePlayers && round.womenDefaultTeeId == null) {
        return `Round ${displayRoundNumber} must have a women's default tee because this event has female players.`;
      }
    }

    if (multiRoundTournamentEnabled && rounds.length < 2) {
      return "A multi-round tournament requires at least two planned rounds.";
    }

    return null;
  }

  function buildSavePayload() {
    return {
      rounds: sortRoundsByPlaySequence(rounds).map((round, index) => ({
        roundNumber: index + 1,
        roundDate: round.roundDate,
        courseId: round.courseId,
        defaultTeeId: round.defaultTeeId,
        womenDefaultTeeId: round.womenDefaultTeeId ?? null,
        format: round.format,
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
    };
  }

  async function handleSave(): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      setMessage(null);
      scrollToTopMessageArea();
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedRounds = await savePlannedRounds(numericTripId, buildSavePayload());
      const sequencedRounds = sortRoundsByPlaySequence(savedRounds);
      setRounds(sequencedRounds);
      setPlannedRoundCount(sequencedRounds.length);
      setInitialSnapshot(snapshotRounds(sequencedRounds));
      setExpandedRoundKey((currentKey) => {
        if (currentKey && sequencedRounds.some((round) => roundKey(round) === currentKey)) {
          return currentKey;
        }
        return selectInitialExpandedRoundKey(sequencedRounds, requestedRoundNumber);
      });
      setMessage("Planned rounds saved. Round count and round numbers were updated from the current planning grid.");
      scrollToTopMessageArea();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to save planned rounds.",
      );
      setMessage(null);
      scrollToTopMessageArea();
    } finally {
      setSaving(false);
    }
  }


  async function handleTournamentSetupClick(): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(`/trips/${numericTripId}/tournament-setup`);
  }

  function renderActionButtons() {
    return (
      <>
        <TripDetailButton
          tripId={numericTripId}
          onBeforeNavigate={confirmIfNeeded}
        />
        {supportsMultiRoundTournament ? (
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void handleTournamentSetupClick()}
          >
            Tournament Setup
          </button>
        ) : null}
        {!isReadOnly ? (
          <button
            style={{
              ...primaryButtonStyle,
              ...(isBusy ? { opacity: 0.55, cursor: "not-allowed" } : {}),
            }}
            type="button"
            onClick={handleSave}
            disabled={isBusy}
          >
            {saving ? "Saving..." : "Save Planned Rounds"}
          </button>
        ) : null}
      </>
    );
  }

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading planned rounds...</div>;
  }

  return (
    <div ref={topAnchorRef} style={pageContainerMediumStyle}>
      <PageHeader
        title="Event Round Planning"
        subtitle={`${tripName ? `${tripName} — ` : ""}${
          isReadOnly
            ? "planned rounds are locked after event initialization."
            : "choose each round's date, game, course, and default tee."
        }`}
        actions={renderActionButtons()}
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {pendingRemoveRound ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-planned-round-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #d0d7de",
              borderRadius: "12px",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.22)",
              maxWidth: "520px",
              width: "100%",
              padding: "18px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div>
              <h3 id="remove-planned-round-title" style={{ margin: "0 0 6px" }}>
                Remove Planned Round?
              </h3>
              <div style={{ color: "#444", fontSize: "14px", lineHeight: 1.45 }}>
                Remove <strong>Round {pendingRemoveRound.roundNumber}</strong>? Any unsaved setup details for this round will be discarded.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={cancelRemoveRound}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  background: "#b42318",
                  borderColor: "#b42318",
                }}
                onClick={confirmRemoveRound}
                disabled={isBusy}
              >
                Remove Round
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {isReadOnly ? (
        <div
          style={{
            ...warningBoxStyle,
            background: "#eef5ff",
            border: "1px solid #bfd3f2",
            color: "#244a7c",
          }}
        >
          This trip has already been initialized. Planned rounds are read-only.
        </div>
      ) : null}

      <div style={{ ...sectionStyle, display: "grid", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Planned Rounds</h2>
            <div style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
              Add/remove rounds here, then choose each round's date, game, course, and default tees. Round numbers are assigned by date order when saved.
            </div>
          </div>

          <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
            <div style={{ color: "#555", fontSize: "14px", textAlign: "right" }}>
              <strong>{sortedRounds.length}</strong> rounds planned
              {plannedRoundCount > 0 && plannedRoundCount !== sortedRounds.length ? <> of <strong>{plannedRoundCount}</strong></> : null}
              <br />
              {formatTripDateRange(tripStartDate, tripEndDate)}
            </div>
            {!isReadOnly ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={handleAddRound}
                disabled={isBusy || sortedRounds.length >= MAX_PLANNED_ROUND_COUNT}
              >
                Add Round
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #d6e4ff",
            borderRadius: "10px",
            padding: "12px",
            background: "#f8fbff",
            color: "#23436c",
            fontSize: "13px",
            lineHeight: 1.45,
          }}
        >
          Round dates must fall inside the event start/end dates. Saving will update the event's planned round count to match this grid.
          <br />
          <strong>Scramble:</strong> select the Scramble team size here. Seeding method and source rounds are configured later on Group/Team Setup for the Scramble round.
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          {sortedRounds.map((round, index) => {
            const currentRoundKey = roundKey(round);
            const isExpanded = currentRoundKey === expandedRoundKey;
            const displayRoundNumber = index + 1;
            const teeOptions =
              round.courseId != null
                ? teeOptionsByCourseId[round.courseId] ?? []
                : [];
            const menTeeOptions = sortTeesByRatingDesc(teeOptions.filter(isMenTeeEligible), "M");
            const womenTeeOptions = sortTeesByRatingDesc(teeOptions.filter(isWomenTeeEligible), "F");
            const courseSummary = round.courseName ?? "Select course";
            const dateSummary = formatDisplayDate(round.roundDate) ?? "Select date";
            const menTeeSummary = teeSummary(round.defaultTeeName ?? round.standardTeeName, "Select men's tee");
            const womenTeeSummary = teeSummary(round.womenDefaultTeeName, "Select women's tee");

            return (
              <div
                key={currentRoundKey}
                style={{
                  border: "1px solid #d8dee4",
                  borderRadius: "12px",
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedRoundKey(isExpanded ? null : currentRoundKey)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "#fff",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "42px 150px minmax(280px, 1.5fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) minmax(140px, 0.7fr) 24px",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "999px",
                      background: round.format === "TEAM_SCRAMBLE" ? "#6f42c1" : "#198754",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    {displayRoundNumber}
                  </span>

                  <span>
                    <strong>{dateSummary}</strong>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Round {displayRoundNumber}</span>
                  </span>

                  <span style={{ color: round.courseName ? "#111827" : "#777" }}>
                    <strong>{courseSummary}</strong>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Course</span>
                  </span>

                  <span>
                    <span>{menTeeSummary}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Men's tee</span>
                  </span>

                  <span>
                    <span>{womenTeeSummary}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Women's tee</span>
                  </span>

                  <span>
                    <span>{eventSummary(round)}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Events</span>
                  </span>

                  <span style={{ textAlign: "right", fontSize: "18px" }}>{isExpanded ? "⌃" : "⌄"}</span>
                </button>

                {isExpanded ? (
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      padding: "14px",
                      display: "grid",
                      gap: "14px",
                      background: "#fcfcfc",
                    }}
                  >
                    {!isReadOnly ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() => handleRemoveRound(currentRoundKey)}
                          disabled={isBusy || sortedRounds.length <= 1}
                        >
                          Remove Round
                        </button>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "170px minmax(260px, 1.2fr) minmax(260px, 1fr) minmax(260px, 1fr)",
                        gap: "12px",
                        alignItems: "start",
                      }}
                    >
                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Date
                        <input
                          type="date"
                          value={round.roundDate ?? ""}
                          min={tripStartDate ?? undefined}
                          max={tripEndDate ?? undefined}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              roundDate: e.target.value || null,
                            })
                          }
                          style={{ ...formInputStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        />
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Course
                        <select
                          value={round.courseId ?? ""}
                          onChange={(e) => void handleCourseChange(currentRoundKey, e.target.value)}
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        >
                          <option value="">Select course</option>
                          {courses.map((course) => (
                            <option key={course.courseId} value={course.courseId}>
                              {formatCourseLabel(course)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Men's Default Tee
                        <select
                          value={round.defaultTeeId ?? ""}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              defaultTeeId: e.target.value ? Number(e.target.value) : null,
                              defaultTeeName: null,
                            })
                          }
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly || round.courseId == null}
                        >
                          <option value="">Select men's default tee</option>
                          {menTeeOptions.map((tee) => (
                            <option key={tee.courseTeeId} value={tee.courseTeeId}>
                              {formatMenTeeLabel(tee)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Women's Default Tee
                        <select
                          value={round.womenDefaultTeeId ?? ""}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              womenDefaultTeeId: e.target.value ? Number(e.target.value) : null,
                              womenDefaultTeeName: null,
                            })
                          }
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly || round.courseId == null}
                        >
                          <option value="">Select women's default tee</option>
                          {womenTeeOptions.map((tee) => (
                            <option key={tee.courseTeeId} value={tee.courseTeeId}>
                              {formatWomenTeeLabel(tee)}
                            </option>
                          ))}
                        </select>
                        <span style={{ color: "#667085", fontSize: "12px", fontWeight: 400 }}>
                          Used for female players added to this event.
                        </span>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Game
                        <select
                          value={primaryGameSelectValue(round)}
                          onChange={(e) => {
                            const nextOptionValue = e.target.value || null;
                            const nextFormat = optionValueToLegacyFormat(nextOptionValue);
                            const nextEventType = legacyFormatToPrimaryEventType(nextOptionValue);
                            const nextTeamSize = defaultTeamSizeForEventType(nextEventType, nextFormat === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : null);
                            updateRound(currentRoundKey, {
                              format: nextFormat,
                              scrambleTeamSize: nextFormat === "TEAM_SCRAMBLE" ? (round.scrambleTeamSize ?? 4) : 4,
                              events: nextOptionValue ? [{
                                eventType: nextEventType,
                                eventName: defaultEventName(nextEventType, nextTeamSize),
                                eventOrder: 1,
                                teamSize: nextTeamSize,
                                handicapPercent: null,
                              }] : [],
                            });
                          }}
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        >
                          <option value="">Select game</option>
                          {formatOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div style={{ display: "grid", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
                        Individual Events
                        <div style={{ display: "grid", gap: "6px", fontWeight: 400 }}>
                          {individualEventOptions.map((option) => (
                            <label key={option.value} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={hasEvent(round, option.value)}
                                onChange={(e) => toggleIndividualEvent(currentRoundKey, option.value, e.target.checked)}
                                disabled={isBusy || isReadOnly || round.format === "TEAM_SCRAMBLE"}
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                        <span style={{ color: "#667085", fontSize: "12px", fontWeight: 400 }}>
                          Individual side events can be added to scored individual/team rounds. Scramble rounds use team-only scoring.
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: "8px", gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "14px" }}>Event Configuration</div>
                            <div style={{ color: "#667085", fontSize: "12px" }}>
                              These are the scoring events configured for this round.
                            </div>
                          </div>
                        </div>

                        {normalizeEvents(round).map((event, eventIndex) => (
                          <div
                            key={`${event.eventType}-${eventIndex}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 260px) auto",
                              gap: "10px",
                              alignItems: "end",
                              padding: "10px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              background: "#ffffff",
                            }}
                          >
                            <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                              Display Name
                              <input
                                value={event.eventName ?? defaultEventName(event.eventType, event.teamSize)}
                                onChange={(e) => updateRoundEvent(currentRoundKey, eventIndex, { eventName: e.target.value })}
                                style={{ ...formInputStyle, width: "100%", boxSizing: "border-box" }}
                                disabled={isBusy || isReadOnly}
                              />
                            </label>

                            <div style={{ display: "grid", gap: "5px", fontSize: "12px", color: "#475467" }}>
                              <div style={{ fontWeight: 800, color: "#344054" }}>{defaultEventName(event.eventType, event.teamSize)}</div>
                              <div>{eventModeLabel(event.eventType)}</div>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {eventBadges(event).map((badge) => (
                                  <span
                                    key={badge}
                                    style={{
                                      padding: "2px 7px",
                                      borderRadius: "999px",
                                      background: "#f2f4f7",
                                      color: "#344054",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => moveRoundEvent(currentRoundKey, eventIndex, -1)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || eventIndex === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRoundEvent(currentRoundKey, eventIndex, 1)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || eventIndex === normalizeEvents(round).length - 1}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRoundEvent(currentRoundKey, eventIndex)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || normalizeEvents(round).length <= 1}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {round.format === "TEAM_SCRAMBLE" ? (
                        <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                          Scramble Size
                          <select
                            value={round.scrambleTeamSize ?? 4}
                            onChange={(e) =>
                              updateRound(currentRoundKey, {
                                scrambleTeamSize: Number(e.target.value),
                                events: [{
                                  eventType: "TEAM_SCRAMBLE",
                                  eventName: defaultEventName("TEAM_SCRAMBLE", Number(e.target.value)),
                                  eventOrder: 1,
                                  teamSize: Number(e.target.value),
                                  handicapPercent: null,
                                }],
                              })
                            }
                            style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                            disabled={isBusy || isReadOnly}
                          >
                            <option value={2}>2-person</option>
                            <option value={3}>3-person</option>
                            <option value={4}>4-person</option>
                          </select>
                        </label>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", color: "#666", fontSize: "13px" }}>
          Rounds are shown in the order they will be played. Saving renumbers them by date sequence.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            paddingTop: "8px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          {supportsMultiRoundTournament ? (
            <div style={{ color: "#666", fontSize: "13px" }}>
              Next step after saving: configure the multi-round tournament.
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: "13px" }}>
              Single-round event setup is complete after saving planned rounds.
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!isReadOnly ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={handleAddRound}
                disabled={isBusy || sortedRounds.length >= MAX_PLANNED_ROUND_COUNT}
              >
                Add Round
              </button>
            ) : null}
            {supportsMultiRoundTournament ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => void handleTournamentSetupClick()}
              >
                Tournament Setup
              </button>
            ) : null}
            {!isReadOnly ? (
              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  ...(isBusy ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                }}
                onClick={handleSave}
                disabled={isBusy}
              >
                {saving ? "Saving..." : "Save Planned Rounds"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
