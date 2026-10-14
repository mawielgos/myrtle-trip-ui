import type { CSSProperties } from "react";
import {
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import type { useRoundGroupsPageData } from "./useRoundGroupsPageData";
import type { useRoundGroupsCommands } from "./useRoundGroupsCommands";
import type { useRoundGroupsInteractions } from "./useRoundGroupsInteractions";
import {
  formatIndex,
  formatParticipationStatus,
  getContinueLabel,
  getEligibleSortedTeesForPlayer,
  getTeeDisplayForPlayer,
  getTeeLabel,
  isScrambleRound,
  normalizeGender,
  sortPlayers,
  type UiPlayer,
} from "./roundGroupsLogic";

const compactSectionStyle: CSSProperties = {
  ...sectionStyle,
  overflowX: "auto",
};
const compactTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "840px",
};
const teeSelectStyle: CSSProperties = {
  minWidth: "240px",
  height: "32px",
  border: "1px solid #cfd6de",
  borderRadius: "6px",
  padding: "0 8px",
  background: "#fff",
};
const compactTeeSelectStyle: CSSProperties = { ...teeSelectStyle, minWidth: "150px" };
const assignmentButtonWrapStyle: CSSProperties = { display: "flex", gap: "6px", flexWrap: "wrap" };
const smallButtonStyle: CSSProperties = { ...buttonStyle, height: "30px", padding: "0 10px", fontSize: "13px" };
const disabledSmallButtonStyle: CSSProperties = {
  ...smallButtonStyle,
  color: "#888",
  background: "#eee",
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};
const quickTeeControlStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "10px" };
const quickTeeSelectStyle: CSSProperties = { ...teeSelectStyle, minWidth: "260px" };

type Props = {
  data: ReturnType<typeof useRoundGroupsPageData>;
  interactions: ReturnType<typeof useRoundGroupsInteractions>;
  commands: ReturnType<typeof useRoundGroupsCommands>;
  roundId?: string;
  readOnly: boolean;
  teamsStepRequired: boolean;
  continueDisabled: boolean;
  continueDisabledReason?: string;
  continueButtonStyle: CSSProperties;
  onNavigateIfClean: (path: string) => Promise<void>;
  onContinue: () => Promise<void>;
};

