import api from "./api";
import type {
  HandicapCardDetailResponse,
  HandicapCardsResponse,
} from "../types/handicapCard";

export async function getHandicapCards(
  tripId: number,
  asOfDate?: string | null,
): Promise<HandicapCardsResponse> {
  const response = await api.get<HandicapCardsResponse>(
    `/trips/${tripId}/handicap-cards`,
    {
      params: asOfDate ? { asOfDate } : undefined,
    },
  );
  return response.data;
}

export async function getHandicapCardDetail(
  tripId: number,
  playerId: number,
  asOfDate?: string | null,
): Promise<HandicapCardDetailResponse> {
  const response = await api.get<HandicapCardDetailResponse>(
    `/trips/${tripId}/handicap-cards/players/${playerId}`,
    {
      params: asOfDate ? { asOfDate } : undefined,
    },
  );
  return response.data;
}
