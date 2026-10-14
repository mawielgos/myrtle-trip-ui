import { useEffect, useMemo, useState } from "react";
import { createPlayer, getPlayer, setPlayerActive, updatePlayer } from "../api/playerApi";
import { useAppDialog } from "../components/common/AppDialog";
import type { PlayerDetail, SavePlayerRequest } from "../types/player";
import { normalizeHandicapMethod } from "../utils/handicapMethod";
import { emptyForm, buildDisplayName, buildFormFromPlayer, hasFormChanges, normalizeGender } from "./playerAdminLogic";

export type PlayerEditorState = {
  mode: "new" | "edit";
  playerId: number | null;
};

export function usePlayerEditor(editor: PlayerEditorState, onClose: () => void, onSaved: (message: string) => Promise<void>) {
  const { alertDialog, confirmDialog } = useAppDialog();
  const isNew = editor.mode === "new";

  const [form, setForm] = useState<SavePlayerRequest>(emptyForm());
  const [initialForm, setInitialForm] = useState<SavePlayerRequest>(emptyForm());
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const computedDisplayName = useMemo(() => {
    return buildDisplayName(form.firstName, form.lastName);
  }, [form.firstName, form.lastName]);

  const hasChanges = hasFormChanges(form, initialForm, loading);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayer() {
      if (isNew || !editor.playerId) {
        setForm(emptyForm());
        setInitialForm(emptyForm());
        setPlayerDetail(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const player = await getPlayer(editor.playerId);
        if (cancelled) {
          return;
        }
        const loadedForm = buildFormFromPlayer(player);
        setPlayerDetail(player);
        setForm(loadedForm);
        setInitialForm(loadedForm);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Failed to load player.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlayer();

    return () => {
      cancelled = true;
    };
  }, [editor.playerId, isNew]);

  function updateField<K extends keyof SavePlayerRequest>(field: K, value: SavePlayerRequest[K]) {
    setError("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function closeIfConfirmed() {
    if (!hasChanges || saving) {
      onClose();
      return;
    }

    const confirmed = await confirmDialog({
      title: "Discard Player Changes?",
      message: "Close the player dialog and discard unsaved changes?",
      severity: "warning",
      confirmText: "Discard Changes",
    });

    if (confirmed) {
      onClose();
    }
  }

  async function handleSave() {
    if (!form.firstName.trim()) {
      await alertDialog({
        title: "First Name Required",
        message: "First name is required.",
        severity: "warning",
      });
      return;
    }

    if (!form.lastName.trim()) {
      await alertDialog({
        title: "Last Name Required",
        message: "Last name is required.",
        severity: "warning",
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: SavePlayerRequest = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: computedDisplayName,
        ghinNumber: form.ghinNumber.trim(),
        email: form.email.trim(),
        cell: form.cell.trim(),
        venmoId: form.venmoId.trim(),
        zelleId: form.zelleId.trim(),
        handicapMethod: normalizeHandicapMethod(form.handicapMethod),
        gender: normalizeGender(form.gender),
      };

      if (isNew) {
        await createPlayer(payload);
      } else if (editor.playerId) {
        await updatePlayer(editor.playerId, payload);
      }

      setInitialForm(payload);
      await onSaved(isNew ? "Player created successfully." : "Player saved successfully.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save player.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!playerDetail) {
      return;
    }

    try {
      setError("");
      const updated = await setPlayerActive(playerDetail.playerId, !playerDetail.active);
      const updatedForm = buildFormFromPlayer(updated);
      setPlayerDetail(updated);
      setForm(updatedForm);
      setInitialForm(updatedForm);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update player active status.");
    }
  }

  return { isNew, form, playerDetail, loading, saving, error, computedDisplayName, updateField, closeIfConfirmed, handleSave, handleToggleActive };
}
