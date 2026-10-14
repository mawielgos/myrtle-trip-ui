import type { CSSProperties, ReactNode } from "react";
import type { RoundGameResult, TeamGameResult } from "../../types/round";
import { sectionStyle, tdStyle, thStyle } from "../../styles/uiStyles";
import RoundResultsScorePanels from "./RoundResultsScorePanels";
import { formatCurrencyCents } from "../../utils/moneyFormat";
import { formatGameDescription } from "../../utils/gameFormat";
import type { TeamPlayerResult, TeamValidationGroup } from "./scoreGridBuilders";
import {
  formatEventResultScore,
  getEventPlacementLabel,
  getTeamDisplayTotal,
  getTeamEventDisplayTotal,
  isIndividualResultTie,
  isTeamEventResultTie,
} from "../../pages/roundResultsLogic";
import type { useRoundResultsViewState } from "../../pages/useRoundResultsViewState";

function formatLabel(value?: string | null, scrambleTeamSize?: number | null): string {
  return formatGameDescription(value, scrambleTeamSize);
}

type RoundResultsViewState = ReturnType<typeof useRoundResultsViewState>;

interface RoundResultsPresentationProps {
  results: RoundGameResult;
  viewState: RoundResultsViewState;
}


function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) {
    return "";
  }

  return tied ? `T${value}` : String(value);
}

function isTieForPlacement(
  team: TeamGameResult,
  teams: TeamGameResult[],
): boolean {
  if (team.placement == null) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < teams.length; i += 1) {
    if (teams[i].placement === team.placement) {
      count += 1;
    }
  }
  return count > 1;
}

function getTeamPlayerDisplayLabel(player: TeamPlayerResult): string {
  const name = player.summary.playerName;
  const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
  const withdrawalHoleNumber = player.detail?.withdrawalHoleNumber ?? player.summary.withdrawalHoleNumber ?? null;

  if (status === "WITHDRAWN" && withdrawalHoleNumber != null) {
    return `${name} (WD after ${withdrawalHoleNumber})`;
  }
  if (status === "WITHDRAWN") {
    return `${name} (WD)`;
  }
  if (status === "NO_SHOW") {
    return `${name} (NS)`;
  }
  return name;
}

function isGhostPlayerName(name?: string | null): boolean {
  return (name ?? "").trim().toLowerCase() === "ghost player";
}

function renderEventTeamPlayers(team: TeamGameResult, validationGroups: TeamValidationGroup[]): ReactNode {
  const group = validationGroups.find((candidate) => candidate.teamId === team.teamId);
  if (!group || group.players.length === 0) {
    return null;
  }

  const nodes: ReactNode[] = [];
  for (let i = 0; i < group.players.length; i += 1) {
    const player = group.players[i];
    if (i > 0) {
      nodes.push(<span key={`sep-${player.summary.scorecardId}`}> / </span>);
    }
    const label = getTeamPlayerDisplayLabel(player);
    const ghost = isGhostPlayerName(player.summary.playerName);
    nodes.push(
      <span key={player.summary.scorecardId} style={ghost ? ghostPlayerInlineStyle : undefined}>
        {label}
      </span>,
    );
  }
  return nodes;
}

function teamHasWithdrawnPlayer(team: TeamGameResult | TeamValidationGroup, validationGroups?: TeamValidationGroup[]): boolean {
  const group = "players" in team
    ? team
    : validationGroups?.find((candidate) => candidate.teamId === team.teamId);

  if (!group || group.players.length === 0) {
    return false;
  }

  for (let i = 0; i < group.players.length; i += 1) {
    const player = group.players[i];
    const status = (player.detail?.participationStatus ?? player.summary.participationStatus ?? "").toUpperCase();
    if (status === "WITHDRAWN") {
      return true;
    }
  }

  return false;
}

function renderWithdrawnTeamBadge(show: boolean): ReactNode {
  return show ? (
    <span style={withdrawnTeamBadgeStyle} title="This team includes at least one withdrawn player.">
      WD
    </span>
  ) : null;
}

