import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPlayer, getPlayer, setPlayerActive, updatePlayer } from "../api/playerApi";
import type { PlayerDetail, SavePlayerRequest } from "../types/player";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { useAppDialog } from "../components/common/AppDialog";
import { emptyPlayerForm, buildPlayerDisplayName, normalizePlayerForm, formFromPlayer, validatePlayerForm } from "./playerEditLogic";

/** Keeps the player edit workflow and API interactions separate from rendering. */
export function usePlayerEditController() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alertDialog } = useAppDialog();
  const params = useParams();
  const playerIdParam = params.playerId;
  const isNew = !playerIdParam;
  const playerId = playerIdParam ? Number(playerIdParam) : null;

  const [form, setForm] = useState<SavePlayerRequest>(emptyPlayerForm());
  const [initialForm, setInitialForm] = useState<SavePlayerRequest>(emptyPlayerForm());
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const computedDisplayName = useMemo(() => {
    return buildPlayerDisplayName(form.firstName, form.lastName);
  }, [form.firstName, form.lastName]);


  const comparableForm = useMemo(() => normalizePlayerForm(form), [form]);
  const initialComparableForm = useMemo(() => normalizePlayerForm(initialForm), [initialForm]);

  const hasChanges =
    !loading &&
    JSON.stringify(comparableForm) !== JSON.stringify(initialComparableForm);

  useEffect(() => {
    const state = location.state as { saveMessage?: string } | null;
    if (state?.saveMessage) {
      setSaveMessage(state.saveMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }

  async function loadPlayer() {
    if (!playerId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const player = await getPlayer(playerId);
      setPlayerDetail(player);
      const loadedForm = formFromPlayer(player);
      setForm(loadedForm);
      setInitialForm(loadedForm);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load player.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isNew) {
      void loadPlayer();
    }
  }, [isNew, playerId]);

  function updateField<K extends keyof SavePlayerRequest>(
    field: K,
    value: SavePlayerRequest[K]
  ) {
    setSaveMessage("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave() {
    const validationError = validatePlayerForm(form);
    if (validationError) {
      await alertDialog({
        title: validationError === "firstName" ? "First Name Required" : "Last Name Required",
        message: validationError === "firstName" ? "First name is required." : "Last name is required.",
        severity: "warning",
      });
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const payload = normalizePlayerForm(form);

      let saved: PlayerDetail;
      if (isNew) {
        saved = await createPlayer(payload);
      } else {
        saved = await updatePlayer(playerId as number, payload);
      }

      setInitialForm(payload);
      const message = isNew ? "Player created successfully." : "Player saved successfully.";
      if (isNew) {
        navigate(`/admin/players/${saved.playerId}`, { state: { saveMessage: message } });
      } else {
        setPlayerDetail(saved);
        setSaveMessage(message);
      }
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
      await setPlayerActive(playerDetail.playerId, !playerDetail.active);
      await loadPlayer();
    } catch (err: any) {
      await alertDialog({
        title: "Unable to Update Player",
        message: err?.response?.data?.message || "Failed to update player active status.",
        severity: "danger",
      });
    }
  }

  return {
    isNew, form, playerDetail, loading, saving, error, saveMessage,
    computedDisplayName, navigateIfConfirmed, updateField, handleSave, handleToggleActive,
  };
}
