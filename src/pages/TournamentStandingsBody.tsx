import { Fragment } from "react";
import type { CSSProperties } from "react";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import {
  buttonStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import type { TournamentStandings } from "../types/trip";
import type { TournamentCompetition } from "./useTournamentStandingsPageData";
import type { TournamentStandingsViewState } from "./useTournamentStandingsViewState";
import {
  buildNetScoreStyle,
  buildToParStyle,
  formatMoney,
  formatPosition,
  formatToPar,
  getRoundForLabel,
  getRoundHeaderParts,
  renderStatusText,
} from "./tournamentStandingsLogic";

const STICKY_POS_WIDTH = 64;
const STICKY_PLAYER_WIDTH = 240;
const titleMetaStyle: CSSProperties = {
  marginTop: "8px",
  color: "#555",
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  fontSize: "14px",
};

const leaderboardShellStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

const titleBandStyle: CSSProperties = {
  borderBottom: "1px solid #d5d9de",
  padding: "16px",
  background: "#fafafa",
  borderTopLeftRadius: "8px",
  borderTopRightRadius: "8px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 700,
  color: "#222",
};

const subtitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const metaBlockStyle: CSSProperties = {
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  fontSize: "14px",
  color: "#555",
};

const statusStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};
const payoutSummaryStyle: CSSProperties = {
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  marginTop: "8px",
  fontSize: "13px",
  color: "#333",
};

const payoutSummaryItemStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "6px",
  padding: "6px 8px",
  background: "#fff",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",
  maxWidth: "100%",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
  minWidth: "980px",
};

const topHeaderCellStyle: CSSProperties = {
  borderRight: "1px solid #d5d9de",
  borderBottom: "1px solid #c7ccd1",
  padding: "8px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 600,
  background: "#f7f7f7",
  color: "#222",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 6,
};

const subHeaderCellStyle: CSSProperties = {
  borderRight: "1px solid #eee",
  borderBottom: "1px solid #d5d9de",
  padding: "6px 4px",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: 600,
  background: "#fcfcfc",
  color: "#666",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 33,
  zIndex: 5,
};

const bodyCellStyle: CSSProperties = {
  borderRight: "1px solid #eee",
  borderBottom: "1px solid #eee",
  padding: "8px",
  fontSize: "14px",
  textAlign: "center",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  color: "#222",
  backgroundClip: "padding-box",
  position: "relative",
  zIndex: 1,
};

const rankCellStyle: CSSProperties = {
  ...bodyCellStyle,
  fontWeight: 600,
  width: `${STICKY_POS_WIDTH}px`,
};

const playerCellStyle: CSSProperties = {
  ...bodyCellStyle,
  textAlign: "left",
  fontWeight: 600,
  width: `${STICKY_PLAYER_WIDTH}px`,
  paddingLeft: "10px",
};

const roundScoreCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "54px",
  fontWeight: 700,
};

const roundToParCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "54px",
  fontSize: "14px",
};

const totalScoreCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "72px",
  fontWeight: 700,
  background: "#fafafa",
};

const totalToParCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "76px",
  fontWeight: 700,
  background: "#fafafa",
};

const moneyCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "96px",
  fontWeight: 700,
  background: "#fcfcfc",
};

const dividerAfterPlayerStyle: CSSProperties = {
  borderRight: "2px solid #d0d0d0",
};

const dividerBeforeTotalsStyle: CSSProperties = {
  borderLeft: "2px solid #d0d0d0",
};

const rowEvenStyle: CSSProperties = {
  background: "#fcfcfc",
};

const rowOddStyle: CSSProperties = {
  background: "#fff",
};

const footerNoteStyle: CSSProperties = {
  padding: "10px 16px 14px 16px",
  fontSize: "12px",
  color: "#666",
};

const stickyPosHeaderStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 7,
  background: "#f7f7f7",
};

const stickyPlayerHeaderStyle: CSSProperties = {
  position: "sticky",
  left: `${STICKY_POS_WIDTH}px`,
  zIndex: 7,
  background: "#f7f7f7",
};

const stickyPosBodyStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 3,
};

const stickyPlayerBodyStyle: CSSProperties = {
  position: "sticky",
  left: `${STICKY_POS_WIDTH}px`,
  zIndex: 3,
};


type TournamentStandingsBodyProps = {
  standings: TournamentStandings;
  competition: TournamentCompetition;
  setCompetition: (competition: TournamentCompetition) => void;
  viewState: TournamentStandingsViewState;
  onPrint: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
};

