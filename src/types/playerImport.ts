export type ImportMatchStatus =
  | "MATCHED_BY_GHIN"
  | "MATCHED_BY_EMAIL"
  | "POSSIBLE_DUPLICATE"
  | "NEW_PLAYER"
  | "ALREADY_IN_TRIP"
  | "INVALID";

export interface PlayerImportRow {
  rowNumber: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  ghinNumber: string | null;
  gender: string | null;
  handicapIndex: number | null;
  matchStatus: ImportMatchStatus;
  matchedPlayerId: number | null;
  matchedPlayerName: string | null;
  alreadyInTrip: boolean | null;
  validationMessage: string | null;
}

export interface PlayerImportCommitRequest {
  rows: PlayerImportRow[];
}
