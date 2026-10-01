import { Link } from "react-router-dom";
import {
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import type { TripPlannedRound, TripRoundListItem, TripTournamentSetup } from "../../types/trip";
import {
  buildPlannedRoundAction,
  formatGameLabel,
} from "./tripDetailUtils";
import { formatRoundDateShort, formatRoundEventDescription } from "../../utils/roundDisplay";

interface TripPlannedRoundsPanelProps {
  tripId: number;
  tripStatus: string;
  plannedRounds: TripPlannedRound[];
  roundsByRoundNumber: Map<number, TripRoundListItem>;
  onNavigate: (path: string) => void;
  tournamentSetup?: TripTournamentSetup | null;
}


function getTournamentCompetitionLabels(tournamentSetup: TripTournamentSetup | null | undefined): string[] {
  if (tournamentSetup?.enabled !== true) {
    return [];
  }

  const labels: string[] = [];

  if (tournamentSetup.lowNetEnabled === true) {
    labels.push(tournamentSetup.lowNetName?.trim() || "Low Net");
  }

  if (tournamentSetup.lowGrossEnabled === true) {
    labels.push(tournamentSetup.lowGrossName?.trim() || "Low Gross");
  }

  return labels;
}

function isRoundIncludedInTournament(round: TripPlannedRound, tournamentSetup: TripTournamentSetup | null | undefined): boolean {
  if (tournamentSetup?.enabled !== true) {
    return round.includeInFourDayStandings === true;
  }

  return (tournamentSetup.rounds ?? []).some(
    (tournamentRound) =>
      tournamentRound.included === true &&
      tournamentRound.roundNumber === round.roundNumber,
  );
}

function formatTournamentDisplay(
  round: TripPlannedRound,
  tournamentSetup: TripTournamentSetup | null | undefined,
): string {
  if (!isRoundIncludedInTournament(round, tournamentSetup)) {
    return "Not included";
  }

  const labels = getTournamentCompetitionLabels(tournamentSetup);
  return labels.length > 0 ? labels.join(" + ") : "Included";
}

function formatPlannedRoundGameLabel(round: TripPlannedRound): string {
  const eventLabels = (round.events ?? [])
    .slice()
    .sort((a, b) => (a.eventOrder ?? 999) - (b.eventOrder ?? 999))
    .map((event) => formatRoundEventDescription(event.eventType, event.eventName ?? event.defaultEventName))
    .filter((label) => label && label !== "—");

  if (eventLabels.length > 0) {
    return eventLabels.join(" + ");
  }

  return formatGameLabel(round.format);
}

function formatCourseRatingInDisplay(value: string | null | undefined): string {
  if (!value) {
    return value || "";
  }

  return value.replace(/(Rating\s+)(\d+(?:\.\d+)?)/gi, (_match, prefix: string, ratingText: string) => {
    const rating = Number(ratingText);
    return Number.isFinite(rating) ? `${prefix}${rating.toFixed(1)}` : `${prefix}${ratingText}`;
  });
}

function isConfiguredPlannedRound(round: TripPlannedRound): boolean {
  return (
    Boolean(round.roundDate) &&
    Boolean(round.format) &&
    round.courseId != null &&
    round.defaultTeeId != null
  );
}

export default function TripPlannedRoundsPanel({
  tripId,
  tripStatus,
  plannedRounds,
  roundsByRoundNumber,
  onNavigate,
  tournamentSetup,
}: TripPlannedRoundsPanelProps) {
  const configuredRoundCount = plannedRounds.filter(isConfiguredPlannedRound).length;
  const tripIsComplete = tripStatus === "COMPLETE";
  const tournamentSetupAvailable = plannedRounds.length >= 2 && !tripIsComplete;
  const tournamentIncludedRoundCount = plannedRounds.filter(
    (round) => isConfiguredPlannedRound(round) && isRoundIncludedInTournament(round, tournamentSetup),
  ).length;
  const tournamentRoundsHaveBeenSet = tournamentIncludedRoundCount >= 2;

  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0 }}>Planned Rounds</h2>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {tripStatus !== "IN_PROGRESS" && tripStatus !== "COMPLETE" ? (
            <Link to={`/trips/${tripId}/planned-rounds`}>
              <button type="button" style={buttonStyle}>
                Edit Planned Rounds
              </button>
            </Link>
          ) : null}
          {tournamentSetupAvailable ? (
            <Link to={`/trips/${tripId}/tournament-setup`}>
              <button type="button" style={buttonStyle}>
                Tournament Setup
              </button>
            </Link>
          ) : null}
        </div>
      </div>

      {plannedRounds.length === 0 ? (
        <div style={{ color: "#555" }}>No planned rounds yet.</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {plannedRounds.map((plannedRound) => {
            const action = buildPlannedRoundAction(
              tripId,
              plannedRound,
              roundsByRoundNumber,
            );

            return (
              <div
                key={plannedRound.roundNumber}
                style={{
                  border: "1px solid #e6e6e6",
                  borderRadius: "8px",
                  padding: "12px",
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 540px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "6px",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        Round {plannedRound.roundNumber}
                      </div>
                      <div style={{ color: "#666", fontSize: "13px" }}>
                        {formatRoundDateShort(plannedRound.roundDate)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        marginBottom: "6px",
                      }}
                    >
                      <strong>{formatPlannedRoundGameLabel(plannedRound)}</strong>
                      {" • "}
                      {plannedRound.courseName || "No course selected"}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "6px 16px",
                        fontSize: "13px",
                        color: "#555",
                      }}
                    >
                      <div>
                        Men's Default Tee:{" "}
                        <strong>{formatCourseRatingInDisplay(plannedRound.defaultTeeName || plannedRound.standardTeeName || "—")}</strong>
                      </div>
                      {plannedRound.womenDefaultTeeName ? (
                        <div>
                          Women's Default Tee:{" "}
                          <strong>{formatCourseRatingInDisplay(plannedRound.womenDefaultTeeName)}</strong>
                        </div>
                      ) : null}
                      {tournamentRoundsHaveBeenSet ? (
                        <div>
                          Tournament:{" "}
                          <strong>
                            {formatTournamentDisplay(plannedRound, tournamentSetup)}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      style={action.primary ? primaryButtonStyle : buttonStyle}
                      onClick={() => onNavigate(action.path)}
                    >
                      {action.label}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
