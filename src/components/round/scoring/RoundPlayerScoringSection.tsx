import React from "react";
import type { RoundTeeOption } from "../../../types/round";
import { compactSelectStyle, sectionStyle } from "../../../styles/uiStyles";
import {
  formatPostingAdjustedScore,
  getEligibleSortedTeesForPlayer,
  getFilledRequiredHoleCount,
  getRequiredHoleCount,
  getTeeDisplayForPlayer,
  isHoleOpenForRow,
  normalizeParticipationStatus,
  rowHasRequiredScores,
  type ScoreRow,
} from "../../../pages/roundScoringLogic";
import {
  activeStatusButtonStyle,
  centeredThStyle,
  compactPostCellStyle,
  compactSubtotalCellStyle,
  compactTotalCellStyle,
  holeCellStyle,
  holeInputStyle,
  scoringTableWrapStyle,
  stickyColumnStyle,
  stickyScoringHeaderRowOneStyle,
  stickyScoringHeaderRowThreeStyle,
  stickyScoringHeaderRowTwoStyle,
  tableStyle,
  tdStyle,
  teeSelectStyle,
  wdButtonStyle,
} from "./roundScoringViewStyles";

type HoleMeta = ScoreRow["holeMeta"][number];

type Props = {
  rows: ScoreRow[];
  headerHoles: HoleMeta[];
  frontNineParTotal: number;
  backNineParTotal: number;
  totalParTotal: number;
  teeOptions: RoundTeeOption[];
  defaultRoundTeeId: number | null;
  saving: boolean;
  finalizing: boolean;
  scoringReadOnly: boolean;
  setInputRef: (rowId: number, holeIndex: number, element: HTMLInputElement | null, prefix?: string) => void;
  updateTee: (scorecardId: number, roundTeeId: number) => void;
  updateWithdrawalStatus: (scorecardId: number, withdrawalHoleNumber: number | null) => void;
  markRowWithdrawn: (scorecardId: number) => void;
  handlePlayerHoleChange: (scorecardId: number, holeIndex: number, value: string) => void;
  handleHoleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, rowId: number, holeIndex: number, currentValue: string, prefix?: string) => void;
};

function formatRoundTotal(row: ScoreRow, total: number): string {
  const status = normalizeParticipationStatus(row.participationStatus);
  const playedHoleCount = getFilledRequiredHoleCount(row);
  if (total <= 0 && !row.holes.some((hole) => hole !== "")) return "";
  if (status === "WITHDRAWN" && playedHoleCount > 0 && playedHoleCount < 18) return `${total} (${playedHoleCount}h)`;
  return String(total);
}

function formatNetTotal(row: ScoreRow): string {
  if (normalizeParticipationStatus(row.participationStatus) === "WITHDRAWN") return "";
  return row.netScore == null ? "" : String(row.netScore);
}

function getPlayerRowStatusText(row: ScoreRow): string {
  const filledHoleCount = getFilledRequiredHoleCount(row);
  const requiredHoleCount = getRequiredHoleCount(row);
  const rowIsComplete = rowHasRequiredScores(row);
  const rowStatus = normalizeParticipationStatus(row.participationStatus);
  if (rowStatus === "WITHDRAWN") return `WD ${row.withdrawalHoleNumber ?? "?"} • ${filledHoleCount}/${requiredHoleCount}`;
  return rowIsComplete ? "Complete" : `${filledHoleCount}/${requiredHoleCount}`;
}

function sumHoleRange(holes: string[], startInclusive: number, endExclusive: number): number {
  return holes.slice(startInclusive, endExclusive).reduce((sum, value) => sum + (value === "" ? 0 : Number(value)), 0);
}

function formatTripIndex(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return Number(value).toFixed(1);
}

function getDisplayTeeName(row: ScoreRow): string {
  return row.currentTeeName || row.teeName || "";
}

function selectScoreInputValue(event: React.FocusEvent<HTMLInputElement>): void {
  event.currentTarget.select();
}

function keepScoreInputValueSelected(event: React.MouseEvent<HTMLInputElement>): void {
  event.preventDefault();
}

