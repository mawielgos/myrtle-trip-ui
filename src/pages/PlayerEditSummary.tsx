import type { PlayerDetail, SavePlayerRequest } from "../types/player";
import { sectionStyle } from "../styles/uiStyles";
import { formatHandicapMethod } from "../utils/handicapMethod";
import { formatPlayerValue, formatPlayerGender } from "./playerEditLogic";

type Props = {
  isNew: boolean;
  playerDetail: PlayerDetail | null;
  form: SavePlayerRequest;
  computedDisplayName: string;
};

export default function PlayerEditSummary({ isNew, playerDetail, form, computedDisplayName }: Props) {
  return (
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
                Display Name: <strong>{formatPlayerValue(computedDisplayName)}</strong>
              </div>
              <div>
                GHIN #: <strong>{formatPlayerValue(form.ghinNumber)}</strong>
              </div>
              <div>
                Gender: <strong>{formatPlayerGender(form.gender)}</strong>
              </div>
              <div>
                Email: <strong>{formatPlayerValue(form.email)}</strong>
              </div>
              <div>
                Cell: <strong>{formatPlayerValue(form.cell)}</strong>
              </div>
              <div>
                Venmo: <strong>{formatPlayerValue(form.venmoId)}</strong>
              </div>
              <div>
                Zelle: <strong>{formatPlayerValue(form.zelleId)}</strong>
              </div>
              <div>
                Handicap Method: <strong>{formatHandicapMethod(form.handicapMethod)}</strong>
              </div>
              <div>
                Status: <strong>{form.active ? "Active" : "Inactive"}</strong>
              </div>
            </div>
          </div>
  );
}
