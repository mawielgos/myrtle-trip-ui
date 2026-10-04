import React from "react";
import type { ScrambleScoreEntryMode } from "../../../types/round";
import { sectionStyle } from "../../../styles/uiStyles";
import type { ScrambleTeamRow } from "../../../pages/roundScrambleScoringLogic";
import {
  centeredThStyle, centeredTdStyle, holeCellStyle, holeInputStyle, modeButtonStyle,
  scoringModeBadgeStyle, selectedModeButtonStyle, stickyColumnStyle, stickyHeaderStyle,
  subtotalCellStyle, tableStyle, tableWrapStyle, tdStyle, thStyle, topButtonRowStyle, totalInputStyle,
} from "./roundScoringViewStyles";

type HoleMeta = { holeNumber: number; par: number | null; handicap: number | null; strokes: number | null };

type Props = {
  scrambleGameLabel: string;
  scrambleModeLabel: string;
  scrambleEntryMode: ScrambleScoreEntryMode;
  scrambleRows: ScrambleTeamRow[];
  headerHoles: HoleMeta[];
  saving: boolean;
  finalizing: boolean;
  scoringReadOnly: boolean;
  finalized: boolean;
  updateScrambleMode: (mode: ScrambleScoreEntryMode) => void;
  updateScrambleTotal: (roundTeamId: number, value: string) => void;
  setInputRef: (rowId: number, holeIndex: number, element: HTMLInputElement | null, prefix?: string) => void;
  handleScrambleHoleChange: (roundTeamId: number, holeIndex: number, value: string) => void;
  handleHoleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, rowId: number, holeIndex: number, currentValue: string, prefix?: string) => void;
};

function sumHoleRange(holes: string[], startInclusive: number, endExclusive: number): number {
  return holes.slice(startInclusive, endExclusive).reduce((sum, value) => sum + (value === "" ? 0 : Number(value)), 0);
}

function selectScoreInputValue(event: React.FocusEvent<HTMLInputElement>): void { event.currentTarget.select(); }
function keepScoreInputValueSelected(event: React.MouseEvent<HTMLInputElement>): void { event.preventDefault(); }

