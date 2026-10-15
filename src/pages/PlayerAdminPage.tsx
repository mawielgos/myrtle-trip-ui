import PageHeader from "../components/common/PageHeader";
import PlayerEditDialog from "./PlayerEditDialog";
import PlayerAdminList from "./PlayerAdminList";
import { usePlayerAdminController } from "./usePlayerAdminController";
import {
  buttonStyle,
  errorBoxStyle,
  inputStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
export { playerAdminTestApi } from "./playerAdminLogic";

export default function PlayerAdminPage() {
  const controller = usePlayerAdminController();
  const {
    players, loading, error, statusMessage,
    onlyActivePlayers, searchText, editor, playerListScrollRef,
    activeCount, visiblePlayers,
  } = controller;

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Player Master"
        subtitle={`${visiblePlayers.length} showing • ${players.length} total • ${activeCount} active`}
        actions={
          <>
            <button style={buttonStyle} onClick={() => void controller.loadPlayers()}>
              Refresh
            </button>
            <button style={primaryButtonStyle} onClick={() => controller.setEditor({ mode: "new", playerId: null })}>
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
            onChange={(event) => controller.setSearchText(event.target.value)}
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
              onChange={(event) => controller.setOnlyActivePlayers(event.target.checked)}
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
        onEdit={(playerId) => controller.setEditor({ mode: "edit", playerId })}
        onToggleActive={(player) => void controller.handleToggleActive(player)}
      />

      {editor ? (
        <PlayerEditDialog
          editor={editor}
          onClose={() => controller.setEditor(null)}
          onSaved={(message) => controller.handlePlayerSaved(message)}
        />
      ) : null}
    </div>
  );
}
