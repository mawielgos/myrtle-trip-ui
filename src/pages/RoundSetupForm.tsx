import type { RoundFormat } from "../types/round";
import {
  buttonStyle, formInputStyle, formSelectStyle, gridStyle, labelStyle,
  primaryButtonStyle, sectionStyle,
} from "../styles/uiStyles";
import { roundFormatOptions } from "./roundSetupLogic";
import type { useRoundSetupController } from "./useRoundSetupController";

type RoundSetupController = ReturnType<typeof useRoundSetupController>;

export default function RoundSetupForm({ controller }: { controller: RoundSetupController }) {
  const {
    loadingLookups, loadingTees, saving, selectedTripId, selectedCourseId,
    selectedDefaultCourseTeeId, roundDate, format, handicapPercent,
    tripOptions, courseOptions, teeOptions, handleCancel, handleSubmit,
    setSelectedTripId, setSelectedCourseId, setSelectedDefaultCourseTeeId,
    setRoundDate, setFormat, setHandicapPercent,
  } = controller;

  return (
      <div style={sectionStyle}>
        {loadingLookups ? (
          <div>Loading round setup options...</div>
        ) : (
          <>
            <div style={gridStyle}>
              <label style={labelStyle} htmlFor="tripId">
                Event
                <select
                  id="tripId"
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  <option value="">Select an event</option>
                  {tripOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="courseId">
                Course
                <select
                  id="courseId"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  <option value="">Select a course</option>
                  {courseOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="defaultCourseTeeId">
                Default Tee
                <select
                  id="defaultCourseTeeId"
                  value={selectedDefaultCourseTeeId}
                  onChange={(e) => setSelectedDefaultCourseTeeId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving || loadingTees || !selectedCourseId}
                >
                  <option value="">
                    {loadingTees ? "Loading tees..." : "Select a default tee"}
                  </option>
                  {teeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="roundDate">
                Round Date
                <input
                  id="roundDate"
                  type="date"
                  value={roundDate}
                  onChange={(e) => setRoundDate(e.target.value)}
                  style={formInputStyle}
                  disabled={saving}
                />
              </label>

              <label style={labelStyle} htmlFor="format">
                Format
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as RoundFormat)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  {roundFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="handicapPercent">
                Handicap Percent
                <input
                  id="handicapPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={handicapPercent}
                  onChange={(e) => setHandicapPercent(e.target.value)}
                  style={formInputStyle}
                  disabled={saving || format === "TEAM_SCRAMBLE"}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <button style={buttonStyle} type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button style={primaryButtonStyle} type="button" onClick={() => void handleSubmit()} disabled={saving}>
                {saving ? "Starting Round..." : "Start Round"}
              </button>
            </div>
          </>
        )}
      </div>
  );
}
