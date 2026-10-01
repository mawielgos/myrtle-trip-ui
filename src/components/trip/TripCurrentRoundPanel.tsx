import { useEffect, useMemo, useState } from "react";
import { getRoundSetupStatus } from "../../api/roundSetupApi";
import {
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import type { RoundSetupStatusResponse } from "../../types/round";
import type { CurrentRound, TripDetail, TripRoundListItem } from "../../types/trip";
import { formatGameLabel } from "./tripDetailUtils";
import { formatRoundEventsSummary } from "../../utils/roundDisplay";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
  roundRequiresTeams,
} from "../../utils/roundEventCapabilities";

interface TripCurrentRoundPanelProps {
  trip: TripDetail;
  currentRound: CurrentRound | null;
  currentRoundDetail?: TripRoundListItem | null;
  onNavigate: (path: string) => void;
}

interface CurrentRoundAction {
  label: string;
  path: string;
  primary?: boolean;
}

function hasScoringStarted(data: RoundSetupStatusResponse | null): boolean {
  if (!data?.round?.players || data.round.players.length === 0) {
    return false;
  }

  for (const player of data.round.players) {
    if (
      player.grossScore != null ||
      player.adjustedGrossScore != null ||
      player.netScore != null
    ) {
      return true;
    }
  }

  return false;
}

function buildRoundState(
  currentRound: CurrentRound,
  setupStatus: RoundSetupStatusResponse | null,
): {
  statusLabel: string;
  helperText: string;
  primaryAction: CurrentRoundAction | null;
  secondaryAction: CurrentRoundAction | null;
} {
  if (currentRound.finalized) {
    return {
      statusLabel: "Finalized",
      helperText: "Scoring is complete and results are available.",
      primaryAction: {
        label: "View Results",
        path: `/rounds/${currentRound.roundId}/results`,
        primary: true,
      },
      secondaryAction: null,
    };
  }

  if (!setupStatus) {
    return {
      statusLabel: "In Progress",
      helperText: "Loading round setup status.",
      primaryAction: {
        label: "Open Round",
        path: `/rounds/${currentRound.roundId}/open`,
        primary: true,
      },
      secondaryAction: null,
    };
  }

  const readiness = setupStatus.readiness;
  const scoringStarted = hasScoringStarted(setupStatus);
  const usesTeamAssignment = roundRequiresTeams(readiness, currentRound.format);
  const hasScrambleEvent = roundHasScrambleEvent(readiness, currentRound.format);
  const hasTwoManLowNetEvent = roundHasTwoManLowNetEvent(readiness, currentRound.format);

  if (usesTeamAssignment && !readiness.teamsReady) {
    return {
      statusLabel: hasScrambleEvent ? "Scramble Teams Needed" : "Team Assignment Needed",
      helperText: hasScrambleEvent
        ? "Create or suggest scramble teams before score entry."
        : "Create teams before the round can move forward.",
      primaryAction: {
        label: hasScrambleEvent ? "Set Scramble Teams" : "Assign Teams",
        path: `/rounds/${currentRound.roundId}/teams`,
        primary: true,
      },
      secondaryAction: {
        label: "Groups",
        path: `/rounds/${currentRound.roundId}/groups`,
      },
    };
  }

  if (!readiness.groupsReady) {
    const teamRoundNeedsTeeTimes = (hasTwoManLowNetEvent || hasScrambleEvent) && readiness.teamsReady;

    return {
      statusLabel: teamRoundNeedsTeeTimes ? "Tee Times Needed" : "Groups Needed",
      helperText: teamRoundNeedsTeeTimes
        ? hasScrambleEvent
          ? "Scramble teams are saved. Generate or adjust the derived tee-sheet groups and tee times before scoring."
          : "2-Man teams are saved. Generate or adjust the derived tee-sheet groups and tee times before scoring."
        : "Set the tee-sheet groups before scoring starts.",
      primaryAction: {
        label: teamRoundNeedsTeeTimes ? "Set Tee Times / Derived Groups" : "Set Groups",
        path: `/rounds/${currentRound.roundId}/groups`,
        primary: true,
      },
      secondaryAction: usesTeamAssignment
        ? {
            label: hasScrambleEvent ? "Scramble Teams" : "Review/Edit Teams",
            path: `/rounds/${currentRound.roundId}/teams`,
          }
        : null,
    };
  }

  if (readiness.readyForScoring) {
    const scrambleCanStillEditTeams = hasScrambleEvent && !scoringStarted;

    if (scrambleCanStillEditTeams) {
      return {
        statusLabel: "Ready for Scoring",
        helperText: "Scramble teams are saved. You can still edit teams until scoring starts.",
        primaryAction: {
          label: "Edit Scramble Teams",
          path: `/rounds/${currentRound.roundId}/teams`,
          primary: true,
        },
        secondaryAction: {
          label: "Enter Scores",
          path: `/rounds/${currentRound.roundId}/scoring`,
        },
      };
    }

    const reviewSetupLabel = usesTeamAssignment
      ? hasScrambleEvent
        ? "Review/Edit Teams"
        : "Review/Edit Teams"
      : "Review/Edit Groups";

    const reviewSetupPath = usesTeamAssignment
      ? `/rounds/${currentRound.roundId}/teams`
      : `/rounds/${currentRound.roundId}/groups`;

    return {
      statusLabel: scoringStarted ? "Scoring In Progress" : "Ready for Scoring",
      helperText: scoringStarted
        ? "Scores have been entered. Continue scoring or review setup until the round is finalized."
        : "Groups and teams are complete. You can still review or edit setup before finalizing the round.",
      primaryAction: {
        label: scoringStarted ? "Continue Scoring" : "Enter Scores",
        path: `/rounds/${currentRound.roundId}/scoring`,
        primary: true,
      },
      secondaryAction: {
        label: reviewSetupLabel,
        path: reviewSetupPath,
      },
    };
  }

  return {
    statusLabel: "In Progress",
    helperText: "Open the round to continue setup.",
    primaryAction: {
      label: "Open Round",
      path: `/rounds/${currentRound.roundId}/open`,
      primary: true,
    },
    secondaryAction: null,
  };
}

