import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { buttonStyle, errorBoxStyle, pageContainerWideStyle, sectionStyle } from "../styles/uiStyles";
import { formatDate } from "./handicapCardLogic";
import { useHandicapCardController } from "./useHandicapCardController";
import { HandicapCardContent } from "./HandicapCardContent";

export default function HandicapCardPage() {
  const controller = useHandicapCardController();
  const { tripId, data, loading, error, effectiveAsOfDate, handlePrint, handleExportCsv } = controller;

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        className="no-print"
        title={data ? `${data.playerName} Handicap Card` : "Handicap Card"}
        subtitle={data?.calculationLabel ?? "Review the score history used to calculate the event index."}
        actions={
          <>
            <TripDetailButton tripId={tripId} />
            <ReportsButton tripId={tripId} />
            <WorkflowBackButton label="Back to Handicap Cards" to={`/trips/${tripId}/handicap-cards`} />
            <button type="button" style={buttonStyle} onClick={handlePrint} disabled={!data}>Print</button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv} disabled={!data}>Export CSV</button>
          </>
        }
      />

      {data ? (
        <div className="print-only" style={{ marginBottom: "14px" }}>
          <h1 style={{ margin: 0 }}>{data.playerName} Handicap Card</h1>
          <div>{data.tripName} - {data.calculationLabel ?? `as of ${formatDate(effectiveAsOfDate)}`}</div>
        </div>
      ) : null}

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {loading ? (
        <div style={sectionStyle}>Loading handicap card...</div>
      ) : data ? (
        <HandicapCardContent controller={controller} />
      ) : null}
    </div>
  );
}
