import { useEffect, useMemo, useState } from "react";
import { getTripDetail, getTripTournamentSetup, saveTripTournamentSetup } from "../api/tripApi";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import type { TripTournamentRound, TripTournamentSetup } from "../types/trip";
import {
  DEFAULT_TOURNAMENT_NAME, DEFAULT_STANDINGS_LABEL, DEFAULT_LOW_NET_NAME, DEFAULT_LOW_GROSS_NAME,
  buildDraft, buildSnapshot, getSortedRounds, getConfiguredRounds,
  getTournamentValidationError, buildTournamentSavePayload,
  type TournamentSetupDraft,
} from "./tripTournamentSetupLogic";

export function useTripTournamentSetupController(numericTripId: number) {
  const [tripName, setTripName] = useState<string>("");
  const [tripStatus, setTripStatus] = useState<string>("PLANNING");
  const [setup, setSetup] = useState<TripTournamentSetup | null>(null);
  const [draft, setDraft] = useState<TournamentSetupDraft>({
    enabled: false,
    tournamentName: DEFAULT_TOURNAMENT_NAME,
    standingsLabel: DEFAULT_STANDINGS_LABEL,
    lowNetEnabled: true,
    lowGrossEnabled: false,
    lowNetName: DEFAULT_LOW_NET_NAME,
    lowGrossName: DEFAULT_LOW_GROSS_NAME,
    includedPlannedRoundIds: [],
  });
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sortedRounds = useMemo(
    () => getSortedRounds(setup),
    [setup],
  );

  const configuredRounds = useMemo(
    () => getConfiguredRounds(sortedRounds),
    [sortedRounds],
  );

  const configuredRoundCount = configuredRounds.length;
  const tournamentSetupAvailable = configuredRoundCount >= 2;
  const includedCount = draft.enabled ? draft.includedPlannedRoundIds.length : 0;
  const isReadOnly = setup?.readOnly === true;
  const currentSnapshot = useMemo(() => buildSnapshot(draft), [draft]);
  const hasChanges = !loading && !isReadOnly && initialSnapshot.length > 0 && currentSnapshot !== initialSnapshot;
  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId]);

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [trip, tournamentSetup] = await Promise.all([
        getTripDetail(numericTripId),
        getTripTournamentSetup(numericTripId),
      ]);

      const nextDraft = buildDraft(tournamentSetup);
      setTripName(trip.tripName ?? "");
      setTripStatus(trip.status ?? "PLANNING");
      setSetup(tournamentSetup);
      setDraft(nextDraft);
      setInitialSnapshot(buildSnapshot(nextDraft));
    } catch (err) {
      console.error("Failed to load tournament setup", err);
      setError("Unable to load tournament setup.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(patch: Partial<TournamentSetupDraft>): void {
    if (isReadOnly) {
      return;
    }

    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
    setError(null);
  }

  function handleEnabledChange(enabled: boolean): void {
    if (isReadOnly) {
      return;
    }

    setDraft((current) => ({
      ...current,
      enabled,
      lowNetEnabled: enabled ? current.lowNetEnabled : true,
      lowGrossEnabled: enabled ? current.lowGrossEnabled : false,
      includedPlannedRoundIds: enabled ? current.includedPlannedRoundIds : [],
    }));
    setMessage(null);
    setError(null);
  }

  function toggleRound(round: TripTournamentRound, checked: boolean): void {
    if (isReadOnly || !draft.enabled || round.plannedRoundId == null) {
      return;
    }

    setDraft((current) => {
      const nextIds = new Set(current.includedPlannedRoundIds);
      if (checked) {
        nextIds.add(round.plannedRoundId);
      } else {
        nextIds.delete(round.plannedRoundId);
      }
      return { ...current, includedPlannedRoundIds: Array.from(nextIds) };
    });
    setMessage(null);
    setError(null);
  }

  function selectAllConfiguredRounds(): void {
    if (isReadOnly || !draft.enabled) {
      return;
    }

    setDraft((current) => ({
      ...current,
      includedPlannedRoundIds: configuredRounds
        .filter((round) => round.plannedRoundId != null)
        .map((round) => round.plannedRoundId),
    }));
  }

  function clearIncludedRounds(): void {
    if (isReadOnly || !draft.enabled) {
      return;
    }

    setDraft((current) => ({ ...current, includedPlannedRoundIds: [] }));
  }

  async function handleSave(): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const validationMessage = getTournamentValidationError(draft, tournamentSetupAvailable);
    if (validationMessage) {
      setError(validationMessage);
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedSetup = await saveTripTournamentSetup(numericTripId, buildTournamentSavePayload(draft));

      const nextDraft = buildDraft(savedSetup);
      setSetup(savedSetup);
      setDraft(nextDraft);
      setInitialSnapshot(buildSnapshot(nextDraft));
      setMessage(tripStatus === "IN_PROGRESS"
        ? "Tournament setup saved. Review tournament standings and recalculate prize winnings if payouts were already calculated."
        : "Tournament setup saved.");
    } catch (err: any) {
      console.error("Failed to save tournament setup", err);
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(apiMessage || "Unable to save tournament setup.");
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  return {
    tripName, tripStatus, draft, sortedRounds, configuredRoundCount, includedCount,
    isReadOnly, loading, saving, error, message, confirmIfNeeded,
    updateDraft, handleEnabledChange, toggleRound, selectAllConfiguredRounds,
    clearIncludedRounds, handleSave,
  };
}
