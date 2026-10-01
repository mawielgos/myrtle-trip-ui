import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourses, getCourseTees } from "../api/courseApi";
import { startRound } from "../api/roundApi";
import { getTrips } from "../api/tripApi";
import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { RoundFormat, RoundSetupRequest } from "../types/round";
import type { TripListItem } from "../types/trip";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  gridStyle,
  labelStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";

type Option = {
  id: number;
  label: string;
};

const formatOptions: Array<{ value: RoundFormat; label: string }> = [
  { value: "MIDDLE_MAN", label: "4-Man Middle Man" },
  { value: "ONE_TWO_THREE", label: "4-Man 1-2-3" },
  { value: "TWO_MAN_LOW_NET", label: "2-Man Low Net" },
  { value: "THREE_LOW_NET", label: "4-Man 3 Low Net" },
  { value: "TEAM_SCRAMBLE", label: "Scramble" },
  { value: "STROKE_PLAY", label: "Stroke Play" },
];

function toTripOptions(trips: TripListItem[]): Option[] {
  return trips.map((trip) => ({
    id: trip.tripId,
    label: `${trip.tripName} (${trip.tripYear})`,
  }));
}

function formatCourseRating(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function toCourseOptions(courses: CourseListItem[]): Option[] {
  return courses.map((course) => ({
    id: course.courseId,
    label: course.location
      ? `${course.courseName} — ${course.location}`
      : course.courseName,
  }));
}

function toTeeOptions(tees: CourseTeeListItem[]): Option[] {
  return tees.map((tee) => ({
    id: tee.courseTeeId,
    label:
      tee.courseRating != null && tee.slope != null
        ? `${tee.teeName} ${tee.yardageTotal ? `- ${tee.yardageTotal} yds ` : ""}(Rating ${formatCourseRating(tee.courseRating)} / Slope ${tee.slope}) ${tee.effectiveDate ? `eff. ${tee.effectiveDate}` : ""}`
        : tee.teeName,
  }));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RoundSetupPage() {
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

  const comparableSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedTripId,
      selectedCourseId,
      selectedDefaultCourseTeeId,
      roundDate,
      format,
      handicapPercent,
    });
  }, [
    format,
    handicapPercent,
    roundDate,
    selectedCourseId,
    selectedDefaultCourseTeeId,
    selectedTripId,
  ]);

  const hasChanges =
    !loadingLookups &&
    initialSnapshot.length > 0 &&
    comparableSnapshot !== initialSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) return;
    navigate(path);
  }

  const normalizedHandicapPercent = useMemo(() => {
    const value = Number(handicapPercent);
    return Number.isFinite(value) ? value : NaN;
  }, [handicapPercent]);

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

      setInitialSnapshot(
        JSON.stringify({
          selectedTripId: initialTripId,
          selectedCourseId: "",
          selectedDefaultCourseTeeId: "",
          roundDate: todayIsoDate(),
          format: "MIDDLE_MAN",
          handicapPercent: "100",
        }),
      );
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

  function validate(): string | null {
    if (!selectedTripId) return "Event is required.";
    if (!selectedCourseId) return "Course is required.";
    if (!selectedDefaultCourseTeeId) return "Default tee is required.";
    if (!roundDate) return "Round date is required.";
    if (!format) return "Format is required.";
    if (!Number.isInteger(normalizedHandicapPercent)) {
      return "Handicap percent must be a whole number.";
    }
    if (normalizedHandicapPercent < 0 || normalizedHandicapPercent > 100) {
      return "Handicap percent must be between 0 and 100.";
    }
    return null;
  }

  async function handleSubmit(): Promise<void> {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: RoundSetupRequest = {
        tripId: Number(selectedTripId),
        courseId: Number(selectedCourseId),
        defaultCourseTeeId: Number(selectedDefaultCourseTeeId),
        roundDate,
        format,
        handicapPercent: normalizedHandicapPercent,
      };

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

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Start Round"
        subtitle="Select the event, course, default tee, date, format, and handicap percent. Player-specific tee changes happen on the team/group setup page."
        actions={<TripDetailButton tripId={selectedTripId || undefined} onBeforeNavigate={confirmIfNeeded} />}
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <div style={warningBoxStyle}>
        Select the default tee for the round. Individual player tee overrides are handled later on the team/group assignment page.
      </div>

      <div style={sectionStyle}>
        {loadingLookups ? (
          <div>Loading round setup options...</div>
        ) : (
          <>
            <div style={gridStyle}>
              <label style={labelStyle} htmlFor="tripId">
                Event
                <select
                  id="tripId"
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  <option value="">Select an event</option>
                  {tripOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="courseId">
                Course
                <select
                  id="courseId"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  <option value="">Select a course</option>
                  {courseOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="defaultCourseTeeId">
                Default Tee
                <select
                  id="defaultCourseTeeId"
                  value={selectedDefaultCourseTeeId}
                  onChange={(e) => setSelectedDefaultCourseTeeId(e.target.value)}
                  style={formSelectStyle}
                  disabled={saving || loadingTees || !selectedCourseId}
                >
                  <option value="">
                    {loadingTees ? "Loading tees..." : "Select a default tee"}
                  </option>
                  {teeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="roundDate">
                Round Date
                <input
                  id="roundDate"
                  type="date"
                  value={roundDate}
                  onChange={(e) => setRoundDate(e.target.value)}
                  style={formInputStyle}
                  disabled={saving}
                />
              </label>

              <label style={labelStyle} htmlFor="format">
                Format
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as RoundFormat)}
                  style={formSelectStyle}
                  disabled={saving}
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle} htmlFor="handicapPercent">
                Handicap Percent
                <input
                  id="handicapPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={handicapPercent}
                  onChange={(e) => setHandicapPercent(e.target.value)}
                  style={formInputStyle}
                  disabled={saving || format === "TEAM_SCRAMBLE"}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <button style={buttonStyle} type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button style={primaryButtonStyle} type="button" onClick={() => void handleSubmit()} disabled={saving}>
                {saving ? "Starting Round..." : "Start Round"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