function getPrizeMemberDisplayName(memberName: string, validationGroups: TeamValidationGroup[]): string {
  const normalizedMemberName = memberName.trim().toLowerCase();
  if (!normalizedMemberName) {
    return memberName;
  }

  for (let i = 0; i < validationGroups.length; i += 1) {
    const group = validationGroups[i];
    for (let j = 0; j < group.players.length; j += 1) {
      const player = group.players[j];
      if ((player.summary.playerName ?? "").trim().toLowerCase() === normalizedMemberName) {
        return getTeamPlayerDisplayLabel(player);
      }
    }
  }

  return memberName;
}

function renderPrizeMemberNames(memberNames: string[], validationGroups: TeamValidationGroup[]): ReactNode {
  if (memberNames.length === 0) {
    return "Team payout";
  }

  const nodes: ReactNode[] = [];
  for (let i = 0; i < memberNames.length; i += 1) {
    const memberName = memberNames[i];
    if (i > 0) {
      nodes.push(<span key={`sep-${memberName}-${i}`}> / </span>);
    }

    const label = getPrizeMemberDisplayName(memberName, validationGroups);
    const ghost = isGhostPlayerName(memberName);
    nodes.push(
      <span key={`${memberName}-${i}`} style={ghost ? ghostPlayerInlineStyle : undefined}>
        {label}
      </span>,
    );
  }

  return nodes;
}















const summaryLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
  fontWeight: 600,
};

const summaryValueStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: 1.15,
};

const summarySubValueStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#666",
};


const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const standingsTableStyle: CSSProperties = {
  width: "auto",
  borderCollapse: "collapse",
  tableLayout: "auto",
};

const standingsNumberCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "center",
  whiteSpace: "nowrap",
  fontWeight: 600,
};

const standingsNameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
};

const eventTeamCellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: "300px",
};

const eventTeamNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  marginBottom: "4px",
};

const eventTeamPlayersStyle: CSSProperties = {
  ...summarySubValueStyle,
  lineHeight: 1.35,
  fontWeight: 500,
};

const ghostPlayerInlineStyle: CSSProperties = {
  color: "#6b7280",
  fontStyle: "italic",
};

const withdrawnTeamBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginLeft: "6px",
  padding: "1px 6px",
  borderRadius: "999px",
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  fontSize: "11px",
  fontWeight: 800,
  lineHeight: 1.4,
  verticalAlign: "middle",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
};

const standingsPrizePanelStyle: CSSProperties = {
  display: "flex",
  gap: "18px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const standingsColumnStyle: CSSProperties = {
  flex: "1 1 560px",
  minWidth: 0,
};

const prizeColumnStyle: CSSProperties = {
  flex: "1 1 420px",
  minWidth: 0,
};

const compactSectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "10px",
  fontSize: "18px",
  minHeight: "22px",
  lineHeight: 1.2,
};

const prizeTitleRowStyle: CSSProperties = {
  ...compactSectionTitleStyle,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
};

const prizeTitleMetaStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "#666",
  whiteSpace: "nowrap",
};







const prizeSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const prizeSummaryCardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#f8fafc",
};

const prizeEventBlockStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  overflow: "hidden",
  background: "#fff",
  marginTop: "12px",
};

const prizeEventHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "12px",
  padding: "10px 12px",
  background: "#fafafa",
  borderBottom: "1px solid #e5e5e5",
};

const prizeEventTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
};

const prizeEntryCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "10px",
  padding: "12px",
};

const prizeEntryCardStyle: CSSProperties = {
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fff",
};

const prizeEntryTopLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "baseline",
};

const prizeEntryNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
};

const prizeEntryAmountStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};