export default function TripCurrentRoundPanel({
  trip,
  currentRound,
  currentRoundDetail,
  onNavigate,
}: TripCurrentRoundPanelProps) {
  const [setupStatus, setSetupStatus] = useState<RoundSetupStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSetupStatus(): Promise<void> {
      if (!currentRound || currentRound.finalized) {
        setSetupStatus(null);
        return;
      }

      try {
        setLoadingStatus(true);
        const response = await getRoundSetupStatus(currentRound.roundId);
        if (!cancelled) {
          setSetupStatus(response);
        }
      } catch (err) {
        console.error("Failed to load current round setup status", err);
        if (!cancelled) {
          setSetupStatus(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    }

    void loadSetupStatus();

    return () => {
      cancelled = true;
    };
  }, [currentRound]);

  const panelState = useMemo(() => {
    return currentRound ? buildRoundState(currentRound, setupStatus) : null;
  }, [currentRound, setupStatus]);

  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Current Round</h2>

      {currentRound ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>
            Round {currentRound.roundNumber}
          </div>

          <div style={{ fontSize: "14px", marginBottom: "6px" }}>
            <strong>{currentRoundDetail ? formatRoundEventsSummary(currentRoundDetail) : formatGameLabel(currentRound.format)}</strong>
          </div>

          <div
            style={{
              display: "grid",
              gap: "6px",
              fontSize: "13px",
              color: "#555",
              marginBottom: "12px",
            }}
          >
            <div>
              Course: <strong>{currentRound.courseName || "—"}</strong>
            </div>
            <div>
              Tee: <strong>{currentRound.teeName || "—"}</strong>
            </div>
            <div>
              Status: <strong>{panelState?.statusLabel || "In Progress"}</strong>
            </div>
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#666",
              marginBottom: "12px",
              minHeight: "18px",
            }}
          >
            {loadingStatus ? "Checking round progress..." : panelState?.helperText}
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {panelState?.primaryAction ? (
              <button
                type="button"
                style={panelState.primaryAction.primary ? primaryButtonStyle : buttonStyle}
                onClick={() => onNavigate(panelState.primaryAction!.path)}
              >
                {panelState.primaryAction.label}
              </button>
            ) : null}

            {panelState?.secondaryAction ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => onNavigate(panelState.secondaryAction!.path)}
              >
                {panelState.secondaryAction.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div style={{ color: "#555", fontSize: "14px" }}>
          {trip.status === "COMPLETE"
            ? "All rounds are complete."
            : "No current round yet."}
        </div>
      )}
    </div>
  );
}
