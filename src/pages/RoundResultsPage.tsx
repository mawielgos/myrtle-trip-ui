import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundGameResults, getRoundStatus } from "../api/roundApi";
import type {
  HoleGameResult,
  RoundGameResult,
  RoundStatus,
  TeamGameResult,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) {
    return "";
  }
  return tied ? `T${value}` : String(value);
}

function formatLabel(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function findHole(team: TeamGameResult, holeNumber: number): HoleGameResult | undefined {
  return team.holeResults.find((hole) => hole.holeNumber === holeNumber);
}

function isTieForPlacement(team: TeamGameResult, teams: TeamGameResult[]): boolean {
  if (team.placement == null) {
    return false;
  }
  return teams.filter((candidate) => candidate.placement === team.placement).length > 1;
}

function formatRoundDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const compactCellStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: "nowrap",
  textAlign: "center",
};

const compactHeaderStyle: React.CSSProperties = {
  ...thStyle,
  whiteSpace: "nowrap",
  textAlign: "center",
};

const scorecardTableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  minWidth: "1200px",
  width: "100%",
  tableLayout: "fixed",
};

const scorecardTeamHeaderStyle: React.CSSProperties = {
  border: "1px solid #bbb",
  background: "#f3f3f3",
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  minWidth: "170px",
  position: "sticky",
  left: 0,
  zIndex: 2,
};

const scorecardHoleHeaderStyle: React.CSSProperties = {
  border: "1px solid #bbb",
  background: "#f7f7f7",
  padding: "8px 0",
  textAlign: "center",
  fontWeight: 700,
  width: "48px",
  minWidth: "48px",
};

const scorecardTotalHeaderStyle: React.CSSProperties = {
  border: "1px solid #bbb",
  background: "#eef3f8",
  padding: "8px 6px",
  textAlign: "center",
  fontWeight: 700,
  width: "62px",
  minWidth: "62px",
};

const scorecardTeamCellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  background: "#fcfcfc",
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  position: "sticky",
  left: 0,
  zIndex: 1,
};

const scorecardValueCellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  background: "#fff",
  padding: "8px 0",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 600,
};

const scorecardTotalCellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  background: "#f9fbfd",
  padding: "8px 6px",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 700,
};

