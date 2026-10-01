export interface StrokesPerDayRound {
  roundId: number;
  roundNumber: number;
  roundDate: string | null;
  dayName: string | null;
  courseName: string | null;
  courseWebsiteUrl: string | null;
  standardTeeName: string | null;
  alternateTeeName: string | null;
  standardCourseRating: number | null;
  alternateCourseRating: number | null;
  standardSlope: number | null;
  alternateSlope: number | null;
  standardYardage: number | null;
  alternateYardage: number | null;
  statusCode: "PLANNING" | "IN_PROGRESS" | "FINALIZED" | string | null;
  statusLabel: string | null;
  teePlanningLocked: boolean | null;
}

export interface StrokesPerDayTeeOption {
  roundTeeId: number;
  sourceCourseTeeId: number | null;
  teeName: string | null;
  displayName: string | null;
  courseRating: number | null;
  slope: number | null;
  parTotal: number | null;
  yardage: number | null;
  courseHandicap: number | null;
  playingHandicap: number | null;
  selected: boolean | null;
}

export interface StrokesPerDayPlayerRound {
  roundId: number;
  roundNumber: number;
  tripIndex: number | null;

  // Legacy fields retained while the backend endpoint name is still /strokes-per-day.
  standardCourseHandicap: number | null;
  alternateCourseHandicap: number | null;
  standardTeeSelected: boolean | null;
  alternateTeeSelected: boolean | null;

  selectedRoundTeeId: number | null;
  selectedTeeName: string | null;
  selectedCourseRating: number | null;
  selectedSlope: number | null;
  selectedYardage: number | null;
  selectedCourseHandicap: number | null;
  selectedPlayingHandicap: number | null;
  eligibleTeeOptions: StrokesPerDayTeeOption[];
}

export interface StrokesPerDayPlayer {
  playerId: number;
  playerName: string;
  displayOrder: number | null;
  rounds: StrokesPerDayPlayerRound[];
}

export interface StrokesPerDayResponse {
  tripId: number;
  tripName: string;
  tripCode: string;
  tripYear: number;
  rounds: StrokesPerDayRound[];
  players: StrokesPerDayPlayer[];
}

export interface StrokesPerDayTeePlanItemRequest {
  playerId: number;
  roundId: number;
  roundTeeId: number;
}

export interface StrokesPerDayTeePlanSaveRequest {
  changes: StrokesPerDayTeePlanItemRequest[];
}
