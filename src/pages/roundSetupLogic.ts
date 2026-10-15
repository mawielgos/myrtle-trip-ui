import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { RoundFormat, RoundSetupRequest } from "../types/round";
import type { TripListItem } from "../types/trip";

export type RoundSetupOption = { id: number; label: string };

export const roundFormatOptions: Array<{ value: RoundFormat; label: string }> = [
  { value: "MIDDLE_MAN", label: "4-Man Middle Man" },
  { value: "ONE_TWO_THREE", label: "4-Man 1-2-3" },
  { value: "TWO_MAN_LOW_NET", label: "2-Man Low Net" },
  { value: "THREE_LOW_NET", label: "4-Man 3 Low Net" },
  { value: "TEAM_SCRAMBLE", label: "Scramble" },
  { value: "STROKE_PLAY", label: "Stroke Play" },
];

export function toTripOptions(trips: TripListItem[]): RoundSetupOption[] {
  return trips.map((trip) => ({ id: trip.tripId, label: `${trip.tripName} (${trip.tripYear})` }));
}

function formatCourseRating(value: number | null | undefined): string {
  return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(1);
}

export function toCourseOptions(courses: CourseListItem[]): RoundSetupOption[] {
  return courses.map((course) => ({
    id: course.courseId,
    label: course.location ? `${course.courseName} — ${course.location}` : course.courseName,
  }));
}

export function toTeeOptions(tees: CourseTeeListItem[]): RoundSetupOption[] {
  return tees.map((tee) => ({
    id: tee.courseTeeId,
    label: tee.courseRating != null && tee.slope != null
      ? `${tee.teeName} ${tee.yardageTotal ? `- ${tee.yardageTotal} yds ` : ""}(Rating ${formatCourseRating(tee.courseRating)} / Slope ${tee.slope}) ${tee.effectiveDate ? `eff. ${tee.effectiveDate}` : ""}`
      : tee.teeName,
  }));
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RoundSetupFields = {
  selectedTripId: string;
  selectedCourseId: string;
  selectedDefaultCourseTeeId: string;
  roundDate: string;
  format: RoundFormat;
  handicapPercent: string;
};

export function roundSetupSnapshot(fields: RoundSetupFields): string {
  return JSON.stringify(fields);
}

export function initialRoundSetupFields(selectedTripId: string): RoundSetupFields {
  return {
    selectedTripId,
    selectedCourseId: "",
    selectedDefaultCourseTeeId: "",
    roundDate: todayIsoDate(),
    format: "MIDDLE_MAN",
    handicapPercent: "100",
  };
}

export function normalizeHandicapPercent(handicapPercent: string): number {
  const value = Number(handicapPercent);
  return Number.isFinite(value) ? value : NaN;
}

export function validateRoundSetup(fields: RoundSetupFields): string | null {
  if (!fields.selectedTripId) return "Event is required.";
  if (!fields.selectedCourseId) return "Course is required.";
  if (!fields.selectedDefaultCourseTeeId) return "Default tee is required.";
  if (!fields.roundDate) return "Round date is required.";
  if (!fields.format) return "Format is required.";
  const handicapPercent = normalizeHandicapPercent(fields.handicapPercent);
  if (!Number.isInteger(handicapPercent)) return "Handicap percent must be a whole number.";
  if (handicapPercent < 0 || handicapPercent > 100) return "Handicap percent must be between 0 and 100.";
  return null;
}

export function buildRoundSetupRequest(fields: RoundSetupFields): RoundSetupRequest {
  return {
    tripId: Number(fields.selectedTripId),
    courseId: Number(fields.selectedCourseId),
    defaultCourseTeeId: Number(fields.selectedDefaultCourseTeeId),
    roundDate: fields.roundDate,
    format: fields.format,
    handicapPercent: normalizeHandicapPercent(fields.handicapPercent),
  };
}
