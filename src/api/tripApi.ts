import api from "./api";
import type {
  CurrentRound,
  FourDayStandings,
  TournamentStandings,
  TripDetail,
  TripListItem,
  TripPlannedRound,
  TripPlannedRoundEvent,
  TripPlayer,
  TripReadiness,
  TripRoundListItem,
  PrizeSchedule,
  SaveTripPrizeSchedulesRequest,
  PrizeRecalculationResponse,
  TripBillInventory,
  SaveTripBillInventoryRequest,
  TripTournamentSetup,
  SaveTripTournamentSetupRequest,
  TripWorkflowReadiness,
} from "../types/trip";
import type { GhinFixRow } from "../types/ghinFix";

export interface SaveTripSetupRequest {
  tripId?: number | null;
  name: string;
  tripYear: number;
  tripCode: string;
  entryFee?: number | null;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  plannedRoundCount?: number | null;
  handicapsEnabled?: boolean | null;
  handicapMethod?: string | null;
  playerIds: number[];
  frozenHandicapIndexesByPlayerId?: Record<number, number | null>;
}

export interface CreateTripRequest {
  tripName: string;
  tripCode: string;
  tripYear: number;
  entryFee?: number | null;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  plannedRoundCount?: number | null;
  handicapsEnabled?: boolean | null;
  handicapMethod?: string | null;
  initialized?: boolean | null;
  playerIds?: number[];
}

export interface UpdateTripPlayersRequest {
  playerIds: number[];
}

export interface SavePlannedRoundsRequest {
  rounds: SavePlannedRoundItem[];
}

export interface SavePlannedRoundEventItem {
  eventType: string;
  eventName?: string | null;
  eventOrder?: number | null;
  teamSize?: number | null;
  handicapPercent?: number | null;
  teamBased?: boolean | null;
  individualEvent?: boolean | null;
  usesHandicap?: boolean | null;
  payoutEligible?: boolean | null;
  tournamentEligible?: boolean | null;
  scoringModeLabel?: string | null;
  defaultEventName?: string | null;
}

export interface SavePlannedRoundItem {
  roundNumber: number;
  roundDate: string | null;
  courseId: number | null;
  defaultTeeId: number | null;
  womenDefaultTeeId?: number | null;

  format: string | null;
  includeInFourDayStandings: boolean;
  scrambleTeamSize?: number | null;
  events?: SavePlannedRoundEventItem[];
}

export interface SaveGhinFixRequest {
  differential: number;
}

type TripReadinessApiResponse = {
  activePlayerCount?: number | null;
  plannedRoundCount?: number | null;
  completedPlannedRoundCount?: number | null;
  unresolvedGhinFixCount?: number | null;
  rosterReady?: boolean | null;
  plannedRoundsReady?: boolean | null;
  ghinFixesReady?: boolean | null;
  handicapIndexesReady?: boolean | null;
  canStartTrip?: boolean | null;
  blockingItems?: string[] | null;
};

type TripDetailApiResponse = {
  tripId?: number;
  id?: number;
  tripName?: string | null;
  name?: string | null;
  tripCode?: string | null;
  tripYear?: number | null;
  entryFee?: number | null;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  plannedRoundCount?: number | null;
  handicapsEnabled?: boolean | null;
  handicapMethod?: string | null;
  initialized?: boolean | null;
  status?: string | null;
  correctionMode?: boolean | null;
  archived?: boolean | null;
  currentRound?: CurrentRound | null;
  unresolvedGhinFixCount?: number | null;
  readiness?: TripReadinessApiResponse | null;
  hasFemalePlayers?: boolean | null;
};

type TripListItemApiResponse = {
  tripId?: number;
  id?: number;
  tripName?: string | null;
  name?: string | null;
  tripCode?: string | null;
  tripYear?: number | null;
  playerCount?: number | null;
  roundCount?: number | null;
  plannedRoundCount?: number | null;
  status?: string | null;
  correctionMode?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  canDelete?: boolean | null;
  archived?: boolean | null;
  canArchive?: boolean | null;
  canRestore?: boolean | null;
};

