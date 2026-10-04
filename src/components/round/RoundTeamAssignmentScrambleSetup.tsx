import type { RoundScrambleSeedingRound } from "../../types/round";
import {
  buttonStyle,
  formSelectStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import {
  formatSeedingRoundLabel,
  getScrambleSeedingMethodLabel,
} from "../../pages/roundTeamAssignmentLogic";

const mutedTextStyle: React.CSSProperties = { color: "#666" };

const configGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  padding: "6px 0",
};

const disabledSmallButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: "30px",
  padding: "0 10px",
  fontSize: "13px",
  color: "#888",
  background: "#eee",
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

type Props = {
  scrambleTeamSize: number | null;
  scrambleSeedingMethod: string;
  scrambleHandicapDate: string;
  scrambleSeedingRounds: RoundScrambleSeedingRound[];
  scrambleConfigDirty: boolean;
  canEditScrambleSetup: boolean;
  saving: boolean;
  assignTeamsReason?: string | null;
  updateScrambleTeamSize: (value: number) => void;
  updateScrambleSeedingMethod: (value: string) => void;
  updateScrambleHandicapDate: (value: string) => void;
  updateScrambleSeedingRound: (plannedRoundId: number, included: boolean) => void;
  handleSaveScrambleConfig: () => Promise<unknown>;
  suggestScrambleTeams: (reason?: string | null) => void;
};

export default function RoundTeamAssignmentScrambleSetup({
  scrambleTeamSize,
  scrambleSeedingMethod,
  scrambleHandicapDate,
  scrambleSeedingRounds,
  scrambleConfigDirty,
  canEditScrambleSetup,
  saving,
  assignTeamsReason,
  updateScrambleTeamSize,
  updateScrambleSeedingMethod,
  updateScrambleHandicapDate,
  updateScrambleSeedingRound,
  handleSaveScrambleConfig,
  suggestScrambleTeams,
}: Props) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Scramble Setup</h2>
      <div style={{ ...mutedTextStyle, marginBottom: "12px" }}>
        Configure this Scramble round independently. Pick the team size, seeding
        method, handicap date, and the prior non-Scramble rounds that should feed
        the team seed ranking. After saving setup changes, click Suggest Teams to
        rebuild the team suggestion.
      </div>

      <div style={configGridStyle}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Team Size</div>
          <select
            value={scrambleTeamSize ?? 4}
            onChange={(event) => updateScrambleTeamSize(Number(event.target.value))}
            style={formSelectStyle}
            disabled={saving || !canEditScrambleSetup}
          >
            <option value={2}>2-Person Scramble</option>
            <option value={3}>3-Person Scramble</option>
            <option value={4}>4-Person Scramble</option>
          </select>
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Seeding Method
          </div>
          <select
            value={scrambleSeedingMethod}
            onChange={(event) => updateScrambleSeedingMethod(event.target.value)}
            style={formSelectStyle}
            disabled={saving || !canEditScrambleSetup}
          >
            <option value="CURRENT_HANDICAP_INDEX">Current Handicap Index</option>
            <option value="AVERAGE_GROSS_SCORE">Average Gross Score</option>
            <option value="AVERAGE_NET_SCORE">Average Net Score</option>
          </select>
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Handicap Date
          </div>
          <input
            type="date"
            value={scrambleHandicapDate}
            onChange={(event) => updateScrambleHandicapDate(event.target.value)}
            style={formSelectStyle}
            disabled={saving || !canEditScrambleSetup}
          />
        </label>

        <div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Current Method</div>
          <div
            style={{
              ...mutedTextStyle,
              minHeight: "32px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {getScrambleSeedingMethodLabel(scrambleSeedingMethod)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "14px" }}>
        <div style={{ fontWeight: 600, marginBottom: "6px" }}>
          Source Rounds for This Scramble
        </div>
        {scrambleSeedingRounds.length === 0 ? (
          <div style={mutedTextStyle}>
            No prior non-Scramble rounds are available for this Scramble.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "4px" }}>
            {scrambleSeedingRounds.map((round) => (
              <label
                key={round.plannedRoundId}
                style={{
                  ...checkboxRowStyle,
                  color: round.eligible ? undefined : "#888",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(round.included) && Boolean(round.eligible)}
                  disabled={saving || !canEditScrambleSetup || !round.eligible}
                  onChange={(event) =>
                    updateScrambleSeedingRound(
                      round.plannedRoundId,
                      event.target.checked,
                    )
                  }
                />
                <span>{formatSeedingRoundLabel(round)}</span>
                {!round.eligible ? (
                  <span style={{ fontSize: "12px" }}>Not eligible</span>
                ) : null}
              </label>
            ))}
          </div>
        )}
      </div>

      {canEditScrambleSetup ? (
        <div
          style={{
            marginTop: "14px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => void handleSaveScrambleConfig()}
            disabled={saving || !scrambleConfigDirty}
          >
            {saving
              ? "Saving..."
              : scrambleConfigDirty
                ? "Save Scramble Setup"
                : "Scramble Setup Saved"}
          </button>
          <button
            type="button"
            style={scrambleConfigDirty ? disabledSmallButtonStyle : buttonStyle}
            onClick={() => suggestScrambleTeams(assignTeamsReason)}
            disabled={saving || scrambleConfigDirty}
          >
            Suggest Teams
          </button>
        </div>
      ) : null}
    </section>
  );
}
