import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getHandicapCardDetail } from "../api/handicapCardApi";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import {
  appTableCellStyle,
  appTableHeaderCellStyle,
  appTableNameCellStyle,
  appTableNumericCellStyle,
  appTableStyle,
  borderColor,
  buttonStyle,
  cardStyle,
  errorBoxStyle,
  inputStyle,
  pageContainerWideStyle,
  sectionStyle,
  subtleBackground,
  subtleBorderColor,
} from "../styles/uiStyles";
import type { HandicapCardDetailResponse, HandicapCardScore } from "../types/handicapCard";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import { formatHandicapMethod } from "../utils/handicapMethod";


function csvValue(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('\"', '\"\"')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
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

function safeFilePart(value: string | null | undefined): string {
  return (value || "handicap-card")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "handicap-card";
}

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(value: string, days: number): string {
  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function clampToToday(value: string): string {
  const today = getTodayIsoDate();
  if (!value) {
    return today;
  }
  return value > today ? today : value;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  return `${month}/${day}/${year}`;
}

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function getPendingIndexDelta(data: HandicapCardDetailResponse | null): number | null {
  if (!data || data.pendingTripIndex == null || data.tripIndex == null) {
    return null;
  }

  const backendDelta = data.pendingIndexDelta;
  if (backendDelta != null && Number.isFinite(Number(backendDelta))) {
    return Number(backendDelta);
  }

  return Number(data.pendingTripIndex) - Number(data.tripIndex);
}

function formatSignedDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  const rounded = Number(value).toFixed(digits);
  return Number(value) > 0 ? `+${rounded}` : rounded;
}

function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }
  return String(value);
}


function formatSource(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  if (value === "TRIP_ROUND") {
    return "Event";
  }
  if (value === "GHIN_FROZEN") {
    return "GHIN";
  }
  if (value === "DB_HISTORY_FROZEN") {
    return "DB History";
  }
  return value.replaceAll("_", " ");
}

function buildRecencyLabel(score: HandicapCardScore): string {
  if (score.sourceType === "GHIN_FROZEN" && score.postingOrder != null) {
    return `GHIN #${score.postingOrder}`;
  }

  if (score.sourceType === "TRIP_ROUND") {
    return `Event ${formatDate(score.scoreDate)}`;
  }

  return formatDate(score.scoreDate);
}

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const metricLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#666",
  fontWeight: 700,
  marginBottom: "4px",
};

const metricValueStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  lineHeight: 1.2,
};

const tableWrapperStyle: CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  background: "#fff",
};

const dateControlBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const dateControlGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
};

const arrowButtonStyle: CSSProperties = {
  ...buttonStyle,
  minWidth: "34px",
  width: "34px",
  height: "34px",
  padding: "0",
  fontSize: "16px",
  fontWeight: 900,
  lineHeight: 1,
};

const disabledArrowButtonStyle: CSSProperties = {
  ...arrowButtonStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

const usedBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "56px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#1f6b2a",
  background: "#edf8f0",
  border: "1px solid #d8e8dc",
};

const excludedBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "56px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#777",
  background: "#f5f5f5",
  border: `1px solid ${subtleBorderColor}`,
};

const pendingBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "56px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#8a4d00",
  background: "#fff7e8",
  border: "1px solid #f1d49c",
};

const windowBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "56px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#34528f",
  background: "#eef3ff",
  border: "1px solid #d6e1ff",
};

const panelHeaderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 850,
};

const panelSubtitleStyle: CSSProperties = {
  color: "#666",
  fontSize: "13px",
  marginTop: "4px",
};

const pendingPanelStyle: CSSProperties = {
  border: "1px solid #f1d49c",
  background: "#fffaf0",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "16px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
};

const currentPanelStyle: CSSProperties = {
  border: `1px solid ${borderColor}`,
  background: "#fff",
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
};

const deltaBadgeBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "3px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 850,
  whiteSpace: "nowrap",
};

function pendingDeltaBadge(delta: number | null) {
  if (delta == null || !Number.isFinite(Number(delta))) {
    return null;
  }

  if (Math.abs(delta) < 0.05) {
    return (
      <span
        style={{
          ...deltaBadgeBaseStyle,
          color: "#555",
          background: "#f5f5f5",
          border: `1px solid ${subtleBorderColor}`,
        }}
      >
        No change
      </span>
    );
  }

  const improvesIndex = delta < 0;
  return (
    <span
      title={improvesIndex ? "Pending score lowers the index" : "Pending score raises the index"}
      style={{
        ...deltaBadgeBaseStyle,
        color: improvesIndex ? "#1f6b2a" : "#9a3412",
        background: improvesIndex ? "#edf8f0" : "#fff3ed",
        border: improvesIndex ? "1px solid #d8e8dc" : "1px solid #f2c9b7",
      }}
    >
      {improvesIndex ? "↓" : "↑"} {formatSignedDecimal(delta)}
    </span>
  );
}

