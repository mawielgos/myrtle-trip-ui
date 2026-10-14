import axios from "axios";
import type {
  RoundGroupPageResponse,
  RoundPlayerStatusResponse,
  RoundReadinessResponse,
  RoundTeeOption,
} from "../types/round";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
} from "../utils/roundEventCapabilities";

export type UiPlayer = {
  scorecardId: number;
  playerId: number;
  playerName: string;
  tripIndex: number | null;
  gender: string | null;
  seatOrder: number | null;
  roundTeeId: number | null;
  participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
};

export type UiGroup = {
  groupId: number;
  groupNumber: number;
  teeTime: string | null;
  startingHole: number | null;
  players: UiPlayer[];
};

export function normalizeGender(gender?: string | null): "M" | "F" {
  if (!gender || gender.trim().length === 0) {
    return "M";
  }

  const normalized = gender.trim().toUpperCase();

  if (
    normalized === "F" ||
    normalized === "FEMALE" ||
    normalized === "W" ||
    normalized === "WOMAN"
  ) {
    return "F";
  }

  return "M";
}

export function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);
  return normalizedGender === "F"
    ? (tee.womenCourseRating ?? -999)
    : (tee.menCourseRating ?? -999);
}

export function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);
  return normalizedGender === "F"
    ? tee.displayNameForWomen || tee.displayName || tee.teeName
    : tee.displayNameForMen || tee.displayName || tee.teeName;
}

export function teeIsEligibleForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): boolean {
  const normalizedGender = normalizeGender(gender);
  return normalizedGender === "F"
    ? tee.eligibleForWomen === true
    : tee.eligibleForMen !== false;
}

export function getEligibleSortedTeesForPlayer(
  teeOptions: RoundTeeOption[],
  gender?: string | null,
): RoundTeeOption[] {
  return [...teeOptions]
    .filter((tee) => teeIsEligibleForPlayer(tee, gender))
    .sort((a, b) => {
      const ratingCompare =
        getTeeRatingForPlayer(b, gender) - getTeeRatingForPlayer(a, gender);
      return ratingCompare !== 0
        ? ratingCompare
        : (a.teeName || "").localeCompare(b.teeName || "");
    });
}

export function getDefaultTeeForGender(
  teeOptions: RoundTeeOption[],
  preferredRoundTeeId: number | null,
  gender: "M" | "F",
): number | null {
  const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, gender);
  if (eligibleTees.length === 0) return null;

  if (
    preferredRoundTeeId != null &&
    eligibleTees.some((tee) => tee.roundTeeId === preferredRoundTeeId)
  ) {
    return preferredRoundTeeId;
  }

  return eligibleTees[0].roundTeeId;
}

export function sortPlayers(players: UiPlayer[]): UiPlayer[] {
  return [...players].sort((a, b) => {
    const aOrder = a.seatOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.seatOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder !== bOrder
      ? aOrder - bOrder
      : a.playerName.localeCompare(b.playerName);
  });
}

export function isActiveRoundPlayer(
  player: RoundPlayerStatusResponse | UiPlayer,
): boolean {
  return (player.participationStatus ?? "ACTIVE") === "ACTIVE";
}

export function getPlayerRoundTeeId(
  player: RoundPlayerStatusResponse | undefined,
  defaultRoundTeeId: number | null,
): number | null {
  return player?.roundTeeId != null ? player.roundTeeId : defaultRoundTeeId;
}

