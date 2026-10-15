import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import { getRoundEntryDestination } from "./roundEntryRedirectLogic";
import {
  errorBoxStyle,
  pageContainerMediumStyle,
  sectionStyle,
} from "../styles/uiStyles";

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

        navigate(getRoundEntryDestination(numericRoundId, response), { replace: true });
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