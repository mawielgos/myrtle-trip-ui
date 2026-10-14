import { useCallback, useEffect, useState } from "react";
import { getCourses, getCourseTees } from "../api/courseApi";
import { getPlannedRounds, getTripDetail } from "../api/tripApi";
import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { TripPlannedRound } from "../types/trip";
import {
  roundKey,
  selectInitialExpandedRoundKey,
  snapshotRounds,
  sortRoundsByPlaySequence,
} from "./tripRoundPlanningLogic";

export interface UseTripRoundPlanningPageDataArgs {
  tripId: number;
  requestedRoundNumber: number;
}

export function useTripRoundPlanningPageData({
  tripId,
  requestedRoundNumber,
}: UseTripRoundPlanningPageDataArgs) {
  const [rounds, setRounds] = useState<TripPlannedRound[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [teeOptionsByCourseId, setTeeOptionsByCourseId] = useState<Record<number, CourseTeeListItem[]>>({});
  const [expandedRoundKey, setExpandedRoundKey] = useState<string | null>(null);

  const [tripName, setTripName] = useState<string | null>(null);
  const [tripInitialized, setTripInitialized] = useState(false);
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);
  const [tripEndDate, setTripEndDate] = useState<string | null>(null);
  const [plannedRoundCount, setPlannedRoundCount] = useState(0);
  const [hasFemalePlayers, setHasFemalePlayers] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const preloadTees = useCallback(async (courseIds: number[]): Promise<void> => {
    if (courseIds.length === 0) {
      return;
    }

    const results = await Promise.all(
      courseIds.map(async (courseId) => ({
        courseId,
        tees: await getCourseTees(courseId),
      })),
    );

    setTeeOptionsByCourseId((current) => {
      const next = { ...current };
      for (const result of results) {
        next[result.courseId] = result.tees;
      }
      return next;
    });
  }, []);

  const loadPage = useCallback(async (): Promise<void> => {
    if (!tripId || Number.isNaN(tripId)) {
      setError("Invalid event id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [plannedRounds, courseData, tripDetail] = await Promise.all([
        getPlannedRounds(tripId),
        getCourses(),
        getTripDetail(tripId),
      ]);

      const sequencedRounds = sortRoundsByPlaySequence(plannedRounds);
      setRounds(sequencedRounds);
      setExpandedRoundKey(selectInitialExpandedRoundKey(sequencedRounds, requestedRoundNumber));
      setInitialSnapshot(snapshotRounds(sequencedRounds));
      setCourses(courseData);
      setTripName(tripDetail.tripName ?? null);
      setTripInitialized(tripDetail.initialized === true);
      setTripStartDate(tripDetail.tripStartDate ?? null);
      setTripEndDate(tripDetail.tripEndDate ?? null);
      setPlannedRoundCount(tripDetail.plannedRoundCount ?? plannedRounds.length);
      setHasFemalePlayers(tripDetail.hasFemalePlayers === true);

      const distinctCourseIds = Array.from(
        new Set(
          plannedRounds
            .map((round) => round.courseId)
            .filter((courseId): courseId is number => courseId != null),
        ),
      );
      await preloadTees(distinctCourseIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load planned rounds.");
    } finally {
      setLoading(false);
    }
  }, [preloadTees, requestedRoundNumber, tripId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const ensureTeesLoaded = useCallback(
    async (courseId: number): Promise<void> => {
      if (teeOptionsByCourseId[courseId]) {
        return;
      }

      const tees = await getCourseTees(courseId);
      setTeeOptionsByCourseId((current) => ({
        ...current,
        [courseId]: tees,
      }));
    },
    [teeOptionsByCourseId],
  );

  function applySavedRounds(savedRounds: TripPlannedRound[]): void {
    const sequencedRounds = sortRoundsByPlaySequence(savedRounds);
    setRounds(sequencedRounds);
    setPlannedRoundCount(sequencedRounds.length);
    setInitialSnapshot(snapshotRounds(sequencedRounds));
    setExpandedRoundKey((currentKey) => {
      if (currentKey && sequencedRounds.some((round) => roundKey(round) === currentKey)) {
        return currentKey;
      }
      return selectInitialExpandedRoundKey(sequencedRounds, requestedRoundNumber);
    });
  }

  return {
    rounds,
    setRounds,
    courses,
    teeOptionsByCourseId,
    expandedRoundKey,
    setExpandedRoundKey,
    tripName,
    tripInitialized,
    tripStartDate,
    tripEndDate,
    plannedRoundCount,
    setPlannedRoundCount,
    hasFemalePlayers,
    loading,
    error,
    setError,
    initialSnapshot,
    ensureTeesLoaded,
    applySavedRounds,
    reload: loadPage,
  };
}
