import { useParams } from "react-router-dom";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useTripManualScoreHistoryPageData } from "./useTripManualScoreHistoryPageData";
import { useTripManualScoreHistoryCommands } from "./useTripManualScoreHistoryCommands";
import { useTripManualScoreHistoryInteractions } from "./useTripManualScoreHistoryInteractions";
import TripManualScoreHistoryImportPanel from "./TripManualScoreHistoryImportPanel";
import TripManualScoreHistoryPriorEventPanel from "./TripManualScoreHistoryPriorEventPanel";
import TripManualScoreHistoryCommittedPanel from "./TripManualScoreHistoryCommittedPanel";

export default function TripManualScoreHistoryPage() {
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const data = useTripManualScoreHistoryPageData(numericTripId);
  const interactions = useTripManualScoreHistoryInteractions({
    players: data.players,
    entries: data.entries,
    loading: data.loading,
  });
  const commands = useTripManualScoreHistoryCommands({
    numericTripId,
    activePlayers: interactions.activePlayers,
    existingCountsByPlayerId: interactions.existingCountsByPlayerId,
    rows: interactions.rows,
    setRows: interactions.setRows,
    selectedDbCandidateIds: interactions.selectedDbCandidateIds,
    setSelectedDbCandidateIds: interactions.setSelectedDbCandidateIds,
    selectedEntryIds: interactions.selectedEntryIds,
    editRow: interactions.editRow,
    setError: data.setError,
    refreshCommittedEntries: data.refreshCommittedEntries,
  });

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Manual Score History"
        subtitle={`${data.tripName} • Add or upload DB Score History rows for this event only`}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                commands.setMessage(null);
                void data.loadPage();
              }}
            >
              Refresh
            </button>
          </>
        }
      />

      {data.error && <div style={errorBoxStyle}>{data.error}</div>}
      {commands.message && <div style={successBoxStyle}>{commands.message}</div>}

      <TripManualScoreHistoryImportPanel
        rows={interactions.rows}
        activePlayers={interactions.activePlayers}
        saving={commands.saving}
        loading={data.loading}
        updateRow={interactions.updateRow}
        addRow={interactions.addRow}
        addFiveRows={interactions.addFiveRows}
        clearRows={interactions.clearRows}
        removeRow={interactions.removeRow}
        copyFirstRowDown={interactions.copyFirstRowDown}
        onUpload={commands.handleUpload}
        onSaveAll={commands.handleSaveAll}
      />

      <TripManualScoreHistoryPriorEventPanel
        candidates={commands.dbCandidates}
        selectedCandidateIds={interactions.selectedDbCandidateIds}
        loadingCandidates={commands.loadingDbCandidates}
        saving={commands.saving}
        toggleCandidate={interactions.toggleDbCandidateSelected}
        toggleAllCandidates={interactions.toggleSelectAllDbCandidates}
        onLoadCandidates={commands.handleLoadDbCandidates}
        onCommitSelected={commands.handleCommitSelectedDbCandidates}
      />

      <TripManualScoreHistoryCommittedPanel
        entries={data.entries}
        groupedEntries={interactions.groupedEntries}
        loading={data.loading}
        saving={commands.saving}
        activePlayers={interactions.activePlayers}
        editingEntryId={interactions.editingEntryId}
        editRow={interactions.editRow}
        selectedEntryIds={interactions.selectedEntryIds}
        collapsedPlayerIds={interactions.collapsedPlayerIds}
        selectedEntryCount={interactions.selectedEntryCount}
        allVisibleEntriesSelected={interactions.allVisibleEntriesSelected}
        setError={data.setError}
        setMessage={commands.setMessage}
        toggleSelectedEntry={interactions.toggleSelectedEntry}
        toggleSelectAllEntries={interactions.toggleSelectAllEntries}
        togglePlayerSelected={interactions.togglePlayerSelected}
        togglePlayerCollapsed={interactions.togglePlayerCollapsed}
        collapseAllPlayers={interactions.collapseAllPlayers}
        expandAllPlayers={interactions.expandAllPlayers}
        startEdit={interactions.startEdit}
        cancelEdit={interactions.cancelEdit}
        updateEditRow={interactions.updateEditRow}
        onSaveEdit={commands.handleSaveEdit}
        onDelete={commands.handleDelete}
        onBulkDelete={commands.handleBulkDelete}
      />
    </div>
  );
}
