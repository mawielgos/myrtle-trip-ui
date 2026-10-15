import type { CSSProperties } from "react";
import type { HandicapCardPlayerSummary } from "../types/handicapCard";
import {
  appTableCellStyle, appTableHeaderCellStyle, appTableNameCellStyle,
  appTableNumericCellStyle, appTableRowBackground, appTableStyle,
  borderColor, buttonStyle, sectionStyle, subtleBackground, subtleBorderColor,
} from "../styles/uiStyles";
import { formatHandicapMethod } from "../utils/handicapMethod";
import { formatDecimal, formatStatus } from "./handicapCardsLogic";

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

function getStatusBadgeStyle(statusCode: string | null | undefined): CSSProperties {
  if (statusCode === "READY") {
    return { ...statusBadgeBaseStyle, color: "#1f6b2a", background: "#edf8f0", border: "1px solid #d8e8dc" };
  }
  return { ...statusBadgeBaseStyle, color: "#8a5a00", background: "#fff7e6", border: "1px solid #f2d39b" };
}

type Props = {
  loading: boolean;
  sortedPlayers: HandicapCardPlayerSummary[];
  openPlayer: (player: HandicapCardPlayerSummary) => void;
};

export default function HandicapCardsSummaryTable({ loading, sortedPlayers, openPlayer }: Props) {
  return (
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
  );
}
