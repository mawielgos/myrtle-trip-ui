import { useNavigate } from "react-router-dom";
import { errorBoxStyle, pageContainerMediumStyle, primaryButtonStyle } from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { formatRoundSetupDate, formatRoundSetupFormat } from "./roundSetupStatusLogic";
import { useRoundSetupStatusController } from "./useRoundSetupStatusController";
import RoundSetupStatusContent from "./RoundSetupStatusContent";

export default function RoundSetupStatusPage() {
  const navigate = useNavigate();
  const { data, loading, error, round, readiness, groups, teamAssignment, summary } =
    useRoundSetupStatusController();

  if (loading) return <div style={{ padding: "16px" }}>Loading round setup...</div>;
  if (error) return <div style={pageContainerMediumStyle}><div style={errorBoxStyle}>{error}</div></div>;
  if (!data || !round || !readiness || !groups || !teamAssignment || !summary) {
    return <div style={pageContainerMediumStyle}><div style={errorBoxStyle}>Round setup data was not found.</div></div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Workflow"
        subtitle={`${round.courseName ?? "Course not selected"} • ${formatRoundSetupDate(round.roundDate)} • ${formatRoundSetupFormat(round.format)}`}
        actions={<>
          {round.tripId ? <TripDetailButton tripId={round.tripId} /> : null}
          <button style={primaryButtonStyle} type="button" onClick={() => navigate(`/rounds/${round.roundId}/open`)}>Continue</button>
        </>}
      />
      <RoundProgressBar roundId={round.roundId} currentStep="setup" format={round.format} finalized={round.finalized} />
      <RoundSetupStatusContent round={round} readiness={readiness} summary={summary} />
    </div>
  );
}
