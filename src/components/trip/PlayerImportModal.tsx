import { useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { commitPlayerImport, previewPlayerImport } from "../../api/playerImportApi";
import {
  buttonStyle,
  errorBoxStyle,
  primaryButtonStyle,
  successBoxStyle,
} from "../../styles/uiStyles";
import type { ImportMatchStatus, PlayerImportRow } from "../../types/playerImport";

interface PlayerImportModalProps {
  tripId: number;
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  zIndex: 1000,
};

const modalStyle: CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22)",
  width: "min(1120px, 96vw)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: "16px 18px",
  borderBottom: "1px solid #e6e8eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const bodyStyle: CSSProperties = {
  padding: "16px 18px",
  overflow: "auto",
};

const footerStyle: CSSProperties = {
  padding: "14px 18px",
  borderTop: "1px solid #e6e8eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "1px solid #d9dee5",
  background: "#f7f9fb",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle: CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #edf0f3",
  verticalAlign: "top",
};

const statusStyle: Record<ImportMatchStatus, CSSProperties> = {
  MATCHED_BY_GHIN: {
    color: "#14532d",
    fontWeight: 700,
  },
  MATCHED_BY_EMAIL: {
    color: "#14532d",
    fontWeight: 700,
  },
  NEW_PLAYER: {
    color: "#1d4ed8",
    fontWeight: 700,
  },
  ALREADY_IN_TRIP: {
    color: "#6b7280",
    fontWeight: 700,
  },
  POSSIBLE_DUPLICATE: {
    color: "#92400e",
    fontWeight: 700,
  },
  INVALID: {
    color: "#b91c1c",
    fontWeight: 700,
  },
};

function readApiError(err: any, fallback: string): string {
  const apiMessage =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  return typeof apiMessage === "string" ? apiMessage : fallback;
}

function getDisplayName(row: PlayerImportRow): string {
  const parts = [row.firstName, row.lastName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" ") : "—";
}

function isBlockingRow(row: PlayerImportRow): boolean {
  return row.matchStatus === "INVALID" || row.matchStatus === "POSSIBLE_DUPLICATE";
}

function canCommitRow(row: PlayerImportRow): boolean {
  return (
    row.matchStatus === "NEW_PLAYER" ||
    row.matchStatus === "MATCHED_BY_EMAIL" ||
    row.matchStatus === "MATCHED_BY_GHIN" ||
    row.matchStatus === "ALREADY_IN_TRIP"
  );
}

function getCommitSummary(rows: PlayerImportRow[]): string {
  const creatableRows = rows.filter((row) => row.matchStatus === "NEW_PLAYER").length;
  const matchedRows = rows.filter(
    (row) =>
      row.matchStatus === "MATCHED_BY_EMAIL" ||
      row.matchStatus === "MATCHED_BY_GHIN" ||
      row.matchStatus === "ALREADY_IN_TRIP",
  ).length;
  const blockingRows = rows.filter(isBlockingRow).length;

  return `${creatableRows} new, ${matchedRows} existing/update, ${blockingRows} blocked`;
}

