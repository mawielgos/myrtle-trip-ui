import type { GhinFixRow } from "../types/ghinFix";
import {
  formInputStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import { buildRowHint, formatNullableNumber } from "./tripGhinFixesLogic";

type Props = {
  sortedRows: GhinFixRow[];
  drafts: Record<number, string>;
  savingRowId: number | null;
  numericTripId: number;
  updateDraft: (scoreHistoryEntryId: number, value: string) => void;
  handleSave: (row: GhinFixRow) => Promise<void>;
  handleSaveAll: () => Promise<void>;
  navigateIfConfirmed: (path: string) => Promise<void>;
};

export default function TripGhinFixesTable({
  sortedRows,
  drafts,
  savingRowId,
  numericTripId,
  updateDraft,
  handleSave,
  handleSaveAll,
  navigateIfConfirmed,
}: Props) {
  return (
    <div style={sectionStyle}>
        {sortedRows.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>No outstanding GHIN fixes.</div>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void navigateIfConfirmed(`/trips/${numericTripId}`)}
            >
              Return to Event
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "980px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>GHIN #</th>
                  <th style={thStyle}>Row Info</th>
                  <th style={thStyle}>Gross</th>
                  <th style={thStyle}>Rating</th>
                  <th style={thStyle}>Slope</th>
                  <th style={thStyle}>Current Diff</th>
                  <th style={thStyle}>Manual Diff</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const isSaving = savingRowId === row.scoreHistoryEntryId;

                  return (
                    <tr key={row.scoreHistoryEntryId}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.playerName}</div>
                      </td>
                      <td style={tdStyle}>{row.ghinNumber || "—"}</td>
                      <td style={tdStyle}>{buildRowHint(row)}</td>
                      <td style={tdStyle}>{row.grossScore ?? "—"}</td>
                      <td style={tdStyle}>{formatNullableNumber(row.courseRating, 1)}</td>
                      <td style={tdStyle}>{row.slope ?? "—"}</td>
                      <td style={tdStyle}>{formatNullableNumber(row.differential, 3)}</td>
                      <td style={tdStyle}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={drafts[row.scoreHistoryEntryId] ?? ""}
                          onChange={(e) =>
                            updateDraft(row.scoreHistoryEntryId, e.target.value)
                          }
                          placeholder="Enter diff"
                          style={{ ...formInputStyle, minWidth: "110px" }}
                          disabled={savingRowId === -1 || isSaving}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={primaryButtonStyle}
                          onClick={() => void handleSave(row)}
                          disabled={savingRowId === -1 || isSaving}
                        >
                          {isSaving ? "Saving..." : "Save Fix"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSaveAll()}
                disabled={savingRowId != null || sortedRows.length === 0}
              >
                {savingRowId === -1 ? "Saving All..." : "Save All Fixes"}
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
