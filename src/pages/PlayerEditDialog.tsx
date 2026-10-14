import { usePlayerEditor } from "./usePlayerEditor";
import type { PlayerEditorState } from "./usePlayerEditor";
import { buttonStyle, dangerButtonStyle, errorBoxStyle, formInputStyle, labelStyle, primaryButtonStyle, sectionStyle, strongBorderColor, subtleBorderColor } from "../styles/uiStyles";
import { formatValue, formatGender, normalizeGender } from "./playerAdminLogic";
import { HANDICAP_METHOD_DB_SCORE_HISTORY, HANDICAP_METHOD_GHIN, formatHandicapMethod, normalizeHandicapMethod } from "../utils/handicapMethod";

export default function PlayerEditDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: PlayerEditorState;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const { isNew, form, playerDetail, loading, saving, error, computedDisplayName,
    updateField, closeIfConfirmed, handleSave, handleToggleActive } = usePlayerEditor(editor, onClose, onSaved);

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

