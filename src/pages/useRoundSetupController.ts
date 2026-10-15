import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourses, getCourseTees } from "../api/courseApi";
import { startRound } from "../api/roundApi";
import { getTrips } from "../api/tripApi";
import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { RoundFormat } from "../types/round";
import type { TripListItem } from "../types/trip";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import {
  buildRoundSetupRequest,
  initialRoundSetupFields,
  roundSetupSnapshot,
  toCourseOptions,
  toTeeOptions,
  toTripOptions,
  todayIsoDate,
  validateRoundSetup,
} from "./roundSetupLogic";

export function useRoundSetupController() {
  const navigate = useNavigate();
  const { tripId: routeTripId } = useParams<{ tripId: string }>();

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingTees, setLoadingTees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [tees, setTees] = useState<CourseTeeListItem[]>([]);

  const [selectedTripId, setSelectedTripId] = useState(routeTripId ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDefaultCourseTeeId, setSelectedDefaultCourseTeeId] = useState("");
  const [roundDate, setRoundDate] = useState(todayIsoDate());
  const [format, setFormat] = useState<RoundFormat>("MIDDLE_MAN");
  const [handicapPercent, setHandicapPercent] = useState("100");
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const tripOptions = useMemo(() => toTripOptions(trips), [trips]);
  const courseOptions = useMemo(() => toCourseOptions(courses), [courses]);
  const teeOptions = useMemo(() => toTeeOptions(tees), [tees]);

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    if (format === "TEAM_SCRAMBLE") {
      setHandicapPercent("0");
    } else if (handicapPercent === "0") {
      setHandicapPercent("100");
    }
  }, [format, handicapPercent]);

  useEffect(() => {
    if (!selectedCourseId) {
      setTees([]);
      setSelectedDefaultCourseTeeId("");
      return;
    }

    void loadTees(Number(selectedCourseId));
  }, [selectedCourseId]);

  const fields = useMemo(() => ({
    selectedTripId,
    selectedCourseId,
    selectedDefaultCourseTeeId,
    roundDate,
    format,
    handicapPercent,
  }), [selectedTripId, selectedCourseId, selectedDefaultCourseTeeId, roundDate, format, handicapPercent]);

  const comparableSnapshot = useMemo(() => roundSetupSnapshot(fields), [fields]);

  const hasChanges =
    !loadingLookups &&
    initialSnapshot.length > 0 &&
    comparableSnapshot !== initialSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) return;
    navigate(path);
  }

  async function loadLookups(): Promise<void> {
    try {
      setLoadingLookups(true);
      setError(null);

      const [tripData, courseData] = await Promise.all([getTrips(), getCourses()]);
      setTrips(tripData);
      setCourses(courseData);

      let initialTripId = "";
      if (routeTripId && tripData.some((trip) => trip.tripId === Number(routeTripId))) {
        initialTripId = routeTripId;
        setSelectedTripId(routeTripId);
      } else if (!routeTripId && tripData.length === 1) {
        initialTripId = String(tripData[0].tripId);
        setSelectedTripId(String(tripData[0].tripId));
      }

      setInitialSnapshot(roundSetupSnapshot(initialRoundSetupFields(initialTripId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load round setup data.");
    } finally {
      setLoadingLookups(false);
    }
  }

  async function loadTees(courseId: number): Promise<void> {
    try {
      setLoadingTees(true);
      setError(null);

      const teeData = await getCourseTees(courseId);
      setTees(teeData);
      setSelectedDefaultCourseTeeId(
        teeData.length === 1 ? String(teeData[0].courseTeeId) : "",
      );
    } catch (err) {
      setTees([]);
      setSelectedDefaultCourseTeeId("");
      setError(err instanceof Error ? err.message : "Failed to load course tees.");
    } finally {
      setLoadingTees(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    const validationError = validateRoundSetup(fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = buildRoundSetupRequest(fields);
      const roundId = await startRound(payload);
      setInitialSnapshot(comparableSnapshot);
      navigate(`/rounds/${roundId}/open`);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(typeof apiMessage === "string" ? apiMessage : "Failed to start round.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel(): void {
    if (selectedTripId) {
      navigateIfConfirmed(`/trips/${selectedTripId}`);
      return;
    }
    navigateIfConfirmed("/trips");
  }

  return {
    loadingLookups,
    loadingTees,
    saving,
    error,
    selectedTripId,
    selectedCourseId,
    selectedDefaultCourseTeeId,
    roundDate,
    format,
    handicapPercent,
    tripOptions,
    courseOptions,
    teeOptions,
    confirmIfNeeded,
    handleCancel,
    handleSubmit,
    setSelectedTripId,
    setSelectedCourseId,
    setSelectedDefaultCourseTeeId,
    setRoundDate,
    setFormat,
    setHandicapPercent,
  };
}
