import type { CSSProperties } from "react";
import type { NavigateFunction } from "react-router-dom";
import { buttonStyle, sectionStyle } from "../styles/uiStyles";
import { getTournamentCompetitionLinks } from "./tripReportsLogic";

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
};

const cardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
};

type Props = {
  tripId: number;
  showTournament: boolean;
  tournamentCompetitionLinks: ReturnType<typeof getTournamentCompetitionLinks>;
  onNavigate: NavigateFunction;
};

export default function TripEventReports({ tripId, showTournament, tournamentCompetitionLinks, onNavigate: navigate }: Props) {
  return (
<section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Event Reports</h2>
        <div style={cardGridStyle}>
          {showTournament
            ? tournamentCompetitionLinks.map((link) => (
                <div key={link.competition} style={cardStyle}>
                  <h3 style={{ marginTop: 0 }}>{link.label}</h3>
                  <p style={{ color: "#555" }}>
                    Print and CSV export for this configured multi-round
                    tournament leaderboard.
                  </p>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() =>
                      navigate(
                        `/trips/${tripId}/tournament-standings?competition=${link.competition}`,
                      )
                    }
                  >
                    Open {link.label}
                  </button>
                </div>
              ))
            : null}

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Payout Summary</h3>
            <p style={{ color: "#555" }}>
              Event winnings detail with print and CSV export.
            </p>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(`/trips/${tripId}/winning-detail`)}
            >
              Open Payout Summary
            </button>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Money Distribution</h3>
            <p style={{ color: "#555" }}>
              Cash envelope / bill distribution report.
            </p>
            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                navigate(`/trips/${tripId}/money-distribution`)
              }
            >
              Open Money Distribution
            </button>
          </div>
        </div>
      </section>
  );
}
