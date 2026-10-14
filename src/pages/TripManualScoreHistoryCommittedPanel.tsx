import { Fragment } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ManualScoreHistoryEntry } from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";
import type { ScoreRowForm } from "./tripManualScoreHistoryLogic";
import { formatNumber, formatScoreMonthYear } from "./tripManualScoreHistoryLogic";
import {
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
const committedHeaderCellStyle: CSSProperties = {
  ...thStyle,
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "#fff",
  boxShadow: "0 1px 0 #c7ccd1",
  whiteSpace: "nowrap",
};
const committedTableStyle: CSSProperties = {
  ...appTableStyle,
  minWidth: "1100px",
  margin: 0,
  borderCollapse: "separate",
  borderSpacing: 0,
};

interface EntryGroup {
  playerId: number;
  playerName: string;
  entries: ManualScoreHistoryEntry[];
}

interface TripManualScoreHistoryCommittedPanelProps {
  entries: ManualScoreHistoryEntry[];
  groupedEntries: EntryGroup[];
  loading: boolean;
  saving: boolean;
  activePlayers: TripPlayer[];
  editingEntryId: number | null;
  editRow: ScoreRowForm | null;
  selectedEntryIds: number[];
  collapsedPlayerIds: number[];
  selectedEntryCount: number;
  allVisibleEntriesSelected: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  toggleSelectedEntry: (entryId: number) => void;
  toggleSelectAllEntries: (checked: boolean) => void;
  togglePlayerSelected: (entries: ManualScoreHistoryEntry[], checked: boolean) => void;
  togglePlayerCollapsed: (playerId: number) => void;
  collapseAllPlayers: () => void;
  expandAllPlayers: () => void;
  startEdit: (entry: ManualScoreHistoryEntry) => void;
  cancelEdit: () => void;
  updateEditRow: <K extends keyof ScoreRowForm>(key: K, value: ScoreRowForm[K]) => void;
  onSaveEdit: (entryId: number) => Promise<void>;
  onDelete: (entry: ManualScoreHistoryEntry) => Promise<void>;
  onBulkDelete: () => Promise<void>;
}

export default function TripManualScoreHistoryCommittedPanel({
  entries,
  groupedEntries,
  loading,
  saving,
  activePlayers,
  editingEntryId,
  editRow,
  selectedEntryIds,
  collapsedPlayerIds,
  selectedEntryCount,
  allVisibleEntriesSelected,
  setError,
  setMessage,
  toggleSelectedEntry,
  toggleSelectAllEntries,
  togglePlayerSelected,
  togglePlayerCollapsed,
  collapseAllPlayers,
  expandAllPlayers,
  startEdit,
  cancelEdit,
  updateEditRow,
  onSaveEdit,
  onDelete,
  onBulkDelete,
}: TripManualScoreHistoryCommittedPanelProps) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Committed Score History Entries</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#555" }}>
          <span>{selectedEntryCount} selected</span>
          <button type="button" style={buttonStyle} disabled={groupedEntries.length === 0} onClick={expandAllPlayers}>Expand All</button>
          <button type="button" style={buttonStyle} disabled={groupedEntries.length === 0} onClick={collapseAllPlayers}>Collapse All</button>
          <button type="button" style={dangerButtonStyle} disabled={saving || selectedEntryCount === 0} onClick={() => void onBulkDelete()}>Remove Selected</button>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: "12px" }}>Loading score history...</div>
      ) : entries.length === 0 ? (
        <div style={{ color: "#555", marginTop: "12px" }}>No score history entries for this event yet.</div>
      ) : (
        <div style={{ maxHeight: "520px", overflowY: "auto", overflowX: "auto", border: "1px solid #d8dee8", borderRadius: "10px" }}>
          <table style={committedTableStyle}>
            <thead>
              <tr>
                <th style={{ ...committedHeaderCellStyle, width: "42px", textAlign: "center" }}>
                  <input type="checkbox" checked={allVisibleEntriesSelected} onChange={(event) => toggleSelectAllEntries(event.target.checked)} aria-label="Select all committed score history entries" />
                </th>
                <th style={committedHeaderCellStyle}>Player</th>
                <th style={committedHeaderCellStyle}>Seq</th>
                <th style={committedHeaderCellStyle}>Score Date</th>
                <th style={committedHeaderCellStyle}>Course Name</th>
                <th style={committedHeaderCellStyle}>Score</th>
                <th style={committedHeaderCellStyle}>CR</th>
                <th style={committedHeaderCellStyle}>Slope</th>
                <th style={committedHeaderCellStyle}>Diff</th>
                <th style={committedHeaderCellStyle}>Holes</th>
                <th style={committedHeaderCellStyle}>Include</th>
                <th style={committedHeaderCellStyle}></th>
              </tr>
            </thead>
            <tbody>
              {groupedEntries.map((group) => {
                const collapsed = collapsedPlayerIds.includes(group.playerId);
                const groupEntryIds = group.entries.map((entry) => entry.scoreHistoryEntryId);
                const selectedInGroup = groupEntryIds.filter((id) => selectedEntryIds.includes(id)).length;
                const allGroupEntriesSelected = groupEntryIds.length > 0 && selectedInGroup === groupEntryIds.length;

                return (
                  <Fragment key={`group-${group.playerId}`}>
                    <tr>
                      <td style={{ ...tdStyle, background: "#f3f6f9", borderTop: "2px solid #cfd8e3", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={allGroupEntriesSelected}
                          onChange={(event) => togglePlayerSelected(group.entries, event.target.checked)}
                          aria-label={`Select all score history entries for ${group.playerName}`}
                        />
                      </td>
                      <td colSpan={11} style={{ ...tdStyle, background: "#f3f6f9", borderTop: "2px solid #cfd8e3", fontWeight: 700 }}>
                        <button type="button" style={{ ...buttonStyle, padding: "2px 8px", marginRight: "10px" }} onClick={() => togglePlayerCollapsed(group.playerId)}>
                          {collapsed ? "+" : "−"}
                        </button>
                        {group.playerName} · {group.entries.length} score{group.entries.length === 1 ? "" : "s"}
                        {selectedInGroup > 0 && <span style={{ marginLeft: "10px", color: "#555", fontWeight: 500 }}>{selectedInGroup} selected</span>}
                      </td>
                    </tr>

                    {!collapsed && group.entries.map((entry) => {
                      const isEditing = editingEntryId === entry.scoreHistoryEntryId && editRow;
                      if (isEditing && editRow) {
                        return (
                          <tr key={entry.scoreHistoryEntryId}>
                            <td style={{ ...tdStyle, textAlign: "center" }}></td>
                            <td style={tdStyle}>{playerSelect(editRow.playerId, (value) => updateEditRow("playerId", value))}</td>
                            <td style={tdStyle}><input type="number" style={{ ...gridInputStyle, width: "52px" }} value={editRow.postingOrder} onChange={(event) => updateEditRow("postingOrder", event.target.value)} /></td>
                            <td style={tdStyle}><input style={{ ...gridInputStyle, width: "76px" }} value={editRow.scoreDate} onChange={(event) => updateEditRow("scoreDate", event.target.value)} placeholder="MM/YY" /></td>
                            <td style={tdStyle}><input style={{ ...gridInputStyle, width: "150px" }} value={editRow.courseName} onChange={(event) => updateEditRow("courseName", event.target.value)} placeholder="Optional" /></td>
                            <td style={tdStyle}><input type="number" style={{ ...gridInputStyle, width: "62px" }} value={editRow.score} onChange={(event) => updateEditRow("score", event.target.value)} /></td>
                            <td style={tdStyle}><input type="number" step="0.1" style={{ ...gridInputStyle, width: "62px" }} value={editRow.courseRating} onChange={(event) => updateEditRow("courseRating", event.target.value)} /></td>
                            <td style={tdStyle}><input type="number" style={{ ...gridInputStyle, width: "58px" }} value={editRow.slope} onChange={(event) => updateEditRow("slope", event.target.value)} /></td>
                            <td style={tdStyle}><input type="number" step="0.1" style={{ ...gridInputStyle, width: "62px" }} value={editRow.differential} onChange={(event) => updateEditRow("differential", event.target.value)} placeholder="Auto" /></td>
                            <td style={tdStyle}>
                              <select style={{ ...gridSelectStyle, width: "64px" }} value={editRow.holesPlayed} onChange={(event) => updateEditRow("holesPlayed", event.target.value)}>
                                <option value="18">18</option><option value="9">9</option>
                              </select>
                            </td>
                            <td style={tdStyle}><input type="checkbox" checked={editRow.includedInMyrtleCalc} onChange={(event) => updateEditRow("includedInMyrtleCalc", event.target.checked)} /></td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button type="button" style={primaryButtonStyle} disabled={saving} onClick={() => void onSaveEdit(entry.scoreHistoryEntryId)}>Save</button>
                                <button type="button" style={buttonStyle} onClick={cancelEdit}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={entry.scoreHistoryEntryId}>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <input type="checkbox" checked={selectedEntryIds.includes(entry.scoreHistoryEntryId)} onChange={() => toggleSelectedEntry(entry.scoreHistoryEntryId)} aria-label={`Select score history entry for ${entry.playerName}`} />
                          </td>
                          <td style={tdStyle}>{entry.playerName}</td>
                          <td style={tdStyle}>{entry.postingOrder ?? "—"}</td>
                          <td style={tdStyle}>{formatScoreMonthYear(entry.scoreDate)}</td>
                          <td style={tdStyle}>{entry.courseName || "—"}</td>
                          <td style={tdStyle}>{entry.adjustedGrossScore ?? entry.grossScore}</td>
                          <td style={tdStyle}>{formatNumber(entry.courseRating, 1)}</td>
                          <td style={tdStyle}>{entry.slope}</td>
                          <td style={tdStyle}>{formatNumber(entry.differential, 1)}</td>
                          <td style={tdStyle}>{entry.holesPlayed}</td>
                          <td style={tdStyle}>{entry.includedInMyrtleCalc === false ? "No" : "Yes"}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button type="button" style={buttonStyle} onClick={() => { setError(null); setMessage(null); startEdit(entry); }}>Edit</button>
                              <button type="button" style={dangerButtonStyle} onClick={() => void onDelete(entry)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
