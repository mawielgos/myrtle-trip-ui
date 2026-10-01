import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCourseTee,
  getCourseTee,
  getCourseTeeHoles,
  saveCourseTeeHoles,
  updateCourseTee,
} from "../api/courseAdminApi";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  gridStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import type {
  CourseHole,
  CourseTee,
  SaveCourseTeeRequest,
} from "../types/courseAdmin";

interface TeeFormState {
  teeName: string;
  courseRating: string;
  slope: string;
  parTotal: string;
  active: string;
}

interface HoleEditRow {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
}

type HoleField = "par" | "handicap" | "yardage";

function createDefaultHoles(): HoleEditRow[] {
  const rows: HoleEditRow[] = [];
  for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
    rows.push({
      holeNumber,
      par: "4",
      handicap: String(holeNumber),
      yardage: "",
    });
  }
  return rows;
}

function courseHoleToEdit(hole: CourseHole): HoleEditRow {
  return {
    holeNumber: hole.holeNumber,
    par: hole.par != null ? String(hole.par) : "",
    handicap: hole.handicap != null ? String(hole.handicap) : "",
    yardage: hole.yardage != null ? String(hole.yardage) : "",
  };
}

function parseRequiredNumber(value: string): number {
  return Number(value);
}

function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/[^0-9]/g, "").slice(0, maxLength);
}

function getFieldMaxLength(field: HoleField): number {
  if (field === "yardage") {
    return 4;
  }
  return 2;
}

