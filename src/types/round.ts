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
  tripIndex?: number | null;
  handicapAsOfDate?: string | null;
  handicapMethod?: string | null;
  handicapLabel?: string | null;
  gender?: string | null;
  roundTeeId?: number | null;
  roundTeeName?: string | null;
  courseHandicap: number | null;
  playingHandicap: number | null;
  teamId?: number | null;
  teamName?: string | null;
  teamNumber?: number | null;
  playerOrder?: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
  teamId?: number | null;
  teamName?: string | null;
  teamNumber?: number | null;
  playerOrder?: number | null;
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  withdrawalHoleNumber?: number | null;
}

export interface RoundCapabilities {
  roundId?: number | null;
  tripId?: number | null;
  tripComplete?: boolean | null;
  tripCorrectionMode?: boolean | null;
  tripLocked?: boolean | null;
  roundFinalized?: boolean | null;

  canAssignTeams?: boolean | null;
  assignTeamsReason?: string | null;

  canChangeTeeBeforeFinalization?: boolean | null;
  changeTeeBeforeFinalizationReason?: string | null;

  canCorrectTeeAfterFinalization?: boolean | null;
  correctTeeAfterFinalizationReason?: string | null;

  readinessReadyForScoring?: boolean | null;
  readinessReason?: string | null;

  canSaveScores?: boolean | null;
  saveScoresReason?: string | null;

  canEditCorrections?: boolean | null;
  editCorrectionsReason?: string | null;

  canEditScrambleSetup?: boolean | null;
  editScrambleSetupReason?: string | null;

  canViewScoring?: boolean | null;
  viewScoringReason?: string | null;

  canViewResults?: boolean | null;
  viewResultsReason?: string | null;
}

export interface RoundStatus {
  roundId: number;
  roundNumber?: number | null;
  tripId?: number;
  courseName: string;
  teeName: string;
  roundDate: string;
  format?: string | null;
  scrambleTeamSize?: number | null;
  scrambleScoreEntryMode?: ScrambleScoreEntryMode | null;
  finalized: boolean;
  tripStatus?: string | null;
  tripCorrectionMode?: boolean | null;
  tripLocked?: boolean | null;
  editable?: boolean | null;
  capabilities?: RoundCapabilities | null;
  players?: RoundPlayerStatusResponse[];
}

export interface RoundScorecardSummary {
  scorecardId: number;
  playerId: number;
  playerName: string;
  tripIndex?: number | null;
  handicapAsOfDate?: string | null;
  handicapMethod?: string | null;
  handicapLabel?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  teamNumber?: number | null;
  playerOrder?: number | null;
  teeName?: string | null;
  currentTeeName?: string | null;
  roundTeeId?: number | null;
  roundTeeName?: string | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  withdrawalHoleNumber?: number | null;
}

export type HoleScoreDto = {
  holeNumber: number;
  strokes?: number | null;
  netStrokes?: number | null;
  adjustedStrokes?: number | null;
  par?: number | null;
  handicap?: number | null;
};

export interface ScorecardDetail {
  scorecardId: number;
  playerId: number;
  playerName: string;
  tripIndex?: number | null;
  handicapAsOfDate?: string | null;
  handicapMethod?: string | null;
  handicapLabel?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  teamNumber?: number | null;
  playerOrder?: number | null;
  teeName?: string | null;
  currentTeeName?: string | null;
  roundTeeId?: number | null;
  roundTeeName?: string | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  adjustedGrossScore?: number | null;
  netScore?: number | null;
  holes: HoleScoreDto[];
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  withdrawalHoleNumber?: number | null;
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
  defaultCourseTeeId: number;
  roundDate: string;
  format: RoundFormat;
  handicapPercent: number;
}

export interface RoundReadinessIssue {
  severity?: "ERROR" | "WARNING" | string | null;
  message: string;
}

export interface RoundReadinessResponse {
  roundId: number;
  groupsReady: boolean;
  teamsReady: boolean;
  teesReady: boolean;
  scorecardsReady: boolean;
  readyForScoring: boolean;
  readyForFinalization?: boolean | null;
  ready: boolean;
  hasTeamEvents?: boolean | null;
  hasIndividualEvents?: boolean | null;
  hasScrambleEvent?: boolean | null;
  hasTwoManLowNetEvent?: boolean | null;
  requiresTeams?: boolean | null;
  requiresNetScores?: boolean | null;
  requiresPlayerScorecards?: boolean | null;
  expectedTeamSize?: number | null;
  blockingIssues: string[];
  warnings: string[];
  issues?: RoundReadinessIssue[];
}

export interface RoundGroupPlayerResponse {
  playerId: number;
  playerName: string;
  seatOrder: number | null;
}

export interface RoundGroupResponse {
  groupId: number;
  groupNumber: number;
  teeTime?: string | null;
  startingHole?: number | null;
  players: RoundGroupPlayerResponse[];
}

export interface RoundGroupPageResponse {
  roundId: number;
  groups: RoundGroupResponse[];
}

export interface RoundGroupSaveItemRequest {
  scorecardId: number;
  playerId: number;
  groupNumber: number;
  seatOrder: number;
  roundTeeId?: number | null;
}

export interface RoundGroupTeeTimeRequest {
  groupNumber: number;
  teeTime?: string | null;
  startingHole?: number | null;
}

export interface RoundGroupSaveRequest {
  assignments: RoundGroupSaveItemRequest[];
  groupTeeTimes?: RoundGroupTeeTimeRequest[];
}

export interface RoundTeeOption {
  roundTeeId: number;
  sourceCourseTeeId?: number | null;
  teeName: string;

  displayName: string;
  displayNameForMen?: string | null;
  displayNameForWomen?: string | null;

