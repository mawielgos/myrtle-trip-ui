import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  RoundPlayerStatusResponse,
  RoundReadinessResponse,
  RoundTeeOption,
} from "../types/round";
import {
  addMinutesToTime,
  buildUnassignedPlayers,
  getEligibleSortedTeesForPlayer,
  getPlayerRoundTeeId,
  getTeeLabel,
  isActiveRoundPlayer,
  isScrambleRound,
  normalizeGender,
  parsePositiveInteger,
  sortPlayers,
  teeIsEligibleForPlayer,
  type UiGroup,
  type UiPlayer,
} from "./roundGroupsLogic";

type UseRoundGroupsInteractionsArgs = {
  hydrationRevision: number;
  groups: UiGroup[];
  setGroups: Dispatch<SetStateAction<UiGroup[]>>;
  allRoundPlayers: RoundPlayerStatusResponse[];
  setAllRoundPlayers: Dispatch<SetStateAction<RoundPlayerStatusResponse[]>>;
  readiness: RoundReadinessResponse | null;
  roundFormat: string | null;
  defaultRoundTeeId: number | null;
  menDefaultRoundTeeId: number | null;
  womenDefaultRoundTeeId: number | null;
  teeOptions: RoundTeeOption[];
  readOnly: boolean;
  readOnlyReason: string | null;
  setError: (message: string | null) => void;
};

