import api from "./api";
import type {
  RoundGroupPageResponse,
  RoundGroupSaveRequest,
} from "../types/round";

export async function getRoundGroups(
  roundId: number
): Promise<RoundGroupPageResponse> {
  const response = await api.get<RoundGroupPageResponse>(
    `/rounds/${roundId}/groups`
  );
  return response.data;
}

export async function saveRoundGroups(
  roundId: number,
  payload: RoundGroupSaveRequest
): Promise<RoundGroupPageResponse> {
  const response = await api.put<RoundGroupPageResponse>(
    `/rounds/${roundId}/groups`,
    payload
  );
  return response.data;
}