  eligibleForMen?: boolean | null;
  eligibleForWomen?: boolean | null;

  menCourseRating?: number | null;
  menSlope?: number | null;
  menParTotal?: number | null;

  womenCourseRating?: number | null;
  womenSlope?: number | null;
  womenParTotal?: number | null;
}

export interface RoundTeamPlayer {
  scorecardId: number;
  playerId: number;
  playerName: string;
  playerOrder?: number | null;
  tripIndex?: number | null;
  gender?: string | null;

  roundTeeId?: number | null;
  roundTeeName?: string | null;
  teeOverride?: boolean | null;
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  withdrawalHoleNumber?: number | null;

}

export interface RoundTeam {
  roundTeamId: number;
  teamNumber?: number | null;
  teamName: string;
  players: RoundTeamPlayer[];
}

export interface RoundScrambleSeedingRound {
  plannedRoundId: number;
  roundNumber?: number | null;
  roundDate?: string | null;
  format?: string | null;
  courseName?: string | null;
  included?: boolean | null;
  eligible?: boolean | null;
}

export type ScrambleSeedingMethod = "CURRENT_HANDICAP_INDEX" | "AVERAGE_GROSS_SCORE" | "AVERAGE_NET_SCORE";

export interface RoundTeamAssignmentPageResponse {
  roundId: number;
  defaultRoundTeeId?: number | null;
  scrambleTeamSize?: number | null;
  scrambleSeedingMethod?: ScrambleSeedingMethod | string | null;
  scrambleHandicapDate?: string | null;
  seedingAsOfDate?: string | null;
  seedingLabel?: string | null;
  scrambleSeedingRounds?: RoundScrambleSeedingRound[];
  teeOptions: RoundTeeOption[];
  teams: RoundTeam[];
  unassignedPlayers: RoundTeamPlayer[];
  inactivePlayers?: RoundTeamPlayer[];
  capabilities?: RoundCapabilities | null;
}

export interface SaveRoundTeamPlayerRequest {
  scorecardId: number;
  playerId: number;
  playerOrder: number;
  roundTeeId?: number | null;
}

export interface SaveRoundTeamRequest {
  teamNumber: number;
  teamName: string;
  players: SaveRoundTeamPlayerRequest[];
}

export interface SaveRoundTeamsRequest {
  teams: SaveRoundTeamRequest[];
}


export type RoundTeamExceptionType = "GHOST_PLAYER" | "EXTRA_SHOT_ROTATION";
export type RoundTeamExceptionSelectionMethod = "MANUAL" | "RANDOM";

export interface RoundTeamExceptionResponse {
  id: number;
  roundId: number;
  roundTeamId: number;
  teamNumber?: number | null;
  teamName?: string | null;
  exceptionType: RoundTeamExceptionType;
  ghostPlayerId?: number | null;
  ghostPlayerName?: string | null;
  ghostSourceTeamId?: number | null;
  ghostSourceTeamNumber?: number | null;
  ghostSourceTeamName?: string | null;
  indexMin?: number | null;
  indexMax?: number | null;
  selectionMethod?: RoundTeamExceptionSelectionMethod | null;
  rotationPattern?: string | null;
  active?: boolean | null;
  notes?: string | null;
}

export interface RoundTeamExceptionPageResponse {
  roundId: number;
  exceptions: RoundTeamExceptionResponse[];
}

export interface RoundTeamExceptionRequest {
  id?: number | null;
  roundTeamId: number;
  exceptionType: RoundTeamExceptionType;
  ghostPlayerId?: number | null;
  indexMin?: number | null;
  indexMax?: number | null;
  selectionMethod?: RoundTeamExceptionSelectionMethod | null;
  rotationPattern?: string | null;
  active?: boolean | null;
  notes?: string | null;
}

export interface SaveRoundScrambleSeedingRequest {
  includedPlannedRoundIds: number[];
  seedingMethod?: ScrambleSeedingMethod | string | null;
  scrambleTeamSize?: number | null;
  scrambleHandicapDate?: string | null;
}

export interface RoundTeeCorrectionRequest {
  scorecardId: number;
  roundTeeId: number;
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

export interface PlayerRoundResult {
  playerId: number;
  playerName: string;
  grossScore: number;
  netScore: number;
  points: number;
  holes?: HoleGameResult[];
}

export interface TeamRoundResult {
  teamId: number;
  teamName: string;
  grossScore: number;
  netScore: number;
  points: number;
  players?: PlayerRoundResult[];
}


export interface TeamGameResult {
  teamId: number;
  teamName: string;
  placement?: number | null;
  totalGross?: number | null;
  totalNet?: number | null;
  totalPoints?: number | null;
  holeResults: HoleGameResult[];
}

export interface RoundGameResult {
  roundId: number;
  format: string;
  teams: TeamGameResult[];
}

export interface RoundResultsResponse {
  roundId: number;
  roundName?: string;
  format: RoundFormat;
  teams: TeamRoundResult[];
  players: PlayerRoundResult[];
}

export type ScrambleScoreEntryMode = "TOTAL" | "HOLES";

export interface RoundScrambleTeamScoreResponse {
  roundTeamId: number;
  teamNumber?: number | null;
  teamName: string;
  totalScore?: number | null;
  holes?: Array<number | null>;
}

export interface SaveRoundScrambleTeamScoreRequest {
  roundTeamId: number;
  totalScore?: number | null;
  holes?: Array<number | null>;
}

export interface SaveRoundScrambleScoresRequest {
  entryMode?: ScrambleScoreEntryMode | null;
  teams: SaveRoundScrambleTeamScoreRequest[];
}

export interface RoundScrambleScoreResponse {
  roundId: number;
  entryMode?: ScrambleScoreEntryMode | null;
  teams: RoundScrambleTeamScoreResponse[];
}
