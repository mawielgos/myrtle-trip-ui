import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type { RoundPlayerStatusResponse, RoundSetupStatusResponse } from "../types/round";
import {
  buttonStyle,
  disabledButtonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { formatGameDescription } from "../utils/gameFormat";
import { downloadCsv, sanitizeFileName } from "../utils/exportUtils";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import { buildScoreEntryAction } from "../utils/roundNavigation";

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

function formatTeeTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const parts = value.split(":");
  if (parts.length < 2) {
    return value;
  }

  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatHandicap(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return String(value);
}

function formatStartingHole(value?: number | null): string {
  if (value === 10) {
    return "#10";
  }

  if (value === 1) {
    return "#1";
  }

  return "—";
}

type TeeSheetStartTypeMessage = {
  label: string;
  description: string;
};

function getTeeSheetStartTypeMessage(
  groups: Array<{ startingHole?: number | null }>
): TeeSheetStartTypeMessage {
  const startingHoles = Array.from(
    new Set(
      groups
        .map((group) => group.startingHole)
        .filter((hole): hole is number => hole != null)
    )
  ).sort((a, b) => a - b);

  if (groups.length === 0 || startingHoles.length === 0) {
    return {
      label: "Start Type: Not Configured",
      description: "No tee sheet starting holes have been configured yet.",
    };
  }

  if (startingHoles.length === 1 && startingHoles[0] === 1) {
    return {
      label: "Start Type: Tee Times",
      description: "All groups start on Hole #1.",
    };
  }

  if (
    startingHoles.length === 2 &&
    startingHoles.includes(1) &&
    startingHoles.includes(10)
  ) {
    return {
      label: "Start Type: Split Tees",
      description: "Groups start on Holes #1 and #10.",
    };
  }

  return {
    label: "Start Type: Shotgun Start",
    description: "Groups start on assigned holes.",
  };
}

const printStyles = `
@media print {
  body { background: #fff !important; }
  header, nav, button, .no-print { display: none !important; }
  .tee-sheet-print-page { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .tee-sheet-card { break-inside: avoid; page-break-inside: avoid; }
  .tee-sheet-title { margin-top: 0 !important; }
}
`;

const groupGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "14px",
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
};

const startTypeBannerStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  background: "#eff6ff",
  padding: "10px 12px",
  marginBottom: "14px",
  color: "#1e3a8a",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const startTypeLabelStyle: React.CSSProperties = {
  fontWeight: 700,
};

const startTypeDescriptionStyle: React.CSSProperties = {
  fontSize: "13px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #d5d9de",
  padding: "6px 4px",
  fontSize: "13px",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #edf0f2",
  padding: "6px 4px",
  fontSize: "13px",
};

