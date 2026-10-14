import type { CSSProperties, ReactNode } from "react";
import type { RoundGameResult, RoundStatus, TeamGameResult } from "../../types/round";
import type { RoundEventSnapshotRow } from "../../types/roundEvent";
import type { TeamValidationGroup } from "./scoreGridBuilders";
import { buttonStyle, pageContainerWideStyle, primaryButtonStyle, sectionStyle, warningBoxStyle } from "../../styles/uiStyles";
import RoundProgressBar from "../round/RoundProgressBar";
import PageHeader from "../common/PageHeader";
import ReportsButton from "../common/ReportsButton";
import TripDetailButton from "../common/TripDetailButton";
import {
  formatScoreVsPar,
  getEventSnapshotPlacementLabel,
  getTeamDisplayTotal,
} from "../../pages/roundResultsLogic";
import { useRoundResultsViewState } from "../../pages/useRoundResultsViewState";

type RoundResultsViewState = ReturnType<typeof useRoundResultsViewState>;

function formatRoundDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) return "";
  return tied ? `T${value}` : String(value);
}

function isTieForPlacement(team: TeamGameResult, teams: TeamGameResult[]): boolean {
  if (team.placement == null) return false;
  return teams.filter((candidate) => candidate.placement === team.placement).length > 1;
}

