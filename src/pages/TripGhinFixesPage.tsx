import {
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useTripGhinFixesController } from "./useTripGhinFixesController";
import TripGhinFixesTable from "./TripGhinFixesTable";

export default function TripGhinFixesPage() {
  const {
    numericTripId,
    tripName,
    drafts,
    savingRowId,
    loading,
    error,
    message,
    outstandingCount,
    sortedRows,
    confirmIfNeeded,
    navigateIfConfirmed,
    updateDraft,
    handleSave,
    handleSaveAll,
  } = useTripGhinFixesController();

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading GHIN fixes...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="GHIN Fixes Review"
        subtitle={`${tripName} — review unresolved frozen GHIN differentials before the event can move to In Progress.`}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "34px",
                padding: "0 12px",
                borderRadius: "999px",
                background: outstandingCount > 0 ? "#fff8e1" : "#edf8f0",
                border: outstandingCount > 0 ? "1px solid #e5d7a8" : "1px solid #b7d7c0",
                color: outstandingCount > 0 ? "#8a6700" : "#1f6b2a",
                fontWeight: 700,
              }}
            >
              Outstanding: {outstandingCount}
            </div>
            {outstandingCount > 0 ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSaveAll()}
                disabled={savingRowId != null || sortedRows.length === 0}
              >
                {savingRowId === -1 ? "Saving All..." : "Save All Fixes"}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      {outstandingCount > 0 ? (
        <div style={warningBoxStyle}>
          Enter one or more manual differentials, then save each row individually or use
          Save All Fixes to clear multiple GHIN fixes at once. When the count reaches
          zero, the event start block is removed.
        </div>
      ) : (
        <div style={successBoxStyle}>
          All GHIN manual fixes are complete. This trip is no longer blocked by GHIN
          differential review.
        </div>
      )}

      <TripGhinFixesTable
        sortedRows={sortedRows}
        drafts={drafts}
        savingRowId={savingRowId}
        numericTripId={numericTripId}
        updateDraft={updateDraft}
        handleSave={handleSave}
        handleSaveAll={handleSaveAll}
        navigateIfConfirmed={navigateIfConfirmed}
      />
    </div>
  );
}