import { buttonStyle, sectionStyle, thStyle, tdStyle } from "../styles/uiStyles";
import type { useTripTournamentSetupController } from "./useTripTournamentSetupController";
import { isIncluded } from "./tripTournamentSetupLogic";
import { formatGameLabel } from "../components/trip/tripDetailUtils";
import { formatRoundDateShort } from "../utils/roundDisplay";

type Props = Pick<ReturnType<typeof useTripTournamentSetupController>, "draft" | "isReadOnly" | "saving" | "sortedRounds" | "includedCount" | "configuredRoundCount" | "toggleRound" | "selectAllConfiguredRounds" | "clearIncludedRounds">;

export default function TournamentIncludedRoundsSection({ draft, isReadOnly, saving, sortedRounds, includedCount, configuredRoundCount, toggleRound, selectAllConfiguredRounds, clearIncludedRounds }: Props) {
  return (
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Included Rounds</h2>
            <div style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
              {includedCount} of {configuredRoundCount} configured non-scramble rounds included.
            </div>
          </div>

          {!isReadOnly && draft.enabled ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" style={buttonStyle} onClick={selectAllConfiguredRounds} disabled={saving}>
                Include Configured Rounds
              </button>
              <button type="button" style={buttonStyle} onClick={clearIncludedRounds} disabled={saving}>
                Clear Included Rounds
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Include</th>
                <th style={thStyle}>Round</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Game</th>
                <th style={thStyle}>Course</th>
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((round) => {
                const disabled =
                  isReadOnly ||
                  saving ||
                  !draft.enabled ||
                  round.configured !== true;

                return (
                  <tr key={round.plannedRoundId ?? round.roundNumber}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={draft.enabled && round.plannedRoundId != null && isIncluded(draft, round.plannedRoundId)}
                        onChange={(e) => toggleRound(round, e.target.checked)}
                        disabled={disabled}
                      />
                    </td>
                    <td style={tdStyle}>Round {round.roundNumber}</td>
                    <td style={tdStyle}>{formatRoundDateShort(round.roundDate)}</td>
                    <td style={tdStyle}>{formatGameLabel(round.format)}</td>
                    <td style={tdStyle}>{round.courseName || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
  );
}
