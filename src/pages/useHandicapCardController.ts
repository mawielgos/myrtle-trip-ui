import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getHandicapCardDetail } from "../api/handicapCardApi";
import type { HandicapCardDetailResponse, HandicapCardScore } from "../types/handicapCard";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import { formatHandicapMethod } from "../utils/handicapMethod";
import {
  addDaysToIsoDate, buildRecencyLabel, clampToToday, downloadCsv, formatDate,
  formatDecimal, formatInteger, formatSignedDecimal, formatSource,
  getPendingIndexDelta, getTodayIsoDate, safeFilePart,
} from "./handicapCardLogic";

export function useHandicapCardController() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const playerId = Number(params.playerId);

  const [asOfDate, setAsOfDate] = useState<string>(() => getTodayIsoDate());
  const [data, setData] = useState<HandicapCardDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayIso = getTodayIsoDate();
  const isViewingToday = asOfDate >= todayIso;

  const pendingScores = useMemo(
    () => (data?.scores ?? []).filter((score) => score.pendingForCalculationDate === true),
    [data]
  );
  const windowScores = useMemo(
    () => (data?.scores ?? []).filter((score) => score.pendingForCalculationDate !== true),
    [data]
  );
  const effectiveAsOfDate = data?.asOfDate ?? asOfDate;
  const pendingIndexDelta = getPendingIndexDelta(data);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(tripId) || !Number.isFinite(playerId)) {
        setError("Invalid event or player id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getHandicapCardDetail(tripId, playerId, asOfDate);
        if (!cancelled) {
          setData(response);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error ?? err?.message ?? "Unable to load handicap card.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tripId, playerId, asOfDate]);

  function moveOneDay(days: number): void {
    setAsOfDate((current) => clampToToday(addDaysToIsoDate(current || getTodayIsoDate(), days)));
  }

  function handleDateChange(value: string): void {
    setAsOfDate(clampToToday(value || getTodayIsoDate()));
  }

  function resetToday(): void {
    setAsOfDate(getTodayIsoDate());
  }

  function handlePrint(): void {
    printWithReportTitle(buildReportFileTitle(data?.tripName || "Event", "Handicap Card", data?.playerName));
  }

  function addScoreRows(rows: Array<Array<string | number | null | undefined>>, title: string, scores: HandicapCardScore[]): void {
    rows.push([]);
    rows.push([title]);
    rows.push(["#", "Date / Seq", "Source", "Course", "Gross", "Adj", "CR", "Slope", "Diff", "Status", "Reason"]);
    for (const [index, score] of scores.entries()) {
      let status = "Excluded";
      if (score.pendingForCalculationDate === true) {
        status = score.usedInPendingIndex === true ? "Pending Used" : "Pending";
      } else if (score.usedInIndex === true) {
        status = "Used";
      } else if (score.eligibleForWindow === true) {
        status = "Window";
      }

      rows.push([
        score.displaySortOrder ?? index + 1,
        buildRecencyLabel(score),
        formatSource(score.sourceType),
        score.courseName ?? "",
        formatInteger(score.grossScore),
        formatInteger(score.adjustedGrossScore),
        formatDecimal(score.courseRating),
        formatInteger(score.slope),
        formatDecimal(score.differential),
        status,
        score.exclusionReason ?? "",
      ]);
    }
  }

  function handleExportCsv(): void {
    if (!data) {
      return;
    }

    const rows: Array<Array<string | number | null | undefined>> = [];
    rows.push(["Handicap Card"]);
    rows.push(["Event", data.tripName]);
    rows.push(["Player", data.playerName]);
    rows.push(["Calculation Date", formatDate(effectiveAsOfDate)]);
    rows.push(["Current Event Index", formatDecimal(data.tripIndex)]);
    rows.push(["Pending Handicap Index", data.pendingTripIndex == null ? "" : formatDecimal(data.pendingTripIndex)]);
    rows.push(["Pending Index Delta", pendingIndexDelta == null ? "" : formatSignedDecimal(pendingIndexDelta)]);
    rows.push(["Method", formatHandicapMethod(data.handicapMethod)]);
    rows.push(["Window", data.windowScoreCount]);
    rows.push(["Used", data.usedScoreCount]);
    rows.push(["Eligible Before Date", data.eligibleScoreCount]);

    if (pendingScores.length > 0) {
      addScoreRows(rows, "Pending Posted Scores", pendingScores);
    }
    addScoreRows(rows, "Current Calculation Window", windowScores);

    downloadCsv(`${safeFilePart(data.tripName)}-${safeFilePart(data.playerName)}-handicap-card-${effectiveAsOfDate}.csv`, rows);
  }

  return {
    tripId, playerId, asOfDate, data, loading, error, todayIso, isViewingToday,
    pendingScores, windowScores, effectiveAsOfDate, pendingIndexDelta,
    moveOneDay, handleDateChange, resetToday, handlePrint, handleExportCsv,
  };
}
