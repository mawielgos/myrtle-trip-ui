export type RoundCorrectionLog = {
  id: number;
  roundId: number;
  playerId?: number | null;
  playerName?: string | null;
  correctionType: "SCORE_CHANGE" | "TEE_CHANGE" | "HANDICAP_REFRESH" | "PARTICIPATION_CHANGE" | string;
  previousValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type RoundCorrectionRequest = {
  playerCorrections?: Array<{
    playerId: number;
    holes: Array<number | null>;
  }>;
  teeCorrections?: Array<{
    scorecardId: number;
    roundTeeId?: number | null;
  }>;
  participationCorrections?: Array<{
    scorecardId: number;
    participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string;
    withdrawalHoleNumber?: number | null;
  }>;
  refreshHandicaps?: boolean;
};

export type RoundCorrectionResponse = {
  success: boolean;
  message: string;
};
