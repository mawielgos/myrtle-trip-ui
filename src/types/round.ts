export interface TripRoundSummary {
  id: number;
  roundDate: string;
  format: string;
  courseName: string;
  teeName: string;
  finalized: boolean;
}

export interface RoundPlayerStatusResponse {
  scorecardId: number;
  playerId: number;
  playerName: string;
  useAlternateTee?: boolean;
  courseHandicap: number | null;
  playingHandicap: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
  teamId?: number | null;
  teamName?: string | null;
}

export interface RoundStatus {
  roundId: number;
  courseName: string;
  teeName: string;
  alternateTeeName?: string | null;
  roundDate: string;
  format?: string | null;
  finalized: boolean;
  players?: RoundPlayerStatusResponse[];
}

export interface RoundScorecardSummary {
  scorecardId: number;
  playerId: number;
  playerName: string;
  teamId?: number | null;
  teamName?: string | null;
  useAlternateTee: boolean;
  teeName?: string | null;
  alternateTeeName?: string | null;
  currentTeeName?: string | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
}

export interface HoleScoreDto {
  holeNumber: number;
  strokes?: number | null;
  adjustedStrokes?: number | null;
  netStrokes?: number | null;
}

export interface ScorecardDetail {
  scorecardId: number;
  playerId: number;
  playerName: string;
  teamId?: number | null;
  teamName?: string | null;
  useAlternateTee: boolean;
  teeName?: string | null;
  alternateTeeName?: string | null;
  currentTeeName?: string | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
  holes: HoleScoreDto[];
}

export interface BulkScoreEntryRequest {
  scorecards: Array<{
    playerId: number;
    holes: Array<number | null>;
  }>;
}

export type RoundFormat =
  | "MIDDLE_MAN"
  | "ONE_TWO_THREE"
  | "TWO_MAN_LOW_NET"
  | "THREE_LOW_NET"
  | "TEAM_SCRAMBLE"
  | "STROKE_PLAY";

export interface RoundSetupRequest {
  tripId: number;
  courseId: number;
  standardCourseTeeId: number;
  alternateCourseTeeId: number | null;
  roundDate: string;
  format: RoundFormat;
  handicapPercent: number;
}

export interface RoundReadinessResponse {
  roundId: number;
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface RoundGroupPlayerResponse {
  playerId: number;
  playerName: string;
  seatOrder: number | null;
}

export interface RoundGroupResponse {
  groupId: number;
  groupNumber: number;
  players: RoundGroupPlayerResponse[];
}

export interface RoundGroupPageResponse {
  roundId: number;
  groups: RoundGroupResponse[];
}

export interface RoundGroupSaveItemRequest {
  playerId: number;
  groupNumber: number;
  seatOrder: number;
}

export interface RoundGroupSaveRequest {
  assignments: RoundGroupSaveItemRequest[];
}

export interface RoundTeamPlayer {
  scorecardId: number;
  playerId: number;
  playerName: string;
  playerOrder?: number | null;
  useAlternateTee?: boolean;
}

export interface RoundTeam {
  roundTeamId: number;
  teamNumber?: number | null;
  teamName: string;
  players: RoundTeamPlayer[];
}

export interface RoundTeamAssignmentPageResponse {
  roundId: number;
  teams: RoundTeam[];
  unassignedPlayers: RoundTeamPlayer[];
}

export interface SaveRoundTeamPlayerRequest {
  scorecardId: number;
  playerId: number;
  playerOrder: number;
  useAlternateTee: boolean;
}

export interface SaveRoundTeamRequest {
  teamNumber: number;
  teamName: string;
  players: SaveRoundTeamPlayerRequest[];
}

export interface SaveRoundTeamsRequest {
  teams: SaveRoundTeamRequest[];
}

export interface RoundSetupStatusResponse {
  roundId: number;
  round: RoundStatus;
  readiness: RoundReadinessResponse;
  groups: RoundGroupPageResponse;
  teamAssignment: RoundTeamAssignmentPageResponse;
}

export interface HoleGameResult {
  holeNumber: number;
  grossScore: number;
  netScore: number;
  points: number;
}

export interface TeamGameResult {
  teamId: number;
  teamName: string;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  placement?: number | null;
  holeResults: HoleGameResult[];
}

export interface RoundGameResult {
  roundId: number;
  format: string;
  teams: TeamGameResult[];
}
