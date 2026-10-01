export interface ManualScoreHistoryEntry {
  scoreHistoryEntryId: number;
  playerId: number;
  playerName: string;
  scoreDate: string;
  courseName: string | null;
  courseRating: number;
  slope: number;
  grossScore: number;
  adjustedGrossScore: number;
  differential: number;
  includedInMyrtleCalc: boolean;
  holesPlayed: number;
  postingOrder?: number | null;
}

export interface SaveManualScoreHistoryEntryRequest {
  playerId: number;
  scoreDate: string;
  courseName: string;
  courseRating: number;
  slope: number;
  grossScore: number;
  adjustedGrossScore?: number | null;
  differential?: number | null;
  includedInMyrtleCalc: boolean;
  holesPlayed: number;
  postingOrder?: number | null;
}


export interface DbScoreHistoryImportCandidate {
  sourceScoreHistoryEntryId: number;
  playerId: number;
  playerName: string;
  sourceTripId: number | null;
  sourceTripName: string | null;
  sourceTripCode: string | null;
  sourceRoundNumber: number | null;
  scoreDate: string;
  courseName: string | null;
  courseRating: number;
  slope: number;
  grossScore: number;
  adjustedGrossScore: number;
  differential: number;
  includedInMyrtleCalc: boolean;
  holesPlayed: number;
}
