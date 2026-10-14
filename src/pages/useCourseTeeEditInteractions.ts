import { useEffect, useMemo, type RefObject } from "react";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import {
  applyComboSources,
  applyWomenHoleDefaults,
  getTeeDisplayName,
  normalizeForm,
  normalizeHoleForms,
  type ComboSourceSlot,
  type HoleForm,
  type TeeBuildMode,
  type TeeForm,
} from "./courseTeeEditLogic";
import type { CourseTeeEditPageData } from "./useCourseTeeEditPageData";

interface UseCourseTeeEditInteractionsArgs {
  data: CourseTeeEditPageData;
  saving: boolean;
  clearSaveMessage: () => void;
  firstFieldRef: RefObject<HTMLInputElement | null>;
}

export function useCourseTeeEditInteractions({
  data,
  saving,
  clearSaveMessage,
  firstFieldRef,
}: UseCourseTeeEditInteractionsArgs) {
  const teeHasChanges = useMemo(() => {
    return JSON.stringify(normalizeForm(data.form)) !== JSON.stringify(normalizeForm(data.initialForm));
  }, [data.form, data.initialForm]);

  const holesHaveChanges = useMemo(() => {
    return JSON.stringify(normalizeHoleForms(data.holes)) !== JSON.stringify(normalizeHoleForms(data.initialHoles));
  }, [data.holes, data.initialHoles]);

  const comboHasChanges = useMemo(() => {
    return (
      data.teeBuildMode !== data.initialTeeBuildMode ||
      JSON.stringify(data.comboSourceTeeIds) !== JSON.stringify(data.initialComboSourceTeeIds) ||
      JSON.stringify(data.comboHoleSourceIds) !== JSON.stringify(data.initialComboHoleSourceIds)
    );
  }, [
    data.comboHoleSourceIds,
    data.comboSourceTeeIds,
    data.initialComboHoleSourceIds,
    data.initialComboSourceTeeIds,
    data.initialTeeBuildMode,
    data.teeBuildMode,
  ]);

  const capabilityHasChanges =
    data.hasMenData !== data.initialHasMenData || data.hasWomenData !== data.initialHasWomenData;

  const hasUnsavedChanges = teeHasChanges || holesHaveChanges || comboHasChanges || capabilityHasChanges;
  const confirmIfNeeded = useUnsavedChangesWarning(hasUnsavedChanges && !saving);

  useEffect(() => {
    firstFieldRef.current?.focus();
    firstFieldRef.current?.select();
  }, [data.loading, firstFieldRef]);

  function clearFeedback(): void {
    clearSaveMessage();
  }

  function updateField<K extends keyof TeeForm>(field: K, value: TeeForm[K]): void {
    data.setForm((current) => ({ ...current, [field]: value }));
    clearFeedback();
  }

  function updateHoleField(
    index: number,
    field: keyof Omit<HoleForm, "holeNumber">,
    value: string
  ): void {
    data.setHoles((current) => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
    clearFeedback();
  }

  function updateHasMenData(value: boolean): void {
    data.setHasMenData(value);
    clearFeedback();
  }

  function updateHasWomenData(value: boolean): void {
    data.setHasWomenData(value);

    if (value) {
      data.setHoles((current) =>
        applyWomenHoleDefaults(current, data.availableTees, data.sourceHoleMap)
      );
    }

    clearFeedback();
  }

  function setBuildMode(mode: TeeBuildMode): void {
    data.setTeeBuildMode(mode);
    clearFeedback();

    if (mode === "COMBO") {
      data.setHoles((current) =>
        applyComboSources(current, data.comboHoleSourceIds, data.sourceHoleMap)
      );
    }
  }

  function updateComboSource(slot: ComboSourceSlot, teeIdValue: string): void {
    data.setComboSourceTeeIds((current) => {
      const updated: [string, string] = [...current] as [string, string];
      updated[slot] = teeIdValue;
      return updated;
    });

    data.setComboHoleSourceIds((current) => {
      const fallbackSource = slot === 0 ? teeIdValue : data.comboSourceTeeIds[0];
      const previousSource = data.comboSourceTeeIds[slot];
      const updated = current.map((sourceId) => {
        if (!sourceId || sourceId === previousSource) {
          return teeIdValue || fallbackSource || "";
        }

        return sourceId;
      });

      data.setHoles((currentHoles) =>
        applyComboSources(currentHoles, updated, data.sourceHoleMap)
      );
      return updated;
    });

    clearFeedback();
  }

  function updateComboHoleSource(index: number, teeIdValue: string): void {
    data.setComboHoleSourceIds((current) => {
      const updated = [...current];
      updated[index] = teeIdValue;

      data.setHoles((currentHoles) =>
        applyComboSources(currentHoles, updated, data.sourceHoleMap)
      );
      return updated;
    });

    clearFeedback();
  }

  const comboSourceOptions = data.availableTees.filter((tee) => tee.teeId != null);
  const comboSourceOneName =
    comboSourceOptions.find((tee) => String(tee.teeId) === data.comboSourceTeeIds[0])?.teeName ??
    "Source 1";
  const comboSourceTwoName =
    comboSourceOptions.find((tee) => String(tee.teeId) === data.comboSourceTeeIds[1])?.teeName ??
    "Source 2";

  return {
    teeHasChanges,
    holesHaveChanges,
    comboHasChanges,
    capabilityHasChanges,
    hasUnsavedChanges,
    confirmIfNeeded,
    updateField,
    updateHoleField,
    updateHasMenData,
    updateHasWomenData,
    setBuildMode,
    updateComboSource,
    updateComboHoleSource,
    comboSourceOptions,
    comboSourceOneName,
    comboSourceTwoName,
  };
}

export type CourseTeeEditInteractions = ReturnType<typeof useCourseTeeEditInteractions>;
