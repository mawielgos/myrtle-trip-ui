import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
} from "../styles/uiStyles";
import TournamentStandingsBody from "./TournamentStandingsBody";
import { useTournamentStandingsPageData } from "./useTournamentStandingsPageData";
import type { TournamentCompetition } from "./useTournamentStandingsPageData";
import { useTournamentStandingsViewState } from "./useTournamentStandingsViewState";
import { useTournamentStandingsReport } from "./useTournamentStandingsReport";

export default function TournamentStandingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedCompetition: TournamentCompetition =
    searchParams.get("competition") === "LOW_GROSS" ? "LOW_GROSS" : "LOW_NET";
  const [competition, setCompetitionState] =
    useState<TournamentCompetition>(requestedCompetition);

  useEffect(() => {
    setCompetitionState(requestedCompetition);
  }, [requestedCompetition]);

  function setCompetition(nextCompetition: TournamentCompetition): void {
    setCompetitionState(nextCompetition);
    setSearchParams({ competition: nextCompetition });
  }

  const data = useTournamentStandingsPageData(tripId, competition);
  const viewState = useTournamentStandingsViewState({
    standings: data.standings,
    prizeSchedules: data.prizeSchedules,
    tripRounds: data.tripRounds,
    tournamentSetup: data.tournamentSetup,
    competition,
  });
  const report = useTournamentStandingsReport({
    standings: data.standings,
    sortedRows: viewState.sortedRows,
    tournamentName: viewState.tournamentName,
    configuredPurse: viewState.configuredPurse,
  });

  if (data.loading) {
    return <div style={pageContainerWideStyle}>Loading tournament standings...</div>;
  }

  if (data.error || !data.standings) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>
          {data.error ?? "Tournament standings not found."}
        </div>
        <button type="button" style={buttonStyle} onClick={() => navigate("/trips")}>
          Events
        </button>
      </div>
    );
  }

  return (
    <TournamentStandingsBody
      standings={data.standings}
      competition={competition}
      setCompetition={setCompetition}
      viewState={viewState}
      onPrint={report.handlePrint}
      onExportCsv={report.handleExportCsv}
      onRefresh={() => window.location.reload()}
    />
  );
}