export default function RoundResultsPresentation({ results, viewState }: RoundResultsPresentationProps) {
  const {
    validationGroups,
    roundPrizeTotal,
    prizeBySourceName,
    sortedRoundPrizeWinnings,
    groupedRoundPrizeWinnings,
    individualMode,
    resultEntityLabel,
    displayEventResults,
    hasEventDrivenResults,
  } = viewState;

  function renderGroupedPrizeMoneyWon(compact = false) {
    return (
      <>
        <h2 style={prizeTitleRowStyle}>
          <span>Prize Money Won</span>
          {sortedRoundPrizeWinnings.length > 0 ? (
            <span style={prizeTitleMetaStyle}>
              Round prize total: <strong>{formatCurrencyCents(roundPrizeTotal)}</strong>
            </span>
          ) : null}
        </h2>

        {sortedRoundPrizeWinnings.length > 0 ? (
          <>
            {!compact ? (
              <div style={prizeSummaryGridStyle}>
                <div style={prizeSummaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Distributed This Round</div>
                  <div style={summaryValueStyle}>{formatCurrencyCents(roundPrizeTotal)}</div>
                  <div style={summarySubValueStyle}>Grouped by event and result</div>
                </div>
              </div>
            ) : null}

            {groupedRoundPrizeWinnings.map((group) => (
              <div key={group.key} style={prizeEventBlockStyle} className="round-results-prize-event-block">
                <div style={prizeEventHeaderStyle}>
                  <div>
                    <div style={prizeEventTitleStyle}>{group.eventName}</div>
                    {group.eventType ? <div style={summarySubValueStyle}>{formatLabel(group.eventType)}</div> : null}
                  </div>
                  <div style={{ ...prizeEntryAmountStyle, textAlign: "right" }}>
                    {formatCurrencyCents(group.totalAmount)}
                  </div>
                </div>

                <div style={prizeEntryCardGridStyle}>
                  {group.entries.map((entry) => (
                    <div key={entry.key} style={prizeEntryCardStyle}>
                      <div style={prizeEntryTopLineStyle}>
                        <div>
                          <div style={summarySubValueStyle}>
                            {entry.place != null ? `Place ${entry.place}` : "Place —"}
                          </div>
                          <div style={prizeEntryNameStyle}>
                            {entry.kind === "TEAM" ? entry.resultName : entry.playerName}
                          </div>
                        </div>
                        <div style={prizeEntryAmountStyle}>
                          {formatCurrencyCents(entry.totalAmount)}
                        </div>
                      </div>

                      {entry.kind === "TEAM" ? (
                        <>
                          <div style={{ ...summarySubValueStyle, marginTop: "6px" }}>
                            {renderPrizeMemberNames(entry.memberNames, validationGroups)}
                          </div>
                          <div style={{ ...summarySubValueStyle, marginTop: "4px" }}>
                            {entry.memberNames.length > 0 && entry.perPlayerAmount != null
                              ? `${formatCurrencyCents(entry.perPlayerAmount)} per player`
                              : "Team payout total"}
                          </div>
                        </>
                      ) : (
                        <div style={{ ...summarySubValueStyle, marginTop: "6px" }}>
                          {entry.resultName !== entry.playerName ? entry.resultName : "Individual payout"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={summarySubValueStyle}>
            No prize money has been calculated for this round.
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {hasEventDrivenResults ? (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Event Results</h2>
          <div style={{ display: "grid", gap: "18px" }}>
            {displayEventResults.map((event) => (
              <div
                key={`${event.eventId ?? event.eventType}-${event.eventOrder}`}
                className="round-results-event-result-block"
              >
                <h3 style={{ margin: "0 0 10px", fontSize: "17px" }}>{event.eventName}</h3>

                {event.resultKind === "INDIVIDUAL" ? (
                  <div style={tableWrapStyle}>
                    <table style={{ ...standingsTableStyle, width: "100%" }}>
                      <colgroup>
                        <col style={{ width: "72px" }} />
                        <col style={{ width: "160px" }} />
                        <col />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "96px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                          <th style={thStyle}>Player</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Event Total</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Gross</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.individualResults.map((row) => (
                          <tr key={`${event.eventType}-${row.playerId}`}>
                            <td style={standingsNumberCellStyle}>{getEventPlacementLabel(row.rank, isIndividualResultTie(row, event.individualResults))}</td>
                            <td style={standingsNameCellStyle}>{row.playerName}</td>
                            <td style={standingsNumberCellStyle}>{formatEventResultScore(event, row) ?? ""}</td>
                            <td style={standingsNumberCellStyle}>{row.grossTotal ?? ""}</td>
                            <td style={standingsNumberCellStyle}>{row.netTotal ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={{ ...standingsTableStyle, width: "100%" }}>
                      <colgroup>
                        <col style={{ width: "72px" }} />
                        <col />
                        <col style={{ width: "96px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                          <th style={thStyle}>Team</th>
                          <th style={{ ...thStyle, textAlign: "center" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.teamResults.map((team) => {
                          const players = renderEventTeamPlayers(team, validationGroups);
                          return (
                            <tr key={`${event.eventType}-${team.teamId}`}>
                              <td style={standingsNumberCellStyle}>{placementLabel(team.placement, isTeamEventResultTie(team, event.teamResults))}</td>
                              <td style={eventTeamCellStyle}>
                                <div style={eventTeamNameStyle}>
                                  {team.teamName}
                                  {renderWithdrawnTeamBadge(teamHasWithdrawnPlayer(team, validationGroups))}
                                </div>
                                {players ? <div style={eventTeamPlayersStyle}>{players}</div> : null}
                              </td>
                              <td style={standingsNumberCellStyle}>{getTeamEventDisplayTotal(team, event.eventType) ?? ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasEventDrivenResults ? (
        <section className="round-results-prize-section" style={sectionStyle}>
          {renderGroupedPrizeMoneyWon(false)}
        </section>
      ) : null}

      {!hasEventDrivenResults ? (
      <section style={sectionStyle}>
        <div className="round-results-standings-prize-panel" style={standingsPrizePanelStyle}>
          <div style={standingsColumnStyle}>
            <h2 style={compactSectionTitleStyle}>Standings</h2>

            <div style={tableWrapStyle}>
              <table style={{ ...standingsTableStyle, width: "100%" }}>
                <colgroup>
                  <col style={{ width: "72px" }} />
                  <col />
                  <col style={{ width: "96px" }} />
                  <col style={{ width: "96px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "center" }}>Place</th>
                    <th style={thStyle}>{resultEntityLabel}</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Total</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {results.teams.map((team) => (
                    <tr key={team.teamId}>
                      <td style={standingsNumberCellStyle}>
                        {placementLabel(
                          team.placement,
                          isTieForPlacement(team, results.teams),
                        )}
                      </td>
                      <td style={standingsNameCellStyle}>
                        <div>
                          {team.teamName}
                          {!individualMode ? renderWithdrawnTeamBadge(teamHasWithdrawnPlayer(team, validationGroups)) : null}
                        </div>

                        {!individualMode ? (() => {
                          const group = validationGroups.find(
                            (g) => g.teamId === team.teamId,
                          );
                          if (!group) return null;

                          return (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "2px",
                              }}
                            >
                              {group.players
                                .map((p) => getTeamPlayerDisplayLabel(p))
                                .join(" / ")}
                            </div>
                          );
                        })() : null}
                      </td>
                      <td style={standingsNumberCellStyle}>
                        {getTeamDisplayTotal(team, results.format) ?? ""}
                      </td>
                      <td style={standingsNumberCellStyle}>
                        {prizeBySourceName[team.teamName] != null
                          ? formatCurrencyCents(prizeBySourceName[team.teamName])
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="round-results-prize-section" style={prizeColumnStyle}>
            {renderGroupedPrizeMoneyWon(true)}
          </div>
        </div>
      </section>
      ) : null}

      <RoundResultsScorePanels results={results} viewState={viewState} />
    </>
  );
}
