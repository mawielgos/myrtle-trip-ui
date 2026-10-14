import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getTripDetail, getTripPlayers, getTripPrizeSchedules, recalculateTripPrizeWinnings, saveTripPrizeSchedules } from "../api/tripApi";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { amountKey, buildAmountInputs, buildPlacesPaidInputs, buildPrizeSavePayload, buildPrizeSnapshot, getScheduleDistributedTotal, sortPayouts, type AmountInputMap, type PlacesPaidInputMap } from "./tripPrizeSetupLogic";
import type { PrizeRecalculationResponse, PrizeSchedule, TripDetail, TripPlayer } from "../types/trip";

export function useTripPrizeSetupController() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [schedules, setSchedules] = useState<PrizeSchedule[]>([]);
  const [amountInputs, setAmountInputs] = useState<AmountInputMap>({});
  const [placesPaidInputs, setPlacesPaidInputs] = useState<PlacesPaidInputMap>(
    {},
  );
  const [recalculationResult, setRecalculationResult] =
    useState<PrizeRecalculationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savedPrizeSnapshot, setSavedPrizeSnapshot] = useState<string>("");

  const numericTripId = useMemo(() => {
    if (!tripId) {
      return null;
    }

    const parsed = Number(tripId);
    return Number.isNaN(parsed) ? null : parsed;
  }, [tripId]);

  const activePlayerCount = useMemo(() => {
    return players.filter((player) => player.active !== false).length;
  }, [players]);

  const totalPrizeMoneyCollected = useMemo(() => {
    return (trip?.entryFee ?? 0) * activePlayerCount;
  }, [activePlayerCount, trip?.entryFee]);

  const totalPrizeMoneyDistributed = useMemo(() => {
    return schedules.reduce((sum, schedule) => {
      return sum + getScheduleDistributedTotal(schedule, amountInputs);
    }, 0);
  }, [amountInputs, schedules]);

  const prizeMoneyRemaining =
    totalPrizeMoneyCollected - totalPrizeMoneyDistributed;

  const rosterHasActivePlayers = activePlayerCount > 0;
  const showPrizeSetupAsPendingRoster =
    !rosterHasActivePlayers && totalPrizeMoneyDistributed > 0;

  const currentPrizeSnapshot = useMemo(() => {
    return buildPrizeSnapshot(schedules, amountInputs, placesPaidInputs);
  }, [amountInputs, placesPaidInputs, schedules]);

  const tripIsComplete = trip?.status === "COMPLETE";
  const correctionModeEnabled = trip?.correctionMode === true;
  const prizeSetupReadOnly = tripIsComplete && !correctionModeEnabled;

  const hasChanges =
    !prizeSetupReadOnly &&
    savedPrizeSnapshot !== "" &&
    currentPrizeSnapshot !== savedPrizeSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && !saving,
    "You have unsaved prize setup changes. Leave without saving?",
  );

  useEffect(() => {
    async function load(): Promise<void> {
      if (numericTripId == null) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMessage(null);
        setRecalculationResult(null);

        const [tripResponse, playersResponse, scheduleResponse] =
          await Promise.all([
            getTripDetail(numericTripId),
            getTripPlayers(numericTripId),
            getTripPrizeSchedules(numericTripId),
          ]);

        const sortedSchedules = scheduleResponse.map(sortPayouts);

        setTrip(tripResponse);
        setPlayers(playersResponse);
        setSchedules(sortedSchedules);
        const nextPlacesPaidInputs = buildPlacesPaidInputs(sortedSchedules);
        const nextAmountInputs = buildAmountInputs(sortedSchedules);

        setPlacesPaidInputs(nextPlacesPaidInputs);
        setAmountInputs(nextAmountInputs);
        setSavedPrizeSnapshot(
          buildPrizeSnapshot(
            sortedSchedules,
            nextAmountInputs,
            nextPlacesPaidInputs,
          ),
        );
      } catch (err) {
        console.error("Failed to load prize setup", err);
        setError("Unable to load prize setup.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [numericTripId]);

  function updatePlacesPaid(
    scheduleIndex: number,
    placesPaidValue: string,
  ): void {
    const schedule = schedules[scheduleIndex];

    if (!schedule) {
      return;
    }

    setPlacesPaidInputs((current) => ({
      ...current,
      [schedule.gameKey]: placesPaidValue,
    }));

    if (placesPaidValue.trim() === "") {
      return;
    }

    const parsed = Number(placesPaidValue);

    if (Number.isNaN(parsed)) {
      return;
    }

    const placesPaid = Math.max(0, Math.min(50, Math.floor(parsed)));

    setSchedules((current) => {
      return current.map((currentSchedule, index) => {
        if (index !== scheduleIndex) {
          return currentSchedule;
        }

        const currentPayouts = [...currentSchedule.payouts].sort(
          (a, b) => a.finishingPlace - b.finishingPlace,
        );

        const nextPayouts = [];

        for (let place = 1; place <= placesPaid; place++) {
          const existing = currentPayouts.find(
            (payout) => payout.finishingPlace === place,
          );

          nextPayouts.push(
            existing ?? {
              payoutId: null,
              finishingPlace: place,
              amountPerPlayer: 0,
            },
          );
        }

        return {
          ...currentSchedule,
          payouts: nextPayouts,
        };
      });
    });

    setAmountInputs((current) => {
      const nextInputs: AmountInputMap = { ...current };

      for (let place = 1; place <= placesPaid; place++) {
        const key = amountKey(schedule.gameKey, place);

        if (nextInputs[key] == null) {
          nextInputs[key] = "";
        }
      }

      Object.keys(nextInputs).forEach((key) => {
        if (!key.startsWith(`${schedule.gameKey}:`)) {
          return;
        }

        const placeText = key.substring(schedule.gameKey.length + 1);
        const place = Number(placeText);

        if (!Number.isNaN(place) && place > placesPaid) {
          delete nextInputs[key];
        }
      });

      return nextInputs;
    });
  }

  function updatePayoutAmount(
    schedule: PrizeSchedule,
    finishingPlace: number,
    amountValue: string,
  ): void {
    setAmountInputs((current) => ({
      ...current,
      [amountKey(schedule.gameKey, finishingPlace)]: amountValue,
    }));
  }

  function updateGameName(scheduleIndex: number, gameName: string): void {
    setSchedules((current) => {
      return current.map((schedule, index) => {
        if (index !== scheduleIndex) {
          return schedule;
        }

        return {
          ...schedule,
          gameName,
        };
      });
    });
  }

  async function handleSave(): Promise<void> {
    if (numericTripId == null) {
      return;
    }
    if (prizeSetupReadOnly) {
      setError(
        "Prize setup is locked after the event is complete. Enable Correction Mode from Event Detail to make prize updates.",
      );
      return;
    }

    const { payload, invalidEntries } = buildPrizeSavePayload(schedules, amountInputs);

    if (invalidEntries.length > 0) {
      setError(
        `Fix invalid prize amounts before saving: ${invalidEntries.join("; ")}.`,
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      setRecalculationResult(null);

      const saved = await saveTripPrizeSchedules(numericTripId, payload);
      const sortedSchedules = saved.map(sortPayouts);

      const nextAmountInputs = buildAmountInputs(sortedSchedules);
      const nextPlacesPaidInputs = buildPlacesPaidInputs(sortedSchedules);

      setSchedules(sortedSchedules);
      setAmountInputs(nextAmountInputs);
      setPlacesPaidInputs(nextPlacesPaidInputs);
      setSavedPrizeSnapshot(
        buildPrizeSnapshot(
          sortedSchedules,
          nextAmountInputs,
          nextPlacesPaidInputs,
        ),
      );
      setMessage("Prize money saved.");
    } catch (err) {
      console.error("Failed to save prize setup", err);
      setError("Unable to save prize money setup.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalculate(): Promise<void> {
    if (numericTripId == null) {
      return;
    }
    if (prizeSetupReadOnly) {
      setError(
        "Prize winnings are locked after the event is complete. Enable Correction Mode from Event Detail to recalculate prize winnings.",
      );
      return;
    }

    try {
      setRecalculating(true);
      setError(null);
      setMessage(null);
      setRecalculationResult(null);

      const result = await recalculateTripPrizeWinnings(numericTripId);
      setRecalculationResult(result);
      setMessage("Prize winnings recalculated.");
    } catch (err) {
      console.error("Failed to recalculate prize winnings", err);
      setError(
        "Unable to recalculate prize winnings. Make sure all required rounds are finalized.",
      );
    } finally {
      setRecalculating(false);
    }
  }

  return {
    trip, schedules, amountInputs, placesPaidInputs, recalculationResult,
    loading, saving, recalculating, error, message,
    numericTripId, activePlayerCount, totalPrizeMoneyCollected,
    totalPrizeMoneyDistributed, prizeMoneyRemaining, rosterHasActivePlayers,
    showPrizeSetupAsPendingRoster, tripIsComplete, correctionModeEnabled,
    prizeSetupReadOnly, hasChanges, confirmIfNeeded,
    updatePlacesPaid, updatePayoutAmount, updateGameName, handleSave, handleRecalculate,
  };
}
