import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createPlayer,
  getPlayer,
  setPlayerActive,
  updatePlayer,
} from "../api/playerApi";
import {
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  formInputStyle,
  successBoxStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import type { PlayerDetail, SavePlayerRequest } from "../types/player";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import {
  HANDICAP_METHOD_DB_SCORE_HISTORY,
  HANDICAP_METHOD_GHIN,
  formatHandicapMethod,
  normalizeHandicapMethod,
} from "../utils/handicapMethod";

function emptyForm(): SavePlayerRequest {
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    ghinNumber: "",
    active: true,
    email: "",
    cell: "",
    venmoId: "",
    zelleId: "",
    handicapMethod: "",
    gender: "M",
  };
}

function formatValue(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "—";
  }
  return value;
}

function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function normalizeGender(value: string | null | undefined): string {
  return value === "F" ? "F" : "M";
}

function formatGender(value: string | null | undefined): string {
  return normalizeGender(value) === "F" ? "Female" : "Male";
}

export default function PlayerEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alertDialog } = useAppDialog();
  const params = useParams();
  const playerIdParam = params.playerId;
  const isNew = !playerIdParam;
  const playerId = playerIdParam ? Number(playerIdParam) : null;

  const [form, setForm] = useState<SavePlayerRequest>(emptyForm());
  const [initialForm, setInitialForm] = useState<SavePlayerRequest>(emptyForm());
  const [playerDetail, setPlayerDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const computedDisplayName = useMemo(() => {
    return buildDisplayName(form.firstName, form.lastName);
  }, [form.firstName, form.lastName]);


  const comparableForm = useMemo(() => {
    return {
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
  }, [computedDisplayName, form]);

  const initialComparableForm = useMemo(() => {
    return {
      ...initialForm,
      firstName: initialForm.firstName.trim(),
      lastName: initialForm.lastName.trim(),
      displayName: buildDisplayName(initialForm.firstName, initialForm.lastName),
      ghinNumber: initialForm.ghinNumber.trim(),
      email: initialForm.email.trim(),
      cell: initialForm.cell.trim(),
      venmoId: initialForm.venmoId.trim(),
      zelleId: initialForm.zelleId.trim(),
      handicapMethod: normalizeHandicapMethod(initialForm.handicapMethod),
      gender: normalizeGender(initialForm.gender),
    };
  }, [initialForm]);

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
      const loadedForm: SavePlayerRequest = {
        firstName: player.firstName ?? "",
        lastName: player.lastName ?? "",
        displayName: buildDisplayName(player.firstName ?? "", player.lastName ?? ""),
        ghinNumber: player.ghinNumber ?? "",
        active: player.active ?? true,
        email: player.email ?? "",
        cell: player.cell ?? "",
        venmoId: player.venmoId ?? "",
        zelleId: player.zelleId ?? "",
        handicapMethod: normalizeHandicapMethod(player.handicapMethod),
        gender: normalizeGender(player.gender),
      };
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
    setSaveMessage("");

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

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p>Loading player...</p>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title={isNew ? "Add Player" : "Edit Player"}
        subtitle={
          isNew || !playerDetail
            ? "Create the player record and save."
            : `${playerDetail.active ? "Active" : "Inactive"} • GHIN ${formatValue(playerDetail.ghinNumber)}`
        }
        actions={
          <>
            <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/players")}>
              Player Master
            </button>
            {!isNew && playerDetail ? (
              <button
                style={playerDetail.active ? dangerButtonStyle : buttonStyle}
                onClick={() => void handleToggleActive()}
              >
                {playerDetail.active ? "Deactivate" : "Activate"}
              </button>
            ) : null}
          </>
        }
      />

      {error && <div style={errorBoxStyle}>{error}</div>}
      {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...sectionStyle, marginBottom: 0 }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Player Info</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px 16px",
              }}
            >
              <div>
                <div style={labelStyle}>First Name</div>
                <input
                  style={formInputStyle}
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Last Name</div>
                <input
                  style={formInputStyle}
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Display Name</div>
                <input
                  style={{
                    ...formInputStyle,
                    background: "#f7f7f7",
                    color: "#555",
                  }}
                  value={computedDisplayName}
                  readOnly
                />
              </div>

              <div>
                <div style={labelStyle}>GHIN #</div>
                <input
                  style={formInputStyle}
                  value={form.ghinNumber}
                  onChange={(e) => updateField("ghinNumber", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Gender</div>
                <select
                  style={formInputStyle}
                  value={normalizeGender(form.gender)}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>

              <div>
                <div style={labelStyle}>Email</div>
                <input
                  style={formInputStyle}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Cell</div>
                <input
                  style={formInputStyle}
                  value={form.cell}
                  onChange={(e) => updateField("cell", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Venmo ID</div>
                <input
                  style={formInputStyle}
                  value={form.venmoId}
                  onChange={(e) => updateField("venmoId", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Zelle ID</div>
                <input
                  style={formInputStyle}
                  value={form.zelleId}
                  onChange={(e) => updateField("zelleId", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Handicap Method</div>
                <select
                  style={formInputStyle}
                  value={normalizeHandicapMethod(form.handicapMethod)}
                  onChange={(e) => updateField("handicapMethod", e.target.value)}
                >
                  <option value="">Select handicap method</option>
                  <option value={HANDICAP_METHOD_GHIN}>GHIN</option>
                  <option value={HANDICAP_METHOD_DB_SCORE_HISTORY}>DB Score History</option>
                </select>
              </div>

              <div>
                <div style={labelStyle}>Active</div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: "36px",
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateField("active", e.target.checked)}
                  />
                  Player is active
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <button style={primaryButtonStyle} onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save Player"}
              </button>
              <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/players")}>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ ...sectionStyle, marginBottom: 0 }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Summary</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "10px",
                fontSize: "14px",
                color: "#444",
              }}
            >
              {!isNew && playerDetail ? (
                <div>
                  Player ID: <strong>{playerDetail.playerId}</strong>
                </div>
              ) : null}
              <div>
                Display Name: <strong>{formatValue(computedDisplayName)}</strong>
              </div>
              <div>
                GHIN #: <strong>{formatValue(form.ghinNumber)}</strong>
              </div>
              <div>
                Gender: <strong>{formatGender(form.gender)}</strong>
              </div>
              <div>
                Email: <strong>{formatValue(form.email)}</strong>
              </div>
              <div>
                Cell: <strong>{formatValue(form.cell)}</strong>
              </div>
              <div>
                Venmo: <strong>{formatValue(form.venmoId)}</strong>
              </div>
              <div>
                Zelle: <strong>{formatValue(form.zelleId)}</strong>
              </div>
              <div>
                Handicap Method: <strong>{formatHandicapMethod(form.handicapMethod)}</strong>
              </div>
              <div>
                Status: <strong>{form.active ? "Active" : "Inactive"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}