type TripPlannedRoundApiResponse = {
  plannedRoundId?: number | null;
  roundId?: number | null;
  roundNumber?: number | null;
  roundDate?: string | null;
  format?: string | null;
  courseId?: number | null;
  courseName?: string | null;
  defaultTeeId?: number | null;
  defaultTeeName?: string | null;
  defaultTeeDisplay?: string | null;
  womenDefaultTeeId?: number | null;
  womenDefaultTeeName?: string | null;
  womenDefaultTeeDisplay?: string | null;
  includeInFourDayStandings?: boolean | null;
  scrambleTeamSize?: number | null;
  finalized?: boolean | null;
  events?: TripPlannedRoundEventApiResponse[] | null;
};

type TripPlannedRoundEventApiResponse = {
  id?: number | null;
  eventType?: string | null;
  eventName?: string | null;
  eventOrder?: number | null;
  teamSize?: number | null;
  handicapPercent?: number | null;
  teamBased?: boolean | null;
  individualEvent?: boolean | null;
  usesHandicap?: boolean | null;
  payoutEligible?: boolean | null;
  tournamentEligible?: boolean | null;
  scoringModeLabel?: string | null;
  defaultEventName?: string | null;
};

type SaveTripSetupApiResponse =
  | number
  | {
      tripId?: number;
      id?: number;
    };

function normalizeTripReadiness(
  data: TripReadinessApiResponse | null | undefined
): TripReadiness | null {
  if (!data) {
    return null;
  }

  return {
    activePlayerCount: data.activePlayerCount ?? 0,
    plannedRoundCount: data.plannedRoundCount ?? 0,
    completedPlannedRoundCount: data.completedPlannedRoundCount ?? 0,
    unresolvedGhinFixCount: data.unresolvedGhinFixCount ?? 0,
    rosterReady: data.rosterReady ?? false,
    plannedRoundsReady: data.plannedRoundsReady ?? false,
    ghinFixesReady: data.ghinFixesReady ?? false,
    handicapIndexesReady: data.handicapIndexesReady ?? true,
    canStartTrip: data.canStartTrip ?? false,
    blockingItems: data.blockingItems ?? [],
  };
}

function normalizeTripDetail(data: TripDetailApiResponse): TripDetail {
  return {
    tripId: data.tripId ?? data.id ?? 0,
    tripName: data.tripName ?? data.name ?? "",
    tripCode: data.tripCode ?? "",
    tripYear: data.tripYear ?? new Date().getFullYear(),
    entryFee: data.entryFee ?? null,
    tripStartDate: data.tripStartDate ?? null,
    tripEndDate: data.tripEndDate ?? null,
    plannedRoundCount: data.plannedRoundCount ?? 5,
    handicapsEnabled: data.handicapsEnabled ?? true,
    handicapMethod: data.handicapMethod ?? "GHIN_PLUS_DB_SCORE_HISTORY",
    initialized: data.initialized ?? null,
    status: data.status ?? "PLANNING",
    correctionMode: data.correctionMode === true,
    archived: data.archived === true,
    currentRound: data.currentRound ?? null,
    unresolvedGhinFixCount: data.unresolvedGhinFixCount ?? 0,
    readiness: normalizeTripReadiness(data.readiness),
    hasFemalePlayers: data.hasFemalePlayers === true,
  };
}

function normalizeTripListItem(data: TripListItemApiResponse): TripListItem {
  return {
    tripId: data.tripId ?? data.id ?? 0,
    tripName: data.tripName ?? data.name ?? "",
    tripCode: data.tripCode ?? "",
    tripYear: data.tripYear ?? new Date().getFullYear(),
    playerCount: data.playerCount ?? 0,
    roundCount: data.roundCount ?? 0,
    plannedRoundCount: data.plannedRoundCount ?? 5,
    status: data.status ?? null,
    correctionMode: data.correctionMode === true,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    canDelete: data.canDelete ?? false,
    archived: data.archived === true,
    canArchive: data.canArchive ?? data.archived !== true,
    canRestore: data.canRestore ?? data.archived === true,
  };
}

function normalizePlannedRoundFormat(
  data: TripPlannedRoundApiResponse,
): string | null {
  return data.format ?? null;
}

