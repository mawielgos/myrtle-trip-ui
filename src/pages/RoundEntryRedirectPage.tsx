import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import { roundHasScrambleEvent, roundRequiresTeams } from "../utils/roundEventCapabilities";
import {
  errorBoxStyle,
  pageContainerMediumStyle,
  sectionStyle,
} from "../styles/uiStyles";

function hasScoringStarted(response: Awaited<ReturnType<typeof getRoundSetupStatus>>): boolean {
  const players = response.round.players ?? [];

  for (const player of players) {
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

export default function RoundEntryRedirectPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        return;
      }

      try {
        const numericRoundId = Number(roundId);
        const response = await getRoundSetupStatus(numericRoundId);

        if (response.round.finalized) {
          navigate(`/rounds/${numericRoundId}/scoring`, { replace: true });
          return;
        }

        const usesTeamAssignment = roundRequiresTeams(response.readiness, response.round.format);
        const scramble = roundHasScrambleEvent(response.readiness, response.round.format);
        const scoringStarted = hasScoringStarted(response);

        if (usesTeamAssignment) {
          if (!response.readiness.teamsReady) {
            navigate(`/rounds/${numericRoundId}/teams`, { replace: true });
            return;
          }

          if (scramble && !scoringStarted) {
            navigate(`/rounds/${numericRoundId}/teams`, { replace: true });
            return;
          }

          if (!response.readiness.groupsReady) {
            navigate(scramble ? `/rounds/${numericRoundId}/teams` : `/rounds/${numericRoundId}/groups`, { replace: true });
            return;
          }

          navigate(`/rounds/${numericRoundId}/scoring`, { replace: true });
          return;
        }

        if (!response.readiness.groupsReady) {
          navigate(`/rounds/${numericRoundId}/groups`, { replace: true });
          return;
        }

        navigate(`/rounds/${numericRoundId}/scoring`, { replace: true });
      } catch (err: any) {
        console.error("Failed to determine round entry step", err);
        setError("Unable to determine the next step for this round.");
      }
    }

    void load();
  }, [roundId, navigate]);

  return (
    <div style={pageContainerMediumStyle}>
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Opening Round...</h2>
        {error ? (
          <div style={errorBoxStyle}>{error}</div>
        ) : (
          <div>Checking round setup status.</div>
        )}
      </div>
    </div>
  );
}