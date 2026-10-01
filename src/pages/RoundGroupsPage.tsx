import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveRoundGroups } from "../api/roundGroupApi";
import { updateRoundScorecardParticipation } from "../api/roundApi";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type {
  RoundGroupPageResponse,
  RoundGroupSaveRequest,
  RoundPlayerStatusResponse,
  RoundReadinessResponse,
  RoundSetupStatusResponse,
  RoundTeeOption,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { roundHasScrambleEvent, roundHasTwoManLowNetEvent } from "../utils/roundEventCapabilities";

type UiPlayer = {
  scorecardId: number;
  playerId: number;
  playerName: string;
  tripIndex: number | null;
  gender: string | null;
  seatOrder: number | null;
  roundTeeId: number | null;
  participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
};

type UiGroup = {
  groupId: number;
  groupNumber: number;
  teeTime: string | null;
  startingHole: number | null;
  players: UiPlayer[];
};

const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  alignItems: "start",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const compactSectionStyle: React.CSSProperties = {
  ...sectionStyle,
  overflowX: "auto",
};

const compactTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "840px",
};

const teeSelectStyle: React.CSSProperties = {
  minWidth: "240px",
  height: "32px",
  border: "1px solid #cfd6de",
  borderRadius: "6px",
  padding: "0 8px",
  background: "#fff",
};

const compactTeeSelectStyle: React.CSSProperties = {
  ...teeSelectStyle,
  minWidth: "150px",
};

const assignmentButtonWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
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
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

const quickTeeControlStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const quickTeeSelectStyle: React.CSSProperties = {
  ...teeSelectStyle,
  minWidth: "260px",
};

function normalizeGender(gender?: string | null): "M" | "F" {
  if (!gender || gender.trim().length === 0) {
    return "M";
  }

  const normalized = gender.trim().toUpperCase();

  if (
    normalized === "F" ||
    normalized === "FEMALE" ||
    normalized === "W" ||
    normalized === "WOMAN"
  ) {
    return "F";
  }

  return "M";
}

function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.womenCourseRating ?? -999;
  }

  return tee.menCourseRating ?? -999;
}

function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.displayNameForWomen || tee.displayName || tee.teeName;
  }

  return tee.displayNameForMen || tee.displayName || tee.teeName;
}

function teeIsEligibleForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): boolean {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.eligibleForWomen === true;
  }

  return tee.eligibleForMen !== false;
}

function getEligibleSortedTeesForPlayer(
  teeOptions: RoundTeeOption[],
  gender?: string | null,
): RoundTeeOption[] {
  return [...teeOptions]
    .filter((tee) => teeIsEligibleForPlayer(tee, gender))
    .sort((a, b) => {
      const ratingCompare =
        getTeeRatingForPlayer(b, gender) - getTeeRatingForPlayer(a, gender);

      if (ratingCompare !== 0) {
        return ratingCompare;
      }

      return (a.teeName || "").localeCompare(b.teeName || "");
    });
}

function getDefaultTeeForGender(
  teeOptions: RoundTeeOption[],
  preferredRoundTeeId: number | null,
  gender: "M" | "F",
): number | null {
  const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, gender);

  if (eligibleTees.length === 0) {
    return null;
  }

  if (preferredRoundTeeId != null) {
    const preferredIsEligible = eligibleTees.some(
      (tee) => tee.roundTeeId === preferredRoundTeeId,
    );

    if (preferredIsEligible) {
      return preferredRoundTeeId;
    }
  }

  return eligibleTees[0].roundTeeId;
}

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

function isActiveRoundPlayer(player: RoundPlayerStatusResponse | UiPlayer): boolean {
  return (player.participationStatus ?? "ACTIVE") === "ACTIVE";
}

function getPlayerRoundTeeId(
  player: RoundPlayerStatusResponse | undefined,
  defaultRoundTeeId: number | null,
): number | null {
  if (player?.roundTeeId != null) {
    return player.roundTeeId;
  }

  return defaultRoundTeeId;
}

