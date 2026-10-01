import api from "./api";
import type { PlayerListItem } from "../types/player";

export async function getPlayers(): Promise<PlayerListItem[]> {
  const response = await api.get<PlayerListItem[]>("/players");
  return response.data;
}