import type { PlayerDetail, SavePlayerRequest } from "../types/player";
import { normalizeHandicapMethod } from "../utils/handicapMethod";

export function emptyPlayerForm(): SavePlayerRequest {
  return {
    firstName: "", lastName: "", displayName: "", ghinNumber: "",
    active: true, email: "", cell: "", venmoId: "", zelleId: "",
    handicapMethod: "", gender: "M",
  };
}

export function formatPlayerValue(value: string | null | undefined): string {
  return !value || value.trim().length === 0 ? "—" : value;
}

export function buildPlayerDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function normalizePlayerGender(value: string | null | undefined): string {
  return value === "F" ? "F" : "M";
}

export function formatPlayerGender(value: string | null | undefined): string {
  return normalizePlayerGender(value) === "F" ? "Female" : "Male";
}

// Canonical values used both for dirty checking and API persistence.
export function normalizePlayerForm(form: SavePlayerRequest): SavePlayerRequest {
  return {
    ...form,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    displayName: buildPlayerDisplayName(form.firstName, form.lastName),
    ghinNumber: form.ghinNumber.trim(),
    email: form.email.trim(),
    cell: form.cell.trim(),
    venmoId: form.venmoId.trim(),
    zelleId: form.zelleId.trim(),
    handicapMethod: normalizeHandicapMethod(form.handicapMethod),
    gender: normalizePlayerGender(form.gender),
  };
}

export function formFromPlayer(player: PlayerDetail): SavePlayerRequest {
  return {
    firstName: player.firstName ?? "",
    lastName: player.lastName ?? "",
    displayName: buildPlayerDisplayName(player.firstName ?? "", player.lastName ?? ""),
    ghinNumber: player.ghinNumber ?? "",
    active: player.active ?? true,
    email: player.email ?? "",
    cell: player.cell ?? "",
    venmoId: player.venmoId ?? "",
    zelleId: player.zelleId ?? "",
    handicapMethod: normalizeHandicapMethod(player.handicapMethod),
    gender: normalizePlayerGender(player.gender),
  };
}

export function validatePlayerForm(form: SavePlayerRequest): "firstName" | "lastName" | null {
  if (!form.firstName.trim()) return "firstName";
  if (!form.lastName.trim()) return "lastName";
  return null;
}
