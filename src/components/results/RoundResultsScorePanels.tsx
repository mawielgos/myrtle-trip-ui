import type { CSSProperties, ReactNode } from "react";
import type { RoundGameResult, TeamGameResult } from "../../types/round";
import { sectionStyle, warningBoxStyle } from "../../styles/uiStyles";
import ScoreGrid from "./ScoreGrid";
import type { TeamPlayerResult, TeamValidationGroup } from "./scoreGridBuilders";
import { formatScoreVsPar, getTeamDisplayTotal } from "../../pages/roundResultsLogic";
import type { useRoundResultsViewState } from "../../pages/useRoundResultsViewState";

type RoundResultsViewState = ReturnType<typeof useRoundResultsViewState>;

interface RoundResultsScorePanelsProps {
  results: RoundGameResult;
  viewState: RoundResultsViewState;
}

function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) return "";
  return tied ? `T${value}` : String(value);
}

function isTieForPlacement(team: TeamGameResult, teams: TeamGameResult[]): boolean {
  if (team.placement == null) return false;
  return teams.filter((candidate) => candidate.placement === team.placement).length > 1;
}

function getTeamPlayerDisplayLabel(player: TeamPlayerResult): string {
  const name = player.summary.playerName;
  const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
  const withdrawalHoleNumber = player.detail?.withdrawalHoleNumber ?? player.summary.withdrawalHoleNumber ?? null;
  if (status === "WITHDRAWN" && withdrawalHoleNumber != null) return `${name} (WD after ${withdrawalHoleNumber})`;
  if (status === "WITHDRAWN") return `${name} (WD)`;
  if (status === "NO_SHOW") return `${name} (NS)`;
  return name;
}

function teamHasWithdrawnPlayer(group: TeamValidationGroup): boolean {
  return group.players.some((player) => {
    const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
    return status === "WITHDRAWN";
  });
}

function renderWithdrawnTeamBadge(show: boolean): ReactNode {
  return show ? (
    <span style={withdrawnTeamBadgeStyle} title="This team includes at least one withdrawn player.">WD</span>
  ) : null;
}

const sectionTitleStyle: CSSProperties = { marginTop: 0, marginBottom: "12px" };
const summaryLabelStyle: CSSProperties = { fontSize: "12px", color: "#666", marginBottom: "4px", fontWeight: 600 };
const summarySubValueStyle: CSSProperties = { marginTop: "4px", fontSize: "12px", color: "#666" };
const tableWrapStyle: CSSProperties = { overflowX: "auto" };
const withdrawnTeamBadgeStyle: CSSProperties = { display: "inline-block", marginLeft: "6px", padding: "1px 5px", borderRadius: "999px", fontSize: "10px", lineHeight: 1.4, fontWeight: 800, color: "#8a1c1c", background: "#fde8e8", border: "1px solid #f5b5b5", verticalAlign: "middle" };
const scrambleSummaryStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" };
const scrambleTeamCardStyle: CSSProperties = { border: "1px solid #d5d9de", borderRadius: "10px", overflow: "hidden", background: "#fff" };
const scrambleTeamHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: "#f7f8fa", borderBottom: "1px solid #e1e4e8" };
const scrambleTeamNameStyle: CSSProperties = { fontSize: "16px", fontWeight: 800 };
const scrambleTeamTotalStyle: CSSProperties = { fontSize: "22px", fontWeight: 800, lineHeight: 1 };
const scrambleCardBodyStyle: CSSProperties = { padding: "12px 14px" };
const mutedTextStyle: CSSProperties = { fontSize: "12px", color: "#666" };
const holeScorePillRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))", gap: "6px", marginTop: "12px" };
const holeScorePillStyle: CSSProperties = { border: "1px solid #dfe3e8", borderRadius: "7px", padding: "5px 4px", textAlign: "center", background: "#fafafa" };

export default function RoundResultsScorePanels({ results, viewState }: RoundResultsScorePanelsProps) {
  const { validationGroups, totalPar, teamParTotal, scoreGridData, showUnsupportedScoreGridMessage, scrambleMode, scrambleHasHoleScores, hasEventDrivenResults } = viewState;

  return (
    <>
      {scrambleMode && !hasEventDrivenResults ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Scramble Results</h2>

          <div style={{ ...summarySubValueStyle, marginBottom: "12px" }}>
            {scrambleHasHoleScores
              ? "Hole-by-hole scramble scores are shown below."
              : "Total-score entry mode: team totals are shown without the unused hole-by-hole grid."}
          </div>

          <div style={scrambleSummaryStyle}>
            {results.teams.map((team) => {
              const group = validationGroups.find((g) => g.teamId === team.teamId);
              const teamTotal = getTeamDisplayTotal(team, results.format);
              const vsPar = formatScoreVsPar(teamTotal, totalPar);
              const isTied = isTieForPlacement(team, results.teams);

              return (
                <div key={team.teamId} style={scrambleTeamCardStyle}>
                  <div style={scrambleTeamHeaderStyle}>
                    <div>
                      <div style={scrambleTeamNameStyle}>
                        {team.teamName}
                        {renderWithdrawnTeamBadge(group ? teamHasWithdrawnPlayer(group) : false)}
                      </div>
                      <div style={mutedTextStyle}>
                        Place {placementLabel(team.placement, isTied) || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={scrambleTeamTotalStyle}>{teamTotal ?? "—"}</div>
                      <div style={mutedTextStyle}>{vsPar}</div>
                    </div>
                  </div>

                  <div style={scrambleCardBodyStyle}>
                    <div style={summaryLabelStyle}>Players</div>
                    <div style={{ fontSize: "14px", lineHeight: 1.35 }}>
                      {group && group.players.length > 0
                        ? group.players.map((p) => getTeamPlayerDisplayLabel(p)).join(" / ")
                        : "—"}
                    </div>

                    {scrambleHasHoleScores ? (
                      <div style={holeScorePillRowStyle}>
                        {[...team.holeResults]
                          .sort((a, b) => a.holeNumber - b.holeNumber)
                          .map((hole) => (
                            <div key={`${team.teamId}-${hole.holeNumber}`} style={holeScorePillStyle}>
                              <div style={mutedTextStyle}>H{hole.holeNumber}</div>
                              <div style={{ fontWeight: 700 }}>{hole.grossScore || "—"}</div>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {scoreGridData ? (
        <section className="round-results-score-grid-section" style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {scoreGridData.title}
            {teamParTotal > 0 ? ` (Team Par - ${teamParTotal})` : ""}
          </h2>

          <div style={tableWrapStyle}>
            <ScoreGrid data={scoreGridData} />
          </div>
        </section>
      ) : null}

      {showUnsupportedScoreGridMessage ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Format-Specific Layout Still Needed</h2>
          <div style={warningBoxStyle}>
            This round format is not yet using the reusable score-grid layout.
          </div>
        </section>
      ) : null}
    </>
  );
}
