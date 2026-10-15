import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type { RoundSetupStatusResponse } from "../types/round";
import { buildRoundSetupSummary } from "./roundSetupStatusLogic";

/** Loads the setup status and derives the read-only workflow summary. */
export function useRoundSetupStatusController() {
  const { roundId } = useParams<{ roundId: string }>();
  const [data, setData] = useState<RoundSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getRoundSetupStatus(Number(roundId));
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load round setup status.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const round = data?.round;
  const readiness = data?.readiness;
  const groups = data?.groups;
  const teamAssignment = data?.teamAssignment;
  const summary = useMemo(
    () => data && round && readiness && groups && teamAssignment
      ? buildRoundSetupSummary(data)
      : null,
    [data, round, readiness, groups, teamAssignment],
  );

  return { data, loading, error, round, readiness, groups, teamAssignment, summary };
}
