import type { CSSProperties } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { TripRoundListItem } from "../types/trip";
import { buttonStyle, primaryButtonStyle, sectionStyle } from "../styles/uiStyles";
import { roundStatusLabel } from "./tripReportsLogic";
import { formatRoundDisplay, formatRoundEventsSummary } from "../utils/roundDisplay";

const cardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
};

type Props = {
  rounds: TripRoundListItem[];
  onNavigate: NavigateFunction;
};

export default function TripRoundReports({ rounds, onNavigate: navigate }: Props) {
  return (
<section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Round Reports</h2>
        {rounds.length === 0 ? (
          <div style={{ color: "#666" }}>No rounds are available yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {rounds.map((round) => (
              <div
                key={round.roundId}
                style={{
                  ...cardStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{formatRoundDisplay(round)}</strong>
                  <div
                    style={{
                      color: "#666",
                      fontSize: "13px",
                      marginTop: "3px",
                    }}
                  >
                    {roundStatusLabel(round)}
                  </div>
                  {(round.events?.length ?? 0) > 0 ? (
                    <div
                      style={{
                        color: "#555",
                        fontSize: "13px",
                        marginTop: "3px",
                      }}
                    >
                      Events: {formatRoundEventsSummary(round)}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() =>
                      navigate(`/rounds/${round.roundId}/tee-sheet`)
                    }
                  >
                    Tee Sheet
                  </button>
                  <button
                    type="button"
                    style={round.finalized ? primaryButtonStyle : buttonStyle}
                    onClick={() => navigate(`/rounds/${round.roundId}/results`)}
                  >
                    Results
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
  );
}