function normalizeTripPlannedRoundEvents(
  events: TripPlannedRoundEventApiResponse[] | null | undefined,
): TripPlannedRoundEvent[] {
  if (!events || events.length === 0) {
    return [];
  }

  return events
    .filter((event) => event.eventType != null && event.eventType !== "")
    .map((event, index) => ({
      id: event.id ?? null,
      eventType: event.eventType ?? "",
      eventName: event.eventName ?? null,
      eventOrder: event.eventOrder ?? index + 1,
      teamSize: event.teamSize ?? null,
      handicapPercent: event.handicapPercent ?? null,
      teamBased: event.teamBased ?? null,
      individualEvent: event.individualEvent ?? null,
      usesHandicap: event.usesHandicap ?? null,
      payoutEligible: event.payoutEligible ?? null,
      tournamentEligible: event.tournamentEligible ?? null,
      scoringModeLabel: event.scoringModeLabel ?? null,
      defaultEventName: event.defaultEventName ?? null,
    }))
    .sort((a, b) => (a.eventOrder ?? 999) - (b.eventOrder ?? 999));
}

function normalizeTripPlannedRound(
  data: TripPlannedRoundApiResponse
): TripPlannedRound {
  return {
    roundId: data.plannedRoundId ?? data.roundId ?? null,
    roundNumber: data.roundNumber ?? 0,
    roundDate: data.roundDate ?? null,
    format: normalizePlannedRoundFormat(data),
    courseId: data.courseId ?? null,
    courseName: data.courseName ?? null,
    defaultTeeId: data.defaultTeeId ?? null,
    defaultTeeName: data.defaultTeeDisplay ?? data.defaultTeeName ?? null,
    womenDefaultTeeId: data.womenDefaultTeeId ?? null,
    womenDefaultTeeName: data.womenDefaultTeeDisplay ?? data.womenDefaultTeeName ?? null,
    includeInFourDayStandings: data.includeInFourDayStandings ?? false,
    scrambleTeamSize: data.scrambleTeamSize ?? 4,
    events: normalizeTripPlannedRoundEvents(data.events),
    finalized: data.finalized ?? false,
  };
}

function extractSavedTripId(data: SaveTripSetupApiResponse): number {
  if (typeof data === "number") {
    return data;
  }

  const tripId = data.tripId ?? data.id;
  if (tripId == null) {
    throw new Error("Event save response did not include an event id.");
  }

  return tripId;
}

function toBackendTripPayload(payload: SaveTripSetupRequest) {
  return {
    name: payload.name,
    tripName: payload.name,
    tripYear: payload.tripYear,
    tripCode: payload.tripCode,
    entryFee: payload.entryFee ?? null,
    tripStartDate: payload.tripStartDate ?? null,
    tripEndDate: payload.tripEndDate ?? null,
    plannedRoundCount: payload.plannedRoundCount ?? 5,
    handicapsEnabled: payload.handicapsEnabled ?? true,
    handicapMethod: payload.handicapMethod ?? "GHIN_PLUS_DB_SCORE_HISTORY",
    playerIds: payload.playerIds,
    frozenHandicapIndexesByPlayerId: payload.frozenHandicapIndexesByPlayerId ?? {},
  };
}

/* =========================
   EXISTING TRIP FUNCTIONS
   ========================= */

export async function getTrips(includeArchived = false): Promise<TripListItem[]> {
  const response = await api.get<TripListItemApiResponse[]>("/trips", {
    params: { includeArchived },
  });
  return response.data.map(normalizeTripListItem);
}

export async function getTripDetail(tripId: number): Promise<TripDetail> {
  const response = await api.get<TripDetailApiResponse>(`/trips/${tripId}`);
  return normalizeTripDetail(response.data);
}

export async function getTrip(tripId: number): Promise<TripDetail> {
  return getTripDetail(tripId);
}

export async function createTrip(payload: CreateTripRequest): Promise<TripDetail> {
  const response = await api.post<SaveTripSetupApiResponse>("/trips", payload);
  const tripId = extractSavedTripId(response.data);
  return getTripDetail(tripId);
}

