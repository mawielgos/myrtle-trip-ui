import api from "./api";
import type { PlayerImportCommitRequest, PlayerImportRow } from "../types/playerImport";

export async function previewPlayerImport(
  tripId: number,
  file: File,
): Promise<PlayerImportRow[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<PlayerImportRow[]>(
    `/trips/${tripId}/player-import/preview`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function commitPlayerImport(
  tripId: number,
  rows: PlayerImportRow[],
): Promise<void> {
  const request: PlayerImportCommitRequest = { rows };

  await api.post(`/trips/${tripId}/player-import/commit`, request);
}
