import { useNavigate, useParams } from "react-router-dom";
import { errorBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import { buildScoreEntryAction } from "../utils/roundNavigation";
import RoundResultsPresentation from "../components/results/RoundResultsPresentation";
import RoundResultsPageShell from "../components/results/RoundResultsPageShell";
import { useRoundResultsPageData } from "./useRoundResultsPageData";
import { useRoundResultsViewState } from "./useRoundResultsViewState";
import { useRoundResultsReport } from "./useRoundResultsReport";

export default function RoundResultsPage() {
  const navigate = useNavigate();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const data = useRoundResultsPageData(numericRoundId);
  const {
    status,
    results,
    eventResults,
    scorecards,
    scorecardDetails,
    holeMeta,
    roundPrizeWinnings,
    teamExceptions,
    tripName,
    tripDateRange,
    tripRounds,
    loading,
    error,
    reload,
  } = data;

  const viewState = useRoundResultsViewState({
    status,
    results,
    eventResults,
    scorecards,
    scorecardDetails,
    holeMeta,
    roundPrizeWinnings,
    teamExceptions,
    tripRounds,
  });

  const report = useRoundResultsReport({
    status,
    results,
    tripName,
    tripDateRange,
    scorecards,
    scorecardDetails,
    viewState,
  });

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !status || !results) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Results</h1>
        <div style={errorBoxStyle}>{error ?? "Round results not found."}</div>
      </div>
    );
  }

  const scoreEntryAction = buildScoreEntryAction(status.roundId, status);
  const showViewScoresButton = Boolean(status.finalized && !status.tripLocked);

  return (
    <RoundResultsPageShell
      status={status}
      results={results}
      tripName={tripName}
      tripDateRange={tripDateRange}
      viewState={viewState}
      scoreEntryLabel={scoreEntryAction.label}
      showViewScoresButton={showViewScoresButton}
      onViewScores={() => navigate(`/rounds/${status.roundId}/scoring?mode=view`)}
      onScoreEntry={() => navigate(scoreEntryAction.path)}
      onPrint={report.handlePrint}
      onExportCsv={report.handleExportCsv}
      onRefresh={() => void reload(status.roundId)}
      buildRoundPrintTitle={report.buildRoundPrintTitle}
    >
      <RoundResultsPresentation results={results} viewState={viewState} />
    </RoundResultsPageShell>
  );
}
