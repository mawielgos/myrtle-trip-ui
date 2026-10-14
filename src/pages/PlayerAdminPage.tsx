import { useEffect, useMemo, useRef, useState } from "react";
import { getPlayers, setPlayerActive } from "../api/playerApi";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import type { PlayerEditorState } from "./usePlayerEditor";
import PlayerEditDialog from "./PlayerEditDialog";
import PlayerAdminList from "./PlayerAdminList";
import {
  buttonStyle,
  errorBoxStyle,
  inputStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import type { PlayerListItem } from "../types/player";
import { countActivePlayers, filterVisiblePlayers } from "./playerAdminLogic";
export { playerAdminTestApi } from "./playerAdminLogic";

export default function PlayerAdminPage() {
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

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Player Master"
        subtitle={`${visiblePlayers.length} showing • ${players.length} total • ${activeCount} active`}
        actions={
          <>
            <button style={buttonStyle} onClick={() => void loadPlayers()}>
              Refresh
            </button>
            <button style={primaryButtonStyle} onClick={() => setEditor({ mode: "new", playerId: null })}>
              Add Player
            </button>
          </>
        }
      />

      <div style={{ ...sectionStyle, padding: "12px", marginBottom: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) auto",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            style={inputStyle}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search players by name, gender, email, GHIN, cell, method, or ID"
          />

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#333",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={onlyActivePlayers}
              onChange={(event) => setOnlyActivePlayers(event.target.checked)}
            />
            Only Active Players
          </label>
        </div>
      </div>

      {loading ? <div style={sectionStyle}>Loading players...</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {!loading && !error && statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

      <PlayerAdminList
        players={visiblePlayers}
        loading={loading}
        error={error}
        searchText={searchText}
        onlyActivePlayers={onlyActivePlayers}
        scrollRef={playerListScrollRef}
        onEdit={(playerId) => setEditor({ mode: "edit", playerId })}
        onToggleActive={(player) => void handleToggleActive(player)}
      />

      {editor ? (
        <PlayerEditDialog
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={(message) => handlePlayerSaved(message)}
        />
      ) : null}
    </div>
  );
}
