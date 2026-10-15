import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import { buttonStyle, errorBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import { buildSubtitle } from "./handicapCardsLogic";
import { useHandicapCardsController } from "./useHandicapCardsController";
import HandicapCardsSummaryTable from "./HandicapCardsSummaryTable";
import HandicapCardsPrintReport from "./HandicapCardsPrintReport";

export default function HandicapCardsPage() {
  const {
    tripId,
    data,
    loading,
    error,
    detailCards,
    detailsLoading,
    sortedPlayers,
    handlePrint,
    handleExportCsv,
    openPlayer,
  } = useHandicapCardsController();

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Handicap Cards"
        subtitle={buildSubtitle(data)}
        actions={
          <>
            <TripDetailButton tripId={tripId} />
            <ReportsButton tripId={tripId} />
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: "8px" }}
              disabled={loading || sortedPlayers.length === 0 || detailsLoading}
              onClick={() => void handlePrint()}
            >
              {detailsLoading ? "Loading..." : "Print"}
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: "8px" }}
              disabled={loading || sortedPlayers.length === 0 || detailsLoading}
              onClick={() => void handleExportCsv()}
            >
              Export CSV
            </button>
          </>
        }
      />

      <style>{`
        .handicap-cards-print-report { display: none; }
        @media print {
          @page { size: landscape; margin: 0.32in; }
          button { display: none !important; }
          .handicap-cards-screen { display: none !important; }
          .handicap-cards-print-report { display: block !important; }
          .handicap-card-print-card { break-after: page; page-break-after: always; }
          .handicap-card-print-card:last-child { break-after: auto; page-break-after: auto; }
          .handicap-card-print-title { font-size: 21px; font-weight: 800; margin: 0 0 2px; }
          .handicap-card-print-subtitle { font-size: 12px; margin: 0 0 8px; color: #333; }
          .handicap-card-print-metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; margin-bottom: 9px; }
          .handicap-card-print-metric { border: 1px solid #aaa; padding: 5px; font-size: 10px; }
          .handicap-card-print-metric strong { display: block; font-size: 12px; margin-top: 2px; }
          .handicap-card-print-table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .handicap-card-print-table th, .handicap-card-print-table td { border: 1px solid #999; padding: 3px 4px; vertical-align: top; }
          .handicap-card-print-table th { background: #f0f0f0; font-weight: 700; }
        }
      `}</style>

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <HandicapCardsSummaryTable loading={loading} sortedPlayers={sortedPlayers} openPlayer={openPlayer} />
      <HandicapCardsPrintReport detailCards={detailCards} data={data} />
    </div>
  );
}
