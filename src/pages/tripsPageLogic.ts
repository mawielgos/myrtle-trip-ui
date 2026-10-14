import type { TripDetail, TripListItem } from "../types/trip";

export function getStatusWeight(status: string | null | undefined, detail?: TripDetail | null): number {
  if (status === "IN_PROGRESS") return 0;
  if (status === "PLANNING" && detail?.readiness?.canStartTrip) return 1;
  if (status === "PLANNING" || status === "NOT_STARTED") return 2;
  if (status === "COMPLETE") return 3;
  return 4;
}

export function sortTrips(trips: readonly TripListItem[], detailsById: Readonly<Record<number, TripDetail>>): TripListItem[] {
  return [...trips].sort((a, b) => {
    const detailA = detailsById[a.tripId];
    const detailB = detailsById[b.tripId];
    const archivedDiff = (a.archived ? 1 : 0) - (b.archived ? 1 : 0);
    if (archivedDiff !== 0) return archivedDiff;
    const statusA = detailA?.status ?? a.status;
    const statusB = detailB?.status ?? b.status;
    const weightDiff = getStatusWeight(statusA, detailA) - getStatusWeight(statusB, detailB);
    if (weightDiff !== 0) return weightDiff;
    const yearDiff = (b.tripYear ?? 0) - (a.tripYear ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return a.tripName.localeCompare(b.tripName);
  });
}

export function summarizeTrips(trips: readonly TripListItem[], detailsById: Readonly<Record<number, TripDetail>>) {
  let planning = 0;
  let inProgress = 0;
  let complete = 0;
  let archived = 0;
  for (const trip of trips) {
    if (trip.archived) archived += 1;
    const status = detailsById[trip.tripId]?.status ?? trip.status;
    if (status === "IN_PROGRESS") inProgress += 1;
    else if (status === "COMPLETE") complete += 1;
    else planning += 1;
  }
  return { total: trips.length, planning, inProgress, complete, archived };
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const responseData = (err as { response?: { data?: unknown } } | null)?.response?.data;
  const data = responseData && typeof responseData === "object" ? responseData as { message?: unknown; error?: unknown } : null;
  const apiMessage = data?.message ?? data?.error ?? (typeof responseData === "string" ? responseData : null);
  return typeof apiMessage === "string" && apiMessage.trim() ? apiMessage : fallback;
}