export default function RoundScrambleScoringSection(props: Props) {
  const { scrambleGameLabel, scrambleModeLabel, scrambleEntryMode, scrambleRows, headerHoles, saving, finalizing, scoringReadOnly, finalized, updateScrambleMode, updateScrambleTotal, setInputRef, handleScrambleHoleChange, handleHoleKeyDown } = props;
  return (
<section style={sectionStyle}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      marginBottom: "12px",
    }}
  >
    <div>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
        {scrambleGameLabel} Scores
      </h2>
      <div
        style={{ fontSize: "0.86rem", color: "#666", marginTop: "4px" }}
      >
        Enter either one final score per team or one shared 18-hole
        scorecard per team.
      </div>
      <div style={{ marginTop: "8px" }}>
        <span style={scoringModeBadgeStyle}>{scrambleModeLabel}</span>
      </div>
    </div>
    <div style={topButtonRowStyle}>
      <button
        type="button"
        style={
          scrambleEntryMode === "TOTAL"
            ? selectedModeButtonStyle
            : modeButtonStyle
        }
        onClick={() => updateScrambleMode("TOTAL")}
        disabled={
          saving || finalizing || scoringReadOnly || finalized
        }
      >
        Final Score
      </button>
      <button
        type="button"
        style={
          scrambleEntryMode === "HOLES"
            ? selectedModeButtonStyle
            : modeButtonStyle
        }
        onClick={() => updateScrambleMode("HOLES")}
        disabled={
          saving || finalizing || scoringReadOnly || finalized
        }
      >
        Hole-by-Hole
      </button>
    </div>
  </div>

  {scrambleEntryMode === "TOTAL" ? (
    <div style={tableWrapStyle}>
      <table style={{ ...tableStyle, maxWidth: "720px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Team</th>
            <th style={centeredThStyle}>Final Score</th>
            <th style={centeredThStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {scrambleRows.map((team) => (
            <tr key={team.roundTeamId}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 700 }}>{team.teamName}</div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {(team.playerNames ?? []).length > 0
                    ? (team.playerNames ?? []).join(" / ")
                    : "No team members assigned"}
                </div>
              </td>
              <td style={centeredTdStyle}>
                <input
                  ref={(element) =>
                    setInputRef(
                      team.roundTeamId,
                      0,
                      element,
                      "scramble-total",
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={team.totalScore}
                  disabled={saving || finalizing || scoringReadOnly}
                  onFocus={selectScoreInputValue}
                  onMouseUp={keepScoreInputValueSelected}
                  onChange={(e) =>
                    updateScrambleTotal(
                      team.roundTeamId,
                      e.target.value,
                    )
                  }
                  style={totalInputStyle}
                />
              </td>
              <td style={centeredTdStyle}>
                {team.totalScore === "" ? "Incomplete" : "Complete"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="scorecard-grid-wrap" style={tableWrapStyle}>
      <table className="scorecard-grid scorecard-grid--scramble" style={tableStyle}>
        <thead>
          <tr className="scorecard-hole-header">
            <th
              className="scorecard-player-header"
              style={{
                ...centeredThStyle,
                ...stickyHeaderStyle,
                ...stickyColumnStyle,
                width: "128px",
                minWidth: "128px",
                maxWidth: "128px",
              }}
            >
              Team
            </th>
            {headerHoles.slice(0, 9).map((hole) => (
              <th
                key={`scramble-hole-front-${hole.holeNumber}`}
                style={{
                  ...centeredThStyle,
                  ...stickyHeaderStyle,
                  minWidth: "30px",
                }}
              >
                {hole.holeNumber}
              </th>
            ))}
            <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
              OUT
            </th>
            {headerHoles.slice(9, 18).map((hole) => (
              <th
                key={`scramble-hole-back-${hole.holeNumber}`}
                style={{
                  ...centeredThStyle,
                  ...stickyHeaderStyle,
                  minWidth: "30px",
                }}
              >
                {hole.holeNumber}
              </th>
            ))}
            <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
              IN
            </th>
            <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {scrambleRows.map((team) => {
            const outTotal = sumHoleRange(team.holes, 0, 9);
            const inTotal = sumHoleRange(team.holes, 9, 18);
            const total = outTotal + inTotal;
            const rowIsComplete = team.holes.every(
              (hole) => hole !== "",
            );

            return (
              <tr key={team.roundTeamId} className="scorecard-player-row">
                <td
                  className="scorecard-player-cell"
                  style={{
                    ...tdStyle,
                    ...stickyColumnStyle,
                    width: "128px",
                    minWidth: "128px",
                    maxWidth: "128px",
                    boxShadow: "1px 0 0 #e5e7eb",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{team.teamName}</div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {(team.playerNames ?? []).length > 0
                      ? (team.playerNames ?? []).join(" / ")
                      : "No team members assigned"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {rowIsComplete
                      ? "Complete"
                      : `${team.holes.filter((hole) => hole !== "").length}/18 entered`}
                  </div>
                </td>
                {team.holes.slice(0, 9).map((hole, index) => (
                  <td
                    key={`scramble-front-${team.roundTeamId}-${index}`}
                    className="scorecard-score-cell"
                    style={holeCellStyle}
                  >
                    <input
                      ref={(element) =>
                        setInputRef(
                          team.roundTeamId,
                          index,
                          element,
                          "scramble",
                        )
                      }
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hole}
                      disabled={saving || finalizing || scoringReadOnly}
                      onFocus={selectScoreInputValue}
                      onMouseUp={keepScoreInputValueSelected}
                      onChange={(e) =>
                        handleScrambleHoleChange(
                          team.roundTeamId,
                          index,
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) =>
                        handleHoleKeyDown(
                          e,
                          team.roundTeamId,
                          index,
                          hole,
                          "scramble",
                        )
                      }
                      className="scorecard-score-input"
                      style={holeInputStyle}
                    />
                  </td>
                ))}
                <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                  {outTotal > 0 ||
                  team.holes.slice(0, 9).some((hole) => hole !== "")
                    ? outTotal
                    : ""}
                </td>
                {team.holes.slice(9, 18).map((hole, index) => (
                  <td
                    key={`scramble-back-${team.roundTeamId}-${index}`}
                    className="scorecard-score-cell"
                    style={holeCellStyle}
                  >
                    <input
                      ref={(element) =>
                        setInputRef(
                          team.roundTeamId,
                          index + 9,
                          element,
                          "scramble",
                        )
                      }
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hole}
                      disabled={saving || finalizing || scoringReadOnly}
                      onFocus={selectScoreInputValue}
                      onMouseUp={keepScoreInputValueSelected}
                      onChange={(e) =>
                        handleScrambleHoleChange(
                          team.roundTeamId,
                          index + 9,
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) =>
                        handleHoleKeyDown(
                          e,
                          team.roundTeamId,
                          index + 9,
                          hole,
                          "scramble",
                        )
                      }
                      className="scorecard-score-input"
                      style={holeInputStyle}
                    />
                  </td>
                ))}
                <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                  {inTotal > 0 ||
                  team.holes.slice(9, 18).some((hole) => hole !== "")
                    ? inTotal
                    : ""}
                </td>
                <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                  {total > 0 || team.holes.some((hole) => hole !== "")
                    ? total
                    : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</section>
  );
}
