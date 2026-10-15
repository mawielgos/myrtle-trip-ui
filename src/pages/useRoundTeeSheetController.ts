import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type { RoundPlayerStatusResponse, RoundSetupStatusResponse } from "../types/round";
import { buttonStyle, disabledButtonStyle, primaryButtonStyle } from "../styles/uiStyles";
import { downloadCsv, sanitizeFileName } from "../utils/exportUtils";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import { buildScoreEntryAction } from "../utils/roundNavigation";
import { buildTeeSheetCsvRows, getTeeSheetStartTypeMessage, sortTeeSheetGroups } from "./roundTeeSheetLogic";

/** Owns tee sheet loading, derived navigation state, and report actions. */
export function useRoundTeeSheetController() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RoundSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getRoundSetupStatus(Number(roundId));
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load tee sheet.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const playersById = useMemo(() => {
    const result = new Map<number, RoundPlayerStatusResponse>();
    (data?.round.players ?? []).forEach((player) => result.set(player.playerId, player));
    return result;
  }, [data]);

  const groups = useMemo(() => sortTeeSheetGroups(data?.groups.groups ?? []), [data]);
  const round = data?.round ?? null;
  const teeSheetStartTypeMessage = getTeeSheetStartTypeMessage(groups);
  const groupsButtonLabel = round?.finalized || round?.tripLocked ? "View Groups" : "Edit Groups";
  const scoringReady = Boolean(data?.readiness?.ready ?? data?.readiness?.readyForScoring);
  const canNavigateToScoring = scoringReady || Boolean(round?.finalized);
  const scoreEntryAction = round ? buildScoreEntryAction(round.roundId, round) : null;
  const scoringButtonStyle = canNavigateToScoring
    ? primaryButtonStyle
    : { ...buttonStyle, ...disabledButtonStyle };
  const scoringButtonTitle = canNavigateToScoring
    ? undefined
    : "Complete round setup before opening scoring.";

  function handleExportCsv(): void {
    if (!round) return;
    const rows = buildTeeSheetCsvRows(groups, playersById);
    const baseName = sanitizeFileName(`${round.courseName || "round"}-${round.roundDate || round.roundId}-tee-sheet`);
    downloadCsv(`${baseName}.csv`, rows);
  }

  function handlePrint(): void {
    if (!round) return;
    printWithReportTitle(buildReportFileTitle(round.courseName || "Event", "Tee Sheet", round.roundDate || `Round ${round.roundId}`));
  }

  function handleOpenGroups(): void {
    if (round) navigate(`/rounds/${round.roundId}/groups`);
  }

  function handleOpenScoring(): void {
    if (canNavigateToScoring && scoreEntryAction) navigate(scoreEntryAction.path);
  }

  return {
    loading, error, data, round, groups, playersById, teeSheetStartTypeMessage,
    groupsButtonLabel, canNavigateToScoring, scoreEntryAction, scoringButtonStyle,
    scoringButtonTitle, handleExportCsv, handlePrint, handleOpenGroups, handleOpenScoring,
  };
}
