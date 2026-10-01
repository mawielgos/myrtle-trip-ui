import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  finalizeRound,
  getRoundScorecards,
  getRoundStatus,
  getScorecardDetail,
  saveBulkScores,
} from "../api/roundApi";
import type {
  BulkScoreEntryRequest,
  RoundScorecardSummary,
  RoundStatus,
  ScorecardDetail,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";

type ScoreRow = {
  scorecardId: number;
  playerId: number;
  playerName: string;
  teamId?: number | null;
  teamName?: string | null;
  teeName?: string | null;
  alternateTeeName?: string | null;
  currentTeeName?: string | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  netScore?: number | null;
  adjustedGrossScore?: number | null;
  holes: string[];
  useAlternateTee: boolean;
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fafafa",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const stickyColumnStyle: React.CSSProperties = {
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 2,
};

const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  background: "#f9fafb",
  zIndex: 3,
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #d1d5db",
  padding: "0.45rem",
  textAlign: "left",
  whiteSpace: "nowrap",
  background: "#f9fafb",
};

const centeredThStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "0.45rem",
  verticalAlign: "top",
};

const centeredTdStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

const metaCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  whiteSpace: "nowrap",
};

const holeInputStyle: React.CSSProperties = {
  width: "2.4rem",
  minWidth: "2.4rem",
  textAlign: "center",
  padding: "0.25rem",
  fontSize: "0.95rem",
  lineHeight: 1.2,
  border: "1px solid #bbb",
  borderRadius: "4px",
  boxSizing: "border-box",
  appearance: "textfield",
  MozAppearance: "textfield" as any,
  WebkitAppearance: "none",
};

const subtotalCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  fontWeight: 700,
  background: "#f8fafc",
};

function buildRows(
  summaries: RoundScorecardSummary[],
  details: ScorecardDetail[]
): ScoreRow[] {
  const detailByScorecard = new Map<number, ScorecardDetail>();
  details.forEach((detail) => detailByScorecard.set(detail.scorecardId, detail));

  return summaries.map((summary) => {
    const detail = detailByScorecard.get(summary.scorecardId);

    const holes = Array.from({ length: 18 }, (_, index) => {
      const holeNumber = index + 1;
      const hole = detail?.holes?.find((item) => item.holeNumber === holeNumber);
      return hole?.strokes != null ? String(hole.strokes) : "";
    });

    return {
      scorecardId: summary.scorecardId,
      playerId: summary.playerId,
      playerName: summary.playerName,
      teamId: summary.teamId,
      teamName: detail?.teamName ?? summary.teamName,
      teeName: detail?.teeName ?? summary.teeName,
      alternateTeeName: detail?.alternateTeeName ?? summary.alternateTeeName,
      currentTeeName: detail?.currentTeeName ?? summary.currentTeeName,
      courseHandicap: detail?.courseHandicap ?? summary.courseHandicap,
      playingHandicap: detail?.playingHandicap ?? summary.playingHandicap,
      grossScore: detail?.grossScore ?? summary.grossScore,
      netScore: detail?.netScore ?? summary.netScore,
      adjustedGrossScore: detail?.adjustedGrossScore ?? summary.adjustedGrossScore,
      holes,
      useAlternateTee: detail?.useAlternateTee ?? summary.useAlternateTee,
    };
  });
}

function sumHoleRange(holes: string[], startInclusive: number, endExclusive: number): number {
  return holes
    .slice(startInclusive, endExclusive)
    .reduce((sum, value) => sum + (value === "" ? 0 : Number(value)), 0);
}

function getDisplayTeeName(row: ScoreRow): string {
  if (row.currentTeeName) {
    return row.currentTeeName;
  }

  if (row.useAlternateTee && row.alternateTeeName) {
    return row.alternateTeeName;
  }

  return row.teeName ?? "";
}