export default function PlayerImportModal({
  tripId,
  open,
  onClose,
  onImported,
}: PlayerImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PlayerImportRow[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const commitRows = useMemo(() => rows.filter(canCommitRow), [rows]);
  const blockingRows = useMemo(() => rows.filter(isBlockingRow), [rows]);

  if (!open) {
    return null;
  }

  function resetAndClose(): void {
    setSelectedFile(null);
    setRows([]);
    setError(null);
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setRows([]);
    setError(null);
    setStatusMessage(null);
  }

  async function handlePreview(): Promise<void> {
    if (!selectedFile) {
      setError("Choose a CSV file before previewing.");
      return;
    }

    try {
      setPreviewing(true);
      setError(null);
      setStatusMessage(null);

      const previewRows = await previewPlayerImport(tripId, selectedFile);
      setRows(previewRows);
      setStatusMessage(`Preview loaded: ${getCommitSummary(previewRows)}.`);
    } catch (err: any) {
      console.error("Failed to preview player import", err);
      setError(readApiError(err, "Unable to preview this player import."));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit(): Promise<void> {
    if (commitRows.length === 0) {
      setError("There are no importable rows. Review duplicate or invalid rows first.");
      return;
    }

    if (blockingRows.length > 0) {
      setError("Resolve or remove invalid/possible duplicate rows before syncing the roster.");
      return;
    }

    try {
      setCommitting(true);
      setError(null);
      setStatusMessage(null);

      await commitPlayerImport(tripId, commitRows);
      await onImported();

      setStatusMessage(`Roster sync complete. ${commitRows.length} row(s) were processed.`);
      setRows([]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Failed to commit player import", err);
      setError(readApiError(err, "Unable to commit this player import."));
    } finally {
      setCommitting(false);
    }
  }

  function downloadTemplate(): void {
    const csv = "First Name,Last Name,Email,GHIN Number,Gender,Handicap Index\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "player-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="player-import-title">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 id="player-import-title" style={{ margin: 0 }}>
              Import Players
            </h2>
            <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
              Upload a CSV to sync this event roster. Before the event starts, the CSV will add new players, update existing players' frozen indexes/display order, and remove roster players who are not in the CSV.
            </div>
          </div>

          <button type="button" style={buttonStyle} onClick={resetAndClose} disabled={previewing || committing}>
            Close
          </button>
        </div>

        <div style={bodyStyle}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={previewing || committing}
            />

            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handlePreview()}
              disabled={!selectedFile || previewing || committing}
            >
              {previewing ? "Previewing..." : "Preview CSV"}
            </button>

            <button type="button" style={buttonStyle} onClick={downloadTemplate} disabled={previewing || committing}>
              Download Template
            </button>
          </div>

          <div style={{ color: "#666", fontSize: "13px", marginBottom: "12px" }}>
            Required headers: <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>,{" "}
            <strong>GHIN Number</strong>, <strong>Gender</strong>, <strong>Handicap Index</strong>
          </div>

          {error ? <div style={errorBoxStyle}>{error}</div> : null}
          {statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

          {rows.length > 0 ? (
            <div style={{ maxHeight: "460px", overflow: "auto", border: "1px solid #e6e8eb", borderRadius: "8px" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Row</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>GHIN</th>
                    <th style={thStyle}>Gender</th>
                    <th style={thStyle}>Index</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Match / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.rowNumber}-${getDisplayName(row)}`}>
                      <td style={tdStyle}>{row.rowNumber}</td>
                      <td style={tdStyle}>{getDisplayName(row)}</td>
                      <td style={tdStyle}>{row.email || "—"}</td>
                      <td style={tdStyle}>{row.ghinNumber || "—"}</td>
                      <td style={tdStyle}>{row.gender || "—"}</td>
                      <td style={tdStyle}>{row.handicapIndex ?? "—"}</td>
                      <td style={tdStyle}>
                        <span style={statusStyle[row.matchStatus]}>{row.matchStatus}</span>
                      </td>
                      <td style={tdStyle}>
                        {row.matchedPlayerName ? (
                          <div>Matched: {row.matchedPlayerName}</div>
                        ) : null}
                        {row.validationMessage ? <div>{row.validationMessage}</div> : null}
                        {row.matchStatus === "POSSIBLE_DUPLICATE" ? (
                          <div style={{ color: "#92400e" }}>
                            Resolve before roster sync. Add GHIN/email to the CSV or handle this player manually.
                          </div>
                        ) : null}
                        {row.matchStatus === "ALREADY_IN_TRIP" ? (
                          <div style={{ color: "#6b7280" }}>Already on roster. Index/display order will be updated.</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div style={footerStyle}>
          <div style={{ color: "#555", fontSize: "13px" }}>
            {rows.length > 0 ? (
              <>
                Roster sync will process <strong>{commitRows.length}</strong> row(s). {getCommitSummary(rows)}.
                {blockingRows.length > 0 ? (
                  <> Resolve <strong>{blockingRows.length}</strong> blocked row(s) first.</>
                ) : null}
              </>
            ) : (
              "Preview a CSV before committing."
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={resetAndClose} disabled={previewing || committing}>
              Cancel
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleCommit()}
              disabled={commitRows.length === 0 || blockingRows.length > 0 || previewing || committing}
            >
              {committing ? "Syncing..." : "Sync Roster"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