export function useRoundGroupsInteractions({
  hydrationRevision,
  groups,
  setGroups,
  allRoundPlayers,
  setAllRoundPlayers,
  readiness,
  roundFormat,
  defaultRoundTeeId,
  menDefaultRoundTeeId,
  womenDefaultRoundTeeId,
  teeOptions,
  readOnly,
  readOnlyReason,
  setError,
}: UseRoundGroupsInteractionsArgs) {
  const [dirty, setDirty] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teeTimeStart, setTeeTimeStart] = useState("08:00");
  const [teeTimeIntervalMinutes, setTeeTimeIntervalMinutes] = useState("10");
  const [groupsStartingOnTen, setGroupsStartingOnTen] = useState("0");

  useEffect(() => {
    if (hydrationRevision <= 0) {
      return;
    }
    setDirty(false);
    setSuccessMessage(null);
  }, [hydrationRevision]);

  const unassignedPlayers = useMemo(
    () => buildUnassignedPlayers(allRoundPlayers, groups, defaultRoundTeeId),
    [allRoundPlayers, groups, defaultRoundTeeId],
  );

  const totalAssignedPlayers = useMemo(
    () => groups.reduce((sum, group) => sum + group.players.length, 0),
    [groups],
  );

  const unavailablePlayers = useMemo(
    () =>
      allRoundPlayers
        .filter((player) => !isActiveRoundPlayer(player))
        .sort((a, b) => a.playerName.localeCompare(b.playerName)),
    [allRoundPlayers],
  );

  const totalPlayers = allRoundPlayers.filter((player) =>
    isActiveRoundPlayer(player),
  ).length;
  const totalUnavailablePlayers = unavailablePlayers.length;

  const hasFemalePlayers = useMemo(
    () =>
      allRoundPlayers.some(
        (player) => normalizeGender(player.gender) === "F",
      ),
    [allRoundPlayers],
  );

  const sortedMenDefaultTeeOptions = useMemo(
    () => getEligibleSortedTeesForPlayer(teeOptions, "M"),
    [teeOptions],
  );

  const sortedWomenDefaultTeeOptions = useMemo(
    () => getEligibleSortedTeesForPlayer(teeOptions, "F"),
    [teeOptions],
  );

  function markDirty(): void {
    if (readOnly) {
      return;
    }
    setDirty(true);
    setSuccessMessage(null);
    setError(null);
  }

  function replacePlayerEverywhere(
    playerId: number,
    updater: (player: UiPlayer) => UiPlayer,
  ): void {
    setGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        players: group.players.map((player) =>
          player.playerId === playerId ? updater(player) : player,
        ),
      })),
    );

    setAllRoundPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        if (player.playerId !== playerId) {
          return player;
        }

        const updatedPlayer = updater({
          scorecardId: player.scorecardId,
          playerId: player.playerId,
          playerName: player.playerName,
          tripIndex: player.tripIndex ?? null,
          gender: player.gender ?? null,
          seatOrder: null,
          roundTeeId: getPlayerRoundTeeId(player, defaultRoundTeeId),
          participationStatus: player.participationStatus ?? "ACTIVE",
        });

        return { ...player, roundTeeId: updatedPlayer.roundTeeId };
      }),
    );
  }

  function movePlayerToGroup(player: UiPlayer, targetGroupNumber: number): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }

    markDirty();
    setGroups((currentGroups) => {
      const targetGroup = currentGroups.find(
        (group) => group.groupNumber === targetGroupNumber,
      );
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
              group.players.map((p, index) => ({ ...p, seatOrder: index + 1 })),
            ),
          };
        }

        const nextPlayers = [
          ...group.players,
          {
            ...player,
            roundTeeId: player.roundTeeId ?? defaultRoundTeeId,
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
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    markDirty();
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.groupNumber !== sourceGroupNumber
          ? group
          : {
              ...group,
              players: group.players
                .filter((player) => player.playerId !== playerId)
                .map((player, index) => ({ ...player, seatOrder: index + 1 })),
            },
      ),
    );
  }

  function movePlayerWithinGroup(
    groupNumber: number,
    playerId: number,
    direction: "up" | "down",
  ): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
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
        [nextPlayers[index], nextPlayers[targetIndex]] = [
          nextPlayers[targetIndex],
          nextPlayers[index],
        ];
        return {
          ...group,
          players: nextPlayers.map((player, idx) => ({
            ...player,
            seatOrder: idx + 1,
          })),
        };
      }),
    );
  }

  function updateGroupTeeTime(groupNumber: number, teeTime: string): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    markDirty();
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.groupNumber === groupNumber
          ? { ...group, teeTime: teeTime.trim().length > 0 ? teeTime : null }
          : group,
      ),
    );
  }

  function updateGroupStartingHole(groupNumber: number, startingHole: number): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    markDirty();
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.groupNumber === groupNumber
          ? { ...group, startingHole: startingHole === 10 ? 10 : 1 }
          : group,
      ),
    );
  }

  function generateTeeTimes(): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    if (!teeTimeStart) {
      setError("Enter a first tee time before generating tee times.");
      return;
    }

    const intervalMinutes = parsePositiveInteger(teeTimeIntervalMinutes, 10);
    if (intervalMinutes <= 0) {
      setError("Interval must be at least 1 minute.");
      return;
    }

    const sortedGroups = [...groups].sort((a, b) => a.groupNumber - b.groupNumber);
    const tenCount = Math.min(
      parsePositiveInteger(groupsStartingOnTen, 0),
      sortedGroups.length,
    );
    const oneCount = sortedGroups.length - tenCount;

    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        const sortedIndex = sortedGroups.findIndex(
          (g) => g.groupNumber === group.groupNumber,
        );
        if (sortedIndex < 0) {
          return group;
        }
        const startsOnTen = sortedIndex >= oneCount;
        const sequenceIndex = startsOnTen ? sortedIndex - oneCount : sortedIndex;
        return {
          ...group,
          startingHole: startsOnTen ? 10 : 1,
          teeTime: addMinutesToTime(teeTimeStart, sequenceIndex * intervalMinutes),
        };
      }),
    );
    markDirty();
  }

  function updatePlayerTee(playerId: number, nextRoundTeeId: number): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    markDirty();
    replacePlayerEverywhere(playerId, (player) => ({
      ...player,
      roundTeeId: nextRoundTeeId,
    }));
  }

  function applyDefaultTeesToPlayers(): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    if (menDefaultRoundTeeId == null) {
      setError("Select a default tee before applying it to players.");
      return;
    }
    if (hasFemalePlayers && womenDefaultRoundTeeId == null) {
      setError("Select a women's default tee before applying defaults.");
      return;
    }

    const menTee = teeOptions.find((tee) => tee.roundTeeId === menDefaultRoundTeeId);
    const womenTee = hasFemalePlayers
      ? teeOptions.find((tee) => tee.roundTeeId === womenDefaultRoundTeeId)
      : null;

    if (!menTee) {
      setError("The selected default tee is no longer available for this round.");
      return;
    }
    if (hasFemalePlayers && !womenTee) {
      setError("The selected women's default tee is no longer available for this round.");
      return;
    }

    const getDefaultTeeIdForPlayer = (player: { gender?: string | null }) =>
      normalizeGender(player.gender) === "F" && hasFemalePlayers
        ? womenDefaultRoundTeeId
        : menDefaultRoundTeeId;
    const getSelectedTeeForPlayer = (player: { gender?: string | null }) =>
      normalizeGender(player.gender) === "F" && hasFemalePlayers ? womenTee : menTee;

    const skippedPlayers = allRoundPlayers.filter((player) => {
      const selectedTee = getSelectedTeeForPlayer(player);
      const nextRoundTeeId = getDefaultTeeIdForPlayer(player);
      return (
        !selectedTee ||
        nextRoundTeeId == null ||
        !teeIsEligibleForPlayer(selectedTee, player.gender)
      );
    });

    if (skippedPlayers.length > 0) {
      setError(
        `${skippedPlayers.length} player${skippedPlayers.length === 1 ? " was" : "s were"} not changed because no eligible default tee was selected for that player.`,
      );
      return;
    }

    setGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        players: group.players.map((player) => ({
          ...player,
          roundTeeId: getDefaultTeeIdForPlayer(player),
        })),
      })),
    );
    setAllRoundPlayers((currentPlayers) =>
      currentPlayers.map((player) => ({
        ...player,
        roundTeeId: getDefaultTeeIdForPlayer(player),
      })),
    );
    markDirty();
    setSuccessMessage(
      hasFemalePlayers
        ? `Default tees applied: Men - ${getTeeLabel(teeOptions, menDefaultRoundTeeId)}, Women - ${getTeeLabel(teeOptions, womenDefaultRoundTeeId)}.`
        : `Default tee applied to all players: ${getTeeLabel(teeOptions, menDefaultRoundTeeId)}.`,
    );
  }

  function getAllPlayersForSuggestion(): UiPlayer[] {
    const playerById = new Map<number, UiPlayer>();
    allRoundPlayers.forEach((player) => {
      playerById.set(player.playerId, {
        scorecardId: player.scorecardId,
        playerId: player.playerId,
        playerName: player.playerName,
        tripIndex: player.tripIndex ?? null,
        gender: player.gender ?? null,
        seatOrder: null,
        roundTeeId: getPlayerRoundTeeId(player, defaultRoundTeeId),
        participationStatus: player.participationStatus ?? "ACTIVE",
      });
    });
    groups.forEach((group) => {
      group.players.forEach((player) => {
        playerById.set(player.playerId, {
          ...player,
          roundTeeId: player.roundTeeId ?? defaultRoundTeeId,
        });
      });
    });
    return Array.from(playerById.values()).filter((player) =>
      isActiveRoundPlayer(player),
    );
  }

  function handleSuggestScrambleGroups(): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }
    if (!isScrambleRound(readiness, roundFormat)) {
      return;
    }
    if (groups.length === 0) {
      setError("No groups are available for this round.");
      return;
    }

    const players = getAllPlayersForSuggestion().sort((a, b) => {
      const aIndex = a.tripIndex ?? Number.MAX_SAFE_INTEGER;
      const bIndex = b.tripIndex ?? Number.MAX_SAFE_INTEGER;
      return aIndex !== bIndex ? aIndex - bIndex : a.playerName.localeCompare(b.playerName);
    });
    const nextGroups = groups
      .map((group) => ({ ...group, players: [] as UiPlayer[] }))
      .sort((a, b) => a.groupNumber - b.groupNumber);

    players.forEach((player, index) => {
      const blockNumber = Math.floor(index / nextGroups.length);
      const positionInBlock = index % nextGroups.length;
      const groupIndex =
        blockNumber % 2 === 0
          ? positionInBlock
          : nextGroups.length - 1 - positionInBlock;
      nextGroups[groupIndex].players.push({
        ...player,
        seatOrder: nextGroups[groupIndex].players.length + 1,
        roundTeeId: player.roundTeeId ?? defaultRoundTeeId,
      });
    });

    setGroups(
      nextGroups.map((group) => ({
        ...group,
        players: group.players.map((player, index) => ({
          ...player,
          seatOrder: index + 1,
        })),
      })),
    );
    markDirty();
  }

  return {
    dirty,
    setDirty,
    successMessage,
    setSuccessMessage,
    teeTimeStart,
    setTeeTimeStart,
    teeTimeIntervalMinutes,
    setTeeTimeIntervalMinutes,
    groupsStartingOnTen,
    setGroupsStartingOnTen,
    unassignedPlayers,
    totalAssignedPlayers,
    unavailablePlayers,
    totalPlayers,
    totalUnavailablePlayers,
    hasFemalePlayers,
    sortedMenDefaultTeeOptions,
    sortedWomenDefaultTeeOptions,
    movePlayerToGroup,
    removePlayerFromGroup,
    movePlayerWithinGroup,
    updateGroupTeeTime,
    updateGroupStartingHole,
    generateTeeTimes,
    updatePlayerTee,
    applyDefaultTeesToPlayers,
    handleSuggestScrambleGroups,
  };
}