export default function RoundTeeSheetPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RoundSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getRoundSetupStatus(Number(roundId));
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load tee sheet.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const playersById = useMemo(() => {
    const result = new Map<number, RoundPlayerStatusResponse>();
    (data?.round.players ?? []).forEach((player) => result.set(player.playerId, player));
    return result;
  }, [data]);

  const groups = useMemo(() => {
    return [...(data?.groups.groups ?? [])].sort((a, b) => {
      if (a.teeTime && b.teeTime && a.teeTime !== b.teeTime) {
        return a.teeTime.localeCompare(b.teeTime);
      }

      if (a.teeTime && !b.teeTime) {
        return -1;
      }

      if (!a.teeTime && b.teeTime) {
        return 1;
      }

      return a.groupNumber - b.groupNumber;
    });
  }, [data]);

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading tee sheet...</div>;
  }

  if (error) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>Round data was not found.</div>
      </div>
    );
  }

  const round = data.round;
  const teeSheetStartTypeMessage = getTeeSheetStartTypeMessage(groups);
  const groupsButtonLabel = round.finalized || round.tripLocked ? "View Groups" : "Edit Groups";
  const scoringReady = Boolean(data.readiness?.ready ?? data.readiness?.readyForScoring);
  const canNavigateToScoring = scoringReady || round.finalized;
  const scoreEntryAction = buildScoreEntryAction(round.roundId, round);
  const scoringButtonStyle = canNavigateToScoring
    ? primaryButtonStyle
    : { ...buttonStyle, ...disabledButtonStyle };
  const scoringButtonTitle = canNavigateToScoring
    ? undefined
    : "Complete round setup before opening scoring.";

  function handleExportCsv(): void {
    const rows: Array<Array<string | number | null | undefined>> = [
      ["Group", "Tee Time", "Starting Hole", "Player", "Tee", "Course Handicap", "Playing Handicap"],
    ];

    groups.forEach((group) => {
      (group.players ?? []).forEach((groupPlayer) => {
        const player = playersById.get(groupPlayer.playerId);
        rows.push([
          group.groupNumber,
          formatTeeTime(group.teeTime),
          formatStartingHole(group.startingHole),
          groupPlayer.playerName,
          player?.roundTeeName ?? "",
          player?.courseHandicap ?? "",
          player?.playingHandicap ?? "",
        ]);
      });
    });

    const baseName = sanitizeFileName(`${round.courseName || "round"}-${round.roundDate || round.roundId}-tee-sheet`);
    downloadCsv(`${baseName}.csv`, rows);
  }

  return (
    <div style={pageContainerWideStyle} className="tee-sheet-print-page">
      <style>{printStyles}</style>

      <PageHeader
        title="Tee Sheet"
        subtitle={`${round.courseName} • ${formatRoundDate(round.roundDate)} • ${formatGameDescription(round.format)}`}
        actions={
          <>
            {round.tripId ? <TripDetailButton tripId={round.tripId} /> : null}
            {round.tripId ? <ReportsButton tripId={round.tripId} /> : null}
            <button type="button" style={buttonStyle} onClick={() => navigate(`/rounds/${round.roundId}/groups`)}>
              {groupsButtonLabel}
            </button>
            <button
              type="button"
              style={scoringButtonStyle}
              onClick={() => {
                if (!canNavigateToScoring) {
                  return;
                }
                navigate(scoreEntryAction.path);
              }}
              disabled={!canNavigateToScoring}
              title={scoringButtonTitle}
            >
              {scoreEntryAction.label}
            </button>
            <button type="button" style={buttonStyle} onClick={() => printWithReportTitle(buildReportFileTitle(round.courseName || "Event", "Tee Sheet", round.roundDate || `Round ${round.roundId}`))}>
              Print
            </button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv}>
              Export CSV
            </button>
          </>
        }
      />

      <section style={sectionStyle}>
        <h2 className="tee-sheet-title" style={{ marginTop: 0 }}>Round Information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "8px 14px" }}>
          <strong>Course</strong>
          <span>{round.courseName}</span>
          <strong>Date</strong>
          <span>{formatRoundDate(round.roundDate)}</span>
          <strong>Format</strong>
          <span>{formatGameDescription(round.format)}</span>
          <strong>Default Tee</strong>
          <span>{round.teeName}</span>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Groups</h2>
        <div style={startTypeBannerStyle}>
          <span style={startTypeLabelStyle}>{teeSheetStartTypeMessage.label}</span>
          <span style={startTypeDescriptionStyle}>{teeSheetStartTypeMessage.description}</span>
        </div>
        {groups.length === 0 ? (
          <div style={{ color: "#666" }}>No groups have been created for this round.</div>
        ) : (
          <div style={groupGridStyle}>
            {groups.map((group) => (
              <div key={group.groupId} style={groupCardStyle} className="tee-sheet-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <strong>Group {group.groupNumber}</strong>
                  <strong>{formatTeeTime(group.teeTime)} • {formatStartingHole(group.startingHole)}</strong>
                </div>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Player</th>
                      <th style={thStyle}>Tee</th>
                      <th style={thStyle}>CH</th>
                      <th style={thStyle}>PH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.players ?? []).map((groupPlayer) => {
                      const player = playersById.get(groupPlayer.playerId);
                      return (
                        <tr key={groupPlayer.playerId}>
                          <td style={tdStyle}>{groupPlayer.playerName}</td>
                          <td style={tdStyle}>{player?.roundTeeName ?? "—"}</td>
                          <td style={tdStyle}>{formatHandicap(player?.courseHandicap)}</td>
                          <td style={tdStyle}>{formatHandicap(player?.playingHandicap)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
