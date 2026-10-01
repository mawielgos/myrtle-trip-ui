import api from "./api";
import type {
  BulkScoreEntryRequest,
  RoundGameResult,
  RoundReadinessResponse,
  RoundScorecardSummary,
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundSetupRequest,
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

export async function getRoundReadiness(
  roundId: number
): Promise<RoundReadinessResponse> {
  const response = await api.get<RoundReadinessResponse>(
    `/rounds/${roundId}/readiness`
  );
  return response.data;
}

export async function getRoundScorecards(
  roundId: number
): Promise<RoundScorecardSummary[]> {
  const response = await api.get<RoundScorecardSummary[]>(
    `/rounds/${roundId}/scorecards`
  );
  return response.data;
}

export async function getScorecardDetail(
  scorecardId: number
): Promise<ScorecardDetail> {
  const response = await api.get<ScorecardDetail>(`/scorecards/${scorecardId}`);
  return response.data;
}

export async function setAlternateTee(
  scorecardId: number,
  useAlternateTee: boolean
): Promise<void> {
  await api.put(`/scorecards/${scorecardId}/alternate-tee`, {
    useAlternateTee,
  });
}

export async function saveBulkScores(
  roundId: number,
  payload: BulkScoreEntryRequest
): Promise<void> {
  await api.put(`/rounds/${roundId}/scores/bulk`, payload);
}

export async function finalizeRound(roundId: number): Promise<void> {
  await api.post(`/rounds/${roundId}/finalize`);
}

export async function getRoundTeamAssignmentPage(
  roundId: number
): Promise<RoundTeamAssignmentPageResponse> {
  const response = await api.get<RoundTeamAssignmentPageResponse>(
    `/rounds/${roundId}/team-assignment`
  );
  return response.data;
}

export async function getRoundTeams(roundId: number): Promise<RoundTeam[]> {
  const response = await api.get<RoundTeam[]>(`/rounds/${roundId}/teams`);
  return response.data;
}

export async function saveRoundTeams(
  roundId: number,
  payload: SaveRoundTeamsRequest
): Promise<void> {
  await api.put(`/rounds/${roundId}/teams`, payload);
}

export async function getRoundGameResults(
  roundId: number
): Promise<RoundGameResult> {
  const response = await api.get<RoundGameResult>(`/round-games/${roundId}`);
  return response.data;
}