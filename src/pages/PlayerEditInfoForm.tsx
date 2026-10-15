import type { SavePlayerRequest } from "../types/player";
import { buttonStyle, formInputStyle, labelStyle, primaryButtonStyle, sectionStyle } from "../styles/uiStyles";
import { normalizePlayerGender } from "./playerEditLogic";
import { HANDICAP_METHOD_DB_SCORE_HISTORY, HANDICAP_METHOD_GHIN, normalizeHandicapMethod } from "../utils/handicapMethod";

type Props = {
  form: SavePlayerRequest;
  computedDisplayName: string;
  saving: boolean;
  updateField: <K extends keyof SavePlayerRequest>(field: K, value: SavePlayerRequest[K]) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function PlayerEditInfoForm({ form, computedDisplayName, saving, updateField, onSave, onCancel }: Props) {
  return (
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
                  value={normalizePlayerGender(form.gender)}
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
              <button style={primaryButtonStyle} onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Player"}
              </button>
              <button style={buttonStyle} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
  );
}
