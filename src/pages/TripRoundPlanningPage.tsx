import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourses, getCourseTees } from "../api/courseApi";
import {
  getPlannedRounds,
  initializeTrip,
  savePlannedRounds,
} from "../api/tripApi";
import type { CourseListItem, CourseTeeListItem } from "../types/course";
import type { TripPlannedRound } from "../types/trip";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";

type RoundFormatOption = {
  value: string;
  label: string;
};

const formatOptions: RoundFormatOption[] = [
  { value: "MIDDLE_MAN", label: "4-Man Middle Man" },
  { value: "ONE_TWO_THREE", label: "4-Man 1-2-3" },
  { value: "TWO_MAN_LOW_NET", label: "2-Man Low Net" },
  { value: "THREE_LOW_NET", label: "4-Man 3 Low Net" },
  { value: "TEAM_SCRAMBLE", label: "4-Man Scramble" },
];

function formatCourseLabel(course: CourseListItem): string {
  return course.location
    ? `${course.courseName} — ${course.location}`
    : course.courseName;
}

function formatTeeLabel(tee: CourseTeeListItem): string {
  if (tee.courseRating != null && tee.slope != null) {
    return `${tee.teeName} (Rating ${tee.courseRating} / Slope ${tee.slope})`;
  }

  return tee.teeName;
}

