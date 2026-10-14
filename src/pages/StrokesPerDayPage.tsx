import { useNavigate, useParams } from "react-router-dom";
import {
  buttonStyle,
  disabledButtonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import { useAppDialog } from "../components/common/AppDialog";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import { buildDailyHandicapsCsv } from "./strokesPerDayLogic";
import { useStrokesPerDayPageData } from "./useStrokesPerDayPageData";
import { useStrokesPerDayCommands } from "./useStrokesPerDayCommands";
import { useStrokesPerDayInteractions } from "./useStrokesPerDayInteractions";
import StrokesPerDayBody from "./StrokesPerDayBody";

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilePart(value: string | null | undefined): string {
  return (
    (value ?? "daily-handicaps")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "daily-handicaps"
  );
}

export default function StrokesPerDayPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { confirmDialog } = useAppDialog();

  const {
    data,
    setData,
    loading,
    error,
    rounds,
    players,
    initialSelectedTeeIds,
    hydrationRevision,
    hydrateData,
  } = useStrokesPerDayPageData(tripId);

  const interactions = useStrokesPerDayInteractions({
    setData,
    initialSelectedTeeIds,
    hydrationRevision,
    confirmDialog,
  });

  const commands = useStrokesPerDayCommands({
    tripId,
    data,
    setData,
    initialSelectedTeeIds,
    changedTeeKeys: interactions.changedTeeKeys,
    setChangedTeeKeys: interactions.setChangedTeeKeys,
    hydrateData,
    confirmDialog,
  });

  function handlePlanningTeeChange(
    playerId: number,
    roundId: number,
    selectedValue: string,
  ): void {
    commands.clearFeedback();
    interactions.changePlanningTee(playerId, roundId, selectedValue);
  }

  function handlePrint(): void {
    printWithReportTitle(
      buildReportFileTitle(data?.tripName || "Event", "Daily Handicaps"),
    );
  }

  function handleExportCsv(): void {
    if (!data) {
      return;
    }

    downloadCsv(
      `${sanitizeFilePart(data.tripName)}-daily-handicaps.csv`,
      buildDailyHandicapsCsv(data),
    );
  }

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading daily handicaps...</div>;
  }

  if (error || !data) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Daily handicaps not found."}</div>
        <button type="button" style={buttonStyle} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }

  const actionDisabled = commands.saving || !interactions.hasUnsavedTeeChanges;

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Daily Handicaps"
        subtitle={
          <>
            <span>{data.tripName}</span>
            <span> • selected tee and playing strokes by round</span>
          </>
        }
        actions={
          <>
            <TripDetailButton
              tripId={data.tripId}
              onBeforeNavigate={interactions.confirmDiscardUnsavedTeeChanges}
            />
            <ReportsButton
              tripId={data.tripId}
              onBeforeNavigate={interactions.confirmDiscardUnsavedTeeChanges}
            />
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginLeft: "8px" }}
              onClick={handlePrint}
            >
              Print
            </button>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginLeft: "8px" }}
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
            <button
              type="button"
              style={{
                ...secondaryButtonStyle,
                marginLeft: "8px",
                ...(actionDisabled ? disabledButtonStyle : {}),
              }}
              disabled={actionDisabled}
              onClick={() => void commands.resetTeeChanges()}
            >
              Reset All Changes
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                marginLeft: "8px",
                ...(actionDisabled ? disabledButtonStyle : {}),
              }}
              disabled={actionDisabled}
              onClick={() => void commands.saveTeePlan()}
            >
              {commands.saving
                ? "Saving..."
                : interactions.hasUnsavedTeeChanges
                  ? `Save Tee Plan (${interactions.changedTeeCount})`
                  : "Save Tee Plan"}
            </button>
          </>
        }
      />

      <StrokesPerDayBody
        data={data}
        rounds={rounds}
        players={players}
        changedTeeKeys={interactions.changedTeeKeys}
        saving={commands.saving}
        saveMessage={commands.saveMessage}
        saveError={commands.saveError}
        changedTeeCount={interactions.changedTeeCount}
        hasUnsavedTeeChanges={interactions.hasUnsavedTeeChanges}
        onPlanningTeeChange={handlePlanningTeeChange}
        onResetTeeChanges={commands.resetTeeChanges}
        onSaveTeePlan={commands.saveTeePlan}
      />
    </div>
  );
}