export default function RoundScoringPage() {
  const navigate = useNavigate();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericRoundId) || numericRoundId <= 0) {
      setError("Invalid round id.");
      setLoading(false);
      return;
    }

    void loadPage(numericRoundId);
  }, [numericRoundId]);

  async function loadPage(id: number): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const roundStatus = await getRoundStatus(id);
      const roundScorecards = await getRoundScorecards(id);
      const details = await Promise.all(
        roundScorecards.map((scorecard) => getScorecardDetail(scorecard.scorecardId))
      );

      setStatus(roundStatus);
      setRows(buildRows(roundScorecards, details));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load round scoring page."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateHole(scorecardId: number, holeIndex: number, value: string): void {
    const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 2);

    setRows((prev) =>
      prev.map((row) => {
        if (row.scorecardId !== scorecardId) {
          return row;
        }

        const nextHoles = [...row.holes];
        nextHoles[holeIndex] = digitsOnly;

        return {
          ...row,
          holes: nextHoles,
        };
      })
    );

    setMessage(null);
    setError(null);
  }

  async function handleSaveScores(): Promise<void> {
    if (!status) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const request: BulkScoreEntryRequest = {
        scorecards: rows.map((row) => ({
          playerId: row.playerId,
          holes: row.holes.map((value) => (value === "" ? null : Number(value))),
        })),
      };

      await saveBulkScores(status.roundId, request);
      await loadPage(status.roundId);
      setMessage("Scores saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scores.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalizeRound(): Promise<void> {
    if (!status) {
      return;
    }

    if (!canFinalize) {
      setError("Every player must have all 18 holes entered before finalizing.");
      setMessage(null);
      return;
    }

    try {
      setFinalizing(true);
      setError(null);
      setMessage(null);

      await finalizeRound(status.roundId);
      await loadPage(status.roundId);
      setMessage("Round finalized.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize round.");
    } finally {
      setFinalizing(false);
    }
  }

  const summary = useMemo(() => {
    const completedPlayers = rows.filter((row) => row.holes.every((hole) => hole !== ""));
    const incompletePlayers = rows.filter((row) => row.holes.some((hole) => hole === ""));
    const unassignedPlayers = rows.filter((row) => !row.teamId);
    const partiallyEnteredPlayers = rows.filter((row) => {
      const filledCount = row.holes.filter((hole) => hole !== "").length;
      return filledCount > 0 && filledCount < 18;
    });

    return {
      playerCount: rows.length,
      completedCount: completedPlayers.length,
      incompleteCount: incompletePlayers.length,
      unassignedCount: unassignedPlayers.length,
      partiallyEnteredCount: partiallyEnteredPlayers.length,
      unassignedPlayers,
      incompletePlayers,
    };
  }, [rows]);

  const hasUnassignedPlayers = summary.unassignedCount > 0;
  const hasIncompleteScorecards = summary.incompleteCount > 0;
  const canFinalize = !status?.finalized && !hasIncompleteScorecards && rows.length > 0;
  const saveDisabled = !!status?.finalized || saving || finalizing;
  const finalizeDisabled = !!status?.finalized || finalizing || saving || !canFinalize;

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div style={errorBoxStyle}>{error ?? "Round not found."}</div>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Round Scoring</h1>
          <div style={{ marginTop: "8px", color: "#555" }}>
            Round {status.roundId}
            {status.courseName ? ` • ${status.courseName}` : ""}
            {status.teeName
              ? status.alternateTeeName
                ? ` • ${status.teeName} / ${status.alternateTeeName}`
                : ` • ${status.teeName}`
              : ""}
            {status.roundDate ? ` • ${status.roundDate}` : ""}
          </div>
        </div>

        <div style={topButtonRowStyle}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate(`/rounds/${status.roundId}/teams`)}
          >
            Teams
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate(`/rounds/${status.roundId}/results`)}
          >
            Results
          </button>
          <button type="button" style={buttonStyle} onClick={() => window.history.back()}>
            Back
          </button>
        </div>
      </div>

      {hasUnassignedPlayers ? (
        <div style={warningBoxStyle}>
          Team assignment warning: {summary.unassignedCount} player
          {summary.unassignedCount === 1 ? "" : "s"} do not have a team assignment yet.
          <div style={{ marginTop: "8px" }}>
            {summary.unassignedPlayers.map((player) => player.playerName).join(", ")}
          </div>
        </div>
      ) : null}

      {hasIncompleteScorecards ? (
        <div style={warningBoxStyle}>
          Finalize is disabled until all players have 18 holes entered.
          <div style={{ marginTop: "8px" }}>
            Incomplete cards: {summary.incompleteCount}
          </div>
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Finalized</div>
              <div style={summaryValueStyle}>{status.finalized ? "Yes" : "No"}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Players</div>
              <div style={summaryValueStyle}>{summary.playerCount}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Completed</div>
              <div style={summaryValueStyle}>
                {summary.completedCount} / {summary.playerCount}
              </div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Incomplete</div>
              <div style={summaryValueStyle}>{summary.incompleteCount}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Unassigned</div>
              <div style={summaryValueStyle}>{summary.unassignedCount}</div>
            </div>
          </div>

          <div style={topButtonRowStyle}>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void loadPage(status.roundId)}
              disabled={saving || finalizing}
            >
              Refresh
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleSaveScores()}
              disabled={saveDisabled}
            >
              {saving ? "Saving..." : "Save Scores"}
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleFinalizeRound()}
              disabled={finalizeDisabled}
              title={
                canFinalize
                  ? "Finalize round"
                  : "All players must have all 18 holes entered before finalizing"
              }
            >
              {finalizing ? "Finalizing..." : "Finalize Round"}
            </button>
          </div>
        </div>
      </section>
      {status ? (
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="scoring"
          format={status.format}
          finalized={status.finalized}
        />
      ) : null}
      <section style={sectionStyle}>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th
                  style={{
                    ...thStyle,
                    ...stickyHeaderStyle,
                    ...stickyColumnStyle,
                    minWidth: "14rem",
                  }}
                  rowSpan={2}
                >
                  Player
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  Team
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  Tee
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  CH
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  PH
                </th>

                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} colSpan={9}>
                  OUT
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  OUT
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} colSpan={9}>
                  IN
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  IN
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  TOTAL
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  Adj
                </th>
                <th style={{ ...centeredThStyle, ...stickyHeaderStyle }} rowSpan={2}>
                  Net
                </th>
              </tr>
              <tr>
                {Array.from({ length: 18 }, (_, i) => (
                  <th
                    key={i}
                    style={{
                      ...centeredThStyle,
                      ...stickyHeaderStyle,
                      minWidth: "3rem",
                    }}
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const filledHoleCount = row.holes.filter((hole) => hole !== "").length;
                const rowIsComplete = filledHoleCount === 18;

                const outTotal = sumHoleRange(row.holes, 0, 9);
                const inTotal = sumHoleRange(row.holes, 9, 18);
                const total = outTotal + inTotal;

                return (
                  <tr key={row.scorecardId}>
                    <td
                      style={{
                        ...tdStyle,
                        ...stickyColumnStyle,
                        minWidth: "14rem",
                        boxShadow: "1px 0 0 #e5e7eb",
                      }}
                    >
                      <div>{row.playerName}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {rowIsComplete ? "Complete" : `${filledHoleCount}/18 entered`}
                      </div>
                    </td>

                    <td style={metaCellStyle}>{row.teamName ?? ""}</td>
                    <td style={metaCellStyle}>{getDisplayTeeName(row)}</td>
                    <td style={metaCellStyle}>{row.courseHandicap ?? ""}</td>
                    <td style={metaCellStyle}>{row.playingHandicap ?? ""}</td>

                    {row.holes.slice(0, 9).map((hole, index) => (
                      <td key={`front-${index}`} style={centeredTdStyle}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={hole}
                          disabled={status.finalized || saving || finalizing}
                          onChange={(e) => updateHole(row.scorecardId, index, e.target.value)}
                          style={holeInputStyle}
                        />
                      </td>
                    ))}

                    <td style={subtotalCellStyle}>
                      {outTotal > 0 || row.holes.slice(0, 9).some((hole) => hole !== "")
                        ? outTotal
                        : ""}
                    </td>

                    {row.holes.slice(9, 18).map((hole, index) => (
                      <td key={`back-${index}`} style={centeredTdStyle}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={hole}
                          disabled={status.finalized || saving || finalizing}
                          onChange={(e) =>
                            updateHole(row.scorecardId, index + 9, e.target.value)
                          }
                          style={holeInputStyle}
                        />
                      </td>
                    ))}

                    <td style={subtotalCellStyle}>
                      {inTotal > 0 || row.holes.slice(9, 18).some((hole) => hole !== "")
                        ? inTotal
                        : ""}
                    </td>

                    <td style={subtotalCellStyle}>
                      {total > 0 || row.holes.some((hole) => hole !== "") ? total : ""}
                    </td>
                    <td style={subtotalCellStyle}>{row.adjustedGrossScore ?? ""}</td>
                    <td style={subtotalCellStyle}>{row.netScore ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}