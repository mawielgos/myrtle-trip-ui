import { useEffect, useMemo, useState } from "react";
import {
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
  warningBoxStyle,
} from "../../styles/uiStyles";
import { getRoundSetupStatus } from "../../api/roundSetupApi";
import type { TripRoundListItem } from "../../types/trip";
import type { RoundSetupStatusResponse } from "../../types/round";
import { formatRoundDateShort, formatRoundEventsSummary } from "../../utils/roundDisplay";
import { roundRequiresTeams } from "../../utils/roundEventCapabilities";
import { buildRoundAction } from "./tripDetailUtils";

interface TripRoundsPanelProps {
  rounds: TripRoundListItem[];
  onNavigate: (path: string) => void;
}

type RoundSetupStatusMap = Record<number, RoundSetupStatusResponse | null | undefined>;

function buildSetupPath(round: TripRoundListItem, status: RoundSetupStatusResponse | null | undefined): string {
  if (round.finalized) {
    return `/rounds/${round.roundId}/results`;
  }

  if (!status) {
    return `/rounds/${round.roundId}/open`;
  }

  const usesTeams = roundRequiresTeams(status.readiness, status.round.format);
  return usesTeams ? `/rounds/${round.roundId}/teams` : `/rounds/${round.roundId}/groups`;
}

function isReadyForScoring(status: RoundSetupStatusResponse | null | undefined): boolean {
  return status?.readiness?.readyForScoring === true;
}

function roundHasGroupsOrTeams(status: RoundSetupStatusResponse | null | undefined): boolean {
  if (!status) {
    return false;
  }

  const hasGroups = (status.groups?.groups ?? []).length > 0;
  const hasTeams = (status.teamAssignment?.teams ?? []).some(
    (team) => (team.players ?? []).length > 0,
  );

  return hasGroups || hasTeams;
}

function roundHasConfiguredTeeSheet(status: RoundSetupStatusResponse | null | undefined): boolean {
  const groups = status?.groups?.groups ?? [];

  if (groups.length === 0) {
    return false;
  }

  return groups.some((group) => Boolean(group.teeTime) || group.startingHole != null);
}

function shouldShowTeeSheetWarning(
  round: TripRoundListItem,
  status: RoundSetupStatusResponse | null | undefined,
): boolean {
  if (round.finalized) {
    return false;
  }

  return roundHasGroupsOrTeams(status) && !roundHasConfiguredTeeSheet(status);
}

export default function TripRoundsPanel({
  rounds,
  onNavigate,
}: TripRoundsPanelProps) {
  const unplayedRounds = rounds.filter((round) => round.finalized !== true);
  const [setupStatuses, setSetupStatuses] = useState<RoundSetupStatusMap>({});

  const openRoundIds = useMemo(
    () => unplayedRounds.map((round) => round.roundId),
    [unplayedRounds],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSetupStatuses(): Promise<void> {
      if (openRoundIds.length === 0) {
        setSetupStatuses({});
        return;
      }

      const entries = await Promise.all(
        openRoundIds.map(async (roundId) => {
          try {
            const status = await getRoundSetupStatus(roundId);
            return [roundId, status] as const;
          } catch (err) {
            console.error(`Failed to load setup status for round ${roundId}`, err);
            return [roundId, null] as const;
          }
        }),
      );

      if (!cancelled) {
        const next: RoundSetupStatusMap = {};
        for (const [roundId, status] of entries) {
          next[roundId] = status;
        }
        setSetupStatuses(next);
      }
    }

    void loadSetupStatuses();

    return () => {
      cancelled = true;
    };
  }, [openRoundIds.join(",")]);

  return (
    <div style={sectionStyle}>
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
        <h2 style={{ margin: 0 }}>Rounds To Play</h2>
        <div style={{ color: "#666", fontSize: "14px" }}>
          {unplayedRounds.length} open
        </div>
      </div>

      {unplayedRounds.length === 0 ? (
        <div style={{ color: "#555" }}>No open rounds left to play.</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {unplayedRounds.map((round) => {
            const action = buildRoundAction(round);
            const setupStatus = setupStatuses[round.roundId];
            const readyForScoring = isReadyForScoring(setupStatus);
            const setupPath = buildSetupPath(round, setupStatus);
            const showTeeSheetWarning = shouldShowTeeSheetWarning(round, setupStatus);

            return (
              <div
                key={round.roundId}
                style={{
                  border: "1px solid #e6e6e6",
                  borderRadius: "8px",
                  padding: "12px",
                  background: "#fff",
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
                  <div style={{ minWidth: 0, flex: "1 1 520px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "6px",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {round.roundNumber != null
                          ? `Round ${round.roundNumber}`
                          : "Round"}
                      </div>
                      <div style={{ color: "#666", fontSize: "13px" }}>
                        {formatRoundDateShort(round.roundDate)}
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: round.finalized ? "#edf8f0" : "#fff8e1",
                          color: round.finalized ? "#1f6b2a" : "#8a6700",
                          border: round.finalized
                            ? "1px solid #b7d7c0"
                            : "1px solid #e5d7a8",
                        }}
                      >
                        {round.finalized ? "Finalized" : "Open"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        marginBottom: "6px",
                      }}
                    >
                      <strong>{formatRoundEventsSummary(round)}</strong>
                      {" • "}
                      {round.courseName || "—"}
                    </div>

                    <div style={{ fontSize: "13px", color: "#555" }}>
                      Tee: <strong>{round.teeName || "—"}</strong>
                    </div>

                    {showTeeSheetWarning ? (
                      <div
                        style={{
                          ...warningBoxStyle,
                          marginTop: "10px",
                          marginBottom: 0,
                          padding: "8px 10px",
                          fontSize: "13px",
                        }}
                      >
                        <strong>Tee sheet has not been configured yet.</strong>{" "}
                        Groups or teams exist for this round, but no tee times or starting holes have been set.
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {round.finalized ? (
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => onNavigate(action.path)}
                      >
                        Results
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => onNavigate(setupPath)}
                        >
                          Setup
                        </button>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => onNavigate(`/rounds/${round.roundId}/tee-sheet`)}
                        >
                          Tee Sheet
                        </button>
                        <button
                          type="button"
                          style={readyForScoring ? primaryButtonStyle : buttonStyle}
                          disabled={!readyForScoring}
                          title={readyForScoring ? "Enter scores" : "Complete round setup before scoring"}
                          onClick={() => onNavigate(`/rounds/${round.roundId}/scoring`)}
                        >
                          Score
                        </button>
                      </>
                    )}
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
