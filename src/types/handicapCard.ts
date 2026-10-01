export interface HandicapCardPlayerSummary {
  playerId: number;
  playerName: string;
  displayOrder: number | null;
  handicapMethod: string | null;
  tripIndex: number | null;
  statusCode: string | null;
  statusLabel: string | null;
  eligibleScoreCount: number | null;
  windowScoreCount: number | null;
  usedScoreCount: number | null;
}

export interface HandicapCardsResponse {
  tripId: number;
  tripName: string;
  tripCode: string | null;
  tripYear: number | null;
  asOfDate: string | null;
  players: HandicapCardPlayerSummary[];
}

export interface HandicapCardScore {
  scoreHistoryEntryId: number;
  displaySortOrder: number | null;
  scoreSection: string | null;
  pendingForCalculationDate: boolean | null;
  usedInPendingIndex: boolean | null;
  scoreDate: string | null;
  courseName: string | null;
  grossScore: number | null;
  adjustedGrossScore: number | null;
  courseRating: number | null;
  slope: number | null;
  differential: number | null;
  holesPlayed: number | null;
  sourceType: string | null;
  scoreType: string | null;
  postingOrder: number | null;
  manualDifferentialRequired: boolean | null;
  eligibleForWindow: boolean | null;
  usedInIndex: boolean | null;
  exclusionReason: string | null;
}

export interface HandicapCardDetailResponse {
  tripId: number;
  tripName: string;
  tripCode: string | null;
  tripYear: number | null;
  asOfDate: string | null;
  playerId: number;
  playerName: string;
  handicapMethod: string | null;
  tripIndex: number | null;
  pendingTripIndex: number | null;
  pendingIndexDelta?: number | null;
  pendingScoreCount: number | null;
  calculationLabel: string | null;
  pendingCalculationLabel: string | null;
  eligibleScoreCount: number | null;
  windowScoreCount: number | null;
  usedScoreCount: number | null;
  scores: HandicapCardScore[];
}
