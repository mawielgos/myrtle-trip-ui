import { buttonStyle, formInputStyle, labelStyle, sectionStyle } from "../styles/uiStyles";
import type { useTripCreateController } from "./useTripCreateController";

type Controller = ReturnType<typeof useTripCreateController>;
export default function TripCreateDetailsForm({ controller }: { controller: Controller }) {
  const {
    tripName, setTripName, tripYear, setTripYear, tripCode, setTripCode,
    entryFee, setEntryFee, tripStartDate, setTripStartDate, tripEndDate, setTripEndDate,
    plannedRoundCount, setPlannedRoundCount, handicapsEnabled, setHandicapsEnabled,
    handicapMethod, setHandicapMethod, usesFrozenGhinIndex, handleAutoCode, saving, initialized,
  } = controller;
  return (
      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label style={labelStyle} htmlFor="tripName">
            Event Name
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripYear">
            Event Year
            <input
              id="tripYear"
              type="number"
              value={tripYear}
              onChange={(e) => setTripYear(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripCode">
            Event Code
            <input
              id="tripCode"
              type="text"
              value={tripCode}
              onChange={(e) => setTripCode(e.target.value.toUpperCase())}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="entryFee">
            Entry Fee
            <input
              id="entryFee"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripStartDate">
            Event Start Date
            <input
              id="tripStartDate"
              type="date"
              value={tripStartDate}
              onChange={(e) => setTripStartDate(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripEndDate">
            Event End Date
            <input
              id="tripEndDate"
              type="date"
              value={tripEndDate}
              onChange={(e) => setTripEndDate(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="plannedRoundCount">
            Number of Rounds
            <input
              id="plannedRoundCount"
              type="number"
              min={1}
              max={12}
              step={1}
              value={plannedRoundCount}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setPlannedRoundCount(e.target.value);
                }
              }}
              onBlur={() => {
                const parsed = Number(plannedRoundCount);
                if (!Number.isInteger(parsed) || parsed < 1) {
                  setPlannedRoundCount("1");
                } else if (parsed > 12) {
                  setPlannedRoundCount("12");
                }
              }}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label
            style={{
              ...labelStyle,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              paddingBottom: "9px",
            }}
          >
            <input
              type="checkbox"
              checked={!handicapsEnabled}
              onChange={(e) => setHandicapsEnabled(!e.target.checked)}
              disabled={saving || initialized}
            />
            Scratch / no handicaps
          </label>

          <label style={labelStyle} htmlFor="handicapMethod">
            Event Handicap Method
            <select
              id="handicapMethod"
              value={handicapMethod}
              onChange={(e) => setHandicapMethod(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized || !handicapsEnabled}
            >
              <option value="FROZEN_GHIN_INDEX">Frozen GHIN</option>
              <option value="GHIN_HISTORY">GHIN History</option>
              <option value="GHIN_PLUS_DB_SCORE_HISTORY">GHIN History + DB Score History</option>
            </select>
          </label>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            border: "1px solid #d8e2ef",
            borderRadius: "8px",
            background: "#f7fbff",
            color: "#36506c",
            fontSize: "13px",
            lineHeight: 1.4,
          }}
        >
          Event dates are used to validate planned round dates. Number of rounds controls the round rows created on the Round Planning page. Players are optional during initial creation and can be added or imported after the event is saved.
          {" "}
          {handicapsEnabled
            ? "This handicap method applies to the entire event. Mixed event policies are not allowed."
            : "Scratch / no handicaps is selected. Everyone will be treated as scratch for event start readiness and scorecard handicap setup."}
          {handicapsEnabled && usesFrozenGhinIndex
            ? " Enter one frozen starting index for each selected player below."
            : handicapsEnabled && handicapMethod === "GHIN_HISTORY"
            ? " Only loaded GHIN history and event scores will be used for every selected player."
            : handicapsEnabled
            ? " Loaded GHIN history, DB score history, and event scores will be used for every selected player."
            : ""}
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={buttonStyle}
            type="button"
            onClick={handleAutoCode}
            disabled={saving || initialized}
          >
            Build Event Code
          </button>
        </div>
      </div>
  );
}
