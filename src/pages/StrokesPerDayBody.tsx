import { Fragment } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import {
  appTableCellStyle,
  appTableHeaderCellStyle,
  appTableStyle,
  borderColor,
  disabledButtonStyle,
  errorBoxStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionStyle,
  subtleBackground,
  subtleBorderColor,
} from "../styles/uiStyles";
import type {
  StrokesPerDayPlayer,
  StrokesPerDayPlayerRound,
  StrokesPerDayResponse,
  StrokesPerDayRound,
} from "../types/strokes";
import {
  buildPlayerRoundKey,
  buildTeeDetail,
  buildTeeMeta,
  chunkRounds,
  findPlayerRound,
  formatDate,
  formatDecimal,
  formatStrokes,
  getRoundStatusLabel,
  isPlanningRound,
  normalizeWebsiteUrl,
} from "./strokesPerDayLogic";

type StrokesPerDayBodyProps = {
  data: StrokesPerDayResponse;
  rounds: StrokesPerDayRound[];
  players: StrokesPerDayPlayer[];
  changedTeeKeys: Set<string>;
  saving: boolean;
  saveMessage: string | null;
  saveError: string | null;
  changedTeeCount: number;
  hasUnsavedTeeChanges: boolean;
  onPlanningTeeChange: (playerId: number, roundId: number, selectedValue: string) => void;
  onResetTeeChanges: () => void | Promise<void>;
  onSaveTeePlan: () => void | Promise<void>;
};

const tableWrapperStyle: CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  background: "#fff",
  maxWidth: "100%",
};

const nameColumnWidth = 170;
const indexColumnWidth = 56;
const teeColumnWidth = 168;
const strokesColumnWidth = 56;
const roundColumnWidth = indexColumnWidth + teeColumnWidth + strokesColumnWidth;
const minimumCompactTableWidth = 620;

function getTableStyle(roundCount: number): CSSProperties {
  const contentWidth = nameColumnWidth + roundCount * roundColumnWidth;
  const tableWidth = roundCount >= 4
    ? contentWidth
    : Math.max(minimumCompactTableWidth, contentWidth);

  return {
    ...appTableStyle,
    width: `${tableWidth}px`,
    minWidth: `${tableWidth}px`,
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
  };
}

const roundHeaderStyle: CSSProperties = {
  ...appTableHeaderCellStyle,
  textAlign: "center",
  background: subtleBackground,
  borderBottom: `1px solid ${borderColor}`,
  borderRight: `1px solid ${subtleBorderColor}`,
  padding: "8px 8px 6px",
  verticalAlign: "bottom",
};

const roundDateStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  lineHeight: 1.15,
};

const roundDayStyle: CSSProperties = {
  marginTop: "3px",
  fontSize: "12px",
  color: "#555",
  fontWeight: 600,
};

const roundCourseStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  lineHeight: 1.2,
  fontWeight: 700,
};

const courseNameStyle: CSSProperties = {
  color: "#34528f",
  fontWeight: 600,
  fontSize: "17px",
  textDecoration: "none",
};

const roundStatusBadgeBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "6px",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.2,
  border: `1px solid ${subtleBorderColor}`,
};

const columnHeaderStyle: CSSProperties = {
  ...appTableHeaderCellStyle,
  textAlign: "center",
  background: "#fff",
  fontSize: "12px",
  color: "#333",
  padding: "8px 6px",
  borderRight: `1px solid ${subtleBorderColor}`,
};

const nameHeaderStyle: CSSProperties = {
  ...columnHeaderStyle,
  position: "sticky",
  left: 0,
  zIndex: 6,
  width: `${nameColumnWidth}px`,
  minWidth: `${nameColumnWidth}px`,
  textAlign: "left",
  background: "#fff",
};

const nameCellStyle: CSSProperties = {
  ...appTableCellStyle,
  position: "sticky",
  left: 0,
  zIndex: 5,
  width: `${nameColumnWidth}px`,
  minWidth: `${nameColumnWidth}px`,
  fontWeight: 700,
  background: "inherit",
  whiteSpace: "nowrap",
  borderRight: `1px solid ${borderColor}`,
};

