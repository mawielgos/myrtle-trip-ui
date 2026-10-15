import { errorBoxStyle, pageContainerMediumStyle, warningBoxStyle } from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useRoundSetupController } from "./useRoundSetupController";
import RoundSetupForm from "./RoundSetupForm";

export default function RoundSetupPage() {
  const controller = useRoundSetupController();
  const { error, selectedTripId, confirmIfNeeded } = controller;

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Start Round"
        subtitle="Select the event, course, default tee, date, format, and handicap percent. Player-specific tee changes happen on the team/group setup page."
        actions={<TripDetailButton tripId={selectedTripId || undefined} onBeforeNavigate={confirmIfNeeded} />}
      />
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      <div style={warningBoxStyle}>
        Select the default tee for the round. Individual player tee overrides are handled later on the team/group assignment page.
      </div>
      <RoundSetupForm controller={controller} />
    </div>
  );
}
