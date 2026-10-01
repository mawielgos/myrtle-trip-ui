import api from "./api";
import type {
  BulkScoreEntryRequest,
  RoundGameResult,
  RoundReadinessResponse,
  RoundScorecardSummary,
  RoundCapabilities,
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeeCorrectionRequest,
  RoundSetupRequest,
  RoundScrambleScoreResponse,
  RoundTeamExceptionPageResponse,
  RoundTeamExceptionRequest,
  RoundTeamExceptionResponse,
  SaveRoundScrambleScoresRequest,
  SaveRoundScrambleSeedingRequest,
  SaveRoundTeamsRequest,
  ScorecardDetail,
} from "../types/round";

export async function startRound(payload: RoundSetupRequest): Promise<number> {
  const response = await api.post<number>("/rounds", payload);
  return response.data;
}

export async function getRoundStatus(roundId: number): Promise<RoundStatus> {
  const response = await api.get<RoundStatus>(`/rounds/${roundId}/status`);
  return response.data;
}

export async function getRoundCapabilities(
  roundId: number,
): Promise<RoundCapabilities> {
  const response = await api.get<RoundCapabilities>(
    `/rounds/${roundId}/capabilities`,
  );
  return response.data;
}

export async function getRoundReadiness(
  roundId: number,
): Promise<RoundReadinessResponse> {
  const response = await api.get<RoundReadinessResponse>(
    `/rounds/${roundId}/readiness`,
  );
  return response.data;
}

export async function getRoundScorecards(
  roundId: number,
): Promise<RoundScorecardSummary[]> {
  const response = await api.get<RoundScorecardSummary[]>(
    `/rounds/${roundId}/scorecards`,
  );
  return response.data;
}

export async function getScorecardDetail(
  scorecardId: number,
): Promise<ScorecardDetail> {
  const response = await api.get<ScorecardDetail>(`/scorecards/${scorecardId}`);
  return response.data;
}

export async function setScorecardTee(
  scorecardId: number,
  roundTeeId: number,
): Promise<void> {
  await api.put(`/scorecards/${scorecardId}/tee`, { roundTeeId });
}

export async function setScorecardParticipation(
  scorecardId: number,
  participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN",
  withdrawalHoleNumber?: number | null,
): Promise<void> {
  await api.patch(`/scorecards/${scorecardId}/participation`, {
    participationStatus,
    withdrawalHoleNumber,
  });
}

export async function saveBulkScores(
  roundId: number,
  payload: BulkScoreEntryRequest,
): Promise<void> {
  await api.put(`/rounds/${roundId}/scores/bulk`, payload);
}

export async function finalizeRound(roundId: number): Promise<void> {
  await api.post(`/rounds/${roundId}/finalize`);
}

export async function refreshRoundHandicaps(roundId: number): Promise<void> {
  await api.post(`/rounds/${roundId}/refresh-handicaps`);
}

export async function getRoundTeamAssignmentPage(
  roundId: number,
): Promise<RoundTeamAssignmentPageResponse> {
  const response = await api.get<RoundTeamAssignmentPageResponse>(
    `/rounds/${roundId}/team-assignment`,
  );
  return response.data;
}

export async function updateRoundScorecardParticipation(
  roundId: number,
  scorecardId: number,
  participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN",
  withdrawalHoleNumber?: number | null,
): Promise<RoundTeamAssignmentPageResponse> {
  const response = await api.patch<RoundTeamAssignmentPageResponse>(
    `/rounds/${roundId}/team-assignment/scorecards/${scorecardId}/participation`,
    { participationStatus, withdrawalHoleNumber },
  );
  return response.data;
}

export async function getRoundTeams(roundId: number): Promise<RoundTeam[]> {
  const response = await api.get<RoundTeam[]>(`/rounds/${roundId}/teams`);
  return response.data;
}

export async function saveRoundTeams(
  roundId: number,
  payload: SaveRoundTeamsRequest,
): Promise<void> {
  await api.put(`/rounds/${roundId}/teams`, payload);
}

export async function saveRoundScrambleSeeding(
  roundId: number,
  payload: SaveRoundScrambleSeedingRequest,
): Promise<RoundTeamAssignmentPageResponse> {
  const response = await api.put<RoundTeamAssignmentPageResponse>(
    `/rounds/${roundId}/team-assignment/scramble-seeding`,
    payload,
  );
  return response.data;
}

export async function saveRoundTeeCorrections(
  roundId: number,
  payload: RoundTeeCorrectionRequest[],
): Promise<void> {
  await api.put(`/rounds/${roundId}/tee-corrections`, payload);
}

export async function getRoundGameResults(
  roundId: number,
): Promise<RoundGameResult> {
  const response = await api.get<RoundGameResult>(`/round-games/${roundId}`);
  return response.data;
}
export async function getRoundScrambleScores(
  roundId: number,
): Promise<RoundScrambleScoreResponse> {
  const response = await api.get<RoundScrambleScoreResponse>(
    `/rounds/${roundId}/scramble-scores`,
  );
  return response.data;
}

export async function saveRoundScrambleScores(
  roundId: number,
  payload: SaveRoundScrambleScoresRequest,
): Promise<void> {
  await api.put(`/rounds/${roundId}/scramble-scores`, payload);
}

export async function getRoundTeamExceptions(
  roundId: number,
): Promise<RoundTeamExceptionPageResponse> {
  const response = await api.get<RoundTeamExceptionPageResponse>(
    `/rounds/${roundId}/team-exceptions`,
  );
  return response.data;
}

export async function saveRoundTeamException(
  roundId: number,
  payload: RoundTeamExceptionRequest,
): Promise<RoundTeamExceptionResponse> {
  const response = await api.post<RoundTeamExceptionResponse>(
    `/rounds/${roundId}/team-exceptions`,
    payload,
  );
  return response.data;
}

export async function deleteRoundTeamException(
  roundId: number,
  exceptionId: number,
): Promise<void> {
  await api.delete(`/rounds/${roundId}/team-exceptions/${exceptionId}`);
}
