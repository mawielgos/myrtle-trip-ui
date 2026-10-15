import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import { useTripTournamentSetupController } from "./useTripTournamentSetupController";
import TournamentBasicsSection from "./TournamentBasicsSection";
import TournamentIncludedRoundsSection from "./TournamentIncludedRoundsSection";

export default function TripTournamentSetupPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const {
    tripName, tripStatus, draft, sortedRounds, configuredRoundCount, includedCount,
    isReadOnly, loading, saving, error, message, confirmIfNeeded,
    updateDraft, handleEnabledChange, toggleRound, selectAllConfiguredRounds,
    clearIncludedRounds, handleSave,
  } = useTripTournamentSetupController(numericTripId);

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading tournament setup...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Multi-Round Tournament Setup"
        subtitle={tripName ? `${tripName} • ${tripStatus}` : undefined}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                void confirmIfNeeded().then((confirmed) => {
                  if (confirmed) {
                    navigate(`/trips/${numericTripId}/planned-rounds`);
                  }
                });
              }}
            >
              Round Planning
            </button>
            {!isReadOnly ? (
              <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Tournament Setup"}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      {isReadOnly ? (
        <div style={{ ...warningBoxStyle, background: "#eef5ff", color: "#244a7c" }}>
          This event is complete and locked. Tournament setup is view-only unless Correction Mode is enabled.
        </div>
      ) : null}

      {!isReadOnly && tripStatus === "IN_PROGRESS" ? (
        <div style={{ ...warningBoxStyle, background: "#fff8e6", color: "#7a4b00" }}>
          This event has already started. You can still correct the tournament setup, such as adding a missed planned round.
          Existing finalized round scores will be reflected in tournament standings. If prize winnings were already calculated, recalculate payouts after saving.
        </div>
      ) : null}

      <TournamentBasicsSection draft={draft} isReadOnly={isReadOnly} saving={saving} handleEnabledChange={handleEnabledChange} updateDraft={updateDraft} />

      <TournamentIncludedRoundsSection draft={draft} isReadOnly={isReadOnly} saving={saving} sortedRounds={sortedRounds} includedCount={includedCount} configuredRoundCount={configuredRoundCount} toggleRound={toggleRound} selectAllConfiguredRounds={selectAllConfiguredRounds} clearIncludedRounds={clearIncludedRounds} />

      {!isReadOnly ? (
        <div style={{ ...sectionStyle, display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={() => navigate(`/trips/${numericTripId}`)} disabled={saving}>
            Cancel
          </button>
          <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Tournament Setup"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
