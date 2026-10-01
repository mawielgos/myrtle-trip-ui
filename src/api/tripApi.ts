import api from "./api";
import type {
  SaveTripPlannedRoundsRequest,
  TripDetail,
  TripListItem,
  TripPlannedRound,
  TripPlayer,
  TripRoundListItem,
  TripSetupRequest,
} from "../types/trip";

export async function getTrips(): Promise<TripListItem[]> {
  const response = await api.get<TripListItem[]>("/trips");
  return response.data;
}

export async function getTrip(tripId: number): Promise<TripDetail> {
  const response = await api.get<TripDetail>(`/trips/${tripId}`);
  return response.data;
}

export async function getTripPlayers(tripId: number): Promise<TripPlayer[]> {
  const response = await api.get<TripPlayer[]>(`/trips/${tripId}/players`);
  return response.data;
}

export async function getTripRounds(
  tripId: number
): Promise<TripRoundListItem[]> {
  const response = await api.get<TripRoundListItem[]>(
    `/trips/${tripId}/rounds`
  );
  return response.data;
}

export async function saveTripSetup(
  payload: TripSetupRequest
): Promise<number> {
  const response = await api.post<number>("/trips/setup", payload);
  return response.data;
}

export async function getPlannedRounds(
  tripId: number
): Promise<TripPlannedRound[]> {
  const response = await api.get<TripPlannedRound[]>(
    `/trips/${tripId}/planned-rounds`
  );
  return response.data;
}

export async function savePlannedRounds(
  tripId: number,
  payload: SaveTripPlannedRoundsRequest
): Promise<TripPlannedRound[]> {
  const response = await api.put<TripPlannedRound[]>(
    `/trips/${tripId}/planned-rounds`,
    payload
  );
  return response.data;
}

export async function initializeTrip(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/initialize`, {});
}