function normalizeGroups(
  response: RoundGroupPageResponse,
  roundPlayers: RoundPlayerStatusResponse[],
  defaultRoundTeeId: number | null,
): UiGroup[] {
  const playerById = new Map<number, RoundPlayerStatusResponse>();

  roundPlayers.forEach((player) => {
    playerById.set(player.playerId, player);
  });

  return (response.groups ?? [])
    .map((group) => ({
      groupId: group.groupId,
      groupNumber: group.groupNumber,
      teeTime: group.teeTime ?? null,
      startingHole: group.startingHole ?? null,
      players: sortPlayers(
        (group.players ?? [])
          .filter((player) => {
            const roundPlayer = playerById.get(player.playerId);
            return isActiveRoundPlayer(
              roundPlayer ?? ({ participationStatus: "ACTIVE" } as RoundPlayerStatusResponse),
            );
          })
          .map((player) => {
            const roundPlayer = playerById.get(player.playerId);

            return {
              scorecardId: roundPlayer?.scorecardId ?? 0,
              playerId: player.playerId,
              playerName: player.playerName,
              tripIndex: roundPlayer?.tripIndex ?? null,
              gender: roundPlayer?.gender ?? null,
              seatOrder: player.seatOrder ?? null,
              roundTeeId: getPlayerRoundTeeId(roundPlayer, defaultRoundTeeId),
              participationStatus: roundPlayer?.participationStatus ?? "ACTIVE",
            };
          }),
      ),
    }))
    .sort((a, b) => a.groupNumber - b.groupNumber);
}