function getRowStyle(score: HandicapCardScore, index: number): CSSProperties {
  if (score.pendingForCalculationDate === true) {
    return {
      background: "#fffaf0",
      borderLeft: "4px solid #e8b454",
    };
  }

  if (score.usedInIndex === true) {
    return {
      background: "#f2faf3",
      borderLeft: "4px solid #5aa96a",
    };
  }

  if (score.eligibleForWindow === false) {
    return {
      background: index % 2 === 0 ? "#f7f7f7" : "#f2f2f2",
      color: "#777",
      borderLeft: "4px solid transparent",
    };
  }

  return {
    background: index % 2 === 0 ? "#fff" : "#fafafa",
    borderLeft: "4px solid transparent",
  };
}

function statusBadge(score: HandicapCardScore) {
  if (score.pendingForCalculationDate === true) {
    if (score.usedInPendingIndex === true) {
      return <span style={pendingBadgeStyle}>Pending Used</span>;
    }
    return <span style={pendingBadgeStyle}>Pending</span>;
  }

  if (score.usedInIndex === true) {
    return <span style={usedBadgeStyle}>Used</span>;
  }

  if (score.eligibleForWindow === true) {
    return <span style={windowBadgeStyle}>Window</span>;
  }

  return <span style={excludedBadgeStyle}>Excluded</span>;
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", fontSize: "12px" }}>
      <span style={usedBadgeStyle}>Used</span>
      <span style={windowBadgeStyle}>Window</span>
      <span style={pendingBadgeStyle}>Pending</span>
      <span style={excludedBadgeStyle}>Excluded</span>
    </div>
  );
}

