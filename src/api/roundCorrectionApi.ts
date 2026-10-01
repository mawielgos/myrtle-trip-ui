import api from "./api";
import type {
  RoundCorrectionLog,
  RoundCorrectionRequest,
  RoundCorrectionResponse,
} from "../types/roundCorrection";

export async function saveRoundCorrections(
  roundId: number,
  request: RoundCorrectionRequest
): Promise<RoundCorrectionResponse> {
  const response = await api.put<RoundCorrectionResponse>(
    `/rounds/${roundId}/corrections`,
    request
  );
  return response.data;
}

export async function getRoundCorrections(
  roundId: number
): Promise<RoundCorrectionLog[]> {
  const response = await api.get<RoundCorrectionLog[]>(`/rounds/${roundId}/corrections`);
  return response.data;
}