export default function CourseTeeEditPage() {
  const navigate = useNavigate();
  const params = useParams();

  const courseId = Number(params.courseId);
  const teeIdParam = params.teeId;
  const isNew = !teeIdParam || teeIdParam === "new";
  const teeId = !isNew && teeIdParam ? Number(teeIdParam) : null;
  
  const [teeForm, setTeeForm] = useState<TeeFormState>({
    teeName: "",
    courseRating: "",
    slope: "",
    parTotal: "72",
    active: "true",
  });

  const [holes, setHoles] = useState<HoleEditRow[]>(createDefaultHoles());
  const [loading, setLoading] = useState(!isNew);
  const [savingTee, setSavingTee] = useState(false);
  const [savingHoles, setSavingHoles] = useState(false);
  const [error, setError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getInputKey(index: number, field: HoleField): string {
    return `${field}-${index}`;
  }

  function setInputRef(
    index: number,
    field: HoleField,
    element: HTMLInputElement | null
  ) {
    inputRefs.current[getInputKey(index, field)] = element;
  }

  function focusField(index: number, field: HoleField) {
    const element = inputRefs.current[getInputKey(index, field)];
    if (!element) {
      return;
    }

    window.setTimeout(() => {
      element.focus();
      element.select();
    }, 0);
  }

  function focusNextField(index: number, field: HoleField) {
    if (index >= 17) {
      return;
    }
    focusField(index + 1, field);
  }

  function focusPreviousField(index: number, field: HoleField) {
    if (index <= 0) {
      return;
    }
    focusField(index - 1, field);
  }

  async function loadTee() {
    if (!teeId) {
      return;
    }

    setLoading(true);
    setError("");
    setValidationMessage("");
    setSuccessMessage("");

    try {
      const [tee, holeList] = await Promise.all([
        getCourseTee(teeId),
        getCourseTeeHoles(teeId),
      ]);

      setTeeForm({
        teeName: tee.teeName,
        courseRating: String(tee.courseRating),
        slope: String(tee.slope),
        parTotal: String(tee.parTotal),
        active: String(tee.active),
      });

      if (holeList.length > 0) {
        const mapped = holeList
          .map(courseHoleToEdit)
          .sort((a, b) => a.holeNumber - b.holeNumber);
        setHoles(mapped);
      } else {
        setHoles(createDefaultHoles());
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load tee.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isNew) {
      void loadTee();
    }
  }, [isNew, teeId]);

  function updateTeeField(field: keyof TeeFormState, value: string) {
    setTeeForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setValidationMessage("");
    setSuccessMessage("");
  }

  function updateHole(index: number, field: HoleField, value: string) {
    const maxLength = getFieldMaxLength(field);
    const sanitized = digitsOnly(value, maxLength);

    setHoles((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      current[field] = sanitized;
      next[index] = current;
      return next;
    });

    setValidationMessage("");
    setSuccessMessage("");
  }

  function handleHoleChange(index: number, field: HoleField, value: string) {
    updateHole(index, field, value);
  }

  function handleHoleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: HoleField,
    currentValue: string
  ) {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;

    const fullValueSelected =
      currentValue.length > 0 &&
      selectionStart === 0 &&
      selectionEnd === currentValue.length;

    const isDigitKey = /^[0-9]$/.test(event.key);

    if (event.key === "Backspace" && currentValue === "") {
      event.preventDefault();
      focusPreviousField(index, field);
      return;
    }

    if (event.key === "ArrowLeft" && selectionStart === 0 && selectionEnd === 0) {
      event.preventDefault();
      focusPreviousField(index, field);
      return;
    }

    if (
      event.key === "ArrowRight" &&
      selectionStart === currentValue.length &&
      selectionEnd === currentValue.length
    ) {
      event.preventDefault();
      focusNextField(index, field);
      return;
    }

    if (!isDigitKey) {
      return;
    }

    if (field === "yardage") {
      const replacingAll = currentValue === "" || fullValueSelected;

      if (replacingAll) {
        return;
      }

      const nextLength =
        currentValue.length - (selectionEnd - selectionStart) + 1;

      if (nextLength >= 3) {
        window.setTimeout(() => {
          focusNextField(index, field);
        }, 0);
      }
      return;
    }

    const replacingSingleValue = currentValue === "" || fullValueSelected;

    if (replacingSingleValue) {
      window.setTimeout(() => {
        focusNextField(index, field);
      }, 0);
    }
  }

  const frontNine = useMemo(() => holes.slice(0, 9), [holes]);
  const backNine = useMemo(() => holes.slice(9, 18), [holes]);

  const frontPar = useMemo(() => {
    let total = 0;
    for (const hole of frontNine) {
      total += Number(hole.par || 0);
    }
    return total;
  }, [frontNine]);

  const backPar = useMemo(() => {
    let total = 0;
    for (const hole of backNine) {
      total += Number(hole.par || 0);
    }
    return total;
  }, [backNine]);

  const totalPar = useMemo(() => {
    return frontPar + backPar;
  }, [frontPar, backPar]);

  const frontYardage = useMemo(() => {
    let total = 0;
    for (const hole of frontNine) {
      total += Number(hole.yardage || 0);
    }
    return total;
  }, [frontNine]);

  const backYardage = useMemo(() => {
    let total = 0;
    for (const hole of backNine) {
      total += Number(hole.yardage || 0);
    }
    return total;
  }, [backNine]);

  const totalYardage = useMemo(() => {
    return frontYardage + backYardage;
  }, [frontYardage, backYardage]);

  function validateTeeForm(): string | null {
    if (!teeForm.teeName.trim()) {
      return "Tee name is required.";
    }

    const courseRating = parseRequiredNumber(teeForm.courseRating);
    if (Number.isNaN(courseRating) || courseRating <= 0) {
      return "Course rating must be greater than 0.";
    }

    const slope = parseRequiredNumber(teeForm.slope);
    if (Number.isNaN(slope) || slope < 55 || slope > 155) {
      return "Slope must be between 55 and 155.";
    }

    const parTotal = parseRequiredNumber(teeForm.parTotal);
    if (Number.isNaN(parTotal) || parTotal <= 0) {
      return "Par total must be greater than 0.";
    }

    return null;
  }

  function validateHoleGrid(): string | null {
    if (holes.length !== 18) {
      return "Exactly 18 holes are required.";
    }

    const handicaps = new Set<number>();

    for (let index = 0; index < holes.length; index += 1) {
      const hole = holes[index];
      const expectedHoleNumber = index + 1;

      if (hole.holeNumber !== expectedHoleNumber) {
        return `Hole numbers must stay fixed at 1 through 18. Problem at hole ${expectedHoleNumber}.`;
      }

      const par = Number(hole.par);
      if (Number.isNaN(par) || par < 3 || par > 5) {
        return `Par must be 3, 4, or 5 on hole ${hole.holeNumber}.`;
      }

      const handicap = Number(hole.handicap);
      if (Number.isNaN(handicap) || handicap < 1 || handicap > 18) {
        return `Handicap must be between 1 and 18 on hole ${hole.holeNumber}.`;
      }

      if (handicaps.has(handicap)) {
        return `Duplicate handicap: ${handicap}.`;
      }
      handicaps.add(handicap);

      if (hole.yardage !== "") {
        const yardage = Number(hole.yardage);
        if (Number.isNaN(yardage) || yardage <= 0) {
          return `Yardage must be positive on hole ${hole.holeNumber}.`;
        }
      }
    }

    const teeParTotal = Number(teeForm.parTotal);
    if (teeParTotal !== totalPar) {
      return `Hole par total ${totalPar} does not match tee par total ${teeParTotal}.`;
    }

    return null;
  }

  async function handleSaveTee() {
    setError("");
    setValidationMessage("");
    setSuccessMessage("");

    const teeValidationError = validateTeeForm();
    if (teeValidationError) {
      setValidationMessage(teeValidationError);
      return;
    }

    setSavingTee(true);

    try {
      const payload: SaveCourseTeeRequest = {
        teeName: teeForm.teeName.trim(),
        courseRating: Number(teeForm.courseRating),
        slope: Number(teeForm.slope),
        parTotal: Number(teeForm.parTotal),
        active: teeForm.active === "true",
      };

      let saved: CourseTee;
      if (isNew) {
        saved = await createCourseTee(courseId, payload);
        navigate(`/admin/courses/${courseId}/tees/${saved.teeId}`);
        return;
      }

      saved = await updateCourseTee(teeId as number, payload);
      void saved;
      await loadTee();
      setSuccessMessage("Tee information saved.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save tee.");
    } finally {
      setSavingTee(false);
    }
  }

  async function handleSaveHoles() {
    setError("");
    setValidationMessage("");
    setSuccessMessage("");

    if (isNew || !teeId) {
      setValidationMessage("Save the tee before saving hole setup.");
      return;
    }

    const teeValidationError = validateTeeForm();
    if (teeValidationError) {
      setValidationMessage(teeValidationError);
      return;
    }

    const holeValidationError = validateHoleGrid();
    if (holeValidationError) {
      setValidationMessage(holeValidationError);
      return;
    }

    setSavingHoles(true);

    try {
      const sorted = [...holes]
        .sort((a, b) => a.holeNumber - b.holeNumber)
        .map((hole) => ({
          holeNumber: hole.holeNumber,
          par: Number(hole.par),
          handicap: Number(hole.handicap),
          yardage: hole.yardage === "" ? null : Number(hole.yardage),
        }));

      await saveCourseTeeHoles(teeId, sorted);
      await loadTee();
      setSuccessMessage("Hole setup saved.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save holes.");
    } finally {
      setSavingHoles(false);
    }
  }

  function renderScorecardSection(
    title: string,
    holeSlice: HoleEditRow[],
    startIndex: number,
    parSubtotal: number,
    yardageSubtotal: number
  ) {
    return (
      <div style={scorecardSectionStyle}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>{title}</h3>

        <div style={scorecardWrapStyle}>
          <table style={scorecardTableStyle}>
            <tbody>
              <tr>
                <td style={labelCellStyle}>Hole</td>
                {holeSlice.map((hole) => (
                  <td key={`hole-${hole.holeNumber}`} style={readOnlyCellStyle}>
                    {hole.holeNumber}
                  </td>
                ))}
                <td style={subtotalLabelCellStyle}>Out</td>
              </tr>

              <tr>
                <td style={labelCellStyle}>Yards</td>
                {holeSlice.map((hole, offset) => (
                  <td key={`yards-${hole.holeNumber}`} style={inputCellStyle}>
                    <input
                      ref={(element) =>
                        setInputRef(startIndex + offset, "yardage", element)
                      }
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={hole.yardage}
                      onChange={(e) =>
                        handleHoleChange(
                          startIndex + offset,
                          "yardage",
                          e.target.value
                        )
                      }
                      onKeyDown={(e) =>
                        handleHoleKeyDown(
                          e,
                          startIndex + offset,
                          "yardage",
                          hole.yardage
                        )
                      }
                      style={yardageInputStyle}
                    />
                  </td>
                ))}
                <td style={subtotalValueCellStyle}>{yardageSubtotal}</td>
              </tr>

              <tr>
                <td style={labelCellStyle}>Par</td>
                {holeSlice.map((hole, offset) => (
                  <td key={`par-${hole.holeNumber}`} style={inputCellStyle}>
                    <input
                      ref={(element) =>
                        setInputRef(startIndex + offset, "par", element)
                      }
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={hole.par}
                      onChange={(e) =>
                        handleHoleChange(startIndex + offset, "par", e.target.value)
                      }
                      onKeyDown={(e) =>
                        handleHoleKeyDown(e, startIndex + offset, "par", hole.par)
                      }
                      style={scorecardInputStyle}
                    />
                  </td>
                ))}
                <td style={subtotalValueCellStyle}>{parSubtotal}</td>
              </tr>

              <tr>
                <td style={labelCellStyle}>Hdcp</td>
                {holeSlice.map((hole, offset) => (
                  <td key={`hdcp-${hole.holeNumber}`} style={inputCellStyle}>
                    <input
                      ref={(element) =>
                        setInputRef(startIndex + offset, "handicap", element)
                      }
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={hole.handicap}
                      onChange={(e) =>
                        handleHoleChange(
                          startIndex + offset,
                          "handicap",
                          e.target.value
                        )
                      }
                      onKeyDown={(e) =>
                        handleHoleKeyDown(
                          e,
                          startIndex + offset,
                          "handicap",
                          hole.handicap
                        )
                      }
                      style={scorecardInputStyle}
                    />
                  </td>
                ))}
                <td style={subtotalValueCellStyle}> </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p>Loading tee...</p>
      </div>
    );
  }

  const teeParTotalNumber = Number(teeForm.parTotal);
  const parMismatch =
    !Number.isNaN(teeParTotalNumber) && teeParTotalNumber !== totalPar;

  return (
    <div style={pageContainerWideStyle}>
      <h1>{isNew ? "Add Tee" : "Edit Tee"}</h1>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button style={buttonStyle} onClick={() => navigate(`/admin/courses/${courseId}`)}>
          Back to Course
        </button>
      </div>

      {error && <div style={errorBoxStyle}>{error}</div>}
      {validationMessage && <div style={warningBoxStyle}>{validationMessage}</div>}
      {successMessage && <div style={successBoxStyle}>{successMessage}</div>}

      <div style={sectionStyle}>
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
          <h2 style={{ margin: 0 }}>Tee Info</h2>
          {!isNew && (
            <div style={{ fontSize: "14px", color: "#444" }}>
              Status: {teeForm.active === "true" ? "Active" : "Inactive"}
            </div>
          )}
        </div>

        <div style={gridStyle}>
          <label style={labelStyle}>
            Tee Name
            <input
              style={formInputStyle}
              value={teeForm.teeName}
              onChange={(e) => updateTeeField("teeName", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Course Rating
            <input
              style={formInputStyle}
              type="number"
              step="0.1"
              value={teeForm.courseRating}
              onChange={(e) => updateTeeField("courseRating", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Slope
            <input
              style={formInputStyle}
              type="number"
              value={teeForm.slope}
              onChange={(e) => updateTeeField("slope", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Par Total
            <input
              style={formInputStyle}
              type="number"
              value={teeForm.parTotal}
              onChange={(e) => updateTeeField("parTotal", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Active
            <select
              style={formSelectStyle}
              value={teeForm.active}
              onChange={(e) => updateTeeField("active", e.target.value)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: "16px" }}>
          <button style={primaryButtonStyle} onClick={handleSaveTee} disabled={savingTee}>
            {savingTee ? "Saving..." : "Save Tee"}
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 6px 0" }}>Hole Setup</h2>
            {isNew ? (
              <p style={{ margin: 0, color: "#555" }}>
                Save the tee first, then save the hole setup.
              </p>
            ) : (
              <p style={{ margin: 0, color: "#555" }}>
                Scorecard-style layout. Hole numbers are fixed at 1 through 18.
              </p>
            )}
          </div>

          <div style={summaryWrapStyle}>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Front Par</div>
              <div style={summaryValueStyle}>{frontPar}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Back Par</div>
              <div style={summaryValueStyle}>{backPar}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Total Par</div>
              <div style={summaryValueStyle}>{totalPar}</div>
            </div>
            <div
              style={{
                ...summaryCardStyle,
                borderColor: parMismatch ? "#d9534f" : "#ddd",
              }}
            >
              <div style={summaryLabelStyle}>Tee Par</div>
              <div style={summaryValueStyle}>{teeForm.parTotal || "-"}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>Total Yards</div>
              <div style={summaryValueStyle}>{totalYardage}</div>
            </div>
          </div>
        </div>

        {parMismatch && (
          <div style={warningBoxStyle}>
            Hole par total {totalPar} does not match tee par total {teeForm.parTotal}.
          </div>
        )}

        {renderScorecardSection("Front 9", frontNine, 0, frontPar, frontYardage)}
        {renderScorecardSection("Back 9", backNine, 9, backPar, backYardage)}

        <div style={{ marginTop: "16px" }}>
          <button
            style={primaryButtonStyle}
            onClick={handleSaveHoles}
            disabled={savingHoles || isNew}
          >
            {savingHoles ? "Saving..." : "Save Hole Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

const summaryWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "10px 12px",
  minWidth: "92px",
  background: "#fafafa",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
};

const scorecardSectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const scorecardWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const scorecardTableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  minWidth: "980px",
  width: "100%",
};

const labelCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  background: "#f7f7f7",
  fontWeight: 700,
  textAlign: "left",
  minWidth: "70px",
};

const readOnlyCellStyle: React.CSSProperties = {
  padding: "10px 8px",
  border: "1px solid #ccc",
  textAlign: "center",
  background: "#fafafa",
  fontWeight: 600,
  minWidth: "58px",
};

const inputCellStyle: React.CSSProperties = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
  background: "#fff",
  minWidth: "58px",
};

const subtotalLabelCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  textAlign: "center",
  background: "#eef3f8",
  fontWeight: 700,
  minWidth: "70px",
};

const subtotalValueCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  textAlign: "center",
  background: "#f5f9fc",
  fontWeight: 700,
  minWidth: "70px",
};

const scorecardInputStyle: React.CSSProperties = {
  width: "42px",
  height: "30px",
  textAlign: "center",
  padding: "2px 4px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid #bbb",
  borderRadius: "4px",
  appearance: "textfield",
  MozAppearance: "textfield" as any,
};

const yardageInputStyle: React.CSSProperties = {
  width: "58px",
  height: "30px",
  textAlign: "center",
  padding: "2px 4px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid #bbb",
  borderRadius: "4px",
  appearance: "textfield",
  MozAppearance: "textfield" as any,
};