import { useEffect, useMemo, useState } from "react";
import { getTripTournamentSetup } from "../../api/tripApi";
import { buttonStyle, primaryButtonStyle, secondaryButtonStyle, sectionStyle } from "../../styles/uiStyles";
import type { TripPlannedRound, TripRoundListItem, TripTournamentSetup } from "../../types/trip";
import { formatRoundDisplay } from "../../utils/roundDisplay";

interface TripStandingsPanelProps {
  tripId: number;
  rounds: TripRoundListItem[];
  plannedRounds: TripPlannedRound[];
  tripStatus: string;
  onNavigate: (path: string) => void;
}

type TournamentCompetitionLink = {
  competition: "LOW_NET" | "LOW_GROSS";
  label: string;
};

function isConfiguredTournamentRound(round: TripPlannedRound): boolean {
  return (
    round.includeInFourDayStandings === true &&
    Boolean(round.roundDate) &&
    Boolean(round.format) &&
    round.courseId != null &&
    round.defaultTeeId != null
  );
}

function cleanCompetitionName(value: string | null | undefined, fallback: string): string {
  const configured = value?.trim();
  return configured && configured.length > 0 ? configured : fallback;
}

function getTournamentName(setup: TripTournamentSetup | null): string {
  const configured = setup?.name?.trim();
  return configured && configured.length > 0 ? configured : "Tournament";
}

function getTournamentCompetitionLinks(setup: TripTournamentSetup | null): TournamentCompetitionLink[] {
  if (setup?.enabled !== true) {
    return [];
  }

  const links: TournamentCompetitionLink[] = [];

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

export default function TripStandingsPanel({
  tripId,
  rounds,
  plannedRounds,
  tripStatus,
  onNavigate,
}: TripStandingsPanelProps) {
  const finalizedRounds = rounds.filter((round) => round.finalized === true);
  const [tournamentSetup, setTournamentSetup] = useState<TripTournamentSetup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTournamentSetup(): Promise<void> {
      try {
        const setup = await getTripTournamentSetup(tripId);
        if (!cancelled) {
          setTournamentSetup(setup);
        }
      } catch (err) {
        console.error("Failed to load tournament setup for event results panel", err);
        if (!cancelled) {
          setTournamentSetup(null);
        }
      }
    }

    void loadTournamentSetup();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const tournamentRoundCount = useMemo(() => {
    if (tournamentSetup?.enabled === true) {
      return (tournamentSetup.rounds ?? []).filter((round) => round.included === true && round.configured === true).length;
    }

    return plannedRounds.filter((round) => isConfiguredTournamentRound(round)).length;
  }, [plannedRounds, tournamentSetup]);

  const tournamentCompetitionLinks = useMemo(() => {
    return getTournamentCompetitionLinks(tournamentSetup);
  }, [tournamentSetup]);

  const showTournamentSetup = tripStatus !== "COMPLETE" && plannedRounds.length >= 2;
  const showTournamentStandings = tournamentRoundCount >= 2 && tournamentCompetitionLinks.length > 0;
  const tournamentName = getTournamentName(tournamentSetup);

  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Results</h2>

      <div style={{ fontSize: "14px", color: "#555", marginBottom: "12px" }}>
        Review finalized round results, multi-round tournament standings, and payout summaries.
      </div>

      {showTournamentStandings ? (
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#444",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {tournamentName}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {tournamentCompetitionLinks.map((link) => (
              <button
                key={link.competition}
                type="button"
                style={buttonStyle}
                onClick={() => onNavigate(`/trips/${tripId}/tournament-standings?competition=${link.competition}`)}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {showTournamentSetup ? (
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => onNavigate(`/trips/${tripId}/tournament-setup`)}
          >
            Tournament Setup
          </button>
        ) : null}

        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => onNavigate(`/trips/${tripId}/reports`)}
        >
          Reports & Exports
        </button>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => onNavigate(`/trips/${tripId}/winning-detail`)}
        >
          View Payout Summary
        </button>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => onNavigate(`/trips/${tripId}/money-distribution`)}
        >
          Money Distribution
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => onNavigate(`/trips/${tripId}/prizes`)}
        >
          Prize Setup
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid #e1e4e8",
          paddingTop: "12px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#444",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Round Results
        </div>

        {finalizedRounds.length === 0 ? (
          <div style={{ fontSize: "14px", color: "#666" }}>
            Finalized round results will appear here.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {finalizedRounds.map((round) => (
              <button
                key={round.roundId}
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  justifyContent: "flex-start",
                  textAlign: "left",
                }}
                onClick={() => onNavigate(`/rounds/${round.roundId}/results`)}
              >
                {formatRoundDisplay(round)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
