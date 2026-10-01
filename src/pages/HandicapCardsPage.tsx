import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getHandicapCardDetail,
  getHandicapCards,
} from "../api/handicapCardApi";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import {
  appTableCellStyle,
  appTableHeaderCellStyle,
  appTableNameCellStyle,
  appTableNumericCellStyle,
  appTableRowBackground,
  appTableStyle,
  borderColor,
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
  subtleBackground,
  subtleBorderColor,
} from "../styles/uiStyles";
import type {
  HandicapCardDetailResponse,
  HandicapCardsResponse,
  HandicapCardPlayerSummary,
} from "../types/handicapCard";
import { formatHandicapMethod } from "../utils/handicapMethod";

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilePart(value: string | null | undefined): string {
  return (
    (value ?? "handicap-cards")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "handicap-cards"
  );
}

function formatScoreValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }
  return String(value);
}

function buildDetailedHandicapCardsCsv(
  data: HandicapCardsResponse,
  details: HandicapCardDetailResponse[],
): Array<Array<string | number | null | undefined>> {
  const rows: Array<Array<string | number | null | undefined>> = [];
  rows.push(["Handicap Cards"]);
  rows.push(["Event", data.tripName]);
  rows.push(["As Of", data.asOfDate ?? ""]);
  rows.push([]);

  for (const detail of details) {
    rows.push(["Player", detail.playerName]);
    rows.push(["Event Index", formatDecimal(detail.tripIndex)]);
    rows.push(["Pending Index", formatDecimal(detail.pendingTripIndex)]);
    rows.push(["Method", formatHandicapMethod(detail.handicapMethod)]);
    rows.push(["Eligible", detail.eligibleScoreCount ?? ""]);
    rows.push(["Window", detail.windowScoreCount ?? ""]);
    rows.push(["Used", detail.usedScoreCount ?? ""]);
    rows.push([
      "Date",
      "Course",
      "Gross",
      "Adjusted Gross",
      "CR",
      "Slope",
      "Differential",
      "Holes",
      "Source",
      "Used",
      "Pending",
      "Reason",
    ]);
    for (const score of detail.scores ?? []) {
      rows.push([
        score.scoreDate ?? "",
        score.courseName ?? "",
        formatScoreValue(score.grossScore),
        formatScoreValue(score.adjustedGrossScore),
        formatDecimal(score.courseRating),
        score.slope ?? "",
        formatDecimal(score.differential),
        score.holesPlayed ?? "",
        score.sourceType ?? "",
        score.usedInIndex ? "Y" : "",
        score.pendingForCalculationDate ? "Y" : "",
        score.exclusionReason ?? "",
      ]);
    }
    rows.push([]);
  }

  return rows;
}

function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value;
}

const tableWrapperStyle: CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  background: "#fff",
};

const statusBadgeBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "74px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  border: `1px solid ${subtleBorderColor}`,
};

function getStatusBadgeStyle(
  statusCode: string | null | undefined,
): CSSProperties {
  if (statusCode === "READY") {
    return {
      ...statusBadgeBaseStyle,
      color: "#1f6b2a",
      background: "#edf8f0",
      border: "1px solid #d8e8dc",
    };
  }

  return {
    ...statusBadgeBaseStyle,
    color: "#8a5a00",
    background: "#fff7e6",
    border: "1px solid #f2d39b",
  };
}

function buildSubtitle(data: HandicapCardsResponse | null): string {
  if (!data) {
    return "Review each player’s handicap calculation card.";
  }

  const asOf = data.asOfDate ? ` as of ${data.asOfDate}` : "";
  return `${data.tripName}${asOf} • ${data.players.length} player${data.players.length === 1 ? "" : "s"}`;
}