export async function saveTripSetup(payload: SaveTripSetupRequest): Promise<number> {
  const backendPayload = toBackendTripPayload(payload);

  if (payload.tripId != null) {
    const response = await api.put<SaveTripSetupApiResponse>(
      `/trips/${payload.tripId}`,
      backendPayload
    );
    return extractSavedTripId(response.data);
  }

  const response = await api.post<SaveTripSetupApiResponse>("/trips", backendPayload);
  return extractSavedTripId(response.data);
}

export async function getTripPlayers(tripId: number): Promise<TripPlayer[]> {
  const response = await api.get<TripPlayer[]>(`/trips/${tripId}/players`);
  return response.data;
}

export async function updateTripPlayerParticipation(
  tripId: number,
  playerId: number,
  participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN"
): Promise<TripPlayer[]> {
  const response = await api.patch<TripPlayer[]>(
    `/trips/${tripId}/players/${playerId}/participation`,
    { participationStatus }
  );
  return response.data;
}

export async function getTripRounds(tripId: number): Promise<TripRoundListItem[]> {
  const response = await api.get<TripRoundListItem[]>(`/trips/${tripId}/rounds`);
  return response.data;
}

export async function getPlannedRounds(tripId: number): Promise<TripPlannedRound[]> {
  const response = await api.get<TripPlannedRoundApiResponse[]>(
    `/trips/${tripId}/planned-rounds`
  );
  return response.data.map(normalizeTripPlannedRound);
}

export async function savePlannedRounds(
  tripId: number,
  payload: SavePlannedRoundsRequest
): Promise<TripPlannedRound[]> {
  const response = await api.put<TripPlannedRoundApiResponse[]>(
    `/trips/${tripId}/planned-rounds`,
    payload
  );
  return response.data.map(normalizeTripPlannedRound);
}

export async function startTrip(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/initialize`);
}

export async function resetTripStart(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/reset-start`);
}

export async function initializeTripGhin(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/initialize-ghin`);
}

export async function archiveTrip(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/archive`);
}

export async function restoreTrip(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/restore`);
}

export async function completeTrip(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/complete`);
}

