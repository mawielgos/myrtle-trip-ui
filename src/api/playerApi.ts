import api from "./api";
import type { PlayerDetail, PlayerListItem, SavePlayerRequest } from "../types/player";

export async function getPlayers(): Promise<PlayerListItem[]> {
  const response = await api.get<PlayerListItem[]>("/players");
  return response.data;
}

export async function getPlayer(playerId: number): Promise<PlayerDetail> {
  const response = await api.get<PlayerDetail>(`/players/${playerId}`);
  return response.data;
}

export async function createPlayer(request: SavePlayerRequest): Promise<PlayerDetail> {
  const response = await api.post<PlayerDetail>("/players", request);
  return response.data;
}

export async function updatePlayer(
  playerId: number,
  request: SavePlayerRequest
): Promise<PlayerDetail> {
  const response = await api.put<PlayerDetail>(`/players/${playerId}`, request);
  return response.data;
}

export async function setPlayerActive(
  playerId: number,
  active: boolean
): Promise<PlayerDetail> {
  const response = await api.put<PlayerDetail>(`/players/${playerId}/active`, null, {
    params: { active },
  });
  return response.data;
}

export async function initializePlayer(playerId: number): Promise<string> {
  const response = await api.post<string>(`/players/initialize/player/${playerId}`);
  return response.data;
}
