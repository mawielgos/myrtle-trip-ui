import { useState } from "react";
import { saveTripPlayerFrozenIndex } from "../../api/tripPlayerHandicapApi";
import { updateTripPlayerParticipation } from "../../api/tripApi";
import {
  buttonStyle,
  formInputStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import type { TripPlayer } from "../../types/trip";
import { formatHandicapIndex } from "./tripDetailUtils";
import {
  HANDICAP_METHOD_FROZEN_GHIN_INDEX,
  formatHandicapMethod,
  normalizeHandicapMethod,
} from "../../utils/handicapMethod";

interface TripRosterPanelProps {
  tripId: number;
  players: TripPlayer[];
  activePlayers: TripPlayer[];
  unresolvedGhinFixCount: number;
  tripLocked?: boolean;
  handicapsEnabled?: boolean;
  handicapMethod?: string | null;
  onNavigate: (path: string) => void;
  onImportPlayers?: () => void;
  onPlayerHandicapSaved?: () => Promise<void> | void;
  onPlayersUpdated?: (players: TripPlayer[]) => void;
  compact?: boolean;
  participationLocked?: boolean;
  participationLockReason?: string | null;
  showPlayerMaintenanceButton?: boolean;
}

function formatIndexInput(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "";
  }

  return String(value);
}

function parseIndexInput(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("Frozen index must be a valid number.");
  }

  if (parsed < -10 || parsed > 54) {
    throw new Error("Frozen index must be between -10.0 and 54.0.");
  }

  return Math.round(parsed * 10) / 10;
}

function formatParticipationStatus(status?: string | null): string {
  if (status === "WITHDRAWN") return "Withdrawn";
  if (status === "NO_SHOW") return "No-Show";
  return "Active";
}

function isEventUnavailable(player: TripPlayer): boolean {
  return (player.participationStatus ?? "ACTIVE") !== "ACTIVE";
}

function readApiError(err: any, fallback: string): string {
  const apiMessage =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  return typeof apiMessage === "string" ? apiMessage : fallback;
}