export async function enableTripCorrectionMode(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/correction-mode/enable`);
}

export async function disableTripCorrectionMode(tripId: number): Promise<void> {
  await api.post(`/trips/${tripId}/correction-mode/disable`);
}


export async function getTripTournamentSetup(
  tripId: number
): Promise<TripTournamentSetup> {
  const response = await api.get<TripTournamentSetup>(`/trips/${tripId}/tournament`);
  return response.data;
}

export async function saveTripTournamentSetup(
  tripId: number,
  payload: SaveTripTournamentSetupRequest
): Promise<TripTournamentSetup> {
  const response = await api.put<TripTournamentSetup>(`/trips/${tripId}/tournament`, payload);
  return response.data;
}

export async function getTournamentStandings(
  tripId: number,
  competition?: "LOW_NET" | "LOW_GROSS" | string
): Promise<TournamentStandings> {
  const response = await api.get<TournamentStandings>(
    `/trips/${tripId}/tournament-standings`,
    { params: competition ? { competition } : undefined }
  );
  return response.data;
}

// Backward-compatible API wrapper while remaining pages are renamed.
export async function getFourDayStandings(
  tripId: number
): Promise<FourDayStandings> {
  return getTournamentStandings(tripId);
}

/* =========================
   GHIN FIX FUNCTIONS (FIX)
   ========================= */

export async function getTripGhinFixes(tripId: number): Promise<GhinFixRow[]> {
  const response = await api.get<GhinFixRow[]>(`/trips/${tripId}/ghin-fixes`);
  return response.data;
}

export async function saveTripGhinFix(
  tripId: number,
  scoreHistoryEntryId: number,
  payload: SaveGhinFixRequest
): Promise<GhinFixRow> {
  const response = await api.put<GhinFixRow>(
    `/trips/${tripId}/ghin-fixes/${scoreHistoryEntryId}`,
    payload
  );
  return response.data;
}
export async function deleteTrip(tripId: number): Promise<void> {
  await api.delete(`/trips/${tripId}`);
}


export async function getTripPrizeSchedules(
  tripId: number
): Promise<PrizeSchedule[]> {
  const response = await api.get<PrizeSchedule[]>(`/trips/${tripId}/prizes`);
  return response.data;
}

export async function saveTripPrizeSchedules(
  tripId: number,
  payload: SaveTripPrizeSchedulesRequest
): Promise<PrizeSchedule[]> {
  const response = await api.put<PrizeSchedule[]>(
    `/trips/${tripId}/prizes`,
    payload
  );
  return response.data;
}


export async function recalculateTripPrizeWinnings(
  tripId: number
): Promise<PrizeRecalculationResponse> {
  const response = await api.post<PrizeRecalculationResponse>(
    `/trips/${tripId}/prizes/recalculate`
  );
  return response.data;
}

export async function getTripPrizeWinnings(
  tripId: number
): Promise<PrizeRecalculationResponse> {
  const response = await api.get<PrizeRecalculationResponse>(
    `/trips/${tripId}/prizes/winnings`
  );
  return response.data;
}


export async function updateTripPlayerPayoutStatus(
  tripId: number,
  playerId: number,
  paid: boolean
): Promise<PrizeRecalculationResponse> {
  const response = await api.put<PrizeRecalculationResponse>(
    `/trips/${tripId}/prizes/players/${playerId}/paid`,
    { paid }
  );
  return response.data;
}


export async function getTripBillInventory(
  tripId: number
): Promise<TripBillInventory> {
  const response = await api.get<TripBillInventory>(
    `/trips/${tripId}/bill-inventory`
  );
  return response.data;
}

export async function saveTripBillInventory(
  tripId: number,
  payload: SaveTripBillInventoryRequest
): Promise<TripBillInventory> {
  const response = await api.put<TripBillInventory>(
    `/trips/${tripId}/bill-inventory`,
    payload
  );
  return response.data;
}

import type {
  DbScoreHistoryImportCandidate,
  ManualScoreHistoryEntry,
  SaveManualScoreHistoryEntryRequest,
} from "../types/manualScoreHistory";

export async function getManualScoreHistory(
  tripId: number
): Promise<ManualScoreHistoryEntry[]> {
  const response = await api.get<ManualScoreHistoryEntry[]>(
    `/trips/${tripId}/manual-score-history`
  );
  return response.data;
}


export async function getImportableDbScoreHistory(
  tripId: number
): Promise<DbScoreHistoryImportCandidate[]> {
  const response = await api.get<DbScoreHistoryImportCandidate[]>(
    `/trips/${tripId}/manual-score-history/importable-db-scores`
  );
  return response.data;
}

export async function createManualScoreHistoryEntry(
  tripId: number,
  payload: SaveManualScoreHistoryEntryRequest
): Promise<ManualScoreHistoryEntry> {
  const response = await api.post<ManualScoreHistoryEntry>(
    `/trips/${tripId}/manual-score-history`,
    payload
  );
  return response.data;
}

export async function createManualScoreHistoryEntries(
  tripId: number,
  payload: SaveManualScoreHistoryEntryRequest[]
): Promise<ManualScoreHistoryEntry[]> {
  const response = await api.post<ManualScoreHistoryEntry[]>(
    `/trips/${tripId}/manual-score-history/bulk`,
    payload
  );
  return response.data;
}

export async function updateManualScoreHistoryEntry(
  tripId: number,
  scoreHistoryEntryId: number,
  payload: SaveManualScoreHistoryEntryRequest
): Promise<ManualScoreHistoryEntry> {
  const response = await api.put<ManualScoreHistoryEntry>(
    `/trips/${tripId}/manual-score-history/${scoreHistoryEntryId}`,
    payload
  );
  return response.data;
}

export async function deleteManualScoreHistoryEntry(
  tripId: number,
  scoreHistoryEntryId: number
): Promise<void> {
  await api.delete(`/trips/${tripId}/manual-score-history/${scoreHistoryEntryId}`);
}

export async function getTripWorkflowReadiness(
  tripId: number
): Promise<TripWorkflowReadiness> {
  const response = await api.get<TripWorkflowReadiness>(
    `/trips/${tripId}/workflow-readiness`
  );
  return response.data;
}
