import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRoundSetupStatus } from "../../api/roundSetupApi";
import { roundHasScrambleEvent, roundRequiresTeams } from "../../utils/roundEventCapabilities";
import type { RoundSetupStatusResponse } from "../../types/round";

type RoundFlowStep = "setup" | "groups" | "teams" | "scoring" | "results";

interface RoundProgressBarProps {
  roundId: number;
  currentStep: RoundFlowStep;
  format?: string | null;
  finalized?: boolean;
}

type StepItem = {
  key: RoundFlowStep;
  label: string;
  path: string;
  unlocked: boolean;
};

function safeLength<T>(value: T[] | undefined | null): number {
  return Array.isArray(value) ? value.length : 0;
}

export default function RoundProgressBar({
  roundId,
  currentStep,
  format,
  finalized = false,
}: RoundProgressBarProps) {
  const navigate = useNavigate();

  const [data, setData] = useState<RoundSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!Number.isFinite(roundId) || roundId <= 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getRoundSetupStatus(roundId);
        setData(response);
      } catch (err) {
        console.error("Failed to load round progress", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [roundId]);

  const effectiveFormat = format ?? data?.round?.format ?? null;
  const usesTeamAssignment = roundRequiresTeams(data?.readiness, effectiveFormat);
  const hasScrambleEvent = roundHasScrambleEvent(data?.readiness, effectiveFormat);

  const totalPlayers = safeLength(data?.round?.players);
  const groupedPlayers =
    data?.groups?.groups?.reduce((sum, group) => {
      return sum + safeLength(group.players);
    }, 0) ?? 0;

  const teamUnassignedCount = safeLength(data?.teamAssignment?.unassignedPlayers);

  const groupsReady = totalPlayers > 0 && groupedPlayers === totalPlayers;
  const teamsReady = usesTeamAssignment ? totalPlayers > 0 && teamUnassignedCount === 0 : groupsReady;
  const scoringReady = finalized || (usesTeamAssignment ? teamsReady && groupsReady : groupsReady);
  const resultsReady = finalized;

  const steps = useMemo<StepItem[]>(() => {
    if (usesTeamAssignment) {
      return [
        {
          key: "setup",
          label: "Setup",
          path: `/rounds/${roundId}`,
          unlocked: true,
        },
        {
          key: "teams",
          label: hasScrambleEvent ? "Scramble Teams" : "Teams",
          path: `/rounds/${roundId}/teams`,
          unlocked: true,
        },
        {
          key: "groups",
          label: hasScrambleEvent ? "Tee Times" : "Groups / Tee Times",
          path: `/rounds/${roundId}/groups`,
          unlocked: true,
        },
        {
          key: "scoring",
          label: "Scoring",
          path: `/rounds/${roundId}/scoring`,
          unlocked: scoringReady,
        },
        {
          key: "results",
          label: "Results",
          path: `/rounds/${roundId}/results`,
          unlocked: resultsReady,
        },
      ];
    }

    return [
      {
        key: "setup",
        label: "Setup",
        path: `/rounds/${roundId}`,
        unlocked: true,
      },
      {
        key: "groups",
        label: "Groups",
        path: `/rounds/${roundId}/groups`,
        unlocked: true,
      },
      {
        key: "scoring",
        label: "Scoring",
        path: `/rounds/${roundId}/scoring`,
        unlocked: scoringReady,
      },
      {
        key: "results",
        label: "Results",
        path: `/rounds/${roundId}/results`,
        unlocked: resultsReady,
      },
    ];
  }, [roundId, usesTeamAssignment, hasScrambleEvent, scoringReady, resultsReady]);

  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  if (loading) {
    return (
      <div
        style={{
          marginBottom: "16px",
          padding: "12px 14px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: "#fff",
          color: "#666",
          fontSize: "14px",
        }}
      >
        Loading round progress...
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fff",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {steps.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const isComplete = index < currentIndex;
          const isLocked = !step.unlocked && !isCurrent;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!step.unlocked && !isCurrent) {
                    return;
                  }
                  navigate(step.path);
                }}
                disabled={isLocked}
                style={{
                  minWidth: "110px",
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "18px",
                  border: "1px solid #bbb",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  background: isCurrent ? "#f3f6fb" : isComplete ? "#f7f7f7" : "#fff",
                  color: isLocked ? "#999" : "#222",
                  fontWeight: isCurrent || isComplete ? 600 : 500,
                  opacity: isLocked ? 0.7 : 1,
                }}
              >
                {isComplete ? "✓ " : ""}
                {step.label}
              </button>

              {index < steps.length - 1 ? (
                <div style={{ color: "#999", fontSize: "14px" }}>→</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}