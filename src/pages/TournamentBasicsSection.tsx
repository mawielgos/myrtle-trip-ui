import { formInputStyle, sectionStyle } from "../styles/uiStyles";
import type { useTripTournamentSetupController } from "./useTripTournamentSetupController";

type Props = Pick<ReturnType<typeof useTripTournamentSetupController>, "draft" | "isReadOnly" | "saving" | "handleEnabledChange" | "updateDraft">;

export default function TournamentBasicsSection({ draft, isReadOnly, saving, handleEnabledChange, updateDraft }: Props) {
  return (
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Tournament Basics</h2>

        <label style={{ display: "flex", gap: "8px", alignItems: "center", fontWeight: 700, marginBottom: "16px" }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            disabled={isReadOnly || saving}
          />
          This event has a multi-round tournament
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Tournament Name
            <input
              type="text"
              value={draft.tournamentName}
              onChange={(e) => updateDraft({ tournamentName: e.target.value })}
              style={formInputStyle}
              disabled={isReadOnly || saving || !draft.enabled}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Standings Label
            <input
              type="text"
              value={draft.standingsLabel}
              onChange={(e) => updateDraft({ standingsLabel: e.target.value })}
              style={formInputStyle}
              disabled={isReadOnly || saving || !draft.enabled}
            />
          </label>
        </div>


        <div style={{ marginTop: "16px" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>Tournament Competitions</div>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(240px, 1fr)", gap: "8px 12px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={draft.lowNetEnabled}
                onChange={(e) => updateDraft({ lowNetEnabled: e.target.checked })}
                disabled={isReadOnly || saving || !draft.enabled}
                aria-label="Enable Low Net tournament competition"
              />
              <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
                Low Net Competition Name
                <input
                  type="text"
                  value={draft.lowNetName}
                  onChange={(e) => updateDraft({ lowNetName: e.target.value })}
                  style={formInputStyle}
                  disabled={isReadOnly || saving || !draft.enabled || !draft.lowNetEnabled}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(240px, 1fr)", gap: "8px 12px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={draft.lowGrossEnabled}
                onChange={(e) => updateDraft({ lowGrossEnabled: e.target.checked })}
                disabled={isReadOnly || saving || !draft.enabled}
                aria-label="Enable Low Gross tournament competition"
              />
              <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
                Low Gross Competition Name
                <input
                  type="text"
                  value={draft.lowGrossName}
                  onChange={(e) => updateDraft({ lowGrossName: e.target.value })}
                  style={formInputStyle}
                  disabled={isReadOnly || saving || !draft.enabled || !draft.lowGrossEnabled}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={{ color: "#666", fontSize: "13px", marginTop: "10px" }}>
          Tournament Name is the optional umbrella title. Prize Setup, Results, standings, and exports use the enabled competition names for actual scoring and payouts.
        </div>
      </div>
  );
}