const indexCellStyle: CSSProperties = {
  ...appTableCellStyle,
  width: "20%",
  maxWidth: "20%",
  textAlign: "right",
  color: "#0000cc",
  fontVariantNumeric: "tabular-nums",
  padding: "8px 4px",
  borderRight: `1px solid ${subtleBorderColor}`,
};

const teeCellStyle: CSSProperties = {
  ...appTableCellStyle,
  width: "60%",
  maxWidth: "60%",
  textAlign: "left",
  padding: "7px 8px",
  minWidth: "140px",
  borderRight: `1px solid ${subtleBorderColor}`,
};

const changedTeeCellStyle: CSSProperties = {
  background: "#fff7d6",
};

const teeSelectStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: "28px",
  border: `1px solid ${subtleBorderColor}`,
  borderRadius: "6px",
  background: "#fff",
  color: "#1f2937",
  fontSize: "13px",
  fontWeight: 600,
  padding: "3px 7px",
  outline: "none",
};

const strokesCellStyle: CSSProperties = {
  ...appTableCellStyle,
  width: "20%",
  maxWidth: "20%",
  textAlign: "right",
  fontSize: "16px",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  padding: "8px 5px 8px 3px",
  borderRight: `1px solid ${borderColor}`,
};

const teeNameStyle: CSSProperties = {
  display: "block",
  fontWeight: 600,
  color: "#1f2937",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const teeMetaStyle: CSSProperties = {
  display: "block",
  marginTop: "2px",
  color: "#666",
  fontSize: "11px",
  lineHeight: 1.15,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const noteStyle: CSSProperties = {
  marginTop: "10px",
  color: "#666",
  fontSize: "13px",
  lineHeight: 1.35,
};

const unsavedBannerStyle: CSSProperties = {
  marginBottom: "10px",
  padding: "10px 12px",
  border: "1px solid #facc15",
  borderRadius: "8px",
  background: "#fef9c3",
  color: "#854d0e",
  fontSize: "13px",
  fontWeight: 700,
};


const bottomActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
  paddingTop: "12px",
  borderTop: `1px solid ${subtleBorderColor}`,
};

const saveSuccessToastStyle: CSSProperties = {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: 1000,
  padding: "12px 16px",
  border: "1px solid #bbf7d0",
  borderRadius: "10px",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: "14px",
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.16)",
};

function getBodyRowStyle(index: number): CSSProperties {
  return {
    background: index % 2 === 0 ? "#fff" : "#fafafa",
  };
}

function getRoundStatusBadgeStyle(round: StrokesPerDayRound): CSSProperties {
  if (round.statusCode === "FINALIZED") {
    return {
      ...roundStatusBadgeBaseStyle,
      background: "#f3f4f6",
      borderColor: "#d1d5db",
      color: "#4b5563",
    };
  }

  if (round.statusCode === "IN_PROGRESS") {
    return {
      ...roundStatusBadgeBaseStyle,
      background: "#fff7ed",
      borderColor: "#fed7aa",
      color: "#9a3412",
    };
  }

  return {
    ...roundStatusBadgeBaseStyle,
    background: "#eef6ff",
    borderColor: "#bfdbfe",
    color: "#1d4ed8",
  };
}

function renderTeeDisplay(playerRound: StrokesPerDayPlayerRound | null) {
  const teeName = playerRound?.selectedTeeName ?? "";
  const meta = buildTeeMeta(playerRound);

  return (
    <>
      <span style={teeNameStyle} title={teeName}>
        {teeName}
      </span>
      {meta ? <span style={teeMetaStyle}>{meta}</span> : null}
    </>
  );
}

function renderTeePlannerCell(
  playerRound: StrokesPerDayPlayerRound,
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void,
) {
  const meta = buildTeeMeta(playerRound);
  const options = playerRound.eligibleTeeOptions ?? [];

  return (
    <>
      <select
        style={teeSelectStyle}
        value={playerRound.selectedRoundTeeId ?? ""}
        onChange={onChange}
      >
        {options.length === 0 ? (
          <option value="">No eligible tees</option>
        ) : null}
        {options.map((option) => (
          <option key={option.roundTeeId} value={option.roundTeeId}>
            {option.displayName ?? option.teeName ?? `Tee ${option.roundTeeId}`}
          </option>
        ))}
      </select>
      {meta ? <span style={teeMetaStyle}>{meta}</span> : null}
    </>
  );
}