export default function TripRosterPanel({
  tripId,
  players,
  activePlayers,
  unresolvedGhinFixCount,
  tripLocked = false,
  handicapsEnabled = true,
  handicapMethod = null,
  onNavigate,
  onImportPlayers,
  onPlayerHandicapSaved,
  onPlayersUpdated,
  compact = false,
  participationLocked = false,
  participationLockReason = null,
  showPlayerMaintenanceButton = true,
}: TripRosterPanelProps) {
  const normalizedHandicapMethod = normalizeHandicapMethod(handicapMethod);
  const usesFrozenIndexMethod =
    handicapsEnabled === true && normalizedHandicapMethod === HANDICAP_METHOD_FROZEN_GHIN_INDEX;

  const [draftFrozenIndexes, setDraftFrozenIndexes] = useState<Record<number, string>>({});
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);
  const [savingParticipationPlayerId, setSavingParticipationPlayerId] = useState<number | null>(null);
  const [handicapMessage, setHandicapMessage] = useState<string | null>(null);
  const [handicapError, setHandicapError] = useState<string | null>(null);


  async function handleParticipationChange(
    player: TripPlayer,
    participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN"
  ): Promise<void> {
    if (participationLocked) {
      setHandicapError(participationLockReason ?? "Event player status is locked.");
      return;
    }

    if (participationStatus !== "ACTIVE") {
      const confirmed = window.confirm(
        `${player.displayName} will remain on the event roster, but will be marked ${
          participationStatus === "WITHDRAWN" ? "Withdrawn" : "No-Show"
        } for event setup and any unfinalized rounds. Continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setSavingParticipationPlayerId(player.playerId);
      setHandicapError(null);
      setHandicapMessage(null);

      const updatedPlayers = await updateTripPlayerParticipation(
        tripId,
        player.playerId,
        participationStatus
      );
      onPlayersUpdated?.(updatedPlayers);

      setHandicapMessage(
        participationStatus === "ACTIVE"
          ? `${player.displayName} marked Active for this event.`
          : `${player.displayName} marked ${participationStatus === "WITHDRAWN" ? "Withdrawn" : "No-Show"} for this event.`
      );
    } catch (err: any) {
      console.error("Failed to update event participation", err);
      setHandicapError(readApiError(err, "Unable to update event participation."));
    } finally {
      setSavingParticipationPlayerId(null);
    }
  }

  async function handleSaveFrozenIndex(player: TripPlayer): Promise<void> {
    try {
      setSavingPlayerId(player.playerId);
      setHandicapError(null);
      setHandicapMessage(null);

      const draftValue =
        draftFrozenIndexes[player.playerId] ?? formatIndexInput(player.frozenHandicapIndex);

      const parsedIndex = parseIndexInput(draftValue);

      await saveTripPlayerFrozenIndex(tripId, player.playerId, parsedIndex);
      await onPlayerHandicapSaved?.();

      setDraftFrozenIndexes((current) => {
        const next = { ...current };
        delete next[player.playerId];
        return next;
      });

      setHandicapMessage(`Frozen index saved for ${player.displayName}.`);
    } catch (err: any) {
      console.error("Failed to save frozen handicap index", err);
      setHandicapError(readApiError(err, "Unable to save frozen handicap index."));
    } finally {
      setSavingPlayerId(null);
    }
  }

  return (
    <div style={sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Handicapping</h2>
          <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
            Active Players: <strong>{activePlayers.length}</strong> / {players.length}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "8px",
            width: "100%",
            maxWidth: "430px",
          }}
        >
          <button
            type="button"
            style={{ ...buttonStyle, width: "100%" }}
            onClick={() => onNavigate(`/trips/${tripId}/strokes-per-day`)}
          >
            Daily Handicaps
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, width: "100%" }}
            onClick={() => onNavigate(`/trips/${tripId}/handicap-cards`)}
          >
            Handicap Cards
          </button>
          {tripLocked ? (
            <button
              type="button"
              style={{ ...buttonStyle, width: "100%", opacity: 0.55, cursor: "not-allowed" }}
              disabled
              title="Manual Score History is locked after the event is complete."
            >
              Manual Score History
            </button>
          ) : (
            <button
              type="button"
              style={{ ...buttonStyle, width: "100%" }}
              onClick={() => onNavigate(`/trips/${tripId}/manual-score-history`)}
            >
              Manual Score History
            </button>
          )}
          <button
            type="button"
            style={{ ...buttonStyle, width: "100%" }}
            onClick={() => onNavigate(`/trips/${tripId}/ghin-fixes`)}
          >
            {unresolvedGhinFixCount > 0
              ? `GHIN Fixes (${unresolvedGhinFixCount})`
              : "GHIN Fixes"}
          </button>
          {showPlayerMaintenanceButton ? (
            <button
              type="button"
              style={{ ...buttonStyle, width: "100%" }}
              onClick={() => onNavigate(`/trips/${tripId}/players`)}
            >
              Event Player Maintenance
            </button>
          ) : null}
          {onImportPlayers ? (
            <button
              type="button"
              style={{ ...buttonStyle, width: "100%" }}
              onClick={onImportPlayers}
              disabled={tripLocked}
              title={tripLocked ? "Player imports are locked after the event is complete." : "Import players from a CSV file."}
            >
              Import Players
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          border: unresolvedGhinFixCount > 0 ? "1px solid #e5d7a8" : "1px solid #d8e8dc",
          background: unresolvedGhinFixCount > 0 ? "#fff8e1" : "#edf8f0",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "12px",
          fontSize: "14px",
          color: unresolvedGhinFixCount > 0 ? "#6f5200" : "#1f6b2a",
        }}
      >
        GHIN Fixes: <strong>{unresolvedGhinFixCount}</strong>{" "}
        {unresolvedGhinFixCount > 0 ? "unresolved" : "unresolved — all manual fixes are complete"}
      </div>

      {usesFrozenIndexMethod ? (
        <div
          style={{
            border: tripLocked ? "1px solid #e0d4aa" : "1px solid #d6e4ff",
            background: tripLocked ? "#fffaf0" : "#f8fbff",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
            fontSize: "13px",
            color: tripLocked ? "#6f5200" : "#23436c",
            lineHeight: 1.4,
          }}
        >
          {tripLocked
            ? "Frozen indexes are locked because this event is complete. Enter correction mode to modify handicap indexes."
            : "Frozen Index is event-specific. Use it for imported golfers, non-GHIN golfers, or manually supplied starting indexes before the event is started."}
        </div>
      ) : (
        <div
          style={{
            border: "1px solid #d6e4ff",
            background: "#f8fbff",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#23436c",
            lineHeight: 1.4,
          }}
        >
          Frozen Index entry is not used for this event. Handicap method:{" "}
          <strong>{handicapsEnabled ? formatHandicapMethod(normalizedHandicapMethod) : "Handicaps disabled"}</strong>.
          The roster below shows each player's current event index.
        </div>
      )}


      {participationLocked ? (
        <div
          style={{
            border: "1px solid #e0d4aa",
            background: "#fffaf0",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#6f5200",
            lineHeight: 1.4,
          }}
        >
          {participationLockReason ?? "Event player status is locked."}
        </div>
      ) : null}

      {handicapError ? (
        <div
          style={{
            border: "1px solid #f2c4c4",
            background: "#fff4f4",
            color: "#9f1d1d",
            borderRadius: "8px",
            padding: "8px 10px",
            marginBottom: "10px",
            fontSize: "13px",
          }}
        >
          {handicapError}
        </div>
      ) : null}

      {handicapMessage ? (
        <div
          style={{
            border: "1px solid #b8e2c1",
            background: "#f0fff3",
            color: "#1f6b2a",
            borderRadius: "8px",
            padding: "8px 10px",
            marginBottom: "10px",
            fontSize: "13px",
          }}
        >
          {handicapMessage}
        </div>
      ) : null}

      {players.length === 0 ? (
        <div style={{ color: "#555" }}>No players assigned to this event.</div>
      ) : compact ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflowY: "auto",
            overflowX: "hidden",
            background: "#fff",
            maxHeight: "430px",
          }}
        >
          {players.map((player, index) => (
            <div
              key={player.playerId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "10px",
                alignItems: "center",
                padding: "8px 10px",
                borderTop: index === 0 ? "none" : "1px solid #edf0f2",
                background: player.active === false ? "#fafafa" : "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {player.displayName}
                </div>
                <div style={{ color: "#666", fontSize: "12px", marginTop: "2px" }}>
                  Index: <strong>{formatHandicapIndex(player.handicapIndex)}</strong>
                  {player.frozenHandicapIndex != null && usesFrozenIndexMethod ? (
                    <> · Frozen: <strong>{formatHandicapIndex(player.frozenHandicapIndex)}</strong></>
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  border: isEventUnavailable(player) ? "1px solid #f0c36d" : "1px solid #b8e2c1",
                  background: isEventUnavailable(player) ? "#fff8e1" : "#edf8f0",
                  color: isEventUnavailable(player) ? "#8a5a00" : "#1f6b2a",
                  borderRadius: "999px",
                  padding: "3px 8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {player.active === false ? "Inactive" : formatParticipationStatus(player.participationStatus)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "8px",
            maxHeight: "620px",
            overflowY: "auto",
            paddingRight: "6px",
          }}
        >
          {players.map((player) => {
            const draftValue =
              draftFrozenIndexes[player.playerId] ?? formatIndexInput(player.frozenHandicapIndex);
            const currentValue = formatIndexInput(player.frozenHandicapIndex);
            const hasDraftChange = draftValue !== currentValue;

            return (
              <div
                key={player.playerId}
                style={{
                  border: "1px solid #ececec",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  background: player.active === false ? "#fafafa" : "#fff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: usesFrozenIndexMethod
                      ? "minmax(190px, 1.2fr) minmax(220px, 1fr) minmax(260px, 1.6fr) auto"
                      : "minmax(190px, 1.2fr) minmax(220px, 1fr) auto",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {player.displayName}
                    </div>
                    <div style={{ color: "#666", fontSize: "12px", marginTop: "2px" }}>
                      Index: <strong>{formatHandicapIndex(player.handicapIndex)}</strong>
                      {player.unavailableRoundCount ? (
                        <> · Unavailable in {player.unavailableRoundCount} round{player.unavailableRoundCount === 1 ? "" : "s"}</>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {isEventUnavailable(player) ? (
                      <button
                        type="button"
                        style={{ ...buttonStyle, padding: "4px 8px", fontSize: "12px" }}
                        disabled={tripLocked || participationLocked || savingParticipationPlayerId === player.playerId}
                        title={participationLocked ? participationLockReason ?? "Event player status is locked." : undefined}
                        onClick={() => void handleParticipationChange(player, "ACTIVE")}
                      >
                        Mark Active
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={{ ...buttonStyle, padding: "4px 8px", fontSize: "12px" }}
                          disabled={tripLocked || participationLocked || savingParticipationPlayerId === player.playerId}
                          title={participationLocked ? participationLockReason ?? "Event player status is locked." : undefined}
                          onClick={() => void handleParticipationChange(player, "WITHDRAWN")}
                        >
                          Mark Withdrawal
                        </button>
                        <button
                          type="button"
                          style={{ ...buttonStyle, padding: "4px 8px", fontSize: "12px" }}
                          disabled={tripLocked || participationLocked || savingParticipationPlayerId === player.playerId}
                          title={participationLocked ? participationLockReason ?? "Event player status is locked." : undefined}
                          onClick={() => void handleParticipationChange(player, "NO_SHOW")}
                        >
                          Mark No-Show
                        </button>
                      </>
                    )}
                    {savingParticipationPlayerId === player.playerId ? (
                      <span style={{ color: "#666", fontSize: "12px" }}>Saving...</span>
                    ) : null}
                  </div>

                  {usesFrozenIndexMethod ? (
                    tripLocked ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          color: "#333",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>Frozen Index</span>
                        <strong>{player.frozenHandicapIndex == null ? "Not set" : formatHandicapIndex(player.frozenHandicapIndex)}</strong>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "92px minmax(90px, 1fr) 76px",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <label style={{ fontWeight: 700, color: "#333", fontSize: "13px" }}>
                          Frozen Index
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftValue}
                          onChange={(event) =>
                            setDraftFrozenIndexes((current) => ({
                              ...current,
                              [player.playerId]: event.target.value,
                            }))
                          }
                          style={{ ...formInputStyle, height: "32px" }}
                          disabled={savingPlayerId === player.playerId}
                          placeholder="Index"
                        />
                        <button
                          type="button"
                          style={{
                            ...primaryButtonStyle,
                            height: "32px",
                            padding: "4px 8px",
                            opacity: savingPlayerId === player.playerId || !hasDraftChange ? 0.55 : 1,
                            cursor: savingPlayerId === player.playerId || !hasDraftChange ? "not-allowed" : "pointer",
                          }}
                          disabled={savingPlayerId === player.playerId || !hasDraftChange}
                          onClick={() => void handleSaveFrozenIndex(player)}
                        >
                          {savingPlayerId === player.playerId ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )
                  ) : null}

                  <div
                    style={{
                      justifySelf: "end",
                      border: isEventUnavailable(player) ? "1px solid #f0c36d" : "1px solid #b8e2c1",
                      background: isEventUnavailable(player) ? "#fff8e1" : "#edf8f0",
                      color: isEventUnavailable(player) ? "#8a5a00" : "#1f6b2a",
                      borderRadius: "999px",
                      padding: "3px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.active === false ? "Inactive" : formatParticipationStatus(player.participationStatus)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
   </div>
  );
}