function teamHasWithdrawnPlayer(team: TeamGameResult | TeamValidationGroup, validationGroups?: TeamValidationGroup[]): boolean {
  const group = "players" in team
    ? team
    : validationGroups?.find((candidate) => candidate.teamId === team.teamId);
  if (!group) return false;
  return group.players.some((player) =>
    (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase() === "WITHDRAWN",
  );
}

function renderWithdrawnTeamBadge(show: boolean): ReactNode {
  return show ? <span style={withdrawnTeamBadgeStyle} title="This team includes at least one withdrawn player.">WD</span> : null;
}

function snapshotWinnerIncludesWithdrawnTeam(row: RoundEventSnapshotRow, validationGroups: TeamValidationGroup[]): boolean {
  if (row.resultKind !== "TEAM") return false;
  const winnerNames = row.winnerNames?.length ? row.winnerNames : row.winnerName ? [row.winnerName] : [];
  return winnerNames.some((winner) => {
    const group = validationGroups.find((candidate) => candidate.teamName.trim().toLowerCase() === winner.trim().toLowerCase());
    return Boolean(group && teamHasWithdrawnPlayer(group));
  });
}

interface Props {
  status: RoundStatus;
  results: RoundGameResult;
  tripName: string;
  tripDateRange: string;
  viewState: RoundResultsViewState;
  scoreEntryLabel: string;
  showViewScoresButton: boolean;
  onViewScores: () => void;
  onScoreEntry: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  buildRoundPrintTitle: (status: RoundStatus, results: RoundGameResult, roundLabel: string) => string;
  children: ReactNode;
}

export default function RoundResultsPageShell({
  status,
  results,
  tripName,
  tripDateRange,
  viewState,
  scoreEntryLabel,
  showViewScoresButton,
  onViewScores,
  onScoreEntry,
  onPrint,
  onExportCsv,
  onRefresh,
  buildRoundPrintTitle,
  children,
}: Props) {
  const {
    validationGroups,
    frontNinePar,
    backNinePar,
    totalPar,
    leader,
    eventSnapshotRows,
    teeSummary,
    gridMode,
    scrambleMode,
    resultEntityPluralLabel,
    eventSummaryLabel,
    primaryScoringLabel,
    eventRoundLabel,
  } = viewState;

  return (
    <div style={pageContainerWideStyle} className="round-results-print-root">
      <PageHeader
        title="Round Results"
        className="round-results-no-print"
        subtitle={
          <>
            <div style={titleMetaStyle}>
              <span>{eventRoundLabel}</span>
              {status.courseName ? <span>{status.courseName}</span> : null}
              {teeSummary ? <span>{teeSummary}</span> : null}
              {status.roundDate ? <span>{formatRoundDate(status.roundDate)}</span> : null}
            </div>
            <div style={badgeRowStyle}>
              {eventSummaryLabel ? <div style={badgeStyle}>{eventSummaryLabel}</div> : null}
              <div style={badgeStyle}>Primary scoring: {primaryScoringLabel}</div>
              <div style={badgeStyle}>{status.finalized ? "Finalized" : "Not Finalized"}</div>
              <div style={badgeStyle}>{gridMode ? "Score Grid View" : scrambleMode ? "Scramble Summary" : "Summary View"}</div>
            </div>
          </>
        }
        actions={
          <>
            <TripDetailButton tripId={status.tripId} />
            <ReportsButton tripId={status.tripId} />
            {showViewScoresButton ? <button type="button" style={buttonStyle} onClick={onViewScores}>View Scores</button> : null}
            <button type="button" style={buttonStyle} onClick={onScoreEntry}>{scoreEntryLabel}</button>
            <button type="button" style={buttonStyle} onClick={onPrint}>Print</button>
            <button type="button" style={buttonStyle} onClick={onExportCsv}>Export CSV</button>
            <button type="button" style={primaryButtonStyle} onClick={onRefresh}>Refresh</button>
          </>
        }
      />

      <div className="round-results-print-header print-only" style={{ display: "none", marginBottom: "12px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}>{tripName || "Golf Event"}</div>
        {tripDateRange ? <div style={{ fontSize: "13px", color: "#555", marginTop: "3px" }}>{tripDateRange}</div> : null}
        <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "10px" }}>
          {buildRoundPrintTitle(status, results, eventRoundLabel)}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>Game Results</div>
      </div>

      {!status.finalized ? (
        <div style={warningBoxStyle} className="round-results-no-print">This round is not finalized yet. Results are shown from the current saved scores, but placement and game totals can still change.</div>
      ) : status.tripLocked ? (
        <div style={warningBoxStyle} className="round-results-no-print">This round is finalized and the event is locked. Scores are view-only unless Correction Mode is enabled from Event Detail.</div>
      ) : (
        <div style={warningBoxStyle} className="round-results-no-print">This round is finalized. Use Edit Corrections to make post-finalization score or tee updates and then refresh this page to verify the recalculated results.</div>
      )}

      <div className="round-results-no-print">
        <RoundProgressBar roundId={status.roundId} currentStep="results" format={status.format} finalized={status.finalized} />
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Round Snapshot</h2>
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{eventSummaryLabel ? "Events" : "Primary Scoring"}</div>
            <div style={summaryValueStyle}>{eventSummaryLabel || primaryScoringLabel}</div>
            {eventSummaryLabel ? <div style={summarySubValueStyle}>Primary scoring: {primaryScoringLabel}</div> : null}
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Course</div>
            <div style={summaryValueStyle}>{status.courseName || "—"}</div>
            <div style={summarySubValueStyle}>{teeSummary || ""}</div>
          </div>
          {eventSnapshotRows.length > 0 ? (
            <div style={{ ...summaryCardStyle, gridColumn: "span 2" }}>
              <div style={summaryLabelStyle}>Event Winners</div>
              <div style={eventWinnerListStyle}>
                {eventSnapshotRows.map((row) => (
                  <div key={`${row.eventId ?? row.eventType}-${row.eventName}`} style={eventWinnerRowStyle}>
                    <div>
                      <div style={summarySubValueStyle}>{row.eventName}</div>
                      <div style={eventWinnerNameStyle}>
                        {row.winnerNames?.length ? row.winnerNames.filter(Boolean).join(" / ") : row.winnerName || "—"}
                        {renderWithdrawnTeamBadge(snapshotWinnerIncludesWithdrawnTeam(row, validationGroups))}
                      </div>
                    </div>
                    <div style={summarySubValueStyle}>{getEventSnapshotPlacementLabel(row.rank, row.tied)}</div>
                    <div style={eventWinnerTotalStyle}>{row.winningTotal ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Leader</div>
                <div style={summaryValueStyle}>{leader?.teamName ?? "—"}</div>
                <div style={summarySubValueStyle}>{leader ? `Place ${placementLabel(leader.placement, isTieForPlacement(leader, results.teams))}` : ""}</div>
              </div>
              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Winning Total</div>
                <div style={summaryValueStyle}>{leader ? getTeamDisplayTotal(leader, results.format) ?? "—" : "—"}</div>
                <div style={summarySubValueStyle}>{scrambleMode && leader ? formatScoreVsPar(getTeamDisplayTotal(leader, results.format), totalPar) : ""}</div>
              </div>
            </>
          )}
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{resultEntityPluralLabel}</div>
            <div style={summaryValueStyle}>{results.teams.length}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Par</div>
            <div style={summaryValueStyle}>{totalPar > 0 ? totalPar : "—"}</div>
            <div style={summarySubValueStyle}>{frontNinePar > 0 || backNinePar > 0 ? `Out ${frontNinePar} / In ${backNinePar}` : ""}</div>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}

const titleMetaStyle: CSSProperties = { marginTop: "8px", color: "#555", display: "flex", gap: "8px 14px", flexWrap: "wrap", fontSize: "14px" };
const badgeRowStyle: CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" };
const badgeStyle: CSSProperties = { display: "inline-flex", alignItems: "center", height: "30px", padding: "0 10px", borderRadius: "999px", border: "1px solid #d5d9de", background: "#f7f8fa", fontSize: "13px", fontWeight: 600, color: "#333" };
const summaryGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" };
const summaryCardStyle: CSSProperties = { border: "1px solid #d5d9de", borderRadius: "8px", padding: "10px 12px", background: "#fafafa" };
const summaryLabelStyle: CSSProperties = { fontSize: "12px", color: "#666", marginBottom: "4px", fontWeight: 600 };
const summaryValueStyle: CSSProperties = { fontSize: "20px", fontWeight: 700, lineHeight: 1.15 };
const summarySubValueStyle: CSSProperties = { fontSize: "12px", color: "#666", marginTop: "4px" };
const eventWinnerListStyle: CSSProperties = { display: "grid", gap: "8px" };
const eventWinnerRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: "12px", alignItems: "center" };
const eventWinnerNameStyle: CSSProperties = { fontSize: "16px", fontWeight: 700 };
const eventWinnerTotalStyle: CSSProperties = { fontSize: "18px", fontWeight: 800, textAlign: "right" };
const withdrawnTeamBadgeStyle: CSSProperties = { display: "inline-flex", marginLeft: "6px", padding: "1px 5px", borderRadius: "999px", border: "1px solid #c46b6b", color: "#a33", fontSize: "10px", fontWeight: 800, verticalAlign: "middle" };
const sectionTitleStyle: CSSProperties = { marginTop: 0, marginBottom: "12px" };
