import api from "./api";

export type RoundTeamExceptionType = "GHOST_PLAYER" | "EXTRA_SHOT_ROTATION";
export type RoundTeamExceptionSelectionMethod = "MANUAL" | "RANDOM";

export interface RoundTeamExceptionResponse {
  id: number;
  roundId: number;
  roundTeamId: number;
  teamNumber: number | null;
  teamName: string | null;
  exceptionType: RoundTeamExceptionType;
  ghostPlayerId: number | null;
  ghostPlayerName: string | null;
  ghostSourceTeamId: number | null;
  ghostSourceTeamNumber: number | null;
  ghostSourceTeamName: string | null;
  indexMin: number | null;
  indexMax: number | null;
  selectionMethod: RoundTeamExceptionSelectionMethod | null;
  rotationPattern: string | null;
  active: boolean;
  notes: string | null;
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

export async function getRoundTeamExceptions(roundId: number): Promise<RoundTeamExceptionPageResponse> {
  const response = await api.get<RoundTeamExceptionPageResponse>(`/rounds/${roundId}/team-exceptions`);
  return response.data;
}

export async function saveRoundTeamException(
  roundId: number,
  request: RoundTeamExceptionRequest,
): Promise<RoundTeamExceptionResponse> {
  const response = await api.post<RoundTeamExceptionResponse>(`/rounds/${roundId}/team-exceptions`, request);
  return response.data;
}

export async function deleteRoundTeamException(roundId: number, exceptionId: number): Promise<void> {
  await api.delete(`/rounds/${roundId}/team-exceptions/${exceptionId}`);
}