function buildUnassignedPlayers(
  roundPlayers: RoundPlayerStatusResponse[],
  groups: UiGroup[],
  defaultRoundTeeId: number | null,
): UiPlayer[] {
  const assignedIds = new Set(
    groups.flatMap((group) => group.players.map((player) => player.playerId)),
  );

  return roundPlayers
    .filter((player) => isActiveRoundPlayer(player))
    .filter((player) => !assignedIds.has(player.playerId))
    .map((player) => ({
      scorecardId: player.scorecardId,
      playerId: player.playerId,
      playerName: player.playerName,
      tripIndex: player.tripIndex ?? null,
      gender: player.gender ?? null,
      seatOrder: null,
      roundTeeId: getPlayerRoundTeeId(player, defaultRoundTeeId),
      participationStatus: player.participationStatus ?? "ACTIVE",
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function isTwoManRound(readiness?: RoundReadinessResponse | null, format?: string | null): boolean {
  return roundHasTwoManLowNetEvent(readiness, format);
}

function isScrambleRound(readiness?: RoundReadinessResponse | null, format?: string | null): boolean {
  return roundHasScrambleEvent(readiness, format);
}

function getContinueLabel(readiness?: RoundReadinessResponse | null, format?: string | null): string {
  return isTwoManRound(readiness, format) ? "Continue to Teams" : "Continue to Scoring";
}

function formatIndex(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "No index";
  }

  return Number(value).toFixed(1);
}

function formatParticipationStatus(status: string | null | undefined): string {
  if (status === "WITHDRAWN") return "Withdrawn";
  if (status === "NO_SHOW") return "No-Show";
  if (status === "ACTIVE") return "Active";
  return "Unavailable";
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

  if (err.response?.status === 409) {
    return "The round setup conflicts with the requested group or tee selections.";
  }

  if (err.response?.status === 400) {
    return "The request was rejected by the server.";
  }

  return fallback;
}

function getTeeLabel(
  teeOptions: RoundTeeOption[],
  roundTeeId: number | null,
): string {
  if (roundTeeId == null) {
    return "No tee selected";
  }

  const tee = teeOptions.find((option) => option.roundTeeId === roundTeeId);
  return tee?.displayName || tee?.teeName || `Tee ${roundTeeId}`;
}

function addMinutesToTime(
  timeValue: string,
  minutesToAdd: number,
): string | null {
  if (!timeValue) {
    return null;
  }

  const [hourText, minuteText] = timeValue.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalizedMinutes / 60);
  const nextMinute = normalizedMinutes % 60;

  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default function RoundGroupsPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [roundStatus, setRoundStatus] = useState<
    RoundSetupStatusResponse["round"] | null
  >(null);
  const [allRoundPlayers, setAllRoundPlayers] = useState<
    RoundPlayerStatusResponse[]
  >([]);
  const [roundFormat, setRoundFormat] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<RoundReadinessResponse | null>(null);
  const [defaultRoundTeeId, setDefaultRoundTeeId] = useState<number | null>(
    null,
  );
  const [menDefaultRoundTeeId, setMenDefaultRoundTeeId] = useState<
    number | null
  >(null);
  const [womenDefaultRoundTeeId, setWomenDefaultRoundTeeId] = useState<
    number | null
  >(null);
  const [teeOptions, setTeeOptions] = useState<RoundTeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teeTimeStart, setTeeTimeStart] = useState("08:00");
  const [teeTimeIntervalMinutes, setTeeTimeIntervalMinutes] = useState("10");
  const [groupsStartingOnTen, setGroupsStartingOnTen] = useState("0");

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

        const response: RoundSetupStatusResponse = await getRoundSetupStatus(
          Number(roundId),
        );
        const roundPlayers = response.round.players ?? [];
        const nextDefaultRoundTeeId =
          response.teamAssignment?.defaultRoundTeeId ?? null;
        const nextTeeOptions = response.teamAssignment?.teeOptions ?? [];

        setRoundStatus(response.round);
        setReadiness(response.readiness ?? null);
        setGroups(
          normalizeGroups(response.groups, roundPlayers, nextDefaultRoundTeeId),
        );
        setAllRoundPlayers(roundPlayers);
        setRoundFormat(response.round.format ?? null);
        setDefaultRoundTeeId(nextDefaultRoundTeeId);
        setMenDefaultRoundTeeId(
          getDefaultTeeForGender(nextTeeOptions, nextDefaultRoundTeeId, "M"),
        );
        setWomenDefaultRoundTeeId(
          getDefaultTeeForGender(nextTeeOptions, nextDefaultRoundTeeId, "F"),
        );
        setTeeOptions(nextTeeOptions);
      } catch (err) {
        setError(getBackendErrorMessage(err, "Failed to load round groups."));
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const unassignedPlayers = useMemo(() => {
    return buildUnassignedPlayers(allRoundPlayers, groups, defaultRoundTeeId);
  }, [allRoundPlayers, groups, defaultRoundTeeId]);

  const totalAssignedPlayers = useMemo(() => {
    return groups.reduce((sum, group) => sum + group.players.length, 0);
  }, [groups]);

  const unavailablePlayers = useMemo(() => {
    return allRoundPlayers
      .filter((player) => !isActiveRoundPlayer(player))
      .sort((a, b) => a.playerName.localeCompare(b.playerName));
  }, [allRoundPlayers]);

  const totalPlayers = allRoundPlayers.filter((player) => isActiveRoundPlayer(player)).length;
  const totalUnavailablePlayers = unavailablePlayers.length;
  const teamsStepRequired = isTwoManRound(readiness, roundFormat);
  const defaultTeeLabel = getTeeLabel(teeOptions, defaultRoundTeeId);
  const hasFemalePlayers = useMemo(() => {
    return allRoundPlayers.some(
      (player) => normalizeGender(player.gender) === "F",
    );
  }, [allRoundPlayers]);

  const sortedMenDefaultTeeOptions = useMemo(
    () => getEligibleSortedTeesForPlayer(teeOptions, "M"),
    [teeOptions],
  );

  const sortedWomenDefaultTeeOptions = useMemo(
    () => getEligibleSortedTeesForPlayer(teeOptions, "F"),
    [teeOptions],
  );
  const roundIsFinalized = roundStatus?.finalized === true;
  const tripIsLocked = roundStatus?.tripLocked === true;
  const readOnly = roundIsFinalized || tripIsLocked;
  const readOnlyReason = tripIsLocked
    ? "This event is complete and locked. Groups and tee selections are view-only."
    : roundIsFinalized
      ? "This round is finalized. Groups and tee selections are view-only."
      : null;
  const assignmentComplete =
    totalPlayers > 0 &&
    totalAssignedPlayers === totalPlayers &&
    unassignedPlayers.length === 0;
  const continueDisabled = !readOnly && (!assignmentComplete || saving);
  const continueDisabledReason = !assignmentComplete
    ? "Assign every player to a group before continuing."
    : saving
      ? "Saving group assignments..."
      : undefined;
  const continueButtonStyle: React.CSSProperties = continueDisabled
    ? {
        ...buttonStyle,
        color: "#888",
        background: "#eee",
        border: "1px solid #c7ccd1",
        cursor: "not-allowed",
      }
    : buttonStyle;

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
        });

        return {
          ...player,
          roundTeeId: updatedPlayer.roundTeeId,
        };
      }),
    );
  }

  function movePlayerToGroup(
    player: UiPlayer,
    targetGroupNumber: number,
  ): void {
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
              group.players.map((p, index) => ({
                ...p,
                seatOrder: index + 1,
              })),
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

  function removePlayerFromGroup(
    playerId: number,
    sourceGroupNumber: number,
  ): void {
    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return;
    }

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
      }),
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

        const index = group.players.findIndex(
          (player) => player.playerId === playerId,
        );

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

  function updateGroupStartingHole(
    groupNumber: number,
    startingHole: number,
  ): void {
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

    const sortedGroups = [...groups].sort(
      (a, b) => a.groupNumber - b.groupNumber,
    );
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
        const sequenceIndex = startsOnTen
          ? sortedIndex - oneCount
          : sortedIndex;

        return {
          ...group,
          startingHole: startsOnTen ? 10 : 1,
          teeTime: addMinutesToTime(
            teeTimeStart,
            sequenceIndex * intervalMinutes,
          ),
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

    const menTee = teeOptions.find(
      (tee) => tee.roundTeeId === menDefaultRoundTeeId,
    );
    const womenTee = hasFemalePlayers
      ? teeOptions.find((tee) => tee.roundTeeId === womenDefaultRoundTeeId)
      : null;

    if (!menTee) {
      setError(
        "The selected default tee is no longer available for this round.",
      );
      return;
    }

    if (hasFemalePlayers && !womenTee) {
      setError(
        "The selected women's default tee is no longer available for this round.",
      );
      return;
    }

    function getDefaultTeeIdForPlayer(player: {
      gender?: string | null;
    }): number | null {
      return normalizeGender(player.gender) === "F" && hasFemalePlayers
        ? womenDefaultRoundTeeId
        : menDefaultRoundTeeId;
    }

    function getSelectedTeeForPlayer(player: {
      gender?: string | null;
    }): RoundTeeOption | null {
      return normalizeGender(player.gender) === "F" && hasFemalePlayers
        ? womenTee
        : menTee;
    }

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

    return Array.from(playerById.values()).filter((player) => isActiveRoundPlayer(player));
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

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return a.playerName.localeCompare(b.playerName);
    });

    const nextGroups = groups
      .map((group) => ({
        ...group,
        players: [] as UiPlayer[],
      }))
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

  async function reloadPageState(): Promise<void> {
    if (!roundId) {
      return;
    }

    const response: RoundSetupStatusResponse = await getRoundSetupStatus(
      Number(roundId),
    );
    const roundPlayers = response.round.players ?? [];
    const nextDefaultRoundTeeId =
      response.teamAssignment?.defaultRoundTeeId ?? null;
    const nextTeeOptions = response.teamAssignment?.teeOptions ?? [];

    setRoundStatus(response.round);
    setGroups(
      normalizeGroups(response.groups, roundPlayers, nextDefaultRoundTeeId),
    );
    setAllRoundPlayers(roundPlayers);
    setRoundFormat(response.round.format ?? null);
    setDefaultRoundTeeId(nextDefaultRoundTeeId);
    setMenDefaultRoundTeeId(
      getDefaultTeeForGender(nextTeeOptions, nextDefaultRoundTeeId, "M"),
    );
    setWomenDefaultRoundTeeId(
      getDefaultTeeForGender(nextTeeOptions, nextDefaultRoundTeeId, "F"),
    );
    setTeeOptions(nextTeeOptions);
    setDirty(false);
  }

  async function handleParticipationChange(
    player: UiPlayer | RoundPlayerStatusResponse,
    participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN",
  ): Promise<void> {
    if (!roundId) {
      return;
    }

    if (dirty) {
      setError("Save current group changes before marking a player unavailable or active.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      await updateRoundScorecardParticipation(
        Number(roundId),
        player.scorecardId,
        participationStatus,
      );
      await reloadPageState();
      setSuccessMessage(
        participationStatus === "ACTIVE"
          ? `${player.playerName} marked active for this round.`
          : `${player.playerName} marked ${participationStatus === "NO_SHOW" ? "No-Show" : "Withdrawn"} for this round.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getBackendErrorMessage(err, "Failed to update player availability."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSave(showSuccessMessage = true): Promise<boolean> {
    if (!roundId) {
      return false;
    }

    if (readOnly) {
      setError(readOnlyReason ?? "Groups are view-only for this round.");
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const assignments = groups.flatMap((group) =>
        group.players.map((player, index) => ({
          scorecardId: player.scorecardId,
          playerId: player.playerId,
          groupNumber: group.groupNumber,
          seatOrder: player.seatOrder ?? index + 1,
          roundTeeId: player.roundTeeId ?? defaultRoundTeeId,
        })),
      );

      const payload: RoundGroupSaveRequest = {
        assignments,
        groupTeeTimes: groups.map((group) => ({
          groupNumber: group.groupNumber,
          teeTime: group.teeTime,
          startingHole: group.startingHole,
        })),
      };

      await saveRoundGroups(Number(roundId), payload);
      await reloadPageState();

      if (showSuccessMessage) {
        setSuccessMessage("Group assignments and tee selections saved.");
      }

      return true;
    } catch (err) {
      setError(
        getBackendErrorMessage(
          err,
          "Failed to save round groups and tee selections.",
        ),
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  const confirmIfNeeded = useUnsavedChangesWarning(
    dirty && !saving,
    "You have unsaved group or tee-selection changes. Leave without saving?",
  );

  async function navigateIfClean(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(path);
  }

  async function handleContinue(): Promise<void> {
    if (!roundId) {
      return;
    }

    if (readOnly) {
      if (teamsStepRequired) {
        navigate(`/rounds/${roundId}/teams`);
        return;
      }

      navigate(`/rounds/${roundId}/scoring`);
      return;
    }

    if (!assignmentComplete) {
      setError("Assign every player to a group before continuing.");
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

  function renderTeeSelector(player: UiPlayer): JSX.Element {
    if (readOnly) {
      return (
        <span>
          {getTeeLabel(teeOptions, player.roundTeeId ?? defaultRoundTeeId)}
        </span>
      );
    }

    const eligibleTees = getEligibleSortedTeesForPlayer(
      teeOptions,
      player.gender,
    );

    if (eligibleTees.length === 0) {
      return (
        <span style={{ color: "#9a3412" }}>
          No eligible tees configured for{" "}
          {normalizeGender(player.gender) === "F" ? "female" : "male"} player
        </span>
      );
    }

    const selectedTeeIsEligible =
      player.roundTeeId == null ||
      eligibleTees.some((tee) => tee.roundTeeId === player.roundTeeId);

    const value = selectedTeeIsEligible
      ? (player.roundTeeId ?? defaultRoundTeeId ?? "")
      : "";

    return (
      <select
        value={value}
        onChange={(event) =>
          updatePlayerTee(player.playerId, Number(event.target.value))
        }
        style={compactTeeSelectStyle}
      >
        {!selectedTeeIsEligible ? (
          <option value="">Select eligible tee</option>
        ) : null}

        {eligibleTees.map((tee) => (
          <option key={tee.roundTeeId} value={tee.roundTeeId}>
            {getTeeDisplayForPlayer(tee, player.gender)}
          </option>
        ))}
      </select>
    );
  }

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading round groups...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Groups"
        subtitle={
          <>
            <div>
              Assigned: {totalAssignedPlayers} • Unassigned:{" "}
              {unassignedPlayers.length} • Total Active: {totalPlayers}
              {totalUnavailablePlayers > 0 ? ` • Unavailable: ${totalUnavailablePlayers}` : ""}
            </div>
            <div
              style={{
                marginTop: "6px",
                color: dirty ? "#9a3412" : "#555",
                fontWeight: dirty ? 600 : 400,
              }}
            >
              {dirty ? "Unsaved changes" : "All changes saved"}
            </div>
          </>
        }
        actions={
          <>
            {roundStatus?.tripId ? (
              <TripDetailButton
                tripId={roundStatus.tripId}
                onBeforeNavigate={confirmIfNeeded}
              />
            ) : null}

            <WorkflowBackButton
              label="Round Setup"
              to={`/rounds/${roundId}`}
              onBeforeNavigate={confirmIfNeeded}
            />

            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                void navigateIfClean(`/rounds/${roundId}/tee-sheet`)
              }
            >
              Tee Sheet
            </button>

            {teamsStepRequired ? (
              <button
                type="button"
                style={continueButtonStyle}
                onClick={() => {
                  if (continueDisabled) {
                    setError(
                      continueDisabledReason ??
                        "Round groups are not ready for team assignment.",
                    );
                    return;
                  }
                  void navigateIfClean(`/rounds/${roundId}/teams`);
                }}
                disabled={continueDisabled}
                title={continueDisabledReason}
              >
                {readOnly ? "View Teams" : "Teams"}
              </button>
            ) : (
              <button
                type="button"
                style={continueButtonStyle}
                onClick={() => {
                  if (continueDisabled) {
                    setError(
                      continueDisabledReason ??
                        "Round groups are not ready for scoring.",
                    );
                    return;
                  }
                  void navigateIfClean(`/rounds/${roundId}/scoring`);
                }}
                disabled={continueDisabled}
                title={continueDisabledReason}
              >
                {readOnly ? "View Scores" : "Scoring"}
              </button>
            )}

            {isScrambleRound(readiness, roundFormat) && !readOnly ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={handleSuggestScrambleGroups}
                disabled={saving || allRoundPlayers.length === 0}
                title="Suggest balanced scramble teams by current index using serpentine seeding"
              >
                Suggest Teams
              </button>
            ) : null}

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
          </>
        }
      />

      <RoundProgressBar
        roundId={Number(roundId)}
        currentStep="groups"
        format={roundFormat}
        finalized={roundStatus?.finalized === true}
      />

      {readOnlyReason ? (
        <div style={warningBoxStyle}>{readOnlyReason}</div>
      ) : null}

      {dirty ? (
        <div style={warningBoxStyle}>
          You have unsaved group or tee-selection changes. Save before
          continuing.
        </div>
      ) : null}

      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

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
              onClick={() => void navigateIfClean(`/rounds/${roundId}/tee-sheet`)}
              disabled={saving}
            >
              Tee Sheet
            </button>

            <button
              type="button"
              style={continueButtonStyle}
              onClick={() => void handleContinue()}
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
    </div>
  );
}