export default function HandicapCardsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tripId = Number(params.tripId);

  const [data, setData] = useState<HandicapCardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailCards, setDetailCards] = useState<HandicapCardDetailResponse[]>(
    [],
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const sortedPlayers = useMemo(() => {
    const players = [...(data?.players ?? [])];
    players.sort((a, b) => {
      const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.playerName.localeCompare(b.playerName);
    });
    return players;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(tripId)) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getHandicapCards(tripId);
        if (!cancelled) {
          setData(response);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ??
              err?.message ??
              "Unable to load handicap cards.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function loadAllDetails(): Promise<HandicapCardDetailResponse[]> {
    if (!data) {
      return [];
    }

    if (
      detailCards.length === sortedPlayers.length &&
      sortedPlayers.length > 0
    ) {
      return detailCards;
    }

    setDetailsLoading(true);
    try {
      const details: HandicapCardDetailResponse[] = [];
      for (const player of sortedPlayers) {
        const detail = await getHandicapCardDetail(
          tripId,
          player.playerId,
          data.asOfDate,
        );
        details.push(detail);
      }
      setDetailCards(details);
      return details;
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handlePrint(): Promise<void> {
    await loadAllDetails();
    printWithReportTitle(buildReportFileTitle(data?.tripName || "Event", "Handicap Cards"));
  }

  async function handleExportCsv(): Promise<void> {
    if (!data) {
      return;
    }
    const details = await loadAllDetails();
    downloadCsv(
      `${sanitizeFilePart(data.tripName)}-handicap-cards.csv`,
      buildDetailedHandicapCardsCsv(data, details),
    );
  }

  function openPlayer(player: HandicapCardPlayerSummary): void {
    navigate(`/trips/${tripId}/handicap-cards/players/${player.playerId}`);
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Handicap Cards"
        subtitle={buildSubtitle(data)}
        actions={
          <>
            <TripDetailButton tripId={tripId} />
            <ReportsButton tripId={tripId} />
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: "8px" }}
              disabled={loading || sortedPlayers.length === 0 || detailsLoading}
              onClick={() => void handlePrint()}
            >
              {detailsLoading ? "Loading..." : "Print"}
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: "8px" }}
              disabled={loading || sortedPlayers.length === 0 || detailsLoading}
              onClick={() => void handleExportCsv()}
            >
              Export CSV
            </button>
          </>
        }
      />

      <style>{`
        .handicap-cards-print-report { display: none; }
        @media print {
          @page { size: landscape; margin: 0.32in; }
          button { display: none !important; }
          .handicap-cards-screen { display: none !important; }
          .handicap-cards-print-report { display: block !important; }
          .handicap-card-print-card { break-after: page; page-break-after: always; }
          .handicap-card-print-card:last-child { break-after: auto; page-break-after: auto; }
          .handicap-card-print-title { font-size: 21px; font-weight: 800; margin: 0 0 2px; }
          .handicap-card-print-subtitle { font-size: 12px; margin: 0 0 8px; color: #333; }
          .handicap-card-print-metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; margin-bottom: 9px; }
          .handicap-card-print-metric { border: 1px solid #aaa; padding: 5px; font-size: 10px; }
          .handicap-card-print-metric strong { display: block; font-size: 12px; margin-top: 2px; }
          .handicap-card-print-table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .handicap-card-print-table th, .handicap-card-print-table td { border: 1px solid #999; padding: 3px 4px; vertical-align: top; }
          .handicap-card-print-table th { background: #f0f0f0; font-weight: 700; }
        }
      `}</style>

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <div className="handicap-cards-screen" style={sectionStyle}>
        {loading ? (
          <div>Loading handicap cards...</div>
        ) : sortedPlayers.length === 0 ? (
          <div>No handicap card data found for this event.</div>
        ) : (
          <div style={tableWrapperStyle}>
            <table style={appTableStyle}>
              <thead>
                <tr style={{ background: subtleBackground }}>
                  <th
                    style={{
                      ...appTableHeaderCellStyle,
                      width: "52px",
                      textAlign: "right",
                    }}
                  >
                    #
                  </th>
                  <th style={appTableHeaderCellStyle}>Player</th>
                  <th style={appTableHeaderCellStyle}>Method</th>
                  <th
                    style={{ ...appTableHeaderCellStyle, textAlign: "right" }}
                  >
                    Event Index
                  </th>
                  <th
                    style={{ ...appTableHeaderCellStyle, textAlign: "center" }}
                  >
                    Status
                  </th>
                  <th
                    style={{ ...appTableHeaderCellStyle, textAlign: "right" }}
                  >
                    Eligible
                  </th>
                  <th
                    style={{ ...appTableHeaderCellStyle, textAlign: "right" }}
                  >
                    Window
                  </th>
                  <th
                    style={{ ...appTableHeaderCellStyle, textAlign: "right" }}
                  >
                    Used
                  </th>
                  <th style={{ ...appTableHeaderCellStyle, width: "92px" }} />
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => (
                  <tr
                    key={player.playerId}
                    style={{ background: appTableRowBackground(index) }}
                  >
                    <td style={appTableNumericCellStyle}>
                      {player.displayOrder ?? index + 1}
                    </td>
                    <td style={appTableNameCellStyle}>{player.playerName}</td>
                    <td style={appTableCellStyle}>
                      {formatHandicapMethod(player.handicapMethod)}
                    </td>
                    <td style={appTableNumericCellStyle}>
                      {formatDecimal(player.tripIndex)}
                    </td>
                    <td style={{ ...appTableCellStyle, textAlign: "center" }}>
                      <span style={getStatusBadgeStyle(player.statusCode)}>
                        {formatStatus(player.statusLabel ?? player.statusCode)}
                      </span>
                    </td>
                    <td style={appTableNumericCellStyle}>
                      {player.eligibleScoreCount ?? "—"}
                    </td>
                    <td style={appTableNumericCellStyle}>
                      {player.windowScoreCount ?? "—"}
                    </td>
                    <td style={appTableNumericCellStyle}>
                      {player.usedScoreCount ?? "—"}
                    </td>
                    <td style={appTableCellStyle}>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => openPlayer(player)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="handicap-cards-print-report">
        {detailCards.length === 0 ? (
          <div>Click Print to load detailed handicap cards.</div>
        ) : (
          detailCards.map((detail) => (
            <div
              key={`print-card-${detail.playerId}`}
              className="handicap-card-print-card"
            >
              <h1 className="handicap-card-print-title">
                {detail.playerName} Handicap Card
              </h1>
              <div className="handicap-card-print-subtitle">
                {detail.tripName} - As of{" "}
                {detail.asOfDate ?? data?.asOfDate ?? ""}
              </div>
              <div className="handicap-card-print-metrics">
                <div className="handicap-card-print-metric">
                  Event Index<strong>{formatDecimal(detail.tripIndex)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Pending Index
                  <strong>{formatDecimal(detail.pendingTripIndex)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Method
                  <strong>{formatHandicapMethod(detail.handicapMethod)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Eligible<strong>{detail.eligibleScoreCount ?? ""}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Window<strong>{detail.windowScoreCount ?? ""}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Used<strong>{detail.usedScoreCount ?? ""}</strong>
                </div>
              </div>
              <table className="handicap-card-print-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Gross</th>
                    <th>Adj</th>
                    <th>CR</th>
                    <th>Slope</th>
                    <th>Diff</th>
                    <th>Holes</th>
                    <th>Source</th>
                    <th>Used</th>
                    <th>Pending</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.scores ?? []).map((score) => (
                    <tr key={score.scoreHistoryEntryId}>
                      <td>{score.scoreDate ?? ""}</td>
                      <td>{score.courseName ?? ""}</td>
                      <td>{formatScoreValue(score.grossScore)}</td>
                      <td>{formatScoreValue(score.adjustedGrossScore)}</td>
                      <td>{formatDecimal(score.courseRating)}</td>
                      <td>{score.slope ?? ""}</td>
                      <td>{formatDecimal(score.differential)}</td>
                      <td>{score.holesPlayed ?? ""}</td>
                      <td>{score.sourceType ?? ""}</td>
                      <td>{score.usedInIndex ? "Y" : ""}</td>
                      <td>{score.pendingForCalculationDate ? "Y" : ""}</td>
                      <td>{score.exclusionReason ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