export default function RoundResultsPage() {
  const navigate = useNavigate();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [results, setResults] = useState<RoundGameResult | null>(null);
  const [loading, setLoading] = useState(true);
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

      const [roundStatus, roundResults] = await Promise.all([
        getRoundStatus(id),
        getRoundGameResults(id),
      ]);

      const orderedTeams = [...roundResults.teams].sort((a, b) => {
        const placementA = a.placement ?? Number.MAX_SAFE_INTEGER;
        const placementB = b.placement ?? Number.MAX_SAFE_INTEGER;
        if (placementA !== placementB) {
          return placementA - placementB;
        }

        const netA = a.totalNet ?? Number.MAX_SAFE_INTEGER;
        const netB = b.totalNet ?? Number.MAX_SAFE_INTEGER;
        if (netA !== netB) {
          return netA - netB;
        }

        const grossA = a.totalGross ?? Number.MAX_SAFE_INTEGER;
        const grossB = b.totalGross ?? Number.MAX_SAFE_INTEGER;
        if (grossA !== grossB) {
          return grossA - grossB;
        }

        return (a.teamName ?? "").localeCompare(b.teamName ?? "");
      });

      setStatus(roundStatus);
      setResults({
        ...roundResults,
        teams: orderedTeams,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load round results.");
    } finally {
      setLoading(false);
    }
  }

  const holes = useMemo(() => Array.from({ length: 18 }, (_, index) => index + 1), []);

  const scoreFlavor = useMemo(() => {
    const format = results?.format;
    if (!format) {
      return "net";
    }
    return format === "TEAM_SCRAMBLE" ? "gross" : "net";
  }, [results]);

  // TODO:
  // When backend support is added, replace the simple hole-number headers with
  // true scorecard metadata from the API:
  // holes: [{ holeNumber, par, handicap }]
  // Then render scorecard-style header rows for Hole #, Par, and Hdcp.

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !status || !results) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div style={errorBoxStyle}>{error ?? "Round results not found."}</div>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Round Results</h1>
          <div style={{ marginTop: "8px", color: "#555" }}>
            Round {status.roundId}
            {status.courseName ? ` • ${status.courseName}` : ""}
            {status.teeName ? ` • ${status.teeName}` : ""}
            {status.roundDate ? ` • ${formatRoundDate(status.roundDate)}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() => navigate(`/rounds/${status.roundId}/teams`)}
          >
            Teams
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() => navigate(`/rounds/${status.roundId}/scoring`)}
          >
            Scoring
          </button>
          <button
            style={primaryButtonStyle}
            type="button"
            onClick={() => void loadPage(status.roundId)}
          >
            Refresh
          </button>
        </div>
      </div>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Summary</h2>

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Format</div>
            <div style={summaryValueStyle}>{formatLabel(results.format)}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Finalized</div>
            <div style={summaryValueStyle}>{status.finalized ? "Yes" : "No"}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Teams</div>
            <div style={summaryValueStyle}>{results.teams.length}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Scored By</div>
            <div style={summaryValueStyle}>
              {scoreFlavor === "gross" ? "Gross" : "Net"}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Points Shown</div>
            <div style={summaryValueStyle}>
              {results.teams.some((team) => (team.totalPoints ?? 0) > 0) ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </section>
      {status ? (
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="results"
          format={status.format}
          finalized={status.finalized}
        />
      ) : null}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Standings</h2>

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Place</th>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Gross</th>
                <th style={thStyle}>Net</th>
                <th style={thStyle}>Points</th>
              </tr>
            </thead>
            <tbody>
              {results.teams.map((team) => (
                <tr key={team.teamId}>
                  <td style={tdStyle}>
                    {placementLabel(team.placement, isTieForPlacement(team, results.teams))}
                  </td>
                  <td style={tdStyle}>{team.teamName}</td>
                  <td style={tdStyle}>{team.totalGross ?? ""}</td>
                  <td style={tdStyle}>{team.totalNet ?? ""}</td>
                  <td style={tdStyle}>{team.totalPoints ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Hole-by-Hole</h2>

        <div style={tableWrapStyle}>
          <table style={scorecardTableStyle}>
            <thead>
              <tr>
                <th style={scorecardTeamHeaderStyle}>Team</th>
                {holes.map((holeNumber) => (
                  <th key={holeNumber} style={scorecardHoleHeaderStyle}>
                    {holeNumber}
                  </th>
                ))}
                <th style={scorecardTotalHeaderStyle}>Gross</th>
                <th style={scorecardTotalHeaderStyle}>Net</th>
                <th style={scorecardTotalHeaderStyle}>Points</th>
              </tr>
            </thead>
            <tbody>
              {results.teams.map((team) => (
                <tr key={team.teamId}>
                  <td style={scorecardTeamCellStyle}>{team.teamName}</td>
                  {holes.map((holeNumber) => {
                    const hole = findHole(team, holeNumber);
                    const value = scoreFlavor === "gross" ? hole?.grossScore : hole?.netScore;

                    return (
                      <td key={holeNumber} style={scorecardValueCellStyle}>
                        {value ?? ""}
                      </td>
                    );
                  })}
                  <td style={scorecardTotalCellStyle}>{team.totalGross ?? ""}</td>
                  <td style={scorecardTotalCellStyle}>{team.totalNet ?? ""}</td>
                  <td style={scorecardTotalCellStyle}>{team.totalPoints ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {results.teams.some((team) =>
        team.holeResults.some((hole) => (hole.points ?? 0) > 0)
      ) && (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Hole Points Detail</h2>

          <div style={tableWrapStyle}>
            <table style={scorecardTableStyle}>
              <thead>
                <tr>
                  <th style={scorecardTeamHeaderStyle}>Team</th>
                  {holes.map((holeNumber) => (
                    <th key={holeNumber} style={scorecardHoleHeaderStyle}>
                      {holeNumber}
                    </th>
                  ))}
                  <th style={scorecardTotalHeaderStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {results.teams.map((team) => (
                  <tr key={team.teamId}>
                    <td style={scorecardTeamCellStyle}>{team.teamName}</td>
                    {holes.map((holeNumber) => {
                      const hole = findHole(team, holeNumber);
                      return (
                        <td key={holeNumber} style={scorecardValueCellStyle}>
                          {hole?.points ?? ""}
                        </td>
                      );
                    })}
                    <td style={scorecardTotalCellStyle}>{team.totalPoints ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}