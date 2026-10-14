import { useCallback, useEffect, useState } from "react";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type {
  RoundPlayerStatusResponse,
  RoundReadinessResponse,
  RoundSetupStatusResponse,
  RoundTeeOption,
} from "../types/round";
import {
  getBackendErrorMessage,
  getDefaultTeeForGender,
  normalizeGroups,
  type UiGroup,
} from "./roundGroupsLogic";

type UseRoundGroupsPageDataOptions = {
  roundId?: string;
};

export function useRoundGroupsPageData({
  roundId,
}: UseRoundGroupsPageDataOptions) {
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
  const [hydrationRevision, setHydrationRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hydrate = useCallback((response: RoundSetupStatusResponse) => {
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
    setHydrationRevision((current) => current + 1);
  }, []);

  const reloadPageState = useCallback(async (): Promise<void> => {
    if (!roundId) {
      return;
    }

    const response = await getRoundSetupStatus(Number(roundId));
    hydrate(response);
  }, [hydrate, roundId]);

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
        const response = await getRoundSetupStatus(Number(roundId));
        hydrate(response);
      } catch (err) {
        setError(getBackendErrorMessage(err, "Failed to load round groups."));
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [hydrate, roundId]);

  return {
    groups,
    setGroups,
    roundStatus,
    allRoundPlayers,
    setAllRoundPlayers,
    roundFormat,
    readiness,
    defaultRoundTeeId,
    menDefaultRoundTeeId,
    setMenDefaultRoundTeeId,
    womenDefaultRoundTeeId,
    setWomenDefaultRoundTeeId,
    teeOptions,
    loading,
    hydrationRevision,
    error,
    setError,
    reloadPageState,
  };
}