export function normalizeGroups(
  response: RoundGroupPageResponse,
  roundPlayers: RoundPlayerStatusResponse[],
  defaultRoundTeeId: number | null,
): UiGroup[] {
  const playerById = new Map<number, RoundPlayerStatusResponse>();
  roundPlayers.forEach((player) => playerById.set(player.playerId, player));

  return (response.groups ?? [])
    .map((group) => ({
      groupId: group.groupId,
      groupNumber: group.groupNumber,
      teeTime: group.teeTime ?? null,
      startingHole: group.startingHole ?? null,
      players: sortPlayers(
        (group.players ?? [])
          .filter((player) => {
            const roundPlayer = playerById.get(player.playerId);
            return isActiveRoundPlayer(
              roundPlayer ??
                ({ participationStatus: "ACTIVE" } as RoundPlayerStatusResponse),
            );
          })
          .map((player) => {
            const roundPlayer = playerById.get(player.playerId);
            return {
              scorecardId: roundPlayer?.scorecardId ?? 0,
              playerId: player.playerId,
              playerName: player.playerName,
              tripIndex: roundPlayer?.tripIndex ?? null,
              gender: roundPlayer?.gender ?? null,
              seatOrder: player.seatOrder ?? null,
              roundTeeId: getPlayerRoundTeeId(roundPlayer, defaultRoundTeeId),
              participationStatus: roundPlayer?.participationStatus ?? "ACTIVE",
            };
          }),
      ),
    }))
    .sort((a, b) => a.groupNumber - b.groupNumber);
}

export function buildUnassignedPlayers(
  roundPlayers: RoundPlayerStatusResponse[],
  groups: UiGroup[],
  defaultRoundTeeId: number | null,
): UiPlayer[] {
  const assignedIds = new Set(
    groups.flatMap((group) => group.players.map((player) => player.playerId)),
  );

  return roundPlayers
    .filter((player) => isActiveRoundPlayer(player))
    .filter((player) => !assignedIds.has(player.playerId))
    .map((player) => ({
      scorecardId: player.scorecardId,
      playerId: player.playerId,
      playerName: player.playerName,
      tripIndex: player.tripIndex ?? null,
      gender: player.gender ?? null,
      seatOrder: null,
      roundTeeId: getPlayerRoundTeeId(player, defaultRoundTeeId),
      participationStatus: player.participationStatus ?? "ACTIVE",
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

export function isTwoManRound(
  readiness?: RoundReadinessResponse | null,
  format?: string | null,
): boolean {
  return roundHasTwoManLowNetEvent(readiness, format);
}

export function isScrambleRound(
  readiness?: RoundReadinessResponse | null,
  format?: string | null,
): boolean {
  return roundHasScrambleEvent(readiness, format);
}

export function getContinueLabel(
  readiness?: RoundReadinessResponse | null,
  format?: string | null,
): string {
  return isTwoManRound(readiness, format)
    ? "Continue to Teams"
    : "Continue to Scoring";
}

export function formatIndex(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return "No index";
  return Number(value).toFixed(1);
}

export function formatParticipationStatus(
  status: string | null | undefined,
): string {
  if (status === "WITHDRAWN") return "Withdrawn";
  if (status === "NO_SHOW") return "No-Show";
  if (status === "ACTIVE") return "Active";
  return "Unavailable";
}

export function getBackendErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  const responseData = err.response?.data;
  if (typeof responseData === "string" && responseData.trim().length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData &&
    typeof responseData.message === "string" &&
    responseData.message.trim().length > 0
  ) {
    return responseData.message;
  }

  if (err.response?.status === 409) {
    return "The round setup conflicts with the requested group or tee selections.";
  }
  if (err.response?.status === 400) {
    return "The request was rejected by the server.";
  }
  return fallback;
}

export function getTeeLabel(
  teeOptions: RoundTeeOption[],
  roundTeeId: number | null,
): string {
  if (roundTeeId == null) return "No tee selected";
  const tee = teeOptions.find((option) => option.roundTeeId === roundTeeId);
  return tee?.displayName || tee?.teeName || `Tee ${roundTeeId}`;
}

export function addMinutesToTime(
  timeValue: string,
  minutesToAdd: number,
): string | null {
  if (!timeValue) return null;

  const [hourText, minuteText] = timeValue.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalizedMinutes / 60);
  const nextMinute = normalizedMinutes % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

export function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}