function ScoreTable({ scores }: { scores: HandicapCardScore[] }) {
  return (
    <div style={tableWrapperStyle}>
      <table style={appTableStyle}>
        <thead>
          <tr style={{ background: subtleBackground }}>
            <th style={{ ...appTableHeaderCellStyle, width: "52px", textAlign: "right" }}>#</th>
            <th style={appTableHeaderCellStyle}>Date / Seq</th>
            <th style={appTableHeaderCellStyle}>Source</th>
            <th style={appTableHeaderCellStyle}>Course</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Gross</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Adj</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>CR</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Slope</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Diff</th>
            <th style={{ ...appTableHeaderCellStyle, textAlign: "center" }}>Status</th>
            <th style={appTableHeaderCellStyle}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {scores.length === 0 ? (
            <tr>
              <td style={appTableCellStyle} colSpan={11}>
                No scores to display for this calculation date.
              </td>
            </tr>
          ) : (
            scores.map((score, index) => (
              <tr key={score.scoreHistoryEntryId} style={getRowStyle(score, index)}>
                <td style={appTableNumericCellStyle}>{score.displaySortOrder ?? index + 1}</td>
                <td style={appTableCellStyle}>{buildRecencyLabel(score)}</td>
                <td style={appTableCellStyle}>{formatSource(score.sourceType)}</td>
                <td style={appTableNameCellStyle}>{score.courseName ?? "—"}</td>
                <td style={appTableNumericCellStyle}>{formatInteger(score.grossScore)}</td>
                <td style={appTableNumericCellStyle}>{formatInteger(score.adjustedGrossScore)}</td>
                <td style={appTableNumericCellStyle}>{formatDecimal(score.courseRating)}</td>
                <td style={appTableNumericCellStyle}>{formatInteger(score.slope)}</td>
                <td
                  style={{
                    ...appTableNumericCellStyle,
                    fontWeight: score.usedInIndex || score.usedInPendingIndex ? 850 : 500,
                  }}
                >
                  {formatDecimal(score.differential, 1)}
                </td>
                <td style={{ ...appTableCellStyle, textAlign: "center" }}>{statusBadge(score)}</td>
                <td style={{ ...appTableCellStyle, color: "#666", fontSize: "13px" }}>
                  {score.exclusionReason ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function HandicapCardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tripId = Number(params.tripId);
  const playerId = Number(params.playerId);

  const [asOfDate, setAsOfDate] = useState<string>(() => getTodayIsoDate());
  const [data, setData] = useState<HandicapCardDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayIso = getTodayIsoDate();
  const isViewingToday = asOfDate >= todayIso;

  const pendingScores = useMemo(
    () => (data?.scores ?? []).filter((score) => score.pendingForCalculationDate === true),
    [data]
  );
  const windowScores = useMemo(
    () => (data?.scores ?? []).filter((score) => score.pendingForCalculationDate !== true),
    [data]
  );
  const effectiveAsOfDate = data?.asOfDate ?? asOfDate;
  const pendingIndexDelta = getPendingIndexDelta(data);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(tripId) || !Number.isFinite(playerId)) {
        setError("Invalid event or player id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getHandicapCardDetail(tripId, playerId, asOfDate);
        if (!cancelled) {
          setData(response);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error ?? err?.message ?? "Unable to load handicap card.");
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
  }, [tripId, playerId, asOfDate]);

  function moveOneDay(days: number): void {
    setAsOfDate((current) => clampToToday(addDaysToIsoDate(current || getTodayIsoDate(), days)));
  }

  function handleDateChange(value: string): void {
    setAsOfDate(clampToToday(value || getTodayIsoDate()));
  }

  function resetToday(): void {
    setAsOfDate(getTodayIsoDate());
  }

  function handlePrint(): void {
    printWithReportTitle(buildReportFileTitle(data?.tripName || "Event", "Handicap Card", data?.playerName));
  }

  function addScoreRows(rows: Array<Array<string | number | null | undefined>>, title: string, scores: HandicapCardScore[]): void {
    rows.push([]);
    rows.push([title]);
    rows.push(["#", "Date / Seq", "Source", "Course", "Gross", "Adj", "CR", "Slope", "Diff", "Status", "Reason"]);
    for (const [index, score] of scores.entries()) {
      let status = "Excluded";
      if (score.pendingForCalculationDate === true) {
        status = score.usedInPendingIndex === true ? "Pending Used" : "Pending";
      } else if (score.usedInIndex === true) {
        status = "Used";
      } else if (score.eligibleForWindow === true) {
        status = "Window";
      }

      rows.push([
        score.displaySortOrder ?? index + 1,
        buildRecencyLabel(score),
        formatSource(score.sourceType),
        score.courseName ?? "",
        formatInteger(score.grossScore),
        formatInteger(score.adjustedGrossScore),
        formatDecimal(score.courseRating),
        formatInteger(score.slope),
        formatDecimal(score.differential),
        status,
        score.exclusionReason ?? "",
      ]);
    }
  }

  function handleExportCsv(): void {
    if (!data) {
      return;
    }

    const rows: Array<Array<string | number | null | undefined>> = [];
    rows.push(["Handicap Card"]);
    rows.push(["Event", data.tripName]);
    rows.push(["Player", data.playerName]);
    rows.push(["Calculation Date", formatDate(effectiveAsOfDate)]);
    rows.push(["Current Event Index", formatDecimal(data.tripIndex)]);
    rows.push(["Pending Handicap Index", data.pendingTripIndex == null ? "" : formatDecimal(data.pendingTripIndex)]);
    rows.push(["Pending Index Delta", pendingIndexDelta == null ? "" : formatSignedDecimal(pendingIndexDelta)]);
    rows.push(["Method", formatHandicapMethod(data.handicapMethod)]);
    rows.push(["Window", data.windowScoreCount]);
    rows.push(["Used", data.usedScoreCount]);
    rows.push(["Eligible Before Date", data.eligibleScoreCount]);

    if (pendingScores.length > 0) {
      addScoreRows(rows, "Pending Posted Scores", pendingScores);
    }
    addScoreRows(rows, "Current Calculation Window", windowScores);

    downloadCsv(`${safeFilePart(data.tripName)}-${safeFilePart(data.playerName)}-handicap-card-${effectiveAsOfDate}.csv`, rows);
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        className="no-print"
        title={data ? `${data.playerName} Handicap Card` : "Handicap Card"}
        subtitle={data?.calculationLabel ?? "Review the score history used to calculate the event index."}
        actions={
          <>
            <TripDetailButton tripId={tripId} />
            <ReportsButton tripId={tripId} />
            <WorkflowBackButton label="Back to Handicap Cards" to={`/trips/${tripId}/handicap-cards`} />
            <button type="button" style={buttonStyle} onClick={handlePrint} disabled={!data}>
              Print
            </button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv} disabled={!data}>
              Export CSV
            </button>
          </>
        }
      />

      {data ? (
        <div className="print-only" style={{ marginBottom: "14px" }}>
          <h1 style={{ margin: 0 }}>{data.playerName} Handicap Card</h1>
          <div>{data.tripName} - {data.calculationLabel ?? `as of ${formatDate(effectiveAsOfDate)}`}</div>
        </div>
      ) : null}

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {loading ? (
        <div style={sectionStyle}>Loading handicap card...</div>
      ) : data ? (
        <>
          <div style={sectionStyle}>
            <div style={dateControlBarStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Calculation Date</h2>
                <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
                  Current index uses scores posted <strong>before</strong> {formatDate(effectiveAsOfDate)}.
                  {pendingScores.length > 0 ? " Same-day posted scores are shown separately as pending." : ""}
                </div>
              </div>

              <div style={dateControlGroupStyle}>
                <button
                  type="button"
                  title="Previous day"
                  aria-label="Previous day"
                  style={arrowButtonStyle}
                  onClick={() => moveOneDay(-1)}
                >
                  ‹
                </button>
                <input
                  type="date"
                  value={asOfDate}
                  max={todayIso}
                  onChange={(event) => handleDateChange(event.target.value)}
                  style={{ ...inputStyle, width: "150px", height: "34px" }}
                />
                <button
                  type="button"
                  title="Next day"
                  aria-label="Next day"
                  disabled={isViewingToday}
                  style={isViewingToday ? disabledArrowButtonStyle : arrowButtonStyle}
                  onClick={() => moveOneDay(1)}
                >
                  ›
                </button>
                <button type="button" style={buttonStyle} onClick={resetToday}>
                  Today
                </button>
              </div>
            </div>

            <div style={metricGridStyle}>
              <div style={cardStyle}>
                <div style={metricLabelStyle}>Current Event Index</div>
                <div style={metricValueStyle}>{formatDecimal(data.tripIndex)}</div>
              </div>
              {data.pendingTripIndex != null ? (
                <div style={{ ...cardStyle, background: "#fffaf0", borderColor: "#f1d49c" }}>
                  <div style={metricLabelStyle}>Pending Handicap Index</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div style={metricValueStyle}>{formatDecimal(data.pendingTripIndex)}</div>
                    {pendingDeltaBadge(pendingIndexDelta)}
                  </div>
                </div>
              ) : null}
              <div style={cardStyle}>
                <div style={metricLabelStyle}>Method</div>
                <div style={metricValueStyle}>{formatHandicapMethod(data.handicapMethod)}</div>
              </div>
              <div style={cardStyle}>
                <div style={metricLabelStyle}>Window</div>
                <div style={metricValueStyle}>{formatInteger(data.windowScoreCount)}</div>
              </div>
              <div style={cardStyle}>
                <div style={metricLabelStyle}>Used</div>
                <div style={metricValueStyle}>{formatInteger(data.usedScoreCount)}</div>
              </div>
              <div style={cardStyle}>
                <div style={metricLabelStyle}>Eligible Before Date</div>
                <div style={metricValueStyle}>{formatInteger(data.eligibleScoreCount)}</div>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={panelHeaderRowStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Score History</h2>
                <div style={panelSubtitleStyle}>
                  Future scores are hidden. The current window shows only the scores used to evaluate this calculation date.
                </div>
              </div>
              <Legend />
            </div>

            {pendingScores.length > 0 ? (
              <div style={pendingPanelStyle}>
                <div style={panelHeaderRowStyle}>
                  <div>
                    <h3 style={panelTitleStyle}>Pending Posted Scores</h3>
                    <div style={{ ...panelSubtitleStyle, color: "#6f4b16" }}>
                      Posted on {formatDate(effectiveAsOfDate)}. These are separated because they are not included in the
                      current index until the next calculation cycle.
                      {data.pendingCalculationLabel ? ` ${data.pendingCalculationLabel}` : ""}
                    </div>
                  </div>
                  {data.pendingTripIndex != null ? (
                    <div
                      style={{
                        minWidth: "160px",
                        textAlign: "right",
                        background: "#fff",
                        border: "1px solid #f1d49c",
                        borderRadius: "10px",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ ...metricLabelStyle, marginBottom: "2px" }}>Pending Index</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ ...metricValueStyle, color: "#8a4d00" }}>{formatDecimal(data.pendingTripIndex)}</div>
                        {pendingDeltaBadge(pendingIndexDelta)}
                      </div>
                    </div>
                  ) : null}
                </div>
                <ScoreTable scores={pendingScores} />
              </div>
            ) : null}

            <div style={currentPanelStyle}>
              <div style={panelHeaderRowStyle}>
                <div>
                  <h3 style={panelTitleStyle}>Current Calculation Window</h3>
                  <div style={panelSubtitleStyle}>
                    Scores before {formatDate(effectiveAsOfDate)}. Used rows are the differentials included in the current
                    index.
                  </div>
                </div>
                <div style={{ textAlign: "right", color: "#666", fontSize: "13px" }}>
                  Showing {windowScores.length} score{windowScores.length === 1 ? "" : "s"}
                </div>
              </div>
              <ScoreTable scores={windowScores} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
