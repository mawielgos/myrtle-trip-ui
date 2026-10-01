import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  createPlayer,
  getPlayer,
  getPlayers,
  setPlayerActive,
  updatePlayer,
} from "../api/playerApi";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import {
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  formInputStyle,
  inputStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  strongBorderColor,
  subtleBorderColor,
  successBoxStyle,
} from "../styles/uiStyles";
import type { PlayerDetail, PlayerListItem, SavePlayerRequest } from "../types/player";
import {
  HANDICAP_METHOD_DB_SCORE_HISTORY,
  HANDICAP_METHOD_GHIN,
  formatHandicapMethod,
  normalizeHandicapMethod,
} from "../utils/handicapMethod";

type PlayerEditorMode = "new" | "edit";

type PlayerEditorState = {
  mode: PlayerEditorMode;
  playerId: number | null;
};

function buildStatusBadgeStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: active ? "#edf8f0" : "#f7f7f7",
    color: active ? "#1f6b2a" : "#666",
    border: active ? "1px solid #b7d7c0" : "1px solid #d5d9de",
  };
}

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

function buildSubLabel(player: PlayerListItem): string {
  const parts: string[] = [];

  if (player.firstName || player.lastName) {
    const fullName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();
    if (fullName.length > 0 && fullName !== player.displayName) {
      parts.push(fullName);
    }
  }

  if (player.handicapMethod && player.handicapMethod.trim().length > 0) {
    parts.push(formatHandicapMethod(player.handicapMethod));
  }

  return parts.join(" • ");
}

