import type { PlayerDetail, PlayerListItem, SavePlayerRequest } from "../types/player";
import { formatHandicapMethod, normalizeHandicapMethod } from "../utils/handicapMethod";

export function emptyForm(): SavePlayerRequest {
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    ghinNumber: "",
    active: true,
    email: "",
    cell: "",
    venmoId: "",
    zelleId: "",
    handicapMethod: "",
    gender: "M",
  };
}

export function formatValue(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "—";
  }
  return value;
}

export function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function normalizeGender(value: string | null | undefined): string {
  return value === "F" ? "F" : "M";
}

export function formatGender(value: string | null | undefined): string {
  return normalizeGender(value) === "F" ? "Female" : "Male";
}

export function buildSubLabel(player: PlayerListItem): string {
  const parts: string[] = [];

  if (player.firstName || player.lastName) {
    const fullName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();
    if (fullName.length > 0 && fullName !== player.displayName) {
      parts.push(fullName);
    }
  }

  if (player.handicapMethod && player.handicapMethod.trim().length > 0) {
    parts.push(formatHandicapMethod(player.handicapMethod));
  }

  return parts.join(" • ");
}

export function buildFormFromPlayer(player: PlayerDetail): SavePlayerRequest {
  return {
    firstName: player.firstName ?? "",
    lastName: player.lastName ?? "",
    displayName: buildDisplayName(player.firstName ?? "", player.lastName ?? ""),
    ghinNumber: player.ghinNumber ?? "",
    active: player.active ?? true,
    email: player.email ?? "",
    cell: player.cell ?? "",
    venmoId: player.venmoId ?? "",
    zelleId: player.zelleId ?? "",
    handicapMethod: normalizeHandicapMethod(player.handicapMethod),
    gender: normalizeGender(player.gender),
  };
}

export function buildComparableForm(form: SavePlayerRequest): SavePlayerRequest {
  return {
    ...form,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    displayName: buildDisplayName(form.firstName, form.lastName),
    ghinNumber: form.ghinNumber.trim(),
    email: form.email.trim(),
    cell: form.cell.trim(),
    venmoId: form.venmoId.trim(),
    zelleId: form.zelleId.trim(),
    handicapMethod: normalizeHandicapMethod(form.handicapMethod),
    gender: normalizeGender(form.gender),
  };
}

export function hasFormChanges(form: SavePlayerRequest, initialForm: SavePlayerRequest, loading: boolean): boolean {
  if (loading) {
    return false;
  }
  return JSON.stringify(buildComparableForm(form)) !== JSON.stringify(buildComparableForm(initialForm));
}


export function countActivePlayers(players: PlayerListItem[]): number {
  let total = 0;
  for (const player of players) {
    if (player.active) {
      total += 1;
    }
  }
  return total;
}

export function filterVisiblePlayers(
  players: PlayerListItem[],
  onlyActivePlayers: boolean,
  searchText: string,
): PlayerListItem[] {
  const normalizedSearch = searchText.trim().toLowerCase();

  return players.filter((player) => {
    if (onlyActivePlayers && !player.active) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const searchableText = [
      player.displayName,
      player.firstName,
      player.lastName,
      player.email,
      player.ghinNumber,
      player.cell,
      player.handicapMethod,
      player.gender,
      formatGender(player.gender),
      String(player.playerId),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });
}

export const playerAdminTestApi = {
  emptyForm,
  formatValue,
  buildDisplayName,
  normalizeGender,
  formatGender,
  buildSubLabel,
  buildFormFromPlayer,
  buildComparableForm,
  hasFormChanges,
  countActivePlayers,
  filterVisiblePlayers,
};

