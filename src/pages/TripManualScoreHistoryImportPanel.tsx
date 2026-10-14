import type { ChangeEvent } from "react";
import type { TripPlayer } from "../types/trip";
import type { ScoreRowForm } from "./tripManualScoreHistoryLogic";
import {
  actionRowStyle,
  appTableStyle,
  buttonStyle,
  dangerButtonStyle,
  formInputStyle,
  formSelectStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";

const gridInputStyle = {
  ...formInputStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};
const gridSelectStyle = {
  ...formSelectStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};

interface TripManualScoreHistoryImportPanelProps {
  rows: ScoreRowForm[];
  activePlayers: TripPlayer[];
  saving: boolean;
  loading: boolean;
  updateRow: <K extends keyof ScoreRowForm>(rowKey: number, key: K, value: ScoreRowForm[K]) => void;
  addRow: () => void;
  addFiveRows: () => void;
  clearRows: () => void;
  removeRow: (rowKey: number) => void;
  copyFirstRowDown: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSaveAll: () => Promise<void>;
}

export default function TripManualScoreHistoryImportPanel({
  rows,
  activePlayers,
  saving,
  loading,
  updateRow,
  addRow,
  addFiveRows,
  clearRows,
  removeRow,
  copyFirstRowDown,
  onUpload,
  onSaveAll,
}: TripManualScoreHistoryImportPanelProps) {
  function playerSelect(value: string, onChange: (value: string) => void) {
    return (
      <select
        style={{ ...gridSelectStyle, width: "160px" }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select player</option>
        {activePlayers.map((player) => (
          <option key={player.playerId} value={player.playerId}>
            {player.displayName}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>Import Score History</h2>
      <p style={{ marginTop: "-4px", color: "#555", fontSize: "13px" }}>
        Upload one CSV for one or more trip players, review the preview rows,
        resequence if needed, then commit. Player matching is case-insensitive and
        limited to players on this event. No player can commit more than 20 score
        rows.
      </p>

      <div style={{ ...actionRowStyle, alignItems: "end", marginBottom: "12px" }}>
        <label>
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            Upload CSV
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onUpload(event)}
          />
        </label>
        <button type="button" style={buttonStyle} onClick={addRow}>
          Add Row
        </button>
        <button type="button" style={buttonStyle} onClick={addFiveRows}>
          Add 5 Rows
        </button>
        <button type="button" style={buttonStyle} onClick={copyFirstRowDown}>
          Copy First Row Down
        </button>
        <button type="button" style={buttonStyle} onClick={clearRows}>
          Clear Preview
        </button>
        <button
          type="button"
          style={primaryButtonStyle}
          disabled={saving || loading}
          onClick={() => void onSaveAll()}
        >
          {saving ? "Committing..." : "Commit Preview Rows"}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            ...appTableStyle,
            tableLayout: "fixed",
            minWidth: "1120px",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "170px" }}>Player</th>
              <th style={{ ...thStyle, width: "48px" }}>Seq</th>
              <th style={{ ...thStyle, width: "88px" }}>Score Date</th>
              <th style={{ ...thStyle, width: "180px" }}>Course Name</th>
              <th style={{ ...thStyle, width: "72px" }}>Score</th>
              <th style={{ ...thStyle, width: "70px" }}>CR</th>
              <th style={{ ...thStyle, width: "70px" }}>Slope</th>
              <th style={{ ...thStyle, width: "70px" }}>Diff</th>
              <th style={{ ...thStyle, width: "70px" }}>Holes</th>
              <th style={{ ...thStyle, width: "76px" }}>Include</th>
              <th style={{ ...thStyle, width: "92px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.rowKey}>
                <td style={tdStyle}>
                  {playerSelect(row.playerId, (value) =>
                    updateRow(row.rowKey, "playerId", value),
                  )}
                  {!row.playerId && row.playerName && (
                    <div style={{ color: "#b25b00", fontSize: "11px", marginTop: "3px" }}>
                      No match: {row.playerName}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    style={{ ...gridInputStyle, width: "40px" }}
                    value={row.postingOrder || String(index + 1)}
                    onChange={(event) => updateRow(row.rowKey, "postingOrder", event.target.value)}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    style={{ ...gridInputStyle, width: "74px" }}
                    value={row.scoreDate}
                    onChange={(event) => updateRow(row.rowKey, "scoreDate", event.target.value)}
                    placeholder="MM/YY"
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    style={{ ...gridInputStyle, width: "160px" }}
                    value={row.courseName}
                    onChange={(event) => updateRow(row.rowKey, "courseName", event.target.value)}
                    placeholder="Optional"
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    style={{ ...gridInputStyle, width: "58px" }}
                    value={row.score}
                    onChange={(event) => updateRow(row.rowKey, "score", event.target.value)}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    step="0.1"
                    style={{ ...gridInputStyle, width: "58px" }}
                    value={row.courseRating}
                    onChange={(event) => updateRow(row.rowKey, "courseRating", event.target.value)}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    style={{ ...gridInputStyle, width: "58px" }}
                    value={row.slope}
                    onChange={(event) => updateRow(row.rowKey, "slope", event.target.value)}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    step="0.1"
                    style={{ ...gridInputStyle, width: "58px" }}
                    value={row.differential}
                    onChange={(event) => updateRow(row.rowKey, "differential", event.target.value)}
                    placeholder="Auto"
                  />
                </td>
                <td style={tdStyle}>
                  <select
                    style={{ ...gridSelectStyle, width: "62px" }}
                    value={row.holesPlayed}
                    onChange={(event) => updateRow(row.rowKey, "holesPlayed", event.target.value)}
                  >
                    <option value="18">18</option>
                    <option value="9">9</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={row.includedInMyrtleCalc}
                    onChange={(event) =>
                      updateRow(row.rowKey, "includedInMyrtleCalc", event.target.checked)
                    }
                  />
                </td>
                <td style={tdStyle}>
                  <button type="button" style={dangerButtonStyle} onClick={() => removeRow(row.rowKey)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "10px", color: "#666", fontSize: "12px" }}>
        CSV headers: <strong>Player, Seq, Score Date, Course Name, Score, CR, Slope, Diff, Holes, Include In Event</strong>.
        Diff and Course Name are optional. CR and Diff are rounded to 1 decimal before commit.
      </div>
    </div>
  );
}
