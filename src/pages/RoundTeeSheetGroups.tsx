import type { CSSProperties } from "react";
import { sectionStyle } from "../styles/uiStyles";
import { formatHandicap, formatStartingHole, formatTeeTime } from "./roundTeeSheetLogic";
import type { useRoundTeeSheetController } from "./useRoundTeeSheetController";

type TeeSheetState = ReturnType<typeof useRoundTeeSheetController>;
type Props = Pick<TeeSheetState, "groups" | "playersById" | "teeSheetStartTypeMessage">;

const groupGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "14px",
};

const groupCardStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
};

const startTypeBannerStyle: CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  background: "#eff6ff",
  padding: "10px 12px",
  marginBottom: "14px",
  color: "#1e3a8a",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const startTypeLabelStyle: CSSProperties = {
  fontWeight: 700,
};

const startTypeDescriptionStyle: CSSProperties = {
  fontSize: "13px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #d5d9de",
  padding: "6px 4px",
  fontSize: "13px",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #edf0f2",
  padding: "6px 4px",
  fontSize: "13px",
};

/** Displays the tee sheet's group cards and handicap columns. */
export default function RoundTeeSheetGroups({ groups, playersById, teeSheetStartTypeMessage }: Props) {
  return (
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Groups</h2>
        <div style={startTypeBannerStyle}>
          <span style={startTypeLabelStyle}>{teeSheetStartTypeMessage.label}</span>
          <span style={startTypeDescriptionStyle}>{teeSheetStartTypeMessage.description}</span>
        </div>
        {groups.length === 0 ? (
          <div style={{ color: "#666" }}>No groups have been created for this round.</div>
        ) : (
          <div style={groupGridStyle}>
            {groups.map((group) => (
              <div key={group.groupId} style={groupCardStyle} className="tee-sheet-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <strong>Group {group.groupNumber}</strong>
                  <strong>{formatTeeTime(group.teeTime)} • {formatStartingHole(group.startingHole)}</strong>
                </div>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Player</th>
                      <th style={thStyle}>Tee</th>
                      <th style={thStyle}>CH</th>
                      <th style={thStyle}>PH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.players ?? []).map((groupPlayer) => {
                      const player = playersById.get(groupPlayer.playerId);
                      return (
                        <tr key={groupPlayer.playerId}>
                          <td style={tdStyle}>{groupPlayer.playerName}</td>
                          <td style={tdStyle}>{player?.roundTeeName ?? "—"}</td>
                          <td style={tdStyle}>{formatHandicap(player?.courseHandicap)}</td>
                          <td style={tdStyle}>{formatHandicap(player?.playingHandicap)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
  );
}