export default function RoundPlayerScoringSection(props: Props) {
  const {
    rows, headerHoles, frontNineParTotal, backNineParTotal, totalParTotal,
    teeOptions, defaultRoundTeeId, saving, finalizing, scoringReadOnly,
    setInputRef, updateTee, updateWithdrawalStatus, markRowWithdrawn,
    handlePlayerHoleChange, handleHoleKeyDown,
  } = props;

  function renderTeeSelector(row: ScoreRow): React.ReactNode {
    const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, row.gender);
    if (eligibleTees.length === 0) return <span>{getDisplayTeeName(row)}</span>;
    const selectedRoundTeeId = row.roundTeeId ?? defaultRoundTeeId;
    const selectedTeeIsEligible =
      selectedRoundTeeId == null ||
      eligibleTees.some((tee) => tee.roundTeeId === selectedRoundTeeId);
    return (
      <select
        value={selectedTeeIsEligible ? (selectedRoundTeeId ?? "") : ""}
        onChange={(e) => updateTee(row.scorecardId, Number(e.target.value))}
        disabled={saving || finalizing || scoringReadOnly}
        style={teeSelectStyle}
      >
        {!selectedTeeIsEligible ? <option value="">Select tee</option> : null}
        {eligibleTees.map((tee) => (
          <option key={tee.roundTeeId} value={tee.roundTeeId}>
            {getTeeDisplayForPlayer(tee, row.gender)}
          </option>
        ))}
      </select>
    );
  }

  return (
<section style={sectionStyle}>
  <div className="scorecard-grid-wrap" style={scoringTableWrapStyle}>
    <table className="scorecard-grid" style={tableStyle}>
      <thead>
        <tr className="scorecard-hole-header">
          <th
            className="scorecard-player-header"
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              ...stickyColumnStyle,
              width: "230px",
              minWidth: "230px",
              maxWidth: "230px",
              zIndex: 8,
            }}
          >
            Player
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
            Team
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
            Tee
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
            Index
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
            CH
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
            PH
          </th>

          {headerHoles.slice(0, 9).map((hole) => (
            <th
              key={`hole-front-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowOneStyle,
                minWidth: "30px",
              }}
            >
              {hole.holeNumber}
            </th>
          ))}

          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              width: "34px",
              minWidth: "34px",
              maxWidth: "34px",
            }}
          >
            OUT
          </th>

          {headerHoles.slice(9, 18).map((hole) => (
            <th
              key={`hole-back-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowOneStyle,
                minWidth: "30px",
              }}
            >
              {hole.holeNumber}
            </th>
          ))}

          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              width: "34px",
              minWidth: "34px",
              maxWidth: "34px",
            }}
          >
            IN
          </th>
          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              width: "40px",
              minWidth: "40px",
              maxWidth: "40px",
            }}
          >
            TOTAL
          </th>
          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              width: "42px",
              minWidth: "42px",
              maxWidth: "42px",
            }}
            title="Adjusted gross for completed active 18-hole scorecards. Mid-round withdrawals are shown as partial totals in the Total column."
          >
            Post
          </th>
          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowOneStyle,
              width: "34px",
              minWidth: "34px",
              maxWidth: "34px",
            }}
          >
            Net
          </th>
        </tr>

        <tr className="scorecard-info-header scorecard-par-header">
          <th
            className="scorecard-row-label"
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowTwoStyle,
              ...stickyColumnStyle,
              width: "230px",
              minWidth: "230px",
              maxWidth: "230px",
              zIndex: 7,
              fontWeight: 500,
              color: "#555",
            }}
          >
            PAR
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />

          {headerHoles.slice(0, 9).map((hole) => (
            <th
              key={`par-front-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowTwoStyle,
                color: "#555",
                fontWeight: 500,
              }}
            >
              {hole.par ?? ""}
            </th>
          ))}

          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowTwoStyle,
              width: "34px",
              minWidth: "34px",
              maxWidth: "34px",
              fontWeight: 700,
              color: "#555",
            }}
          >
            {frontNineParTotal || ""}
          </th>

          {headerHoles.slice(9, 18).map((hole) => (
            <th
              key={`par-back-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowTwoStyle,
                color: "#555",
                fontWeight: 500,
              }}
            >
              {hole.par ?? ""}
            </th>
          ))}

          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowTwoStyle,
              width: "34px",
              minWidth: "34px",
              maxWidth: "34px",
              fontWeight: 700,
              color: "#555",
            }}
          >
            {backNineParTotal || ""}
          </th>

          <th
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowTwoStyle,
              width: "40px",
              minWidth: "40px",
              maxWidth: "40px",
              fontWeight: 700,
              color: "#555",
            }}
          >
            {totalParTotal || ""}
          </th>

          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
        </tr>

        <tr className="scorecard-info-header scorecard-handicap-header">
          <th
            className="scorecard-row-label"
            style={{
              ...centeredThStyle,
              ...stickyScoringHeaderRowThreeStyle,
              ...stickyColumnStyle,
              width: "230px",
              minWidth: "230px",
              maxWidth: "230px",
              zIndex: 7,
              fontWeight: 500,
              color: "#555",
            }}
          >
            HDCP
          </th>
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />

          {headerHoles.slice(0, 9).map((hole) => (
            <th
              key={`hcp-front-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowThreeStyle,
                color: "#555",
                fontWeight: 500,
              }}
            >
              {hole.handicap ?? ""}
            </th>
          ))}

          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />

          {headerHoles.slice(9, 18).map((hole) => (
            <th
              key={`hcp-back-${hole.holeNumber}`}
              style={{
                ...centeredThStyle,
                ...stickyScoringHeaderRowThreeStyle,
                color: "#555",
                fontWeight: 500,
              }}
            >
              {hole.handicap ?? ""}
            </th>
          ))}

          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
          <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
        </tr>
      </thead>

      <tbody>
        {rows.map((row, rowIndex) => {
          const rowStatus = normalizeParticipationStatus(
            row.participationStatus,
          );
          const postingAdjustedScore = formatPostingAdjustedScore(row);

          const outTotal = sumHoleRange(row.holes, 0, 9);
          const inTotal = sumHoleRange(row.holes, 9, 18);
          const total = outTotal + inTotal;
          const totalDisplay = formatRoundTotal(row, total);
          const netDisplay = formatNetTotal(row);

          const previousRow = rowIndex > 0 ? rows[rowIndex - 1] : null;
          const startsNewTeam =
            rowIndex > 0 &&
            (previousRow?.teamId ?? previousRow?.teamName) !==
              (row.teamId ?? row.teamName);

          return (
            <tr
              key={row.scorecardId}
              className={[
                "scorecard-player-row",
                startsNewTeam ? "scorecard-team-start" : "",
                rowStatus === "WITHDRAWN" ? "scorecard-row-withdrawn" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <td
                className="scorecard-player-cell"
                style={{
                  ...tdStyle,
                  ...stickyColumnStyle,
                  width: "230px",
                  minWidth: "230px",
                  maxWidth: "230px",
                  boxShadow: "1px 0 0 #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  <div className="scorecard-player-identity">
                    <span className="scorecard-player-name" title={row.playerName}>
                      {row.playerName}
                    </span>
                    <span
                      className={`scorecard-player-status${rowStatus === "WITHDRAWN" ? " scorecard-player-status--withdrawn" : ""}`}
                    >
                      {getPlayerRowStatusText(row)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      marginLeft: "auto",
                      flex: "0 0 auto",
                    }}
                  >
                  {!scoringReadOnly ? (
                    rowStatus === "WITHDRAWN" ? (
                      <>
                        <select
                          aria-label={`Withdrawal hole for ${row.playerName}`}
                          value={row.withdrawalHoleNumber ?? ""}
                          onChange={(e) =>
                            updateWithdrawalStatus(
                              row.scorecardId,
                              Number(e.target.value),
                            )
                          }
                          disabled={
                            saving || finalizing || scoringReadOnly
                          }
                          style={{
                            ...compactSelectStyle,
                            width: "44px",
                            minWidth: "44px",
                            height: "22px",
                            fontSize: "0.72rem",
                            padding: "1px 2px",
                          }}
                        >
                          {Array.from(
                            { length: 18 },
                            (_, index) => index + 1,
                          ).map((holeNumber) => (
                            <option key={holeNumber} value={holeNumber}>
                              {holeNumber}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          style={activeStatusButtonStyle}
                          onClick={() =>
                            updateWithdrawalStatus(
                              row.scorecardId,
                              null,
                            )
                          }
                          disabled={
                            saving || finalizing || scoringReadOnly
                          }
                        >
                          Active
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        style={wdButtonStyle}
                        onClick={() =>
                          markRowWithdrawn(row.scorecardId)
                        }
                        disabled={
                          saving || finalizing || scoringReadOnly
                        }
                      >
                        WD
                      </button>
                    )
                  ) : null}
                  </div>
                </div>
              </td>

              <td className="scorecard-meta-cell">{row.teamName ?? ""}</td>
              <td className="scorecard-meta-cell scorecard-tee-cell">{renderTeeSelector(row)}</td>
              <td
                className="scorecard-meta-cell"
                title={row.handicapLabel ?? undefined}
              >
                {formatTripIndex(row.tripIndex)}
              </td>
              <td className="scorecard-meta-cell">{row.courseHandicap ?? ""}</td>
              <td className="scorecard-meta-cell">{row.playingHandicap ?? ""}</td>

              {row.holes.slice(0, 9).map((hole, index) => (
                <td key={`front-${index}`} className="scorecard-score-cell" style={holeCellStyle}>
                  <input
                    ref={(element) =>
                      setInputRef(row.scorecardId, index, element)
                    }
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={hole}
                    disabled={
                      saving ||
                      finalizing ||
                      scoringReadOnly ||
                      !isHoleOpenForRow(row, index)
                    }
                    placeholder={
                      !isHoleOpenForRow(row, index) ? "WD" : undefined
                    }
                    onFocus={selectScoreInputValue}
                    onMouseUp={keepScoreInputValueSelected}
                    onChange={(e) =>
                      handlePlayerHoleChange(
                        row.scorecardId,
                        index,
                        e.target.value,
                      )
                    }
                    onKeyDown={(e) =>
                      handleHoleKeyDown(e, row.scorecardId, index, hole)
                    }
                    className="scorecard-score-input"
                    style={
                      !isHoleOpenForRow(row, index)
                        ? {
                            ...holeInputStyle,
                            background: "#f3f4f6",
                            color: "#9ca3af",
                          }
                        : holeInputStyle
                    }
                  />
                </td>
              ))}

              <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>
                {outTotal > 0 ||
                row.holes.slice(0, 9).some((hole) => hole !== "")
                  ? outTotal
                  : ""}
              </td>

              {row.holes.slice(9, 18).map((hole, index) => (
                <td key={`back-${index}`} className="scorecard-score-cell" style={holeCellStyle}>
                  <input
                    ref={(element) =>
                      setInputRef(row.scorecardId, index + 9, element)
                    }
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={hole}
                    disabled={
                      saving ||
                      finalizing ||
                      scoringReadOnly ||
                      !isHoleOpenForRow(row, index + 9)
                    }
                    placeholder={
                      !isHoleOpenForRow(row, index + 9)
                        ? "WD"
                        : undefined
                    }
                    onFocus={selectScoreInputValue}
                    onMouseUp={keepScoreInputValueSelected}
                    onChange={(e) =>
                      handlePlayerHoleChange(
                        row.scorecardId,
                        index + 9,
                        e.target.value,
                      )
                    }
                    onKeyDown={(e) =>
                      handleHoleKeyDown(
                        e,
                        row.scorecardId,
                        index + 9,
                        hole,
                      )
                    }
                    className="scorecard-score-input"
                    style={
                      !isHoleOpenForRow(row, index + 9)
                        ? {
                            ...holeInputStyle,
                            background: "#f3f4f6",
                            color: "#9ca3af",
                          }
                        : holeInputStyle
                    }
                  />
                </td>
              ))}

              <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>
                {inTotal > 0 ||
                row.holes.slice(9, 18).some((hole) => hole !== "")
                  ? inTotal
                  : ""}
              </td>

              <td
                className="scorecard-summary-cell scorecard-total-cell"
                style={{
                  ...compactTotalCellStyle,
                  fontSize: totalDisplay.includes("(") ? "0.72rem" : undefined,
                  lineHeight: totalDisplay.includes("(") ? 1.05 : undefined,
                }}
                title={
                  totalDisplay.includes("(")
                    ? "Partial total for a mid-round withdrawal. Team holes after the WD use the remaining eligible players."
                    : undefined
                }
              >
                {totalDisplay}
              </td>
              <td
                className="scorecard-summary-cell scorecard-post-cell"
                style={{
                  ...compactPostCellStyle,
                  fontSize: postingAdjustedScore.startsWith("No")
                    ? "0.72rem"
                    : undefined,
                  color: postingAdjustedScore.startsWith("No")
                    ? "#92400e"
                    : undefined,
                }}
                title={
                  postingAdjustedScore.includes("(")
                    ? "Posting adjusted gross for holes played. For 10-17 holes, post hole-by-hole in GHIN; GHIN applies expected score to unplayed holes."
                    : undefined
                }
              >
                {postingAdjustedScore}
              </td>
              <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>{netDisplay}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>
  );
}
