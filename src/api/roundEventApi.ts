import api from './api';
import type {
  RoundEventResponse,
  RoundEventsResultResponse,
  SaveRoundEventsRequest,
} from '../types/roundEvent';

export async function getRoundEvents(roundId: number): Promise<RoundEventResponse[]> {
  const response = await api.get<RoundEventResponse[]>(`/round-events/round/${roundId}`);
  return response.data;
}

export async function saveRoundEvents(
  roundId: number,
  request: SaveRoundEventsRequest,
): Promise<RoundEventResponse[]> {
  const response = await api.put<RoundEventResponse[]>(`/round-events/round/${roundId}`, request);
  return response.data;
}

export async function getRoundEventResults(roundId: number): Promise<RoundEventsResultResponse> {
  const response = await api.get<RoundEventsResultResponse>(`/round-events/round/${roundId}/results`);
  return response.data;
}