export default function TripRoundPlanningPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const [rounds, setRounds] = useState<TripPlannedRound[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [teeOptionsByCourseId, setTeeOptionsByCourseId] = useState<
    Record<number, CourseTeeListItem[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid trip id");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId]);

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [plannedRounds, courseData] = await Promise.all([
        getPlannedRounds(numericTripId),
        getCourses(),
      ]);

      setRounds(plannedRounds);
      setCourses(courseData);

      const uniqueCourseIds = plannedRounds
        .map((round) => round.courseId)
        .filter((courseId): courseId is number => courseId != null);

      const distinctCourseIds = Array.from(new Set(uniqueCourseIds));
      await preloadTees(distinctCourseIds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load planned rounds."
      );
    } finally {
      setLoading(false);
    }
  }

  async function preloadTees(courseIds: number[]): Promise<void> {
    if (courseIds.length === 0) {
      return;
    }

    const results = await Promise.all(
      courseIds.map(async (courseId) => {
        const tees = await getCourseTees(courseId);
        return { courseId, tees };
      })
    );

    setTeeOptionsByCourseId((current) => {
      const next = { ...current };

      for (const result of results) {
        next[result.courseId] = result.tees;
      }

      return next;
    });
  }

  async function ensureTeesLoaded(courseId: number): Promise<void> {
    if (teeOptionsByCourseId[courseId]) {
      return;
    }

    const tees = await getCourseTees(courseId);
    setTeeOptionsByCourseId((current) => ({
      ...current,
      [courseId]: tees,
    }));
  }

  function updateRound(
    roundNumber: number,
    updates: Partial<TripPlannedRound>
  ): void {
    setRounds((current) =>
      current.map((round) =>
        round.roundNumber === roundNumber ? { ...round, ...updates } : round
      )
    );
  }

  async function handleCourseChange(
    roundNumber: number,
    courseIdValue: string
  ): Promise<void> {
    const courseId = courseIdValue ? Number(courseIdValue) : null;

    updateRound(roundNumber, {
      courseId,
      standardTeeId: null,
      alternateTeeId: null,
    });

    if (courseId != null) {
      try {
        await ensureTeesLoaded(courseId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load course tees."
        );
      }
    }
  }

  function validate(): string | null {
    if (rounds.length === 0) {
      return "No planned rounds found.";
    }

    for (const round of rounds) {
      if (!round.roundDate) {
        return `Round ${round.roundNumber} must have a date.`;
      }

      if (!round.format) {
        return `Round ${round.roundNumber} must have a format.`;
      }

      if (round.courseId == null) {
        return `Round ${round.roundNumber} must have a course.`;
      }

      if (round.standardTeeId == null) {
        return `Round ${round.roundNumber} must have a standard tee.`;
      }

      if (
        round.alternateTeeId != null &&
        round.alternateTeeId === round.standardTeeId
      ) {
        return `Round ${round.roundNumber} alternate tee must be different from the standard tee.`;
      }
    }

    return null;
  }

  async function handleSave(): Promise<void> {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const saved = await savePlannedRounds(numericTripId, {
        rounds: sortedRounds.map((round) => ({
          roundNumber: round.roundNumber,
          roundDate: round.roundDate,
          courseId: round.courseId,
          standardTeeId: round.standardTeeId,
          alternateTeeId: round.alternateTeeId,
          format: round.format,
        })),
      });

      setRounds(saved);
      setMessage("Planned rounds saved.");
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to save planned rounds."
      );
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleInitializeTrip(): Promise<void> {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    try {
      setInitializing(true);
      setError(null);
      setMessage(null);

      await savePlannedRounds(numericTripId, {
        rounds: sortedRounds.map((round) => ({
          roundNumber: round.roundNumber,
          roundDate: round.roundDate,
          courseId: round.courseId,
          standardTeeId: round.standardTeeId,
          alternateTeeId: round.alternateTeeId,
          format: round.format,
        })),
      });

      await initializeTrip(numericTripId);
      navigate(`/trips/${numericTripId}`);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to initialize trip."
      );
      setMessage(null);
    } finally {
      setInitializing(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading planned rounds...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div style={{ marginBottom: "16px" }}>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => navigate(`/trips/${numericTripId}`)}
        >
          Back to Trip
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px 0" }}>Trip Round Planning</h1>
          <div style={{ color: "#555" }}>
            Set the 5 rounds before initializing the trip.
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            style={buttonStyle}
            type="button"
            onClick={handleSave}
            disabled={saving || initializing}
          >
            {saving ? "Saving..." : "Save Planned Rounds"}
          </button>

          <button
            style={primaryButtonStyle}
            type="button"
            onClick={handleInitializeTrip}
            disabled={saving || initializing}
          >
            {initializing ? "Initializing..." : "Save + Initialize Trip"}
          </button>
        </div>
      </div>

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      <div style={warningBoxStyle}>
        Every planned round needs a date, format, course, and standard tee before initialization.
      </div>

      {sortedRounds.length === 0 ? (
        <div style={sectionStyle}>No planned rounds found.</div>
      ) : (
        <div style={sectionStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Round</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Format</th>
                <th style={thStyle}>Course</th>
                <th style={thStyle}>Standard Tee</th>
                <th style={thStyle}>Alternate Tee</th>
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((round) => {
                const teeOptions =
                  round.courseId != null
                    ? teeOptionsByCourseId[round.courseId] ?? []
                    : [];

                return (
                  <tr key={round.plannedRoundId}>
                    <td style={tdStyle}>
                      <strong>{round.roundNumber}</strong>
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="date"
                        value={round.roundDate ?? ""}
                        onChange={(e) =>
                          updateRound(round.roundNumber, {
                            roundDate: e.target.value || null,
                          })
                        }
                        style={formInputStyle}
                        disabled={saving || initializing}
                      />
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={round.format ?? ""}
                        onChange={(e) =>
                          updateRound(round.roundNumber, {
                            format: e.target.value || null,
                          })
                        }
                        style={formSelectStyle}
                        disabled={saving || initializing}
                      >
                        <option value="">Select format</option>
                        {formatOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={round.courseId ?? ""}
                        onChange={(e) =>
                          void handleCourseChange(round.roundNumber, e.target.value)
                        }
                        style={formSelectStyle}
                        disabled={saving || initializing}
                      >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={course.courseId} value={course.courseId}>
                            {formatCourseLabel(course)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={round.standardTeeId ?? ""}
                        onChange={(e) =>
                          updateRound(round.roundNumber, {
                            standardTeeId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        style={formSelectStyle}
                        disabled={
                          saving ||
                          initializing ||
                          round.courseId == null
                        }
                      >
                        <option value="">Select standard tee</option>
                        {teeOptions.map((tee) => (
                          <option key={tee.courseTeeId} value={tee.courseTeeId}>
                            {formatTeeLabel(tee)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={round.alternateTeeId ?? ""}
                        onChange={(e) =>
                          updateRound(round.roundNumber, {
                            alternateTeeId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        style={formSelectStyle}
                        disabled={
                          saving ||
                          initializing ||
                          round.courseId == null
                        }
                      >
                        <option value="">No alternate tee</option>
                        {teeOptions.map((tee) => (
                          <option key={tee.courseTeeId} value={tee.courseTeeId}>
                            {formatTeeLabel(tee)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}