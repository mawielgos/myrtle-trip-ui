
export interface ReadinessIssue {
  code: string;
  severity: "ERROR" | "WARNING" | string;
  area: string;
  message: string;
  actionLabel?: string | null;
  actionPath?: string | null;
}

export interface TripWorkflowReadiness {
  tripId: number;
  tripStatus: string | null;
  canStartTrip: boolean;
  canCompleteTrip: boolean;
  canEditTournament: boolean;
  canEditPrizeSetup: boolean;
  rosterReady: boolean;
  plannedRoundsReady: boolean;
  handicapIndexesReady: boolean;
  ghinFixesReady: boolean;
  roundsCreatedReady: boolean;
  allRoundsFinalizedReady: boolean;
  tournamentReady: boolean;
  prizeSetupReady: boolean;
  activePlayerCount: number;
  plannedRoundCount: number;
  completedPlannedRoundCount: number;
  roundCount: number;
  finalizedRoundCount: number;
  prizeScheduleCount: number;
  incompletePrizeScheduleCount: number;
  issues: ReadinessIssue[];
}

export interface TripListItem {
  tripId: number;
  tripName: string;
  tripCode: string;
  tripYear: number;
  playerCount: number;
  roundCount: number;
  plannedRoundCount: number;
  status?: string | null;
  correctionMode?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  canDelete?: boolean | null;
  archived?: boolean | null;
  canArchive?: boolean | null;
  canRestore?: boolean | null;
}

export interface CurrentRound {
  roundId: number;
  roundNumber: number;
  format: string | null;
  gameFormat?: string | null;
  courseName: string | null;
  teeName: string | null;
  finalized: boolean;
}

export interface TripReadiness {
  activePlayerCount: number;
  plannedRoundCount: number;
  completedPlannedRoundCount: number;
  unresolvedGhinFixCount: number;
  rosterReady: boolean;
  plannedRoundsReady: boolean;
  ghinFixesReady: boolean;
  handicapIndexesReady: boolean;
  canStartTrip: boolean;
  blockingItems: string[];
}

export interface TripDetail {
  tripId: number;
  tripName: string;
  tripCode: string;
  tripYear: number;
  entryFee: number | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  plannedRoundCount: number;
  handicapsEnabled: boolean;
  handicapMethod: string;
  initialized: boolean | null;
  status: string;
  correctionMode: boolean;
  archived: boolean;
  currentRound: CurrentRound | null;
  unresolvedGhinFixCount?: number | null;
  readiness: TripReadiness | null;
  hasFemalePlayers: boolean;
}

export interface TripPlayer {
  playerId: number;
  displayName: string;
  ghinNumber: string | null;
  handicapIndex: number | null;
  frozenHandicapIndex: number | null;
  active: boolean | null;
  ghinHistoryCount: number;
  dbScoreHistoryCount: number;
  tripScoreCount: number;
  usableHandicapIndex: boolean;
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  unavailableRoundCount?: number | null;
}

export interface TripRoundListItem {
  roundId: number;
  roundNumber: number | null;
  roundDate: string | null;
  courseName: string | null;
  teeName: string | null;
  gameFormat: string | null;
  events?: TripPlannedRoundEvent[];
  finalized: boolean;
}

export interface TripPlannedRoundEvent {
  id?: number | null;
  eventType: string;
  eventName?: string | null;
  eventOrder?: number | null;
  teamSize?: number | null;
  handicapPercent?: number | null;
  teamBased?: boolean | null;
  individualEvent?: boolean | null;
  usesHandicap?: boolean | null;
  payoutEligible?: boolean | null;
  tournamentEligible?: boolean | null;
  scoringModeLabel?: string | null;
  defaultEventName?: string | null;
}

export interface TripPlannedRound {
  roundId: number | null;
  roundNumber: number;
  roundDate: string | null;
  format: string | null;
  courseId: number | null;
  courseName: string | null;

  /** V1.1 source of truth for round planning tee selection. */
  defaultTeeId: number | null;
  defaultTeeName: string | null;
  womenDefaultTeeId: number | null;
  womenDefaultTeeName: string | null;
  standardTeeName?: string | null;

  includeInFourDayStandings: boolean;
  scrambleTeamSize?: number | null;
  events?: TripPlannedRoundEvent[];
  finalized: boolean;
}


