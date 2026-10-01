import api from "./api";

export interface SaveTripPlayerFrozenIndexRequest {
  frozenHandicapIndex: number | null;
}

export async function saveTripPlayerFrozenIndex(
  tripId: number,
  playerId: number,
  frozenHandicapIndex: number | null,
): Promise<void> {
  const request: SaveTripPlayerFrozenIndexRequest = {
    frozenHandicapIndex,
  };

  await api.put(`/trips/${tripId}/players/${playerId}/frozen-index`, request);
}
