import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { buttonStyle, errorBoxStyle, pageContainerMediumStyle, primaryButtonStyle, successBoxStyle, warningBoxStyle } from "../styles/uiStyles";

import { useTripCreateController } from "./useTripCreateController";
import TripCreateDetailsForm from "./TripCreateDetailsForm";
import TripCreatePlayersSection from "./TripCreatePlayersSection";

export default function TripCreatePage() {
  const controller = useTripCreateController();
  const { isEditMode, numericTripId, saving, initialized, error, message,
    confirmIfNeeded, handleBack, handleSave } = controller;

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title={isEditMode ? "Edit Event" : "Create Event"}
        actions={
          <>
            {isEditMode && numericTripId != null ? (
              <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            ) : (
              <button style={buttonStyle} onClick={handleBack} type="button">
                Events
              </button>
            )}
            <button
              style={primaryButtonStyle}
              type="button"
              onClick={handleSave}
              disabled={saving || initialized}
            >
              {saving ? "Saving..." : isEditMode ? "Save Event Changes" : "Save Event"}
            </button>
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      <div style={warningBoxStyle}>
        {initialized
          ? "This event is already initialized, so roster changes should be blocked."
          : "Create the event shell first. You can add or import players afterward from Event Detail before starting the event."}
      </div>

      <TripCreateDetailsForm controller={controller} />

      <TripCreatePlayersSection controller={controller} />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          style={primaryButtonStyle}
          type="button"
          onClick={handleSave}
          disabled={saving || initialized}
        >
          {saving
            ? "Saving..."
            : isEditMode
            ? "Save Event Changes"
            : "Save Event and Continue"}
        </button>
        <button style={buttonStyle} type="button" onClick={handleBack} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}