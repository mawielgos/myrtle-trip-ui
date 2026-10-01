import type { CSSProperties } from "react";
import { buttonStyle, strongBorderColor, subtleBorderColor } from "../../styles/uiStyles";

export type ScorecardHoleRow = {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
  womenPar: string;
  womenHandicap: string;
};

type ScorecardHoleField = "par" | "handicap" | "yardage" | "womenPar" | "womenHandicap";

type ScorecardHoleGridProps = {
  holes: ScorecardHoleRow[];
  disabled?: boolean;
  onHoleChange: (index: number, field: ScorecardHoleField, value: string) => void;
  onClearAll?: () => void;
  holeFieldsDisabled?: boolean;
  comboMode?: boolean;
  comboSourceTeeIds?: [string, string];
  comboHoleSourceIds?: string[];
  sourceNames?: [string, string];
  onComboChange?: (index: number, sourceId: string) => void;
  showMenData?: boolean;
  showWomenData?: boolean;
};

const navy = "#0f3470";
const labelBackgrounds: Record<ScorecardHoleField, string> = {
  par: "#eef8e8",
  handicap: "#fff5cf",
  yardage: "#eaf4ff",
  womenPar: "#f7eefe",
  womenHandicap: "#fdeef4",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.2,
};

const helperTextStyle: CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#555",
  fontSize: "13px",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  marginTop: "10px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "980px",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: "14px",
  color: "#111827",
};

const headerCellStyle: CSSProperties = {
  border: `1px solid ${strongBorderColor}`,
  background: navy,
  color: "#fff",
  padding: "9px 8px",
  textAlign: "center",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

const rowLabelStyle: CSSProperties = {
  border: `1px solid ${strongBorderColor}`,
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 700,
  width: "110px",
};

const cellStyle: CSSProperties = {
  border: `1px solid ${subtleBorderColor}`,
  padding: "5px 6px",
  textAlign: "center",
  background: "#fff",
};

const comboSourceOneSelectedCellStyle: CSSProperties = {
  ...cellStyle,
  background: "#e6f0ff",
  boxShadow: "inset 0 0 0 2px #8fb6ff",
};

const comboSourceTwoSelectedCellStyle: CSSProperties = {
  ...cellStyle,
  background: "#e8f7ec",
  boxShadow: "inset 0 0 0 2px #8bd19d",
};

const comboCheckboxStyle: CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
};

const totalCellStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: 800,
  background: "#fafafa",
  fontVariantNumeric: "tabular-nums",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "30px",
  boxSizing: "border-box",
  border: "1px solid transparent",
  borderRadius: "6px",
  background: "transparent",
  textAlign: "center",
  fontSize: "14px",
  fontFamily: "inherit",
  color: "#111827",
  fontVariantNumeric: "tabular-nums",
  outline: "none",
};

