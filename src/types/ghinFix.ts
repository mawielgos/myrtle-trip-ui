export interface GhinFixRow {
  scoreHistoryEntryId: number;
  playerId: number | null;
  playerName: string;
  ghinNumber: string | null;
  postingOrder: number | null;
  scoreType: string | null;
  holesPlayed: number | null;
  grossScore: number | null;
  courseRating: number | null;
  slope: number | null;
  differential: number | null;
  manualDifferentialRequired: boolean;
}