import { useEffect, useState } from "react";
import { getRoundCorrections } from "../api/roundCorrectionApi";
import type { RoundCorrectionLog } from "../types/roundCorrection";
import { errorBoxStyle, sectionStyle, tdStyle, thStyle } from "../styles/uiStyles";

type Props = {
  roundId: number;
  refreshKey?: number;
};

function formatCorrectionType(value?: string | null): string {
  if (!value) return "";

  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function RoundCorrectionHistoryPanel({
  roundId,
  refreshKey = 0,
}: Props) {
  const [logs, setLogs] = useState<RoundCorrectionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const data = await getRoundCorrections(roundId);
        setLogs(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load correction history."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [roundId, refreshKey]);

  return (
    <section style={sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0 }}>Recent Corrections</h2>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "#374151",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={showLog}
            onChange={(e) => setShowLog(e.target.checked)}
          />
          {showLog ? "Hide Log" : "Show Log"}
        </label>
      </div>

      {showLog && (
        <>
          {loading && <p>Loading correction history.</p>}
          {error && <div style={errorBoxStyle}>{error}</div>}

          {!loading && !error && logs.length === 0 && (
            <p style={{ color: "#666", marginBottom: 0 }}>
              No corrections have been logged for this round.
            </p>
          )}

          {!loading && !error && logs.length > 0 && (
            <div
              style={{
                maxHeight: "280px",
                overflowY: "auto",
                overflowX: "auto",
                paddingRight: "4px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      When
                    </th>
                    <th style={{ ...thStyle, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      Type
                    </th>
                    <th style={{ ...thStyle, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      Player
                    </th>
                    <th style={{ ...thStyle, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      Before
                    </th>
                    <th style={{ ...thStyle, position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>{formatDateTime(log.createdAt)}</td>
                      <td style={tdStyle}>{formatCorrectionType(log.correctionType)}</td>
                      <td style={tdStyle}>{log.playerName ?? "Round"}</td>
                      <td style={tdStyle}>{log.previousValue ?? ""}</td>
                      <td style={tdStyle}>{log.newValue ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}