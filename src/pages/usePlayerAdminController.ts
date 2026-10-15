import { useEffect, useMemo, useRef, useState } from "react";
import { getPlayers, setPlayerActive } from "../api/playerApi";
import { useAppDialog } from "../components/common/AppDialog";
import type { PlayerEditorState } from "./usePlayerEditor";
import type { PlayerListItem } from "../types/player";
import { countActivePlayers, filterVisiblePlayers } from "./playerAdminLogic";

export function usePlayerAdminController() {
  const { confirmDialog } = useAppDialog();
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [onlyActivePlayers, setOnlyActivePlayers] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [editor, setEditor] = useState<PlayerEditorState | null>(null);
  const playerListScrollRef = useRef<HTMLDivElement | null>(null);

  function restorePlayerListScroll(scrollTop: number) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (playerListScrollRef.current) {
          playerListScrollRef.current.scrollTop = scrollTop;
        }
      });
    });
  }

  async function loadPlayers(options?: { preserveStatus?: boolean; preserveScroll?: boolean }) {
    const scrollTop = options?.preserveScroll ? (playerListScrollRef.current?.scrollTop ?? 0) : 0;
    setLoading(true);
    setError("");
    if (!options?.preserveStatus) {
      setStatusMessage("");
    }
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load players.");
    } finally {
      setLoading(false);
      if (options?.preserveScroll) {
        restorePlayerListScroll(scrollTop);
      }
    }
  }

  useEffect(() => {
    void loadPlayers();
  }, []);

  async function handleToggleActive(player: PlayerListItem) {
    const action = player.active ? "deactivate" : "activate";
    const confirmed = await confirmDialog({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} Player`,
      message: `${action === "deactivate" ? "Deactivate" : "Activate"} ${player.displayName}?`,
      severity: action === "deactivate" ? "warning" : "info",
      confirmText: action === "deactivate" ? "Deactivate" : "Activate",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setStatusMessage("");
      await setPlayerActive(player.playerId, !player.active);
      await loadPlayers({ preserveStatus: true, preserveScroll: true });
      setStatusMessage(`${player.displayName} was ${player.active ? "deactivated" : "activated"}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update player active status.");
    }
  }

  async function handlePlayerSaved(message: string) {
    setEditor(null);
    setStatusMessage(message);
    await loadPlayers({ preserveStatus: true, preserveScroll: true });
  }

  const activeCount = useMemo(() => countActivePlayers(players), [players]);
  const visiblePlayers = useMemo(
    () => filterVisiblePlayers(players, onlyActivePlayers, searchText),
    [players, onlyActivePlayers, searchText],
  );

  return {
    players, loading, error, statusMessage,
    onlyActivePlayers, setOnlyActivePlayers,
    searchText, setSearchText,
    editor, setEditor, playerListScrollRef,
    activeCount, visiblePlayers,
    loadPlayers, handleToggleActive, handlePlayerSaved,
  };
}
