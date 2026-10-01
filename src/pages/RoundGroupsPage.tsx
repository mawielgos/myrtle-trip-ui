import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveRoundGroups } from "../api/roundGroupApi";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import { setAlternateTee } from "../api/roundApi";
import type {
  RoundGroupPageResponse,
  RoundGroupSaveRequest,
  RoundPlayerStatusResponse,
  RoundSetupStatusResponse,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";

type UiPlayer = {
  scorecardId: number;
  playerId: number;
  playerName: string;
  seatOrder: number | null;
  useAlternateTee: boolean;
};

type UiGroup = {
  groupId: number;
  groupNumber: number;
  players: UiPlayer[];
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 1.4fr)",
  gap: "20px",
  alignItems: "start",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const smallButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: "30px",
  padding: "0 10px",
  fontSize: "13px",
};

const disabledSmallButtonStyle: React.CSSProperties = {
  ...smallButtonStyle,
  color: "#888",
  background: "#eee",
  border: "1px solid #ccc",
  cursor: "not-allowed",
};

function sortPlayers(players: UiPlayer[]): UiPlayer[] {
  return [...players].sort((a, b) => {
    const aOrder = a.seatOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.seatOrder ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.playerName.localeCompare(b.playerName);
  });
}

function normalizeGroups(
  response: RoundGroupPageResponse,
  roundPlayers: RoundPlayerStatusResponse[]
): UiGroup[] {
  const playerById = new Map<number, RoundPlayerStatusResponse>();
  roundPlayers.forEach((player) => {
    playerById.set(player.playerId, player);
  });

  return (response.groups ?? [])
    .map((group) => ({
      groupId: group.groupId,
      groupNumber: group.groupNumber,
      players: sortPlayers(
        (group.players ?? []).map((player) => {
          const roundPlayer = playerById.get(player.playerId);

          return {
            scorecardId: roundPlayer?.scorecardId ?? 0,
            playerId: player.playerId,
            playerName: player.playerName,
            seatOrder: player.seatOrder ?? null,
            useAlternateTee: roundPlayer?.useAlternateTee ?? false,
          };
        })
      ),
    }))
    .sort((a, b) => a.groupNumber - b.groupNumber);
}