function numericValue(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumField(holes: ScorecardHoleRow[], field: "par" | "yardage" | "womenPar"): number | null {
  let total = 0;
  let hasAnyValue = false;

  for (const hole of holes) {
    const value = numericValue(hole[field]);

    if (value != null) {
      total += value;
      hasAnyValue = true;
    }
  }

  return hasAnyValue ? total : null;
}

function getFieldValue(hole: ScorecardHoleRow, field: ScorecardHoleField): string {
  if (field === "par") {
    return hole.par;
  }

  if (field === "handicap") {
    return hole.handicap;
  }

  if (field === "yardage") {
    return hole.yardage;
  }

  if (field === "womenPar") {
    return hole.womenPar;
  }

  return hole.womenHandicap;
}

function renderTotal(holes: ScorecardHoleRow[], field: ScorecardHoleField): string {
  if (field === "handicap" || field === "womenHandicap") {
    return "—";
  }

  if (field !== "par" && field !== "yardage" && field !== "womenPar") {
    return "—";
  }

  const total = sumField(holes, field);
  return total == null ? "—" : String(total);
}

function ScorecardNineGrid({
  title,
  holes,
  startIndex,
  totalLabel,
  extraTotalLabel,
  allHoles,
  disabled,
  onHoleChange,
  holeFieldsDisabled = false,
  comboMode = false,
  comboSourceTeeIds = ["", ""],
  comboHoleSourceIds = [],
  sourceNames = ["Source Tee 1", "Source Tee 2"],
  onComboChange,
  showMenData = true,
  showWomenData = true,
}: {
  title: string;
  holes: ScorecardHoleRow[];
  startIndex: number;
  totalLabel: string;
  extraTotalLabel?: string;
  allHoles: ScorecardHoleRow[];
  disabled?: boolean;
  onHoleChange: (index: number, field: ScorecardHoleField, value: string) => void;
  holeFieldsDisabled?: boolean;
  comboMode?: boolean;
  comboSourceTeeIds?: [string, string];
  comboHoleSourceIds?: string[];
  sourceNames?: [string, string];
  onComboChange?: (index: number, sourceId: string) => void;
  showMenData?: boolean;
  showWomenData?: boolean;
}) {
  const rows: { field: ScorecardHoleField; label: string }[] = [];

  if (showMenData) {
    rows.push({ field: "par", label: "Men Par" });
    rows.push({ field: "handicap", label: "Men Hdcp" });
  }

  rows.push({ field: "yardage", label: "Yardage" });

  if (showWomenData) {
    rows.push({ field: "womenPar", label: "Women Par" });
    rows.push({ field: "womenHandicap", label: "Women Hdcp" });
  }

  const reserveGrandTotalColumn = true;

  return (
    <div style={tableWrapStyle} aria-label={title}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: "left", width: "110px" }}>Hole</th>
            {holes.map((hole) => (
              <th key={hole.holeNumber} style={headerCellStyle}>
                {hole.holeNumber}
              </th>
            ))}
            <th style={headerCellStyle}>{totalLabel}</th>
            {reserveGrandTotalColumn ? (
              <th style={headerCellStyle}>{extraTotalLabel ?? ""}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {comboMode ? (
            <>
              <tr>
                <td style={{ ...rowLabelStyle, background: "#e6f0ff" }}>{sourceNames[0] || "Source Tee 1"}</td>
                {holes.map((hole, localIndex) => {
                  const absoluteIndex = startIndex + localIndex;
                  const sourceId = comboSourceTeeIds[0];
                  const checked = !!sourceId && comboHoleSourceIds[absoluteIndex] === sourceId;

                  return (
                    <td key={`combo-source-1-${hole.holeNumber}`} style={checked ? comboSourceOneSelectedCellStyle : cellStyle}>
                      <input
                        type="checkbox"
                        style={comboCheckboxStyle}
                        checked={checked}
                        onChange={() => sourceId && onComboChange?.(absoluteIndex, sourceId)}
                        disabled={disabled || !comboSourceTeeIds[0] || !comboSourceTeeIds[1]}
                        aria-label={`Use ${sourceNames[0] || "Source Tee 1"} for hole ${hole.holeNumber}`}
                      />
                    </td>
                  );
                })}
                <td style={totalCellStyle}>—</td>
                {reserveGrandTotalColumn ? <td style={totalCellStyle}>{extraTotalLabel ? "—" : ""}</td> : null}
              </tr>

              <tr>
                <td style={{ ...rowLabelStyle, background: "#e8f7ec" }}>{sourceNames[1] || "Source Tee 2"}</td>
                {holes.map((hole, localIndex) => {
                  const absoluteIndex = startIndex + localIndex;
                  const sourceId = comboSourceTeeIds[1];
                  const checked = !!sourceId && comboHoleSourceIds[absoluteIndex] === sourceId;

                  return (
                    <td key={`combo-source-2-${hole.holeNumber}`} style={checked ? comboSourceTwoSelectedCellStyle : cellStyle}>
                      <input
                        type="checkbox"
                        style={comboCheckboxStyle}
                        checked={checked}
                        onChange={() => sourceId && onComboChange?.(absoluteIndex, sourceId)}
                        disabled={disabled || !comboSourceTeeIds[0] || !comboSourceTeeIds[1]}
                        aria-label={`Use ${sourceNames[1] || "Source Tee 2"} for hole ${hole.holeNumber}`}
                      />
                    </td>
                  );
                })}
                <td style={totalCellStyle}>—</td>
                {reserveGrandTotalColumn ? <td style={totalCellStyle}>{extraTotalLabel ? "—" : ""}</td> : null}
              </tr>
            </>
          ) : null}

          {rows.map((row) => (
            <tr key={row.field}>
              <td style={{ ...rowLabelStyle, background: labelBackgrounds[row.field] }}>{row.label}</td>
              {holes.map((hole, localIndex) => {
                const absoluteIndex = startIndex + localIndex;
                const inputId = `hole-${hole.holeNumber}-${row.field}`;

                return (
                  <td key={inputId} style={cellStyle}>
                    <input
                      id={inputId}
                      type="text"
                      inputMode="numeric"
                      style={inputStyle}
                      value={getFieldValue(hole, row.field)}
                      onChange={(event) => onHoleChange(absoluteIndex, row.field, event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={disabled || holeFieldsDisabled}
                      aria-label={`Hole ${hole.holeNumber} ${row.label}`}
                    />
                  </td>
                );
              })}
              <td style={totalCellStyle}>{renderTotal(holes, row.field)}</td>
              {reserveGrandTotalColumn ? (
                <td style={totalCellStyle}>{extraTotalLabel ? renderTotal(allHoles, row.field) : ""}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScorecardHoleGrid({
  holes,
  disabled = false,
  onHoleChange,
  onClearAll,
  holeFieldsDisabled = false,
  comboMode = false,
  comboSourceTeeIds = ["", ""],
  comboHoleSourceIds = [],
  sourceNames = ["Source Tee 1", "Source Tee 2"],
  onComboChange,
  showMenData = true,
  showWomenData = true,
}: ScorecardHoleGridProps) {
  const normalizedHoles = holes.slice(0, 18);
  const frontNine = normalizedHoles.slice(0, 9);
  const backNine = normalizedHoles.slice(9, 18);

  return (
    <>
      <div style={cardHeaderStyle}>
        <h2 style={titleStyle}>
          Hole Data <span style={{ color: "#555", fontSize: "14px", fontWeight: 500 }}>({normalizedHoles.length} Holes)</span>
        </h2>

        {onClearAll ? (
          <button type="button" style={buttonStyle} onClick={onClearAll} disabled={disabled}>
            Clear All
          </button>
        ) : null}
      </div>

      <ScorecardNineGrid
        title="Front Nine Hole Data"
        holes={frontNine}
        startIndex={0}
        totalLabel="OUT"
        allHoles={normalizedHoles}
        disabled={disabled}
        onHoleChange={onHoleChange}
        holeFieldsDisabled={holeFieldsDisabled}
        comboMode={comboMode}
        comboSourceTeeIds={comboSourceTeeIds}
        comboHoleSourceIds={comboHoleSourceIds}
        sourceNames={sourceNames}
        onComboChange={onComboChange}
        showMenData={showMenData}
        showWomenData={showWomenData}
      />

      <ScorecardNineGrid
        title="Back Nine Hole Data"
        holes={backNine}
        startIndex={9}
        totalLabel="IN"
        extraTotalLabel="TOTAL"
        allHoles={normalizedHoles}
        disabled={disabled}
        onHoleChange={onHoleChange}
        holeFieldsDisabled={holeFieldsDisabled}
        comboMode={comboMode}
        comboSourceTeeIds={comboSourceTeeIds}
        comboHoleSourceIds={comboHoleSourceIds}
        sourceNames={sourceNames}
        onComboChange={onComboChange}
        showMenData={showMenData}
        showWomenData={showWomenData}
      />

      <p style={helperTextStyle}>
        OUT, IN, and TOTAL values are calculated automatically. Use the Tee Details checkboxes to show or hide Men and Women scorecard rows.
      </p>
    </>
  );
}
