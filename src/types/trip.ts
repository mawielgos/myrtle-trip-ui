export interface TripListItem {
  tripId: number;
  tripName: string;
  tripCode: string;
  tripYear: number;
  playerCount?: number;
  roundCount?: number;
}

export interface TripDetail {
  tripId: number;
  tripName: string;
  tripCode: string;
  tripYear: number;
  entryFee?: number | null;
  initialized?: boolean;
  status?: string | null;
}

export interface TripPlayer {
  playerId: number;
  displayName: string;
  handicapIndex?: number | null;
  active?: boolean;
}

export interface TripRoundListItem {
  roundId: number;
  roundNumber?: number | null;
  roundDate?: string | null;
  courseName?: string | null;
  teeName?: string | null;
  gameFormat?: string | null;
  finalized: boolean;
  needsGrouping: boolean;
  needsTeams: boolean;
  readyForScoring: boolean;
}

export interface TripSetupRequest {
  tripId?: number | null;
  name: string;
  tripYear: number;
  tripCode: string;
  entryFee?: number | null;
  playerIds: number[];
}

export interface TripPlannedRound {
  plannedRoundId: number;
  roundNumber: number;
  roundDate: string | null;
  courseId: number | null;
  standardTeeId: number | null;
  alternateTeeId: number | null;
  format: string | null;
}

export interface SaveTripPlannedRoundsRequest {
  rounds: TripPlannedRoundRequest[];
}

export interface TripPlannedRoundRequest {
  roundNumber: number;
  roundDate: string | null;
  courseId: number | null;
  standardTeeId: number | null;
  alternateTeeId: number | null;
  format: string | null;
}