export default function StrokesPerDayBody({
  data,
  rounds,
  players,
  changedTeeKeys,
  saving,
  saveMessage,
  saveError,
  changedTeeCount,
  hasUnsavedTeeChanges,
  onPlanningTeeChange,
  onResetTeeChanges,
  onSaveTeePlan,
}: StrokesPerDayBodyProps) {
  return (
    <>
      <style>{`
        .daily-handicaps-print-report { display: none; }
        @media print {
          @page { size: letter landscape; margin: 0.22in; }

          button,
          .no-print,
          .app-shell-no-print,
          .daily-handicaps-screen {
            display: none !important;
          }

          body {
            background: #fff !important;
          }

          .daily-handicaps-print-report {
            display: block !important;
            width: 100% !important;
            color: #111827 !important;
          }

          .daily-handicaps-print-title {
            margin: 0 0 2px 0 !important;
            font-size: 20px !important;
            line-height: 1.1 !important;
          }

          .daily-handicaps-print-subtitle {
            margin: 0 0 10px 0 !important;
            font-size: 11px !important;
            color: #374151 !important;
          }

          .daily-handicaps-print-round-page {
            break-after: page !important;
            page-break-after: always !important;
          }

          .daily-handicaps-print-round-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .daily-handicaps-print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            font-size: 8px !important;
            line-height: 1.05 !important;
          }

          .daily-handicaps-print-table thead {
            display: table-header-group !important;
          }

          .daily-handicaps-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .daily-handicaps-print-table th,
          .daily-handicaps-print-table td {
            border: 1px solid #d0d4da !important;
            padding: 2px 3px !important;
            vertical-align: middle !important;
            overflow: hidden !important;
          }

          .daily-handicaps-print-name-col {
            width: 1.12in !important;
            min-width: 1.12in !important;
            max-width: 1.12in !important;
            text-align: left !important;
            font-weight: 800 !important;
          }

          .daily-handicaps-print-index-col {
            width: 0.38in !important;
            text-align: right !important;
            color: #0000cc !important;
            font-variant-numeric: tabular-nums !important;
          }

          .daily-handicaps-print-tee-col {
            width: 1.28in !important;
            text-align: left !important;
          }

          .daily-handicaps-print-strokes-col {
            width: 0.42in !important;
            text-align: right !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            font-variant-numeric: tabular-nums !important;
          }

          .daily-handicaps-print-round-header {
            text-align: center !important;
            background: #f8fafc !important;
          }

          .daily-handicaps-print-round-date {
            display: block !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            line-height: 1.1 !important;
          }

          .daily-handicaps-print-round-day {
            display: block !important;
            margin-top: 1px !important;
            font-size: 8px !important;
            color: #555 !important;
            font-weight: 700 !important;
          }

          .daily-handicaps-print-round-course {
            display: block !important;
            margin-top: 2px !important;
            font-size: 9px !important;
            line-height: 1.05 !important;
            color: #34528f !important;
            font-weight: 900 !important;
          }

          .daily-handicaps-print-round-status {
            display: inline-block !important;
            margin-top: 2px !important;
            padding: 1px 5px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 999px !important;
            font-size: 7px !important;
            color: #374151 !important;
          }

          .daily-handicaps-print-column-header {
            font-size: 8px !important;
            font-weight: 800 !important;
            text-align: center !important;
            background: #fff !important;
          }

          .daily-handicaps-print-tee-name {
            display: block !important;
            font-weight: 800 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .daily-handicaps-print-tee-meta {
            display: block !important;
            margin-top: 1px !important;
            font-size: 6.7px !important;
            line-height: 1.05 !important;
            color: #666 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .daily-handicaps-print-note {
            margin-top: 8px !important;
            font-size: 8px !important;
            line-height: 1.25 !important;
            color: #4b5563 !important;
          }
        }
      `}</style>

      <div className="daily-handicaps-screen" style={sectionStyle}>
        {hasUnsavedTeeChanges ? (
          <div style={unsavedBannerStyle}>
            You have {changedTeeCount} unsaved tee change
            {changedTeeCount === 1 ? "" : "s"}. Save the tee plan before leaving
            this page.
          </div>
        ) : null}
        {saveError ? (
          <div style={{ ...errorBoxStyle, marginBottom: "10px" }}>
            {saveError}
          </div>
        ) : null}
        <div style={tableWrapperStyle}>
          <table style={getTableStyle(rounds.length)}>
            <colgroup>
              <col style={{ width: `${nameColumnWidth}px` }} />
              {rounds.map((round) => (
                <Fragment key={`${round.roundId}-colgroup`}>
                  <col style={{ width: `${indexColumnWidth}px` }} />
                  <col style={{ width: `${teeColumnWidth}px` }} />
                  <col style={{ width: `${strokesColumnWidth}px` }} />
                </Fragment>
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={nameHeaderStyle} rowSpan={2}>
                  Name
                </th>
                {rounds.map((round) => {
                  const courseUrl = normalizeWebsiteUrl(round.courseWebsiteUrl);

                  return (
                    <th
                      key={round.roundId}
                      style={roundHeaderStyle}
                      colSpan={3}
                    >
                      <div style={roundDateStyle}>
                        {formatDate(round.roundDate)}
                      </div>
                      <div style={roundDayStyle}>
                        {round.dayName ?? `Round ${round.roundNumber}`}
                      </div>
                      <div style={roundCourseStyle}>
                        {courseUrl ? (
                          <a
                            href={courseUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={courseNameStyle}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration =
                                "underline";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                            }}
                          >
                            {round.courseName ?? "Course"}
                          </a>
                        ) : (
                          <span style={courseNameStyle}>
                            {round.courseName ?? "Course"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span style={getRoundStatusBadgeStyle(round)}>
                          {getRoundStatusLabel(round)}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>

              <tr>
                {rounds.map((round) => (
                  <Fragment key={`${round.roundId}-header-columns`}>
                    <th style={{ ...columnHeaderStyle, width: "20%" }}>
                      Index
                    </th>
                    <th style={{ ...columnHeaderStyle, width: "60%" }}>
                      Tee Name
                    </th>
                    <th style={{ ...columnHeaderStyle, width: "20%" }}>
                      Strokes
                    </th>{" "}
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {players.map((player, playerIndex) => (
                <tr key={player.playerId} style={getBodyRowStyle(playerIndex)}>
                  <td style={nameCellStyle}>{player.playerName}</td>

                  {rounds.map((round) => {
                    const playerRound = findPlayerRound(player, round);
                    const teeKey = buildPlayerRoundKey(
                      player.playerId,
                      round.roundId,
                    );
                    const teeChanged = changedTeeKeys.has(teeKey);
                    const teeEditable =
                      playerRound != null && isPlanningRound(round);

                    return (
                      <Fragment
                        key={`${player.playerId}-${round.roundId}-data-columns`}
                      >
                        <td style={indexCellStyle}>
                          {formatDecimal(playerRound?.tripIndex)}
                        </td>
                        <td
                          style={{
                            ...teeCellStyle,
                            ...(teeChanged ? changedTeeCellStyle : {}),
                          }}
                        >
                          {teeEditable
                            ? renderTeePlannerCell(playerRound, (event) => {
                                onPlanningTeeChange(
                                  player.playerId,
                                  round.roundId,
                                  event.target.value,
                                );
                              })
                            : renderTeeDisplay(playerRound)}
                        </td>
                        <td
                          style={strokesCellStyle}
                          title={
                            playerRound?.selectedCourseHandicap == null
                              ? undefined
                              : `Course Hcp: ${formatStrokes(playerRound.selectedCourseHandicap)}`
                          }
                        >
                          {formatStrokes(playerRound?.selectedPlayingHandicap)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={noteStyle}>
          Event Index is calculated as of each round date. Tee shows course
          rating / slope / yardage. Planning rounds can be modeled with tee
          dropdowns. Yellow tee cells have unsaved local changes; use Save Tee
          Plan before leaving. Strokes is the Playing Handicap used for net
          scoring. Hover over Strokes to see the Course Handicap.
        </div>

        <div style={bottomActionRowStyle}>
          <button
            type="button"
            style={{
              ...secondaryButtonStyle,
              ...((saving || !hasUnsavedTeeChanges) ? disabledButtonStyle : {}),
            }}
            disabled={saving || !hasUnsavedTeeChanges}
            onClick={() => void onResetTeeChanges()}
          >
            Reset All Changes
          </button>
          <button
            type="button"
            style={{
              ...primaryButtonStyle,
              ...((saving || !hasUnsavedTeeChanges) ? disabledButtonStyle : {}),
            }}
            disabled={saving || !hasUnsavedTeeChanges}
            onClick={() => void onSaveTeePlan()}
          >
            {saving
              ? "Saving..."
              : hasUnsavedTeeChanges
                ? `Save Tee Plan (${changedTeeCount})`
                : "Save Tee Plan"}
          </button>
        </div>
      </div>

      <div className="daily-handicaps-print-report">
        {chunkRounds(rounds, 4).map((roundChunk, chunkIndex) => (
          <div
            className="daily-handicaps-print-round-page"
            key={`print-round-chunk-${chunkIndex}`}
          >
            <h1 className="daily-handicaps-print-title">Daily Handicaps</h1>
            <div className="daily-handicaps-print-subtitle">
              {data.tripName} - selected tee and playing strokes by round
            </div>
            <table className="daily-handicaps-print-table">
              <colgroup>
                <col className="daily-handicaps-print-name-col" />
                {roundChunk.map((round) => (
                  <Fragment key={`print-colgroup-${chunkIndex}-${round.roundId}`}>
                    <col className="daily-handicaps-print-index-col" />
                    <col className="daily-handicaps-print-tee-col" />
                    <col className="daily-handicaps-print-strokes-col" />
                  </Fragment>
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="daily-handicaps-print-name-col daily-handicaps-print-column-header"
                    rowSpan={2}
                  >
                    Name
                  </th>
                  {roundChunk.map((round) => (
                    <th
                      className="daily-handicaps-print-round-header"
                      colSpan={3}
                      key={`print-round-header-${chunkIndex}-${round.roundId}`}
                    >
                      <span className="daily-handicaps-print-round-date">
                        {formatDate(round.roundDate)}
                      </span>
                      <span className="daily-handicaps-print-round-day">
                        {round.dayName ?? `Round ${round.roundNumber}`}
                      </span>
                      <span className="daily-handicaps-print-round-course">
                        {round.courseName ?? ""}
                      </span>
                      <span className="daily-handicaps-print-round-status">
                        {getRoundStatusLabel(round)}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {roundChunk.map((round) => (
                    <Fragment key={`print-column-header-${chunkIndex}-${round.roundId}`}>
                      <th className="daily-handicaps-print-column-header">
                        Index
                      </th>
                      <th className="daily-handicaps-print-column-header">
                        Tee Name
                      </th>
                      <th className="daily-handicaps-print-column-header">
                        Strokes
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={`print-player-${chunkIndex}-${player.playerId}`}>
                    <td className="daily-handicaps-print-name-col">
                      {player.playerName}
                    </td>
                    {roundChunk.map((round) => {
                      const playerRound = findPlayerRound(player, round);

                      return (
                        <Fragment
                          key={`print-player-round-${chunkIndex}-${player.playerId}-${round.roundId}`}
                        >
                          <td className="daily-handicaps-print-index-col">
                            {formatDecimal(playerRound?.tripIndex)}
                          </td>
                          <td className="daily-handicaps-print-tee-col">
                            <span className="daily-handicaps-print-tee-name">
                              {playerRound?.selectedTeeName ?? ""}
                            </span>
                            <span className="daily-handicaps-print-tee-meta">
                              {buildTeeDetail(playerRound)}
                            </span>
                          </td>
                          <td className="daily-handicaps-print-strokes-col">
                            {formatStrokes(
                              playerRound?.selectedPlayingHandicap,
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="daily-handicaps-print-note">
              Event Index is calculated as of each round date. Tee shows course
              rating / slope / yardage. Strokes is the Playing Handicap used
              for net scoring.
            </div>
          </div>
        ))}
      </div>

      {saveMessage ? (
        <div style={saveSuccessToastStyle}>{saveMessage}</div>
      ) : null}
    </>
  );
}
