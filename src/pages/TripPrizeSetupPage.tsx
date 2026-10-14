import { buttonStyle, errorBoxStyle, pageContainerWideStyle, primaryButtonStyle, successBoxStyle, warningBoxStyle } from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useTripPrizeSetupController } from "./useTripPrizeSetupController";
import PrizeScheduleCards from "./PrizeScheduleCards";
import PrizeMoneySummary from "./PrizeMoneySummary";

export default function TripPrizeSetupPage() {
  const {
    trip, schedules, amountInputs, placesPaidInputs, recalculationResult,
    loading, saving, recalculating, error, message,
    numericTripId, activePlayerCount, totalPrizeMoneyCollected,
    totalPrizeMoneyDistributed, prizeMoneyRemaining, rosterHasActivePlayers,
    showPrizeSetupAsPendingRoster, tripIsComplete, correctionModeEnabled,
    prizeSetupReadOnly, hasChanges, confirmIfNeeded,
    updatePlacesPaid, updatePayoutAmount, updateGameName, handleSave, handleRecalculate,
  } = useTripPrizeSetupController();

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading prize setup...</div>;
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Prize Money Setup"
        subtitle={
          trip ? `${trip.tripName} • ${trip.tripYear}` : "Event prize schedules"
        }
        actions={
          <>
            <TripDetailButton
              tripId={numericTripId}
              onBeforeNavigate={confirmIfNeeded}
            />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void handleRecalculate()}
              disabled={recalculating || prizeSetupReadOnly}
            >
              {recalculating
                ? "Recalculating..."
                : "Recalculate Prize Winnings"}
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleSave()}
              disabled={saving || prizeSetupReadOnly}
            >
              {saving
                ? "Saving..."
                : prizeSetupReadOnly
                  ? "Prize Setup Locked"
                  : "Save Prize Money"}
            </button>
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {prizeSetupReadOnly ? (
        <div
          style={{
            ...warningBoxStyle,
            background: "#eef5ff",
            color: "#244a7c",
          }}
        >
          This trip is complete and locked. Prize setup is view-only unless
          Correction Mode is enabled from Event Detail.
        </div>
      ) : tripIsComplete && correctionModeEnabled ? (
        <div style={warningBoxStyle}>
          Correction Mode is enabled. Prize setup changes and prize
          recalculation are allowed for this completed trip.
        </div>
      ) : null}
      {hasChanges ? (
        <div
          style={{
            ...successBoxStyle,
            borderColor: "#f59e0b",
            background: "#fffbeb",
            color: "#92400e",
          }}
        >
          You have unsaved prize setup changes. Save before leaving this page.
        </div>
      ) : null}

      {recalculationResult ? (
        <div style={{ ...successBoxStyle, marginBottom: "16px" }}>
          Recalculated {recalculationResult.winnings?.length ?? 0} prize winning
          rows
          {recalculationResult.playerTotals
            ? ` across ${recalculationResult.playerTotals.length} players`
            : ""}
          .
        </div>
      ) : null}

      <PrizeMoneySummary
        trip={trip}
        activePlayerCount={activePlayerCount}
        totalPrizeMoneyCollected={totalPrizeMoneyCollected}
        totalPrizeMoneyDistributed={totalPrizeMoneyDistributed}
        prizeMoneyRemaining={prizeMoneyRemaining}
        rosterHasActivePlayers={rosterHasActivePlayers}
        showPrizeSetupAsPendingRoster={showPrizeSetupAsPendingRoster}
      />

      <div style={{ fontSize: "14px", color: "#555", marginBottom: "16px" }}>
        Enter the number of places paid and the amount paid per guy for each
        prize event. Blank amount fields are not saved as $0.00.
      </div>

      <PrizeScheduleCards
        schedules={schedules}
        amountInputs={amountInputs}
        placesPaidInputs={placesPaidInputs}
        prizeSetupReadOnly={prizeSetupReadOnly}
        saving={saving}
        updateGameName={updateGameName}
        updatePlacesPaid={updatePlacesPaid}
        updatePayoutAmount={updatePayoutAmount}
      />
    </div>
  );
}
