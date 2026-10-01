import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getTripDetail,
  getTripRounds,
  getTripTournamentSetup,
} from "../api/tripApi";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import type {
  TripDetail,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import {
  formatRoundDisplay,
  formatRoundEventsSummary,
} from "../utils/roundDisplay";

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

type TournamentCompetitionReportLink = {
  competition: "LOW_NET" | "LOW_GROSS";
  label: string;
};

function cleanCompetitionName(
  value: string | null | undefined,
  fallback: string,
): string {
  const configured = value?.trim();
  return configured && configured.length > 0 ? configured : fallback;
}

function getTournamentCompetitionLinks(
  setup: TripTournamentSetup | null,
): TournamentCompetitionReportLink[] {
  if (setup?.enabled !== true) {
    return [];
  }

  const links: TournamentCompetitionReportLink[] = [];
  if (setup.lowNetEnabled !== false) {
    links.push({
      competition: "LOW_NET",
      label: cleanCompetitionName(setup.lowNetName, "Low Net"),
    });
  }
  if (setup.lowGrossEnabled === true) {
    links.push({
      competition: "LOW_GROSS",
      label: cleanCompetitionName(setup.lowGrossName, "Low Gross"),
    });
  }
  return links;
}

export default function TripReportsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [tournamentSetup, setTournamentSetup] =
    useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [tripDetail, tripRounds, setup] = await Promise.all([
          getTripDetail(numericTripId),
          getTripRounds(numericTripId),
          getTripTournamentSetup(numericTripId),
        ]);
        setTrip(tripDetail);
        setRounds(tripRounds);
        setTournamentSetup(setup);
      } catch (err) {
        console.error(err);
        setError("Failed to load event reports.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [numericTripId]);

  const finalizedRounds = useMemo(
    () => rounds.filter((round) => round.finalized === true),
    [rounds],
  );
  const tournamentCompetitionLinks = useMemo(
    () => getTournamentCompetitionLinks(tournamentSetup),
    [tournamentSetup],
  );

  const showTournament = useMemo(() => {
    if (
      tournamentSetup?.enabled !== true ||
      tournamentCompetitionLinks.length === 0
    ) {
      return false;
    }

    return (tournamentSetup.rounds ?? []).some(
      (round) => round.included === true,
    );
  }, [tournamentCompetitionLinks.length, tournamentSetup]);

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading reports...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event was not found."}</div>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Reports & Exports"
        subtitle={`${trip.tripName} - ${trip.tripYear}`}
        actions={<TripDetailButton tripId={trip.tripId} />}
      />

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
                        `/trips/${trip.tripId}/tournament-standings?competition=${link.competition}`,
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
              onClick={() => navigate(`/trips/${trip.tripId}/winning-detail`)}
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
                navigate(`/trips/${trip.tripId}/money-distribution`)
              }
            >
              Open Money Distribution
            </button>
          </div>
        </div>
      </section>

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
                    {round.finalized ? "Finalized" : "Open"}
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

      {finalizedRounds.length === 0 ? (
        <div style={{ ...sectionStyle, color: "#666" }}>
          Finalized round result reports will become more useful after scoring
          and finalization. Tee sheets are available before finalization.
        </div>
      ) : null}
    </div>
  );
}
