import type { RefObject } from "react";
import PageHeader from "../components/common/PageHeader";
import ScorecardHoleGrid from "../components/course/ScorecardHoleGrid";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import { getTeeDisplayName } from "./courseTeeEditLogic";
import type { CourseTeeEditCommands } from "./useCourseTeeEditCommands";
import type { CourseTeeEditInteractions } from "./useCourseTeeEditInteractions";
import type { CourseTeeEditPageData } from "./useCourseTeeEditPageData";

const comboSourceSelectorStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const teeCapabilityPanelStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const teeCapabilityCardStyle = {
  border: "1px solid #d7dce5",
  borderRadius: "10px",
  padding: "12px",
  background: "#f8fafc",
};

const teeCapabilityHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "10px",
  fontWeight: 800,
};

const teeCapabilityFieldsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

interface CourseTeeEditBodyProps {
  isNew: boolean;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  data: CourseTeeEditPageData;
  commands: CourseTeeEditCommands;
  interactions: CourseTeeEditInteractions;
  onCourseDetail: () => void;
  onCourseList: () => void;
  onCancel: () => void;
}

export default function CourseTeeEditBody({
  isNew,
  firstFieldRef,
  data,
  commands,
  interactions,
  onCourseDetail,
  onCourseList,
  onCancel,
}: CourseTeeEditBodyProps) {
  const {
    form,
    holes,
    teeBuildMode,
    comboSourceTeeIds,
    comboHoleSourceIds,
    hasMenData,
    hasWomenData,
    loading,
    error,
  } = data;
  const { saving, saveMessage, save } = commands;
  const {
    updateField,
    updateHoleField,
    updateHasMenData,
    updateHasWomenData,
    setBuildMode,
    updateComboSource,
    updateComboHoleSource,
    comboSourceOptions,
    comboSourceOneName,
    comboSourceTwoName,
  } = interactions;

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title={isNew ? "Add Tee" : "Edit Tee"}
        subtitle="Maintain tee version history, rating, slope, par, yardage, and hole data."
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={onCourseDetail} disabled={saving}>
              Course Detail
            </button>
            <button type="button" style={buttonStyle} onClick={onCourseList} disabled={saving}>
              Course List
            </button>
          </div>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "18px" }}>Tee Details</h2>

        {loading ? (
          <div>Loading tee...</div>
        ) : (
          <>
            {isNew ? (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                <button
                  type="button"
                  style={teeBuildMode === "REGULAR" ? primaryButtonStyle : buttonStyle}
                  onClick={() => setBuildMode("REGULAR")}
                  disabled={saving}
                >
                  Regular Tee
                </button>
                <button
                  type="button"
                  style={teeBuildMode === "COMBO" ? primaryButtonStyle : buttonStyle}
                  onClick={() => setBuildMode("COMBO")}
                  disabled={saving || comboSourceOptions.length < 2}
                  title={comboSourceOptions.length < 2 ? "At least two tees are required to build a combo tee." : undefined}
                >
                  Combo Tee
                </button>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                alignItems: "end",
              }}
            >
              <label style={labelStyle} htmlFor="teeName">
                Tee Name
                <input
                  id="teeName"
                  ref={firstFieldRef}
                  style={formInputStyle}
                  value={form.teeName}
                  onChange={(event) => updateField("teeName", event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  disabled={saving}
                  placeholder={teeBuildMode === "COMBO" ? "Orange" : undefined}
                />
              </label>

              <label style={labelStyle} htmlFor="effectiveDate">
                Effective Date
                <input
                  id="effectiveDate"
                  type="date"
                  style={formInputStyle}
                  value={form.effectiveDate}
                  onChange={(event) => updateField("effectiveDate", event.target.value)}
                  disabled={saving}
                />
              </label>

              <label style={labelStyle} htmlFor="retiredDate">
                Retired Date
                <input
                  id="retiredDate"
                  type="date"
                  style={formInputStyle}
                  value={form.retiredDate}
                  onChange={(event) => updateField("retiredDate", event.target.value)}
                  disabled={saving}
                />
              </label>

              <label
                style={{ ...labelStyle, display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: 0 }}
                htmlFor="active"
              >
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateField("active", event.target.checked)}
                  disabled={saving}
                />
                Active
              </label>
            </div>

            <div style={teeCapabilityPanelStyle}>
              <div style={{ ...teeCapabilityCardStyle, background: hasMenData ? "#f8fbff" : "#f8fafc" }}>
                <label style={teeCapabilityHeaderStyle} htmlFor="hasMenData">
                  <input
                    id="hasMenData"
                    type="checkbox"
                    checked={hasMenData}
                    onChange={(event) => updateHasMenData(event.target.checked)}
                    disabled={saving}
                  />
                  Men's Tee Data
                </label>

                <div style={teeCapabilityFieldsStyle}>
                  <label style={labelStyle} htmlFor="courseRating">
                    Course Rating
                    <input
                      id="courseRating"
                      type="number"
                      step="0.1"
                      style={formInputStyle}
                      value={form.courseRating}
                      onChange={(event) => updateField("courseRating", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasMenData}
                    />
                  </label>

                  <label style={labelStyle} htmlFor="slope">
                    Slope
                    <input
                      id="slope"
                      type="number"
                      step="1"
                      style={formInputStyle}
                      value={form.slope}
                      onChange={(event) => updateField("slope", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasMenData}
                    />
                  </label>
                </div>
              </div>

              <div style={{ ...teeCapabilityCardStyle, background: hasWomenData ? "#fff8fd" : "#f8fafc" }}>
                <label style={teeCapabilityHeaderStyle} htmlFor="hasWomenData">
                  <input
                    id="hasWomenData"
                    type="checkbox"
                    checked={hasWomenData}
                    onChange={(event) => updateHasWomenData(event.target.checked)}
                    disabled={saving}
                  />
                  Women's Tee Data
                </label>

                <div style={teeCapabilityFieldsStyle}>
                  <label style={labelStyle} htmlFor="womenCourseRating">
                    Course Rating
                    <input
                      id="womenCourseRating"
                      type="number"
                      step="0.1"
                      style={formInputStyle}
                      value={form.womenCourseRating}
                      onChange={(event) => updateField("womenCourseRating", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasWomenData}
                    />
                  </label>

                  <label style={labelStyle} htmlFor="womenSlope">
                    Slope
                    <input
                      id="womenSlope"
                      type="number"
                      step="1"
                      style={formInputStyle}
                      value={form.womenSlope}
                      onChange={(event) => updateField("womenSlope", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasWomenData}
                    />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {!loading && teeBuildMode === "COMBO" ? (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>Combo Tee Builder</h2>
          <p style={{ marginTop: 0, color: "#555", fontSize: "13px" }}>
            Pick the two source tees, then choose which tee supplies each hole. The selected par, handicap, and yardage are copied into this new tee when saved.
          </p>

          <div style={comboSourceSelectorStyle}>
            <label style={labelStyle} htmlFor="comboSource1">
              Source Tee 1
              <select
                id="comboSource1"
                style={formInputStyle}
                value={comboSourceTeeIds[0]}
                onChange={(event) => updateComboSource(0, event.target.value)}
                disabled={saving}
              >
                <option value="">Select tee...</option>
                {comboSourceOptions.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId} disabled={String(tee.teeId) === comboSourceTeeIds[1]}>
                    {getTeeDisplayName(tee)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle} htmlFor="comboSource2">
              Source Tee 2
              <select
                id="comboSource2"
                style={formInputStyle}
                value={comboSourceTeeIds[1]}
                onChange={(event) => updateComboSource(1, event.target.value)}
                disabled={saving}
              >
                <option value="">Select tee...</option>
                {comboSourceOptions.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId} disabled={String(tee.teeId) === comboSourceTeeIds[0]}>
                    {getTeeDisplayName(tee)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section style={sectionStyle}>
          <ScorecardHoleGrid
            holes={holes}
            disabled={saving}
            holeFieldsDisabled={teeBuildMode === "COMBO"}
            onHoleChange={updateHoleField}
            comboMode={teeBuildMode === "COMBO"}
            comboSourceTeeIds={comboSourceTeeIds}
            comboHoleSourceIds={comboHoleSourceIds}
            sourceNames={[comboSourceOneName, comboSourceTwoName]}
            onComboChange={updateComboHoleSource}
            showMenData={hasMenData}
            showWomenData={hasWomenData}
          />
        </section>
      ) : null}

      {!loading ? (
        <section style={sectionStyle}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={primaryButtonStyle} onClick={() => void save("return")} disabled={saving}>
              {saving ? "Saving..." : "Save & Return to Course"}
            </button>
            <button type="button" style={buttonStyle} onClick={() => void save("addAnother")} disabled={saving}>
              Save & Add Another Tee
            </button>
            <button type="button" style={buttonStyle} onClick={() => void save()} disabled={saving}>
              Save Tee
            </button>
            <button type="button" style={buttonStyle} onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