function buildUnassignedPlayers(
  roundPlayers: RoundPlayerStatusResponse[],
  groups: UiGroup[]
): UiPlayer[] {
  const assignedIds = new Set(
    groups.flatMap((group) => group.players.map((player) => player.playerId))
  );

  return roundPlayers
    .filter((player) => !assignedIds.has(player.playerId))
    .map((player) => ({
      scorecardId: player.scorecardId,
      playerId: player.playerId,
      playerName: player.playerName,
      seatOrder: null,
      useAlternateTee: player.useAlternateTee ?? false,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function isTwoManFormat(format?: string | null): boolean {
  return format === "TWO_MAN_LOW_NET";
}

function getContinueLabel(format?: string | null): string {
  return isTwoManFormat(format) ? "Continue to Teams" : "Continue to Scoring";
}

function getBackendErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  const responseData = err.response?.data;

  if (typeof responseData === "string" && responseData.trim().length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData &&
    typeof responseData.message === "string" &&
    responseData.message.trim().length > 0
  ) {
    return responseData.message;
  }

  const status = err.response?.status;

  if (status === 409) {
    return "The round setup conflicts with the requested tee change.";
  }

  if (status === 400) {
    return "The request was rejected by the server.";
  }

  return fallback;
}

export default function RoundGroupsPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [allRoundPlayers, setAllRoundPlayers] = useState<RoundPlayerStatusResponse[]>([]);
  const [originalAlternateTeeByScorecardId, setOriginalAlternateTeeByScorecardId] =
    useState<Record<number, boolean>>({});
  const [roundFormat, setRoundFormat] = useState<string | null>(null);
  const [alternateTeeName, setAlternateTeeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setDirty(false);

        const response: RoundSetupStatusResponse = await getRoundSetupStatus(Number(roundId));
        const roundPlayers = response.round.players ?? [];

        setGroups(normalizeGroups(response.groups, roundPlayers));
        setAllRoundPlayers(roundPlayers);
        setRoundFormat(response.round.format ?? null);
        setAlternateTeeName(response.round.alternateTeeName ?? null);

        const originalMap: Record<number, boolean> = {};
        roundPlayers.forEach((player) => {
          originalMap[player.scorecardId] = player.useAlternateTee ?? false;
        });
        setOriginalAlternateTeeByScorecardId(originalMap);
      } catch (err) {
        setError(getBackendErrorMessage(err, "Failed to load round groups."));
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const unassignedPlayers = useMemo(() => {
    return buildUnassignedPlayers(allRoundPlayers, groups);
  }, [allRoundPlayers, groups]);

  const totalAssignedPlayers = useMemo(() => {
    return groups.reduce((sum, group) => sum + group.players.length, 0);
  }, [groups]);

  const totalPlayers = allRoundPlayers.length;
  const teamsStepRequired = isTwoManFormat(roundFormat);
  const hasAlternateTee = Boolean(alternateTeeName);

  function markDirty(): void {
    setDirty(true);
    setSuccessMessage(null);
    setError(null);
  }

  function replacePlayerEverywhere(
    playerId: number,
    updater: (player: UiPlayer) => UiPlayer
  ): void {
    setGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        players: group.players.map((player) =>
          player.playerId === playerId ? updater(player) : player
        ),
      }))
    );

    setAllRoundPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.playerId === playerId
          ? {
              ...player,
              useAlternateTee: updater({
                scorecardId: player.scorecardId,
                playerId: player.playerId,
                playerName: player.playerName,
                seatOrder: null,
                useAlternateTee: player.useAlternateTee ?? false,
              }).useAlternateTee,
            }
          : player
      )
    );
  }

  function movePlayerToGroup(player: UiPlayer, targetGroupNumber: number): void {
    markDirty();

    setGroups((currentGroups) => {
      const targetGroup = currentGroups.find((group) => group.groupNumber === targetGroupNumber);
      if (!targetGroup) {
        return currentGroups;
      }

      if (targetGroup.players.length >= 4) {
        setError(`Group ${targetGroupNumber} already has 4 players.`);
        return currentGroups;
      }

      const removedFromGroups = currentGroups.map((group) => ({
        ...group,
        players: group.players.filter((p) => p.playerId !== player.playerId),
      }));

      return removedFromGroups.map((group) => {
        if (group.groupNumber !== targetGroupNumber) {
          return {
            ...group,
            players: sortPlayers(
              group.players.map((p, index) => ({
                ...p,
                seatOrder: index + 1,
              }))
            ),
          };
        }

        const nextPlayers = [
          ...group.players,
          {
            ...player,
            seatOrder: group.players.length + 1,
          },
        ];

        return {
          ...group,
          players: sortPlayers(nextPlayers).map((p, index) => ({
            ...p,
            seatOrder: index + 1,
          })),
        };
      });
    });
  }

  function removePlayerFromGroup(playerId: number, sourceGroupNumber: number): void {
    markDirty();

    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.groupNumber !== sourceGroupNumber) {
          return group;
        }

        const nextPlayers = group.players
          .filter((player) => player.playerId !== playerId)
          .map((player, index) => ({
            ...player,
            seatOrder: index + 1,
          }));

        return {
          ...group,
          players: nextPlayers,
        };
      })
    );
  }

  function movePlayerWithinGroup(
    groupNumber: number,
    playerId: number,
    direction: "up" | "down"
  ): void {
    markDirty();

    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.groupNumber !== groupNumber) {
          return group;
        }

        const index = group.players.findIndex((player) => player.playerId === playerId);
        if (index === -1) {
          return group;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= group.players.length) {
          return group;
        }

        const nextPlayers = [...group.players];
        const temp = nextPlayers[index];
        nextPlayers[index] = nextPlayers[targetIndex];
        nextPlayers[targetIndex] = temp;

        return {
          ...group,
          players: nextPlayers.map((player, idx) => ({
            ...player,
            seatOrder: idx + 1,
          })),
        };
      })
    );
  }

  function updateAlternateTee(playerId: number, checked: boolean): void {
    if (!hasAlternateTee) {
      return;
    }

    markDirty();

    replacePlayerEverywhere(playerId, (player) => ({
      ...player,
      useAlternateTee: checked,
    }));
  }

  async function saveAlternateTeeChanges(): Promise<void> {
    if (!hasAlternateTee) {
      return;
    }

    const currentPlayers = [
      ...groups.flatMap((group) => group.players),
      ...buildUnassignedPlayers(allRoundPlayers, groups),
    ];

    const changedPlayers = currentPlayers.filter(
      (player) =>
        originalAlternateTeeByScorecardId[player.scorecardId] !== undefined &&
        originalAlternateTeeByScorecardId[player.scorecardId] !== player.useAlternateTee
    );

    if (changedPlayers.length === 0) {
      return;
    }

    await Promise.all(
      changedPlayers.map((player) =>
        setAlternateTee(player.scorecardId, player.useAlternateTee)
      )
    );

    setOriginalAlternateTeeByScorecardId((current) => {
      const next = { ...current };
      changedPlayers.forEach((player) => {
        next[player.scorecardId] = player.useAlternateTee;
      });
      return next;
    });

    setAllRoundPlayers((currentPlayersState) =>
      currentPlayersState.map((player) => {
        const changed = changedPlayers.find((p) => p.scorecardId === player.scorecardId);
        return changed
          ? { ...player, useAlternateTee: changed.useAlternateTee }
          : player;
      })
    );
  }

  async function handleSave(showSuccessMessage = true): Promise<boolean> {
    if (!roundId) {
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const assignments = groups.flatMap((group) =>
        group.players.map((player, index) => ({
          playerId: player.playerId,
          groupNumber: group.groupNumber,
          seatOrder: player.seatOrder ?? index + 1,
        }))
      );

      const payload: RoundGroupSaveRequest = {
        assignments,
      };

      const savedResponse = await saveRoundGroups(Number(roundId), payload);
      await saveAlternateTeeChanges();

      setGroups(normalizeGroups(savedResponse, allRoundPlayers));
      setDirty(false);

      if (showSuccessMessage) {
        setSuccessMessage(
          hasAlternateTee
            ? "Group assignments and tee selections saved."
            : "Group assignments saved."
        );
      }

      return true;
    } catch (err) {
      setError(
        getBackendErrorMessage(err, "Failed to save round groups and tee selections.")
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue(): Promise<void> {
    if (!roundId) {
      return;
    }

    const saved = await handleSave(false);
    if (!saved) {
      return;
    }

    if (teamsStepRequired) {
      navigate(`/rounds/${roundId}/teams`);
      return;
    }

    navigate(`/rounds/${roundId}/scoring`);
  }

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading round groups...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Round Groups</h1>
          <div style={{ marginTop: "8px", color: "#555" }}>
            Assigned: {totalAssignedPlayers} • Unassigned: {unassignedPlayers.length} • Total:{" "}
            {totalPlayers}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: dirty ? "#9a3412" : "#555",
              fontWeight: dirty ? 600 : 400,
            }}
          >
            {dirty ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>

        <div style={topButtonRowStyle}>
          {teamsStepRequired ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(`/rounds/${roundId}/teams`)}
            >
              Teams
            </button>
          ) : null}
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            {saving ? "Saving..." : dirty ? "Save Groups" : "Saved"}
          </button>
        </div>
      </div>
      <RoundProgressBar
          roundId={Number(roundId)}
          currentStep="groups"
          format={roundFormat}
          finalized={false}
        />

      {dirty ? (
        <div style={warningBoxStyle}>
          You have unsaved group or tee-selection changes. Save before continuing.
        </div>
      ) : null}

      {successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <section style={sectionStyle}>
        <div style={{ color: "#555" }}>
          {teamsStepRequired
            ? "Assign players to tee-sheet groups first, then continue to team assignment."
            : "For this format, the tee-sheet groups are also the competition teams."}
        </div>
        <div style={{ color: "#555", marginTop: "8px" }}>
          Standard tee: from round setup
          {alternateTeeName
            ? ` • Alternate tee: ${alternateTeeName}`
            : " • No alternate tee configured"}
        </div>
      </section>

      <div style={twoColumnGridStyle}>
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Unassigned Players</h2>

          {unassignedPlayers.length === 0 ? (
            <div style={{ color: "#666" }}>No unassigned players.</div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {unassignedPlayers.map((player) => (
                <div key={player.playerId} style={cardStyle}>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>{player.playerName}</div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                      fontSize: "14px",
                      color: hasAlternateTee ? "#111" : "#666",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={player.useAlternateTee}
                      disabled={!hasAlternateTee}
                      onChange={(event) =>
                        updateAlternateTee(player.playerId, event.target.checked)
                      }
                    />
                    {hasAlternateTee ? "Use Alt Tee" : "No Alt Tee Configured"}
                  </label>

                  <div style={topButtonRowStyle}>
                    {groups.map((group) => (
                      <button
                        key={group.groupId}
                        type="button"
                        style={
                          group.players.length >= 4 ? disabledSmallButtonStyle : smallButtonStyle
                        }
                        onClick={() => movePlayerToGroup(player, group.groupNumber)}
                        disabled={group.players.length >= 4}
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
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Groups</h2>

          {groups.length === 0 ? (
            <div style={{ color: "#666" }}>No groups found.</div>
          ) : (
            groups.map((group) => (
              <div key={group.groupId} style={groupCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>Group {group.groupNumber}</strong>
                  <span style={{ color: "#666", fontSize: "13px" }}>
                    {group.players.length}/4 players
                  </span>
                </div>

                {group.players.length === 0 ? (
                  <div style={{ color: "#666" }}>No players assigned.</div>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {group.players.map((player, index) => (
                      <div key={player.playerId} style={cardStyle}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{player.playerName}</div>
                            <div style={{ color: "#666", fontSize: "13px" }}>
                              Seat {player.seatOrder ?? index + 1}
                            </div>
                          </div>

                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "14px",
                              color: hasAlternateTee ? "#111" : "#666",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={player.useAlternateTee}
                              disabled={!hasAlternateTee}
                              onChange={(event) =>
                                updateAlternateTee(player.playerId, event.target.checked)
                              }
                            />
                            {hasAlternateTee ? "Use Alt Tee" : "No Alt Tee Configured"}
                          </label>

                          <div style={topButtonRowStyle}>
                            <button
                              type="button"
                              style={index === 0 ? disabledSmallButtonStyle : smallButtonStyle}
                              onClick={() =>
                                movePlayerWithinGroup(group.groupNumber, player.playerId, "up")
                              }
                              disabled={index === 0}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              style={
                                index === group.players.length - 1
                                  ? disabledSmallButtonStyle
                                  : smallButtonStyle
                              }
                              onClick={() =>
                                movePlayerWithinGroup(group.groupNumber, player.playerId, "down")
                              }
                              disabled={index === group.players.length - 1}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              style={smallButtonStyle}
                              onClick={() =>
                                removePlayerFromGroup(player.playerId, group.groupNumber)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleContinue()}
              disabled={saving}
            >
              {saving ? "Saving..." : getContinueLabel(roundFormat)}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}