function buildFormFromPlayer(player: PlayerDetail): SavePlayerRequest {
  return {
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
}

function buildComparableForm(form: SavePlayerRequest): SavePlayerRequest {
  return {
    ...form,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    displayName: buildDisplayName(form.firstName, form.lastName),
    ghinNumber: form.ghinNumber.trim(),
    email: form.email.trim(),
    cell: form.cell.trim(),
    venmoId: form.venmoId.trim(),
    zelleId: form.zelleId.trim(),
    handicapMethod: normalizeHandicapMethod(form.handicapMethod),
    gender: normalizeGender(form.gender),
  };
}

function hasFormChanges(form: SavePlayerRequest, initialForm: SavePlayerRequest, loading: boolean): boolean {
  if (loading) {
    return false;
  }
  return JSON.stringify(buildComparableForm(form)) !== JSON.stringify(buildComparableForm(initialForm));
}

function PlayerEditDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: PlayerEditorState;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(20, 25, 30, 0.36)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        boxSizing: "border-box",
      }}
      role="presentation"
      onMouseDown={() => void closeIfConfirmed()}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "calc(100vh - 36px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          border: `1px solid ${strongBorderColor}`,
          background: "#fff",
          boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-edit-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            padding: "16px 18px",
            borderBottom: `1px solid ${subtleBorderColor}`,
            background: "#fafafa",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 id="player-edit-dialog-title" style={{ margin: 0, fontSize: "22px", lineHeight: 1.2 }}>
              {isNew ? "Add Player" : "Edit Player"}
            </h2>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#555" }}>
              {isNew || !playerDetail
                ? "Create the player record and save."
                : `${playerDetail.active ? "Active" : "Inactive"} • GHIN ${formatValue(playerDetail.ghinNumber)}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {!isNew && playerDetail ? (
              <button
                type="button"
                style={playerDetail.active ? dangerButtonStyle : buttonStyle}
                onClick={() => void handleToggleActive()}
                disabled={saving || loading}
              >
                {playerDetail.active ? "Deactivate" : "Activate"}
              </button>
            ) : null}
            <button type="button" style={buttonStyle} onClick={() => void closeIfConfirmed()}>
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 18px", overflowY: "auto" }}>
          {loading ? <div style={sectionStyle}>Loading player...</div> : null}
          {error ? <div style={errorBoxStyle}>{error}</div> : null}

          {!loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
                gap: "16px",
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ ...sectionStyle, marginBottom: 0 }}>
                  <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Player Info</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: "12px 16px",
                    }}
                  >
                    <div>
                      <div style={labelStyle}>First Name</div>
                      <input
                        style={formInputStyle}
                        value={form.firstName}
                        onChange={(event) => updateField("firstName", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Last Name</div>
                      <input
                        style={formInputStyle}
                        value={form.lastName}
                        onChange={(event) => updateField("lastName", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Display Name</div>
                      <input
                        style={{ ...formInputStyle, background: "#f7f7f7", color: "#555" }}
                        value={computedDisplayName}
                        readOnly
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>GHIN #</div>
                      <input
                        style={formInputStyle}
                        value={form.ghinNumber}
                        onChange={(event) => updateField("ghinNumber", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Gender</div>
                      <select
                        style={formInputStyle}
                        value={normalizeGender(form.gender)}
                        onChange={(event) => updateField("gender", event.target.value)}
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
                        onChange={(event) => updateField("email", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Cell</div>
                      <input
                        style={formInputStyle}
                        value={form.cell}
                        onChange={(event) => updateField("cell", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Venmo ID</div>
                      <input
                        style={formInputStyle}
                        value={form.venmoId}
                        onChange={(event) => updateField("venmoId", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Zelle ID</div>
                      <input
                        style={formInputStyle}
                        value={form.zelleId}
                        onChange={(event) => updateField("zelleId", event.target.value)}
                      />
                    </div>

                    <div>
                      <div style={labelStyle}>Handicap Method</div>
                      <select
                        style={formInputStyle}
                        value={normalizeHandicapMethod(form.handicapMethod)}
                        onChange={(event) => updateField("handicapMethod", event.target.value)}
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
                          onChange={(event) => updateField("active", event.target.checked)}
                        />
                        Player is active
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ ...sectionStyle, marginBottom: 0 }}>
                  <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Summary</h3>
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
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "12px 18px",
            borderTop: `1px solid ${subtleBorderColor}`,
            background: "#fafafa",
          }}
        >
          <button type="button" style={buttonStyle} onClick={() => void closeIfConfirmed()} disabled={saving}>
            Done
          </button>
          <button type="button" style={primaryButtonStyle} onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Player"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlayerAdminPage() {
  const { confirmDialog } = useAppDialog();

  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [onlyActivePlayers, setOnlyActivePlayers] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [editor, setEditor] = useState<PlayerEditorState | null>(null);
  const playerListScrollRef = useRef<HTMLDivElement | null>(null);

  function restorePlayerListScroll(scrollTop: number) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (playerListScrollRef.current) {
          playerListScrollRef.current.scrollTop = scrollTop;
        }
      });
    });
  }

  async function loadPlayers(options?: { preserveStatus?: boolean; preserveScroll?: boolean }) {
    const scrollTop = options?.preserveScroll ? (playerListScrollRef.current?.scrollTop ?? 0) : 0;
    setLoading(true);
    setError("");
    if (!options?.preserveStatus) {
      setStatusMessage("");
    }
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load players.");
    } finally {
      setLoading(false);
      if (options?.preserveScroll) {
        restorePlayerListScroll(scrollTop);
      }
    }
  }

  useEffect(() => {
    void loadPlayers();
  }, []);

  async function handleToggleActive(player: PlayerListItem) {
    const action = player.active ? "deactivate" : "activate";
    const confirmed = await confirmDialog({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} Player`,
      message: `${action === "deactivate" ? "Deactivate" : "Activate"} ${player.displayName}?`,
      severity: action === "deactivate" ? "warning" : "info",
      confirmText: action === "deactivate" ? "Deactivate" : "Activate",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setStatusMessage("");
      await setPlayerActive(player.playerId, !player.active);
      await loadPlayers({ preserveStatus: true, preserveScroll: true });
      setStatusMessage(`${player.displayName} was ${player.active ? "deactivated" : "activated"}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update player active status.");
    }
  }

  async function handlePlayerSaved(message: string) {
    setEditor(null);
    setStatusMessage(message);
    await loadPlayers({ preserveStatus: true, preserveScroll: true });
  }

  const activeCount = useMemo(() => {
    let total = 0;
    for (const player of players) {
      if (player.active) {
        total += 1;
      }
    }
    return total;
  }, [players]);

  const visiblePlayers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return players.filter((player) => {
      if (onlyActivePlayers && !player.active) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const searchableText = [
        player.displayName,
        player.firstName,
        player.lastName,
        player.email,
        player.ghinNumber,
        player.cell,
        player.handicapMethod,
        player.gender,
        formatGender(player.gender),
        String(player.playerId),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [players, onlyActivePlayers, searchText]);

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Player Master"
        subtitle={`${visiblePlayers.length} showing • ${players.length} total • ${activeCount} active`}
        actions={
          <>
            <button style={buttonStyle} onClick={() => void loadPlayers()}>
              Refresh
            </button>
            <button style={primaryButtonStyle} onClick={() => setEditor({ mode: "new", playerId: null })}>
              Add Player
            </button>
          </>
        }
      />

      <div style={{ ...sectionStyle, padding: "12px", marginBottom: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) auto",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            style={inputStyle}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search players by name, gender, email, GHIN, cell, method, or ID"
          />

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#333",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={onlyActivePlayers}
              onChange={(event) => setOnlyActivePlayers(event.target.checked)}
            />
            Only Active Players
          </label>
        </div>
      </div>

      {loading ? <div style={sectionStyle}>Loading players...</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {!loading && !error && statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

      {!loading && !error ? (
        <div
          ref={playerListScrollRef}
          style={{
            display: "grid",
            gap: "12px",
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {visiblePlayers.length === 0 ? (
            <div style={sectionStyle}>
              {searchText.trim().length > 0
                ? "No players match the current search."
                : onlyActivePlayers
                  ? "No active players found."
                  : "No players found."}
            </div>
          ) : (
            visiblePlayers.map((player) => {
              const subLabel = buildSubLabel(player);

              return (
                <div
                  key={player.playerId}
                  style={{
                    ...sectionStyle,
                    marginBottom: 0,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 420px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "4px",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{player.displayName}</div>
                        <span style={buildStatusBadgeStyle(player.active)}>{player.active ? "Active" : "Inactive"}</span>
                      </div>

                      <div style={{ fontSize: "13px", color: "#666" }}>
                        {subLabel.length > 0 ? subLabel : "Player"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        style={buttonStyle}
                        onClick={() => setEditor({ mode: "edit", playerId: player.playerId })}
                      >
                        Edit
                      </button>
                      <button style={player.active ? dangerButtonStyle : buttonStyle} onClick={() => void handleToggleActive(player)}>
                        {player.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "8px 14px",
                      fontSize: "13px",
                      color: "#444",
                    }}
                  >
                    <div>
                      Player ID: <strong>{player.playerId}</strong>
                    </div>
                    <div>
                      GHIN: <strong>{formatValue(player.ghinNumber)}</strong>
                    </div>
                    <div>
                      Gender: <strong>{formatGender(player.gender)}</strong>
                    </div>
                    <div>
                      Email: <strong>{formatValue(player.email)}</strong>
                    </div>
                    <div>
                      Cell: <strong>{formatValue(player.cell)}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {editor ? (
        <PlayerEditDialog
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={(message) => handlePlayerSaved(message)}
        />
      ) : null}
    </div>
  );
}
