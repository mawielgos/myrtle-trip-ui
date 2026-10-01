import type { CSSProperties } from "react";
import { Fragment } from "react";
import type { ScoreGridCellVariant, ScoreGridData } from "./scoreGridTypes";

const validationTableStyle: CSSProperties = {
  width: "100%",
  minWidth: "900px",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: "#fff",
};

const staticLeftCellStyle: CSSProperties = {
  border: "1px solid #9ca3af",
  background: "#f5f6f7",
  padding: "6px 8px",
  textAlign: "left",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const staticPlayerNameCellStyle: CSSProperties = {
  borderTop: "2px solid #6b7280",
  borderBottom: "2px solid #6b7280",
  borderLeft: "2px solid #6b7280",
  borderRight: "1px solid #b6bcc5",
  background: "#fbfbfc",
  padding: "4px 8px",
  textAlign: "left",
  fontWeight: 600,
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};


const ghostPlayerNameStyle: CSSProperties = {
  color: "#6b7280",
  fontStyle: "italic",
};

const strokesLabelCellStyle: CSSProperties = {
  borderTop: "2px solid #6b7280",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #b6bcc5",
  borderRight: "2px solid #6b7280",
  background: "#fbfbfc",
  padding: "4px 4px",
  textAlign: "center",
  fontWeight: 700,
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  overflow: "hidden",
};

const rankHeaderCellStyle: CSSProperties = {
  border: "1px solid #9ca3af",
  background: "#eceff2",
  padding: "4px 4px",
  textAlign: "center",
  fontWeight: 700,
};

const teamHeaderCellStyle: CSSProperties = {
  border: "3px solid #4b5563",
  background: "#eef1f4",
  padding: "6px 8px",
  textAlign: "left",
  fontWeight: 700,
};

const holeHeaderCellStyle: CSSProperties = {
  border: "1px solid #c0c6ce",
  background: "#f7f8fa",
  padding: "4px 0",
  textAlign: "center",
  fontWeight: 700,
};

const totalHeaderCellStyle: CSSProperties = {
  border: "1px solid #c0c6ce",
  background: "#f1f3f5",
  padding: "4px 0",
  textAlign: "center",
  fontWeight: 700,
};

const playerGrossCellStyle: CSSProperties = {
  borderTop: "2px solid #6b7280",
  borderBottom: "1px solid #cfd5dc",
  borderLeft: "1px solid #cfd5dc",
  borderRight: "1px solid #cfd5dc",
  background: "#ffffff",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 600,
  verticalAlign: "middle",
};

const playerNetCellStyle: CSSProperties = {
  borderTop: "1px solid #e5c5c5",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #e5c5c5",
  borderRight: "1px solid #e5c5c5",
  background: "#fff8f8",
  color: "#b42318",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
};

const countedNetCellStyle: CSSProperties = {
  borderTop: "1px solid #98c39a",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #98c39a",
  borderRight: "1px solid #98c39a",
  background: "#edf8ee",
  color: "#166534",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 800,
  verticalAlign: "middle",
};

const droppedNetCellStyle: CSSProperties = {
  borderTop: "1px solid #d8dde3",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #d8dde3",
  borderRight: "1px solid #d8dde3",
  background: "#f5f6f8",
  color: "#7a7f87",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 600,
  verticalAlign: "middle",
};

const totalValueCellStyle: CSSProperties = {
  borderTop: "2px solid #6b7280",
  borderBottom: "1px solid #cfd5dc",
  borderLeft: "1px solid #cfd5dc",
  borderRight: "1px solid #cfd5dc",
  background: "#fcfcfd",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
};

const netTotalValueCellStyle: CSSProperties = {
  borderTop: "1px solid #e5c5c5",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #e5c5c5",
  borderRight: "1px solid #e5c5c5",
  background: "#fff8f8",
  color: "#b42318",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
};

const playerRankSpacerCellStyle: CSSProperties = {
  borderTop: "2px solid #6b7280",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #c0c6ce",
  borderRight: "2px solid #6b7280",
  background: "#fafbfc",
  padding: "0",
};

const teamTotalLabelCellStyle: CSSProperties = {
  borderTop: "3px solid #4b5563",
  borderBottom: "3px solid #4b5563",
  borderLeft: "3px solid #4b5563",
  borderRight: "1px solid #6b7280",
  background: "#f3f4f6",
  padding: "6px 8px",
  textAlign: "right",
  fontWeight: 700,
};

const teamTotalValueCellStyle: CSSProperties = {
  borderTop: "3px solid #4b5563",
  borderBottom: "3px solid #4b5563",
  borderLeft: "1px solid #6b7280",
  borderRight: "1px solid #6b7280",
  background: "#fafafb",
  padding: "6px 0",
  textAlign: "center",
  fontWeight: 700,
};

const highlightedTeamTotalValueCellStyle: CSSProperties = {
  ...teamTotalValueCellStyle,
  background: "#f4fbf5",
  color: "#166534",
  fontWeight: 800,
};

const teamRankCellStyle: CSSProperties = {
  borderTop: "3px solid #4b5563",
  borderBottom: "3px solid #4b5563",
  borderLeft: "1px solid #6b7280",
  borderRight: "3px solid #4b5563",
  background: "#f3f4f6",
  padding: "6px 0",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
};

const highlightedRankCellStyle: CSSProperties = {
  ...teamRankCellStyle,
  background: "#eef6ff",
};

const teamEndRowStyle: CSSProperties = {
  border: "none",
  padding: "4px",
  background: "transparent",
};

const wdCellStyle: CSSProperties = {
  borderTop: "1px solid #d1d5db",
  borderBottom: "2px solid #6b7280",
  borderLeft: "1px solid #d1d5db",
  borderRight: "1px solid #d1d5db",
  background: "#f3f4f6",
  color: "#6b7280",
  padding: "2px 0",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
};

function getNetCellDisplayStyle(variant: ScoreGridCellVariant): CSSProperties {
  if (variant === "wd") {
    return wdCellStyle;
  }
  if (variant === "counted") {
    return countedNetCellStyle;
  }
  if (variant === "dropped") {
    return droppedNetCellStyle;
  }
  return playerNetCellStyle;
}

function parseNumericValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRelativeToPar(
  total: string | number | null | undefined,
  teamPar: string | number | null | undefined,
): string {
  const totalValue = parseNumericValue(total);
  const parValue = parseNumericValue(teamPar);

  if (totalValue === null || parValue === null) {
    return "";
  }

  const diff = totalValue - parValue;
  if (diff === 0) {
    return "E";
  }
  if (diff > 0) {
    return `+${diff}`;
  }
  return `${diff}`;
}

function isLeaderRank(rankLabel: string | null | undefined): boolean {
  if (!rankLabel) {
    return false;
  }

  const normalized = String(rankLabel).trim().toUpperCase();
  return (
    normalized === "1" ||
    normalized === "1ST" ||
    normalized === "T1" ||
    normalized === "T-1"
  );
}

export default function ScoreGrid({ data }: { data: ScoreGridData }) {
  const totalColumns = data.holes.length + 6;
  const teamParMetaRow = data.metaRows.find(
    (row) => row.label.toUpperCase() === "TEAM PAR",
  );

  return (
    <table className="score-grid-table" style={validationTableStyle}>
      <colgroup>
        <col style={{ width: "145px" }} />
        <col style={{ width: "48px" }} />
        {data.holes.map((holeNumber) => (
          <col key={`col-hole-${holeNumber}`} style={{ width: "28px" }} />
        ))}
        <col style={{ width: "44px" }} />
        <col style={{ width: "44px" }} />
        <col style={{ width: "44px" }} />
        <col style={{ width: "38px" }} />
      </colgroup>

      <thead>
        <tr>
          <th
            colSpan={totalColumns}
            style={{
              ...teamHeaderCellStyle,
              textAlign: "center",
              fontSize: "18px",
            }}
          >
            {data.title}
          </th>
        </tr>

        {data.subtitle ? (
          <tr>
            <th
              colSpan={totalColumns}
              style={{ ...staticLeftCellStyle, fontSize: "13px" }}
            >
              {data.subtitle}
            </th>
          </tr>
        ) : null}

        {data.metaRows.map((row) => (
          <tr key={`meta-row-${row.label}`}>
            <th colSpan={2} style={staticLeftCellStyle}>
              {row.label}
            </th>
            {row.values.map((value, index) => (
              <th
                key={`meta-${row.label}-${index + 1}`}
                style={holeHeaderCellStyle}
              >
                {value ?? ""}
              </th>
            ))}
            <th style={totalHeaderCellStyle}>{row.out ?? ""}</th>
            <th style={totalHeaderCellStyle}>{row.in ?? ""}</th>
            <th style={totalHeaderCellStyle}>{row.total ?? ""}</th>
            <th style={rankHeaderCellStyle}></th>
          </tr>
        ))}
      </thead>

      {data.sections.map((section, sectionIndex) => {
        const relativeToPar = formatRelativeToPar(
          section.aggregate.total,
          teamParMetaRow?.total,
        );
        const leader = isLeaderRank(section.aggregate.rankLabel);

        return (
          <tbody key={section.key} className="score-grid-team-section">
              <tr>
                <td style={teamHeaderCellStyle}>{section.teamName}</td>
                <td
                  style={{
                    ...teamHeaderCellStyle,
                    textAlign: "center",
                    padding: "6px 4px",
                  }}
                >
                  Strokes
                </td>
                {data.holes.map((holeNumber) => (
                  <td
                    key={`team-header-hole-${section.key}-${holeNumber}`}
                    style={{
                      ...teamHeaderCellStyle,
                      textAlign: "center",
                      padding: "6px 0",
                    }}
                  >
                    {holeNumber}
                  </td>
                ))}
                <td
                  style={{
                    ...teamHeaderCellStyle,
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  Out
                </td>
                <td
                  style={{
                    ...teamHeaderCellStyle,
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  In
                </td>
                <td
                  style={{
                    ...teamHeaderCellStyle,
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  Total
                </td>
                <td
                  style={{
                    ...teamHeaderCellStyle,
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  Rank
                </td>
              </tr>

              {section.players.map((player) => (
                <Fragment key={player.key}>
                  <tr>
                    <td rowSpan={2} style={staticPlayerNameCellStyle}>
                      <div style={player.playerName === "Ghost Player" ? ghostPlayerNameStyle : undefined}>
                        {player.playerName}
                      </div>
                    </td>
                    <td rowSpan={2} style={strokesLabelCellStyle}>
                      {player.courseHandicap ?? ""}
                    </td>

                    {player.grossValues.map((value, index) => (
                      <td
                        key={`gross-${player.key}-${index + 1}`}
                        style={player.netCellVariants[index] === "wd" ? wdCellStyle : playerGrossCellStyle}
                      >
                        {player.netCellVariants[index] === "wd" ? "WD" : (value ?? "")}
                      </td>
                    ))}

                    <td style={totalValueCellStyle}>{player.grossOut ?? ""}</td>
                    <td style={totalValueCellStyle}>{player.grossIn ?? ""}</td>
                    <td style={totalValueCellStyle}>
                      {player.grossTotal ?? ""}
                    </td>
                    <td rowSpan={2} style={playerRankSpacerCellStyle}></td>
                  </tr>

                  <tr>
                    {player.netValues.map((value, index) => (
                      <td
                        key={`net-${player.key}-${index + 1}`}
                        style={getNetCellDisplayStyle(
                          player.netCellVariants[index] ?? "default",
                        )}
                      >
                        {player.netCellVariants[index] === "wd" ? "WD" : (value ?? "")}
                      </td>
                    ))}

                    <td style={netTotalValueCellStyle}>
                      {player.netOut ?? ""}
                    </td>
                    <td style={netTotalValueCellStyle}>{player.netIn ?? ""}</td>
                    <td style={netTotalValueCellStyle}>
                      {player.netTotal ?? ""}
                    </td>
                  </tr>
                </Fragment>
              ))}

              <tr>
                <td colSpan={2} style={teamTotalLabelCellStyle}>
                  {section.aggregate.label === "Net Total" ? "Best Ball" : section.aggregate.label}
                  {relativeToPar ? ` (${relativeToPar})` : ""}:
                </td>

                {section.aggregate.values.map((value, index) => (
                  <td
                    key={`aggregate-${section.key}-${index + 1}`}
                    style={teamTotalValueCellStyle}
                  >
                    {value ?? ""}
                  </td>
                ))}

                <td
                  style={teamTotalValueCellStyle}
                >
                  {section.aggregate.out ?? ""}
                </td>
                <td
                  style={teamTotalValueCellStyle}
                >
                  {section.aggregate.in ?? ""}
                </td>
                <td
                  style={teamTotalValueCellStyle}
                >
                  {section.aggregate.total ?? ""}
                </td>
                <td
                  style={teamRankCellStyle}
                >
                  {section.aggregate.rankLabel ?? ""}
                </td>
              </tr>

              {sectionIndex < data.sections.length - 1 ? (
                <tr>
                  <td colSpan={totalColumns} style={teamEndRowStyle}></td>
                </tr>
              ) : null}
          </tbody>
        );
      })}
    </table>
  );
}
