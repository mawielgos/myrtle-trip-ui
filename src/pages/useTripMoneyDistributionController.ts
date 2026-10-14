import { useEffect, useMemo, useState } from "react";
import { getTripBillInventory, getTripDetail, getTripPrizeWinnings, saveTripBillInventory } from "../api/tripApi";
import type { PrizePlayerTotalResponse, TripDetail } from "../types/trip";
import {
  defaultBillCounts,
  emptyBillCounts,
  billCountsFromInventory,
  billCountsFromInputs,
  billInputsFromCounts,
  billInventoryPayloadFromCounts,
  distributeBills,
} from "./tripMoneyDistributionLogic";
import type { BillCountInputs, Denomination } from "./tripMoneyDistributionLogic";

export function useTripMoneyDistributionController(numericTripId: number) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [playerTotals, setPlayerTotals] = useState<PrizePlayerTotalResponse[]>([]);
  const [billCountInputs, setBillCountInputs] = useState<BillCountInputs>(() => billInputsFromCounts(defaultBillCounts));
  const [savedBillCountInputs, setSavedBillCountInputs] = useState<BillCountInputs>(() => billInputsFromCounts(defaultBillCounts));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [tripResult, winningsResult, inventoryResult] = await Promise.all([
          getTripDetail(numericTripId),
          getTripPrizeWinnings(numericTripId),
          getTripBillInventory(numericTripId),
        ]);

        if (!cancelled) {
          setTrip(tripResult);
          setPlayerTotals(winningsResult.playerTotals ?? []);
          const loadedInputs = billInputsFromCounts(billCountsFromInventory(inventoryResult));
          setBillCountInputs(loadedInputs);
          setSavedBillCountInputs(loadedInputs);
          setDirty(false);
          setSaveMessage(null);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Unable to load money distribution data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [numericTripId]);

  const billCounts = useMemo(() => {
    return billCountsFromInputs(billCountInputs);
  }, [billCountInputs]);

  const distribution = useMemo(() => {
    return distributeBills(playerTotals, billCounts);
  }, [billCounts, playerTotals]);

  function updateBillCount(denomination: Denomination, value: string): void {
    const cleanedValue = value.replace(/[^0-9]/g, "");

    setBillCountInputs((current) => ({
      ...current,
      [denomination]: cleanedValue,
    }));
    setDirty(true);
    setSaveMessage(null);
  }

  function reloadSavedCounts(): void {
    setBillCountInputs(savedBillCountInputs);
    setDirty(false);
    setSaveMessage(null);
  }

  function clearCounts(): void {
    setBillCountInputs(billInputsFromCounts(emptyBillCounts));
    setDirty(true);
    setSaveMessage(null);
  }

  async function saveBillCountsForTrip(): Promise<void> {
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setError("Invalid event id.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const savedInventory = await saveTripBillInventory(
        numericTripId,
        billInventoryPayloadFromCounts(billCounts)
      );
      const savedInputs = billInputsFromCounts(billCountsFromInventory(savedInventory));
      setBillCountInputs(savedInputs);
      setSavedBillCountInputs(savedInputs);
      setDirty(false);
      setSaveMessage("Bill counts saved for this event.");
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save bill counts.");
    } finally {
      setSaving(false);
    }
  }

  return {
    trip, billCountInputs, loading, saving, dirty, error, saveMessage,
    distribution, updateBillCount, reloadSavedCounts, clearCounts, saveBillCountsForTrip,
  };
}
