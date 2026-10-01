import api from "./api";
import type { RoundSetupStatusResponse } from "../types/round";

export async function getRoundSetupStatus(
  roundId: number
): Promise<RoundSetupStatusResponse> {
  const response = await api.get<RoundSetupStatusResponse>(
    `/rounds/${roundId}/setup-status`
  );
  return response.data;
}