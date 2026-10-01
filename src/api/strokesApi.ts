import api from "./api";
import type {
  StrokesPerDayResponse,
  StrokesPerDayTeePlanSaveRequest,
} from "../types/strokes";

export async function getStrokesPerDay(
  tripId: number,
): Promise<StrokesPerDayResponse> {
  const response = await api.get<StrokesPerDayResponse>(
    `/trips/${tripId}/strokes-per-day`,
  );
  return response.data;
}

export async function saveStrokesPerDayTeePlan(
  tripId: number,
  request: StrokesPerDayTeePlanSaveRequest,
): Promise<StrokesPerDayResponse> {
  const response = await api.put<StrokesPerDayResponse>(
    `/trips/${tripId}/strokes-per-day/tee-plan`,
    request,
  );
  return response.data;
}
