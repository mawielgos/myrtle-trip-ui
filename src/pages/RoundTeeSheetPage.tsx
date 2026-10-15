import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import { formatGameDescription } from "../utils/gameFormat";
import {
  formatRoundDate,
} from "./roundTeeSheetLogic";
import { useRoundTeeSheetController } from "./useRoundTeeSheetController";
import RoundTeeSheetGroups from "./RoundTeeSheetGroups";

const printStyles = `
@media print {
  body { background: #fff !important; }
  header, nav, button, .no-print { display: none !important; }
  .tee-sheet-print-page { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .tee-sheet-card { break-inside: avoid; page-break-inside: avoid; }
  .tee-sheet-title { margin-top: 0 !important; }
}
`;

export default function RoundTeeSheetPage() {
  const {
    loading, error, data, round, groups, playersById, teeSheetStartTypeMessage,
    groupsButtonLabel, canNavigateToScoring, scoreEntryAction, scoringButtonStyle,
    scoringButtonTitle, handleExportCsv, handlePrint, handleOpenGroups, handleOpenScoring,
  } = useRoundTeeSheetController();

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading tee sheet...</div>;
  }

  if (error) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  if (!data || !round || !scoreEntryAction) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>Round data was not found.</div>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle} className="tee-sheet-print-page">
      <style>{printStyles}</style>

      <PageHeader
        title="Tee Sheet"
        subtitle={`${round.courseName} • ${formatRoundDate(round.roundDate)} • ${formatGameDescription(round.format)}`}
        actions={
          <>
            {round.tripId ? <TripDetailButton tripId={round.tripId} /> : null}
            {round.tripId ? <ReportsButton tripId={round.tripId} /> : null}
            <button type="button" style={buttonStyle} onClick={handleOpenGroups}>
              {groupsButtonLabel}
            </button>
            <button
              type="button"
              style={scoringButtonStyle}
              onClick={handleOpenScoring}
              disabled={!canNavigateToScoring}
              title={scoringButtonTitle}
            >
              {scoreEntryAction.label}
            </button>
            <button type="button" style={buttonStyle} onClick={handlePrint}>
              Print
            </button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv}>
              Export CSV
            </button>
          </>
        }
      />

      <section style={sectionStyle}>
        <h2 className="tee-sheet-title" style={{ marginTop: 0 }}>Round Information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "8px 14px" }}>
          <strong>Course</strong>
          <span>{round.courseName}</span>
          <strong>Date</strong>
          <span>{formatRoundDate(round.roundDate)}</span>
          <strong>Format</strong>
          <span>{formatGameDescription(round.format)}</span>
          <strong>Default Tee</strong>
          <span>{round.teeName}</span>
        </div>
      </section>

      <RoundTeeSheetGroups
        groups={groups}
        playersById={playersById}
        teeSheetStartTypeMessage={teeSheetStartTypeMessage}
      />
    </div>
  );
}
