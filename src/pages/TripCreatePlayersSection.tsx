import { buttonStyle, formInputStyle, labelStyle, sectionStyle, tdStyle, thStyle } from "../styles/uiStyles";
import type { useTripCreateController } from "./useTripCreateController";

type Controller = ReturnType<typeof useTripCreateController>;
export default function TripCreatePlayersSection({ controller }: { controller: Controller }) {
  const {
    handleSelectAllActive, handleClearPlayers, loading, playerSearch, setPlayerSearch,
    selectedPlayerIds, filteredPlayers, togglePlayer, scoreDataByPlayerId,
    frozenIndexes, setFrozenIndexes, saving, initialized, handicapsEnabled, usesFrozenGhinIndex,
  } = controller;
  return (
      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Players</h2>
            <div style={{ marginTop: "4px", color: "#64748b", fontSize: "13px" }}>
              Optional during creation. Add players here manually or save first and import players from Event Detail.
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              type="button"
              onClick={handleSelectAllActive}
              disabled={saving || loading || initialized}
            >
              Select All Active
            </button>
            <button
              style={buttonStyle}
              type="button"
              onClick={handleClearPlayers}
              disabled={saving || loading || initialized}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "12px", maxWidth: "320px" }}>
          <label style={labelStyle} htmlFor="playerSearch">
            Search Players
            <input
              id="playerSearch"
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={formInputStyle}
              disabled={saving || loading}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px", fontSize: "14px", color: "#555" }}>
          Selected Players: <strong>{selectedPlayerIds.length}</strong>
        </div>

        {loading ? (
          <div>Loading players...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Select</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Score Data</th>
                <th style={thStyle}>Index?</th>
                {usesFrozenGhinIndex ? <th style={thStyle}>Frozen GHIN Index</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr key={player.playerId}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.playerId)}
                      onChange={() => togglePlayer(player.playerId)}
                      disabled={saving || initialized}
                    />
                  </td>
                  <td style={tdStyle}>
                    {player.displayName}
                    {player.ghinNumber ? (
                      <span style={{ color: "#64748b", marginLeft: "6px" }}>({player.ghinNumber})</span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>
                    {selectedPlayerIds.includes(player.playerId) ? (
                      <span style={{ fontSize: "12px", color: "#475569" }}>
                        GHIN {scoreDataByPlayerId[player.playerId]?.ghinHistoryCount ?? 0} · DB {scoreDataByPlayerId[player.playerId]?.dbScoreHistoryCount ?? 0} · Event {scoreDataByPlayerId[player.playerId]?.tripScoreCount ?? 0}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {!handicapsEnabled ? (
                      <span style={{ color: "#64748b" }}>Scratch</span>
                    ) : usesFrozenGhinIndex ? (
                      frozenIndexes[player.playerId]?.trim() ? "Yes" : "No"
                    ) : scoreDataByPlayerId[player.playerId]?.usableHandicapIndex ? (
                      "Yes"
                    ) : selectedPlayerIds.includes(player.playerId) ? (
                      <span style={{ color: "#b45309" }}>No</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  {usesFrozenGhinIndex ? (
                    <td style={tdStyle}>
                      {selectedPlayerIds.includes(player.playerId) ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={frozenIndexes[player.playerId] ?? ""}
                          onChange={(e) =>
                            setFrozenIndexes((current) => ({
                              ...current,
                              [player.playerId]: e.target.value,
                            }))
                          }
                          style={{ ...formInputStyle, maxWidth: "100px" }}
                          disabled={saving || initialized}
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
  );
}