export interface TripTournamentRound {
  plannedRoundId: number;
  roundNumber: number;
  roundDate: string | null;
  format: string | null;
  courseId: number | null;
  courseName: string | null;
  configured: boolean;
  included: boolean;
  sortOrder: number | null;
}

export interface TripTournamentSetup {
  tournamentId: number | null;
  tripId: number;
  enabled: boolean;
  name: string;
  standingsLabel: string;
  lowNetEnabled?: boolean | null;
  lowGrossEnabled?: boolean | null;
  lowNetName?: string | null;
  lowGrossName?: string | null;
  readOnly: boolean;
  rounds: TripTournamentRound[];
}

export interface SaveTripTournamentSetupRequest {
  enabled: boolean;
  name: string;
  standingsLabel: string;
  lowNetEnabled?: boolean | null;
  lowGrossEnabled?: boolean | null;
  lowNetName?: string | null;
  lowGrossName?: string | null;
  includedPlannedRoundIds: number[];
}

export interface TournamentStandingRound {
  roundId: number;
  roundNumber: number;
  label: string;
  score: number | null;
  toPar: number | null;
}

export interface TournamentStandingRow {
  playerId: number;
  tripNumber: number | null;
  position: number | null;
  playerName: string;
  totalScore: number;
  totalToPar: number | null;
  completedRounds: number;
  tournamentComplete: boolean;
  money: number | null;
  rounds: TournamentStandingRound[];
}

export interface TournamentStandings {
  tripId: number;
  tripName: string;
  tournamentName?: string | null;
  standingsLabel?: string | null;
  competitionType?: string | null;
  competitionLabel?: string | null;
  completedRounds: number;
  requiredRounds: number;
  leaderboardFinal: boolean;
  leaderboardParTotal: number;
  roundLabels: string[];
  rows: TournamentStandingRow[];
}
export interface PrizeSchedulePayout {
  payoutId: number | null;
  finishingPlace: number;
  amountPerPlayer: number;
}

export interface PrizeSchedule {
  scheduleId: number;
  tripId: number;
  roundId: number | null;
  roundNumber: number | null;
  gameKey: string;
  gameName: string;
  resultScope: "PLAYER" | "TEAM" | string;
  payoutUnit: "PLAYER" | "TEAM" | string;
  payouts: PrizeSchedulePayout[];
}

export interface SavePrizeSchedulePayout {
  finishingPlace: number;
  amountPerPlayer: number;
}

export interface SavePrizeSchedule {
  gameKey: string;
  gameName: string;
  resultScope: string;
  payoutUnit: string;
  payouts: SavePrizeSchedulePayout[];
}

export interface SaveTripPrizeSchedulesRequest {
  schedules: SavePrizeSchedule[];
}


export interface PrizeWinningResponse {
  winningId?: number | null;
  tripId?: number | null;
  gameKey: string;
  gameName: string;
  eventType?: string | null;
  roundId?: number | null;
  roundNumber?: number | null;
  playerId?: number | null;
  playerName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  finishingPlace?: number | null;
  sourceRank?: number | null;
  sourceName?: string | null;
  amount: number;
}

export interface PrizePlayerTotalResponse {
  playerId: number;
  playerName: string;
  totalAmount: number;
  paid?: boolean | null;
  paidAt?: string | null;
}

export interface PrizeRecalculationResponse {
  tripId: number;
  totalAmount?: number | null;
  winnings: PrizeWinningResponse[];
  playerTotals: PrizePlayerTotalResponse[];
}


export interface TripBillInventory {
  tripId: number;
  hundredsCount: number;
  fiftiesCount: number;
  twentiesCount: number;
  tensCount: number;
  fivesCount: number;
  onesCount: number;
}

export interface SaveTripBillInventoryRequest {
  tripId?: number | null;
  hundredsCount: number;
  fiftiesCount: number;
  twentiesCount: number;
  tensCount: number;
  fivesCount: number;
  onesCount: number;
}


// Backward-compatible aliases while pages are migrated to tournament naming.
export type FourDayStandingRound = TournamentStandingRound;
export type FourDayStandingRow = TournamentStandingRow;
export type FourDayStandings = TournamentStandings;
