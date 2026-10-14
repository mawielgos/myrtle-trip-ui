import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TripDetailButton from "../components/common/TripDetailButton";
import { errorBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import {
  buildPayoutSummary,
  buildPlayerPublishRows,
  buildRoundPrizeColumns,
  buildTournamentPositionColumns,
} from "./tripWinningDetailLogic";
import { TripWinningDetailBody } from "./TripWinningDetailBody";
import { useTripWinningDetailPageData } from "./useTripWinningDetailPageData";
import { useTripWinningDetailCommands } from "./useTripWinningDetailCommands";

export default function TripWinningDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const {
    trip,
    players,
    rounds,
    schedules,
    winnings,
    setWinnings,
    standingsByCompetition,
    tournamentSetup,
    loading,
    error,
    setError,
  } = useTripWinningDetailPageData(numericTripId);

  const columns = useMemo(
    () => buildRoundPrizeColumns(schedules, winnings, rounds),
    [rounds, schedules, winnings],
  );

  const tournamentColumns = useMemo(
    () => buildTournamentPositionColumns(tournamentSetup),
    [tournamentSetup],
  );

  const rows = useMemo(
    () =>
      buildPlayerPublishRows(
        players,
        columns,
        tournamentColumns,
        standingsByCompetition,
        winnings,
        schedules,
      ),
    [
      columns,
      players,
      schedules,
      standingsByCompetition,
      tournamentColumns,
      winnings,
    ],
  );

  const { totalPayout, totalPaid, totalUnpaid, unpaidRows } = useMemo(
    () => buildPayoutSummary(rows),
    [rows],
  );

  const tripYear = trip?.tripYear ?? new Date().getFullYear();
  const {
    savingPlayerId,
    savingAllPaid,
    handleTogglePaid,
    handleMarkAllPaid,
    handleExportCsv,
    handlePrint,
  } = useTripWinningDetailCommands({
    numericTripId,
    tripName: trip?.tripName,
    tripYear,
    winnings,
    setWinnings,
    setError,
    rows,
    columns,
    tournamentColumns,
    totalPayout,
    unpaidRows,
  });

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading winning detail...</div>;
  }

  if (error || !trip || !winnings) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Winning detail not found."}</div>
        <TripDetailButton tripId={numericTripId} />
      </div>
    );
  }

  return (
    <TripWinningDetailBody
      trip={trip}
      columns={columns}
      tournamentColumns={tournamentColumns}
      rows={rows}
      totalPayout={totalPayout}
      totalPaid={totalPaid}
      totalUnpaid={totalUnpaid}
      unpaidCount={unpaidRows.length}
      savingPlayerId={savingPlayerId}
      savingAllPaid={savingAllPaid}
      onMoneyDistribution={() =>
        navigate(`/trips/${trip.tripId}/money-distribution`)
      }
      onPrint={handlePrint}
      onExportCsv={handleExportCsv}
      onMarkAllPaid={() => void handleMarkAllPaid()}
      onTogglePaid={(playerId, paid) => void handleTogglePaid(playerId, paid)}
    />
  );
}