export default function RoundGroupsBody({
  data, interactions, commands, roundId, readOnly, teamsStepRequired,
  continueDisabled, continueDisabledReason, continueButtonStyle, onNavigateIfClean, onContinue,
}: Props) {
  const {
    groups, readiness, roundFormat, defaultRoundTeeId, menDefaultRoundTeeId,
    setMenDefaultRoundTeeId, womenDefaultRoundTeeId, setWomenDefaultRoundTeeId, teeOptions,
  } = data;
  const {
    dirty, teeTimeStart, setTeeTimeStart, teeTimeIntervalMinutes, setTeeTimeIntervalMinutes,
    groupsStartingOnTen, setGroupsStartingOnTen, unassignedPlayers, unavailablePlayers,
    hasFemalePlayers, sortedMenDefaultTeeOptions, sortedWomenDefaultTeeOptions,
    movePlayerToGroup, removePlayerFromGroup, movePlayerWithinGroup, updateGroupTeeTime,
    updateGroupStartingHole, generateTeeTimes, updatePlayerTee, applyDefaultTeesToPlayers,
  } = interactions;
  const { saving, handleParticipationChange, handleSave } = commands;
  const defaultTeeLabel = getTeeLabel(teeOptions, defaultRoundTeeId);

  function renderTeeSelector(player: UiPlayer) {
    if (readOnly) {
      return <span>{getTeeLabel(teeOptions, player.roundTeeId ?? defaultRoundTeeId)}</span>;
    }
    const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, player.gender);
    if (eligibleTees.length === 0) {
      return <span style={{ color: "#9a3412" }}>No eligible tees configured for {normalizeGender(player.gender) === "F" ? "female" : "male"} player</span>;
    }
    const selectedTeeIsEligible = player.roundTeeId == null || eligibleTees.some((tee) => tee.roundTeeId === player.roundTeeId);
    const value = selectedTeeIsEligible ? (player.roundTeeId ?? defaultRoundTeeId ?? "") : "";
    return (
      <select value={value} onChange={(event) => updatePlayerTee(player.playerId, Number(event.target.value))} style={compactTeeSelectStyle}>
        {!selectedTeeIsEligible ? <option value="">Select eligible tee</option> : null}
        {eligibleTees.map((tee) => <option key={tee.roundTeeId} value={tee.roundTeeId}>{getTeeDisplayForPlayer(tee, player.gender)}</option>)}
      </select>
    );
  }

  return (
    <>
    <section style={sectionStyle}>
      <div style={{ color: "#555" }}>
        {teamsStepRequired
          ? "Assign players to tee-sheet groups first, then continue to team assignment."
          : isScrambleRound(readiness, roundFormat)
            ? "For this format, the tee-sheet groups are also the competition teams. Use Suggest Teams to seed the scramble by current index, then manually adjust as needed."
            : "For this format, the tee-sheet groups are also the competition teams."}
      </div>
      <div style={{ color: "#555", marginTop: "8px" }}>
        Default tee: {defaultTeeLabel}. Use each player dropdown to override
        the default tee for that player.
      </div>
    
      <div style={quickTeeControlStyle}>
        <strong>
          {hasFemalePlayers ? "Men's default tee:" : "Default tee:"}
        </strong>
        <select
          value={menDefaultRoundTeeId ?? ""}
          onChange={(event) =>
            setMenDefaultRoundTeeId(
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
          style={quickTeeSelectStyle}
          disabled={readOnly || saving || teeOptions.length === 0}
        >
          <option value="">Select default tee</option>
          {sortedMenDefaultTeeOptions.map((tee) => (
            <option key={tee.roundTeeId} value={tee.roundTeeId}>
              {getTeeDisplayForPlayer(tee, "M")}
            </option>
          ))}
        </select>
    
        {hasFemalePlayers ? (
          <>
            <strong>Women's default tee:</strong>
            <select
              value={womenDefaultRoundTeeId ?? ""}
              onChange={(event) =>
                setWomenDefaultRoundTeeId(
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
                )
              }
              style={quickTeeSelectStyle}
              disabled={readOnly || saving || teeOptions.length === 0}
            >
              <option value="">Select women's default tee</option>
              {sortedWomenDefaultTeeOptions.map((tee) => (
                <option key={tee.roundTeeId} value={tee.roundTeeId}>
                  {getTeeDisplayForPlayer(tee, "F")}
                </option>
              ))}
            </select>
          </>
        ) : null}
    
        <button
          type="button"
          style={buttonStyle}
          onClick={applyDefaultTeesToPlayers}
          disabled={
            readOnly ||
            saving ||
            menDefaultRoundTeeId == null ||
            (hasFemalePlayers && womenDefaultRoundTeeId == null)
          }
        >
          {hasFemalePlayers ? "Apply Defaults" : "Apply to All Players"}
        </button>
        <span style={{ color: "#666", fontSize: "13px" }}>
          {hasFemalePlayers
            ? "Men get the men's default tee, women get the women's default tee. Individual dropdowns remain available for exceptions."
            : "Individual player tee dropdowns remain available for exceptions."}
        </span>
      </div>
    </section>
    
    <div style={{ display: "grid", gap: "16px" }}>
      <section style={compactSectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
          Unassigned Players
        </h2>
        <div
          style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}
        >
          Assign players with the group buttons. Suggested groups and tee-time
          generation only run when you click the action buttons.
        </div>
    
        {unassignedPlayers.length === 0 ? (
          <div style={{ color: "#666" }}>No unassigned players.</div>
        ) : (
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Index</th>
                <th style={thStyle}>Tee</th>
                <th style={thStyle}>Assign To</th>
              </tr>
            </thead>
            <tbody>
              {unassignedPlayers.map((player) => (
                <tr key={player.playerId}>
                  <td style={tdStyle}>
                    <strong>{player.playerName}</strong>
                  </td>
                  <td style={tdStyle}>{formatIndex(player.tripIndex)}</td>
                  <td style={tdStyle}>{renderTeeSelector(player)}</td>
                  <td style={tdStyle}>
                    <div style={assignmentButtonWrapStyle}>
                      {groups.map((group) => (
                        <button
                          key={group.groupId}
                          type="button"
                          style={
                            readOnly || group.players.length >= 4
                              ? disabledSmallButtonStyle
                              : smallButtonStyle
                          }
                          onClick={() =>
                            movePlayerToGroup(player, group.groupNumber)
                          }
                          disabled={readOnly || group.players.length >= 4}
                          title={
                            group.players.length >= 4
                              ? `Group ${group.groupNumber} is full`
                              : `Assign to Group ${group.groupNumber}`
                          }
                        >
                          Group {group.groupNumber}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={smallButtonStyle}
                        onClick={() => void handleParticipationChange(player, "NO_SHOW")}
                        disabled={readOnly || dirty}
                        title={dirty ? "Save group changes before marking no-show" : "Player did not show up for this round"}
                      >
                        No-Show
                      </button>
                      <button
                        type="button"
                        style={smallButtonStyle}
                        onClick={() => void handleParticipationChange(player, "WITHDRAWN")}
                        disabled={readOnly || dirty}
                        title={dirty ? "Save group changes before marking withdrawn" : "Player withdrew/cancelled for this round"}
                      >
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    
      {unavailablePlayers.length > 0 ? (
        <section style={compactSectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "4px" }}>Unavailable / No-Shows / Withdrawals</h2>
          <div style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}>
            These players remain on the event roster but are ignored for this round's groups, readiness, and scoring requirements.
          </div>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {unavailablePlayers.map((player) => (
                <tr key={player.playerId}>
                  <td style={tdStyle}>
                    <strong>{player.playerName}</strong>
                    <div style={{ color: "#666", fontSize: "12px" }}>
                      Index: {formatIndex(player.tripIndex ?? null)}
                    </div>
                  </td>
                  <td style={tdStyle}>{formatParticipationStatus(player.participationStatus)}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={smallButtonStyle}
                      onClick={() => void handleParticipationChange(player, "ACTIVE")}
                      disabled={readOnly || dirty}
                      title={dirty ? "Save group changes before marking active" : "Restore this player for this round"}
                    >
                      Mark Active
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    
      <section style={compactSectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: "4px" }}>Groups</h2>
            <div style={{ color: "#666", fontSize: "13px" }}>
              Compact tee-sheet grid for larger trips. Generate tee times from
              a first time and interval, then override any group individually.
            </div>
          </div>
    
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: "4px",
                fontSize: "13px",
                color: "#555",
              }}
            >
              First tee time
              <input
                type="time"
                value={teeTimeStart}
                onChange={(event) => setTeeTimeStart(event.target.value)}
                disabled={readOnly || saving}
                style={{
                  height: "30px",
                  border: "1px solid #cfd6de",
                  borderRadius: "6px",
                  padding: "0 8px",
                }}
              />
            </label>
            <label
              style={{
                display: "grid",
                gap: "4px",
                fontSize: "13px",
                color: "#555",
              }}
            >
              Interval
              <input
                type="number"
                min="1"
                value={teeTimeIntervalMinutes}
                onChange={(event) =>
                  setTeeTimeIntervalMinutes(event.target.value)
                }
                disabled={readOnly || saving}
                style={{
                  width: "80px",
                  height: "30px",
                  border: "1px solid #cfd6de",
                  borderRadius: "6px",
                  padding: "0 8px",
                }}
              />
            </label>
            <label
              style={{
                display: "grid",
                gap: "4px",
                fontSize: "13px",
                color: "#555",
              }}
            >
              Groups off #10
              <input
                type="number"
                min="0"
                max={groups.length}
                value={groupsStartingOnTen}
                onChange={(event) =>
                  setGroupsStartingOnTen(event.target.value)
                }
                disabled={readOnly || saving}
                style={{
                  width: "100px",
                  height: "30px",
                  border: "1px solid #cfd6de",
                  borderRadius: "6px",
                  padding: "0 8px",
                }}
              />
            </label>
            <button
              type="button"
              style={
                readOnly || saving
                  ? disabledSmallButtonStyle
                  : smallButtonStyle
              }
              onClick={generateTeeTimes}
              disabled={readOnly || saving}
            >
              Generate Tee Times
            </button>
          </div>
        </div>
    
        {groups.length === 0 ? (
          <div style={{ color: "#666" }}>No groups found.</div>
        ) : (
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Group</th>
                <th style={thStyle}>Tee Time</th>
                <th style={thStyle}>Start</th>
                <th style={thStyle}>Seat</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Index</th>
                <th style={thStyle}>Tee</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const sortedPlayers = sortPlayers(group.players);
                const rowCount = Math.max(1, sortedPlayers.length);
                if (sortedPlayers.length === 0) {
                  return (
                    <tr key={`${group.groupId}-empty`}>
                      <td style={tdStyle}>
                        <strong>Group {group.groupNumber}</strong>
                        <div style={{ color: "#666", fontSize: "11px" }}>
                          0/4 players
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="time"
                          value={group.teeTime ?? ""}
                          onChange={(event) =>
                            updateGroupTeeTime(
                              group.groupNumber,
                              event.target.value,
                            )
                          }
                          disabled={readOnly || saving}
                          style={{
                            height: "30px",
                            border: "1px solid #cfd6de",
                            borderRadius: "6px",
                            padding: "0 8px",
                            background: readOnly ? "#f3f4f6" : "#fff",
                          }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={group.startingHole ?? 1}
                          onChange={(event) =>
                            updateGroupStartingHole(
                              group.groupNumber,
                              Number(event.target.value),
                            )
                          }
                          disabled={readOnly || saving}
                          style={{
                            height: "30px",
                            border: "1px solid #cfd6de",
                            borderRadius: "6px",
                            padding: "0 8px",
                            background: readOnly ? "#f3f4f6" : "#fff",
                          }}
                        >
                          <option value={1}>#1</option>
                          <option value={10}>#10</option>
                        </select>
                      </td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle} colSpan={4}>
                        No players assigned.
                      </td>
                    </tr>
                  );
                }
    
                return sortedPlayers.map((player, index) => (
                  <tr key={`${group.groupId}-${player.playerId}`}>
                    {index === 0 ? (
                      <>
                        <td style={tdStyle} rowSpan={rowCount}>
                          <strong>Group {group.groupNumber}</strong>
                          <div style={{ color: "#666", fontSize: "11px" }}>
                            {group.players.length}/4 players
                          </div>
                        </td>
                        <td style={tdStyle} rowSpan={rowCount}>
                          <input
                            type="time"
                            value={group.teeTime ?? ""}
                            onChange={(event) =>
                              updateGroupTeeTime(
                                group.groupNumber,
                                event.target.value,
                              )
                            }
                            disabled={readOnly || saving}
                            style={{
                              height: "30px",
                              border: "1px solid #cfd6de",
                              borderRadius: "6px",
                              padding: "0 8px",
                              background: readOnly ? "#f3f4f6" : "#fff",
                            }}
                          />
                        </td>
                        <td style={tdStyle} rowSpan={rowCount}>
                          <select
                            value={group.startingHole ?? 1}
                            onChange={(event) =>
                              updateGroupStartingHole(
                                group.groupNumber,
                                Number(event.target.value),
                              )
                            }
                            disabled={readOnly || saving}
                            style={{
                              height: "30px",
                              border: "1px solid #cfd6de",
                              borderRadius: "6px",
                              padding: "0 8px",
                              background: readOnly ? "#f3f4f6" : "#fff",
                            }}
                          >
                            <option value={1}>#1</option>
                            <option value={10}>#10</option>
                          </select>
                        </td>
                      </>
                    ) : null}
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>
                      <strong>{player.playerName}</strong>
                    </td>
                    <td style={tdStyle}>{formatIndex(player.tripIndex)}</td>
                    <td style={tdStyle}>{renderTeeSelector(player)}</td>
                    <td style={tdStyle}>
                      <div style={assignmentButtonWrapStyle}>
                        <button
                          type="button"
                          style={
                            readOnly || index === 0
                              ? disabledSmallButtonStyle
                              : smallButtonStyle
                          }
                          onClick={() =>
                            movePlayerWithinGroup(
                              group.groupNumber,
                              player.playerId,
                              "up",
                            )
                          }
                          disabled={readOnly || index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          style={
                            readOnly || index === sortedPlayers.length - 1
                              ? disabledSmallButtonStyle
                              : smallButtonStyle
                          }
                          onClick={() =>
                            movePlayerWithinGroup(
                              group.groupNumber,
                              player.playerId,
                              "down",
                            )
                          }
                          disabled={
                            readOnly || index === sortedPlayers.length - 1
                          }
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          style={
                            readOnly
                              ? disabledSmallButtonStyle
                              : smallButtonStyle
                          }
                          onClick={() =>
                            removePlayerFromGroup(
                              player.playerId,
                              group.groupNumber,
                            )
                          }
                          disabled={readOnly}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
    
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {!readOnly ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
            >
              {saving ? "Saving..." : dirty ? "Save Groups" : "Saved"}
            </button>
          ) : null}
    
          <button
            type="button"
            style={buttonStyle}
            onClick={() => void onNavigateIfClean(`/rounds/${roundId}/tee-sheet`)}
            disabled={saving}
          >
            Tee Sheet
          </button>
    
          <button
            type="button"
            style={continueButtonStyle}
            onClick={() => void onContinue()}
            disabled={continueDisabled}
            title={continueDisabledReason}
          >
            {saving
              ? "Saving..."
              : readOnly
                ? teamsStepRequired
                  ? "View Teams"
                  : "View Scores"
                : getContinueLabel(readiness, roundFormat)}
          </button>
        </div>
      </section>
    </div>
    </>
  );
}
