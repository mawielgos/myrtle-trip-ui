import type { RefObject, CSSProperties } from "react";
import type { PlayerListItem } from "../types/player";
import { buttonStyle, dangerButtonStyle, sectionStyle } from "../styles/uiStyles";
import { buildSubLabel, formatGender, formatValue } from "./playerAdminLogic";

function buildStatusBadgeStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: active ? "#edf8f0" : "#f7f7f7",
    color: active ? "#1f6b2a" : "#666",
    border: active ? "1px solid #b7d7c0" : "1px solid #d5d9de",
  };
}

type Props = {
  players: PlayerListItem[];
  loading: boolean;
  error: string;
  searchText: string;
  onlyActivePlayers: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onEdit: (playerId: number) => void;
  onToggleActive: (player: PlayerListItem) => void;
};

export default function PlayerAdminList({ players: visiblePlayers, loading, error, searchText, onlyActivePlayers,
  scrollRef: playerListScrollRef, onEdit, onToggleActive }: Props) {
  return (
    <>
      {!loading && !error ? (
        <div
          ref={playerListScrollRef}
          style={{
            display: "grid",
            gap: "12px",
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {visiblePlayers.length === 0 ? (
            <div style={sectionStyle}>
              {searchText.trim().length > 0
                ? "No players match the current search."
                : onlyActivePlayers
                  ? "No active players found."
                  : "No players found."}
            </div>
          ) : (
            visiblePlayers.map((player) => {
              const subLabel = buildSubLabel(player);

              return (
                <div
                  key={player.playerId}
                  style={{
                    ...sectionStyle,
                    marginBottom: 0,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 420px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "4px",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{player.displayName}</div>
                        <span style={buildStatusBadgeStyle(player.active)}>{player.active ? "Active" : "Inactive"}</span>
                      </div>

                      <div style={{ fontSize: "13px", color: "#666" }}>
                        {subLabel.length > 0 ? subLabel : "Player"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        style={buttonStyle}
                        onClick={() => onEdit(player.playerId)}
                      >
                        Edit
                      </button>
                      <button style={player.active ? dangerButtonStyle : buttonStyle} onClick={() => onToggleActive(player)}>
                        {player.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "8px 14px",
                      fontSize: "13px",
                      color: "#444",
                    }}
                  >
                    <div>
                      Player ID: <strong>{player.playerId}</strong>
                    </div>
                    <div>
                      GHIN: <strong>{formatValue(player.ghinNumber)}</strong>
                    </div>
                    <div>
                      Gender: <strong>{formatGender(player.gender)}</strong>
                    </div>
                    <div>
                      Email: <strong>{formatValue(player.email)}</strong>
                    </div>
                    <div>
                      Cell: <strong>{formatValue(player.cell)}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

    </>
  );
}