export default function TournamentStandingsBody({
  standings,
  competition,
  setCompetition,
  viewState,
  onPrint: handlePrint,
  onExportCsv: handleExportCsv,
  onRefresh,
}: TournamentStandingsBodyProps) {
  const {
    generatedTimestamp,
    tripDateRange,
    tournamentName,
    lowNetButtonLabel,
    lowGrossButtonLabel,
    showLowNetButton,
    showLowGrossButton,
    configuredPurse,
    paidPlaces,
    sortedRows,
    shownWinningsTotal,
  } = viewState;

return (
  <div
    style={pageContainerWideStyle}
    className="tournament-standings-print-root"
  >
    <PageHeader
      title={tournamentName}
      className="tournament-standings-no-print"
      subtitle={
        <div style={titleMetaStyle}>
          <span>
            <strong>Event:</strong> {standings.tripName}
          </span>
          <span>
            <strong>Rounds Completed:</strong> {standings.completedRounds} /{" "}
            {standings.requiredRounds}
          </span>
          <span>
            <strong>Leaderboard Par:</strong> {standings.leaderboardParTotal}
          </span>
        </div>
      }
      actions={
        <>
          <TripDetailButton tripId={standings.tripId} />
          <ReportsButton tripId={standings.tripId} />
          <button type="button" style={buttonStyle} onClick={handlePrint}>
            Print
          </button>
          <button type="button" style={buttonStyle} onClick={handleExportCsv}>
            Export CSV
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </>
      }
    />

    <div
      className="tournament-standings-no-print"
      style={{ ...sectionStyle, marginTop: 0 }}
    >
      <strong style={{ marginRight: "12px" }}>Competition:</strong>
      {showLowNetButton ? (
        <button
          type="button"
          style={competition === "LOW_NET" ? primaryButtonStyle : buttonStyle}
          onClick={() => setCompetition("LOW_NET")}
        >
          {lowNetButtonLabel}
        </button>
      ) : null}
      {showLowGrossButton ? (
        <button
          type="button"
          style={{
            ...(competition === "LOW_GROSS"
              ? primaryButtonStyle
              : buttonStyle),
            marginLeft: showLowNetButton ? "8px" : 0,
          }}
          onClick={() => setCompetition("LOW_GROSS")}
        >
          {lowGrossButtonLabel}
        </button>
      ) : null}
    </div>

    <div
      className="tournament-standings-print-header print-only"
      style={{ display: "none", marginBottom: "12px" }}
    >
      <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}>
        {standings.tripName}
      </div>
      {tripDateRange ? (
        <div style={{ fontSize: "13px", color: "#555", marginTop: "3px" }}>
          {tripDateRange}
        </div>
      ) : null}
      <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "10px" }}>
        {tournamentName}
      </div>
      <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
        Final Leaderboard
      </div>
    </div>

    <div
      style={leaderboardShellStyle}
      className="tournament-standings-print-shell"
    >
      <div
        style={titleBandStyle}
        className="tournament-standings-print-titleband"
      >
        <div className="tournament-standings-screen-title">
          <h2 style={titleStyle}>{tournamentName}</h2>
          <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
            Final Leaderboard
          </div>
        </div>

        <div style={subtitleRowStyle}>
          <div style={metaBlockStyle}>
            <span>
              <strong>Status:</strong> {renderStatusText(standings)}
            </span>
            <span>
              <strong>Event:</strong> {standings.tripName}
            </span>
            <span>
              <strong>Leaderboard Par:</strong>{" "}
              {standings.leaderboardParTotal}
            </span>
            {configuredPurse > 0 ? (
              <span>
                <strong>Total Purse:</strong>{" "}
                {formatMoney(configuredPurse, true)}
              </span>
            ) : null}
            <span
              className="tournament-standings-print-generated"
              style={{ display: "none" }}
            >
              <strong>Generated:</strong> {generatedTimestamp}
            </span>
          </div>

          <div
            style={{
              ...statusStyle,
              color: standings.leaderboardFinal ? "#1f6b2a" : "#8a5a00",
            }}
          >
            {standings.leaderboardFinal
              ? "Winnings finalized"
              : "Winnings hidden until all tournament rounds are complete"}
          </div>
        </div>

        <div
          style={payoutSummaryStyle}
          className="tournament-standings-screen-payout-summary"
        >
          {configuredPurse > 0 ? (
            <div style={payoutSummaryItemStyle}>
              <strong>Total Purse:</strong>{" "}
              {formatMoney(configuredPurse, true)}
            </div>
          ) : null}
          {paidPlaces > 0 ? (
            <div style={payoutSummaryItemStyle}>
              <strong>Paid Places:</strong> {paidPlaces}
            </div>
          ) : null}
          {standings.leaderboardFinal && shownWinningsTotal > 0 ? (
            <div style={payoutSummaryItemStyle}>
              <strong>Final Winnings:</strong>{" "}
              {formatMoney(shownWinningsTotal, true)}
            </div>
          ) : null}
        </div>
      </div>

      <div style={tableWrapStyle} className="tournament-standings-print-wrap">
        <table
          style={tableStyle}
          className="tournament-standings-print-table"
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  ...topHeaderCellStyle,
                  ...stickyPosHeaderStyle,
                  width: `${STICKY_POS_WIDTH}px`,
                }}
              >
                Pos
              </th>
              <th
                rowSpan={2}
                style={{
                  ...topHeaderCellStyle,
                  ...stickyPlayerHeaderStyle,
                  ...dividerAfterPlayerStyle,
                  width: `${STICKY_PLAYER_WIDTH}px`,
                  textAlign: "left",
                  paddingLeft: "10px",
                }}
              >
                Player
              </th>

              {standings.roundLabels.map((label) => {
                const header = getRoundHeaderParts(label);

                return (
                  <th
                    key={label}
                    colSpan={2}
                    style={{
                      ...topHeaderCellStyle,
                      width: "108px",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      lineHeight: 1.15,
                      padding: "6px 4px",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{header.round}</div>
                    {header.date ? (
                      <div style={{ fontSize: "11px", fontWeight: 600 }}>
                        {header.date}
                      </div>
                    ) : null}
                    {header.course ? (
                      <div style={{ fontSize: "11px", fontWeight: 600 }}>
                        {header.course}
                      </div>
                    ) : null}
                  </th>
                );
              })}

              <th
                rowSpan={2}
                style={{
                  ...topHeaderCellStyle,
                  ...dividerBeforeTotalsStyle,
                  width: "72px",
                }}
              >
                Total
              </th>
              <th
                rowSpan={2}
                style={{ ...topHeaderCellStyle, width: "76px" }}
              >
                To Par
              </th>
              <th
                rowSpan={2}
                style={{ ...topHeaderCellStyle, width: "96px" }}
              >
                Winnings
              </th>
            </tr>

            <tr>
              {standings.roundLabels.map((label) => (
                <Fragment key={label}>
                  <th
                    style={{ ...subHeaderCellStyle, background: "#fcfcfc" }}
                  >
                    {competition === "LOW_GROSS" ? "Gross" : "Net"}
                  </th>
                  <th
                    style={{ ...subHeaderCellStyle, background: "#fcfcfc" }}
                  >
                    Par
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + standings.roundLabels.length * 2 + 3}
                  style={{
                    ...bodyCellStyle,
                    padding: "18px 12px",
                    textAlign: "center",
                    borderRight: "none",
                  }}
                >
                  No completed non-scramble rounds yet.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => {
                const rowStyle = index % 2 === 0 ? rowOddStyle : rowEvenStyle;

                return (
                  <tr key={row.playerId} style={rowStyle}>
                    <td
                      style={{
                        ...rankCellStyle,
                        ...stickyPosBodyStyle,
                        background: rowStyle.background,
                      }}
                    >
                      {formatPosition(row, sortedRows)}
                    </td>
                    <td
                      style={{
                        ...playerCellStyle,
                        ...stickyPlayerBodyStyle,
                        ...dividerAfterPlayerStyle,
                        background: rowStyle.background,
                      }}
                    >
                      {row.playerName}
                    </td>

                    {standings.roundLabels.map((label) => {
                      const round = getRoundForLabel(row, label);

                      return (
                        <Fragment key={`${row.playerId}-${label}`}>
                          <td
                            style={{
                              ...roundScoreCellStyle,
                              ...buildNetScoreStyle(round),
                            }}
                          >
                            {round?.score ?? ""}
                          </td>
                          <td
                            style={{
                              ...roundToParCellStyle,
                              ...buildToParStyle(round?.toPar),
                            }}
                          >
                            {round ? formatToPar(round.toPar) : ""}
                          </td>
                        </Fragment>
                      );
                    })}

                    <td
                      style={{
                        ...totalScoreCellStyle,
                        ...dividerBeforeTotalsStyle,
                      }}
                    >
                      {row.totalScore}
                    </td>
                    <td
                      style={{
                        ...totalToParCellStyle,
                        ...buildToParStyle(row.totalToPar),
                      }}
                    >
                      {formatToPar(row.totalToPar)}
                    </td>
                    <td style={moneyCellStyle}>
                      {formatMoney(row.money, standings.leaderboardFinal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={footerNoteStyle}
        className="tournament-standings-print-footer"
      >
        {!standings.leaderboardFinal
          ? "Winnings remain blank until all tournament rounds are complete."
          : "Winnings shown only after the full tournament is complete."}
      </div>
    </div>

    <div
      style={{ ...sectionStyle, marginTop: "16px", marginBottom: 0 }}
      className="tournament-standings-no-print tournament-standings-print-note"
    >
      <div style={{ fontSize: "12px", color: "#666" }}>
        Tied positions are shown as T1, T2, T3, etc.
      </div>
    </div>
  </div>
);

}
