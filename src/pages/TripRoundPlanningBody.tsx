import type { useTripRoundPlanningPageData } from "./useTripRoundPlanningPageData";
import type { useTripRoundPlanningCommands } from "./useTripRoundPlanningCommands";
import type { useTripRoundPlanningInteractions } from "./useTripRoundPlanningInteractions";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  formInputStyle,
  formSelectStyle,
  sectionStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import {
  MAX_PLANNED_ROUND_COUNT,
  defaultEventName,
  eventBadges,
  eventModeLabel,
  eventSummary,
  formatCourseLabel,
  formatDisplayDate,
  formatMenTeeLabel,
  formatTripDateRange,
  formatWomenTeeLabel,
  individualEventOptions,
  hasEvent,
  isMenTeeEligible,
  isWomenTeeEligible,
  normalizeEvents,
  primaryGameSelectValue,
  roundKey,
  sortTeesByRatingDesc,
  teeSummary,
  formatOptions,
} from "./tripRoundPlanningLogic";

type TripRoundPlanningData = ReturnType<typeof useTripRoundPlanningPageData>;
type TripRoundPlanningCommands = ReturnType<typeof useTripRoundPlanningCommands>;
type TripRoundPlanningInteractions = ReturnType<typeof useTripRoundPlanningInteractions>;

interface TripRoundPlanningBodyProps {
  data: TripRoundPlanningData;
  commands: TripRoundPlanningCommands;
  interactions: TripRoundPlanningInteractions;
  isReadOnly: boolean;
  onTournamentSetupClick: () => void;
}

export default function TripRoundPlanningBody({
  data,
  commands,
  interactions,
  isReadOnly,
  onTournamentSetupClick,
}: TripRoundPlanningBodyProps) {
  const {
    courses,
    teeOptionsByCourseId,
    expandedRoundKey,
    tripStartDate,
    tripEndDate,
    plannedRoundCount,
  } = data;

  const {
    saving,
    isBusy,
    pendingRemoveRound,
    handleAddRound,
    handleRemoveRound,
    confirmRemoveRound,
    cancelRemoveRound,
    handleSave,
  } = commands;

  const {
    sortedRounds,
    supportsMultiRoundTournament,
    updateRound,
    updateRoundEvent,
    removeRoundEvent,
    moveRoundEvent,
    handleCourseChange,
    handlePrimaryGameChange,
    toggleIndividualEvent,
    toggleExpandedRound,
  } = interactions;

  return (
    <>
      {pendingRemoveRound ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-planned-round-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #d0d7de",
              borderRadius: "12px",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.22)",
              maxWidth: "520px",
              width: "100%",
              padding: "18px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div>
              <h3 id="remove-planned-round-title" style={{ margin: "0 0 6px" }}>
                Remove Planned Round?
              </h3>
              <div style={{ color: "#444", fontSize: "14px", lineHeight: 1.45 }}>
                Remove <strong>Round {pendingRemoveRound.roundNumber}</strong>? Any unsaved setup details for this round will be discarded.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={cancelRemoveRound}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  background: "#b42318",
                  borderColor: "#b42318",
                }}
                onClick={confirmRemoveRound}
                disabled={isBusy}
              >
                Remove Round
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {isReadOnly ? (
        <div
          style={{
            ...warningBoxStyle,
            background: "#eef5ff",
            border: "1px solid #bfd3f2",
            color: "#244a7c",
          }}
        >
          This trip has already been initialized. Planned rounds are read-only.
        </div>
      ) : null}

      <div style={{ ...sectionStyle, display: "grid", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Planned Rounds</h2>
            <div style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
              Add/remove rounds here, then choose each round's date, game, course, and default tees. Round numbers are assigned by date order when saved.
            </div>
          </div>

          <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
            <div style={{ color: "#555", fontSize: "14px", textAlign: "right" }}>
              <strong>{sortedRounds.length}</strong> rounds planned
              {plannedRoundCount > 0 && plannedRoundCount !== sortedRounds.length ? <> of <strong>{plannedRoundCount}</strong></> : null}
              <br />
              {formatTripDateRange(tripStartDate, tripEndDate)}
            </div>
            {!isReadOnly ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={handleAddRound}
                disabled={isBusy || sortedRounds.length >= MAX_PLANNED_ROUND_COUNT}
              >
                Add Round
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #d6e4ff",
            borderRadius: "10px",
            padding: "12px",
            background: "#f8fbff",
            color: "#23436c",
            fontSize: "13px",
            lineHeight: 1.45,
          }}
        >
          Round dates must fall inside the event start/end dates. Saving will update the event's planned round count to match this grid.
          <br />
          <strong>Scramble:</strong> select the Scramble team size here. Seeding method and source rounds are configured later on Group/Team Setup for the Scramble round.
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          {sortedRounds.map((round, index) => {
            const currentRoundKey = roundKey(round);
            const isExpanded = currentRoundKey === expandedRoundKey;
            const displayRoundNumber = index + 1;
            const teeOptions =
              round.courseId != null
                ? teeOptionsByCourseId[round.courseId] ?? []
                : [];
            const menTeeOptions = sortTeesByRatingDesc(teeOptions.filter(isMenTeeEligible), "M");
            const womenTeeOptions = sortTeesByRatingDesc(teeOptions.filter(isWomenTeeEligible), "F");
            const courseSummary = round.courseName ?? "Select course";
            const dateSummary = formatDisplayDate(round.roundDate) ?? "Select date";
            const menTeeSummary = teeSummary(round.defaultTeeName ?? round.standardTeeName, "Select men's tee");
            const womenTeeSummary = teeSummary(round.womenDefaultTeeName, "Select women's tee");

            return (
              <div
                key={currentRoundKey}
                style={{
                  border: "1px solid #d8dee4",
                  borderRadius: "12px",
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleExpandedRound(currentRoundKey)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "#fff",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "42px 150px minmax(280px, 1.5fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) minmax(140px, 0.7fr) 24px",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "999px",
                      background: round.format === "TEAM_SCRAMBLE" ? "#6f42c1" : "#198754",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    {displayRoundNumber}
                  </span>

                  <span>
                    <strong>{dateSummary}</strong>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Round {displayRoundNumber}</span>
                  </span>

                  <span style={{ color: round.courseName ? "#111827" : "#777" }}>
                    <strong>{courseSummary}</strong>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Course</span>
                  </span>

                  <span>
                    <span>{menTeeSummary}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Men's tee</span>
                  </span>

                  <span>
                    <span>{womenTeeSummary}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Women's tee</span>
                  </span>

                  <span>
                    <span>{eventSummary(round)}</span>
                    <br />
                    <span style={{ color: "#667085", fontSize: "12px" }}>Events</span>
                  </span>

                  <span style={{ textAlign: "right", fontSize: "18px" }}>{isExpanded ? "⌃" : "⌄"}</span>
                </button>

                {isExpanded ? (
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      padding: "14px",
                      display: "grid",
                      gap: "14px",
                      background: "#fcfcfc",
                    }}
                  >
                    {!isReadOnly ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() => handleRemoveRound(currentRoundKey)}
                          disabled={isBusy || sortedRounds.length <= 1}
                        >
                          Remove Round
                        </button>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "170px minmax(260px, 1.2fr) minmax(260px, 1fr) minmax(260px, 1fr)",
                        gap: "12px",
                        alignItems: "start",
                      }}
                    >
                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Date
                        <input
                          type="date"
                          value={round.roundDate ?? ""}
                          min={tripStartDate ?? undefined}
                          max={tripEndDate ?? undefined}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              roundDate: e.target.value || null,
                            })
                          }
                          style={{ ...formInputStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        />
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Course
                        <select
                          value={round.courseId ?? ""}
                          onChange={(e) => void handleCourseChange(currentRoundKey, e.target.value)}
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        >
                          <option value="">Select course</option>
                          {courses.map((course) => (
                            <option key={course.courseId} value={course.courseId}>
                              {formatCourseLabel(course)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Men's Default Tee
                        <select
                          value={round.defaultTeeId ?? ""}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              defaultTeeId: e.target.value ? Number(e.target.value) : null,
                              defaultTeeName: null,
                            })
                          }
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly || round.courseId == null}
                        >
                          <option value="">Select men's default tee</option>
                          {menTeeOptions.map((tee) => (
                            <option key={tee.courseTeeId} value={tee.courseTeeId}>
                              {formatMenTeeLabel(tee)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Women's Default Tee
                        <select
                          value={round.womenDefaultTeeId ?? ""}
                          onChange={(e) =>
                            updateRound(currentRoundKey, {
                              womenDefaultTeeId: e.target.value ? Number(e.target.value) : null,
                              womenDefaultTeeName: null,
                            })
                          }
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly || round.courseId == null}
                        >
                          <option value="">Select women's default tee</option>
                          {womenTeeOptions.map((tee) => (
                            <option key={tee.courseTeeId} value={tee.courseTeeId}>
                              {formatWomenTeeLabel(tee)}
                            </option>
                          ))}
                        </select>
                        <span style={{ color: "#667085", fontSize: "12px", fontWeight: 400 }}>
                          Used for female players added to this event.
                        </span>
                      </label>

                      <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                        Game
                        <select
                          value={primaryGameSelectValue(round)}
                          onChange={(e) =>
                            handlePrimaryGameChange(currentRoundKey, round, e.target.value)
                          }
                          style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                          disabled={isBusy || isReadOnly}
                        >
                          <option value="">Select game</option>
                          {formatOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div style={{ display: "grid", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
                        Individual Events
                        <div style={{ display: "grid", gap: "6px", fontWeight: 400 }}>
                          {individualEventOptions.map((option) => (
                            <label key={option.value} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={hasEvent(round, option.value)}
                                onChange={(e) => toggleIndividualEvent(currentRoundKey, option.value, e.target.checked)}
                                disabled={isBusy || isReadOnly || round.format === "TEAM_SCRAMBLE"}
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                        <span style={{ color: "#667085", fontSize: "12px", fontWeight: 400 }}>
                          Individual side events can be added to scored individual/team rounds. Scramble rounds use team-only scoring.
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: "8px", gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "14px" }}>Event Configuration</div>
                            <div style={{ color: "#667085", fontSize: "12px" }}>
                              These are the scoring events configured for this round.
                            </div>
                          </div>
                        </div>

                        {normalizeEvents(round).map((event, eventIndex) => (
                          <div
                            key={`${event.eventType}-${eventIndex}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 260px) auto",
                              gap: "10px",
                              alignItems: "end",
                              padding: "10px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              background: "#ffffff",
                            }}
                          >
                            <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                              Display Name
                              <input
                                value={event.eventName ?? defaultEventName(event.eventType, event.teamSize)}
                                onChange={(e) => updateRoundEvent(currentRoundKey, eventIndex, { eventName: e.target.value })}
                                style={{ ...formInputStyle, width: "100%", boxSizing: "border-box" }}
                                disabled={isBusy || isReadOnly}
                              />
                            </label>

                            <div style={{ display: "grid", gap: "5px", fontSize: "12px", color: "#475467" }}>
                              <div style={{ fontWeight: 800, color: "#344054" }}>{defaultEventName(event.eventType, event.teamSize)}</div>
                              <div>{eventModeLabel(event.eventType)}</div>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {eventBadges(event).map((badge) => (
                                  <span
                                    key={badge}
                                    style={{
                                      padding: "2px 7px",
                                      borderRadius: "999px",
                                      background: "#f2f4f7",
                                      color: "#344054",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => moveRoundEvent(currentRoundKey, eventIndex, -1)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || eventIndex === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRoundEvent(currentRoundKey, eventIndex, 1)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || eventIndex === normalizeEvents(round).length - 1}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRoundEvent(currentRoundKey, eventIndex)}
                                style={{ ...secondaryButtonStyle, padding: "6px 9px" }}
                                disabled={isBusy || isReadOnly || normalizeEvents(round).length <= 1}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {round.format === "TEAM_SCRAMBLE" ? (
                        <label style={{ display: "grid", gap: "5px", fontWeight: 700, fontSize: "13px" }}>
                          Scramble Size
                          <select
                            value={round.scrambleTeamSize ?? 4}
                            onChange={(e) =>
                              updateRound(currentRoundKey, {
                                scrambleTeamSize: Number(e.target.value),
                                events: [{
                                  eventType: "TEAM_SCRAMBLE",
                                  eventName: defaultEventName("TEAM_SCRAMBLE", Number(e.target.value)),
                                  eventOrder: 1,
                                  teamSize: Number(e.target.value),
                                  handicapPercent: null,
                                }],
                              })
                            }
                            style={{ ...formSelectStyle, width: "100%", boxSizing: "border-box" }}
                            disabled={isBusy || isReadOnly}
                          >
                            <option value={2}>2-person</option>
                            <option value={3}>3-person</option>
                            <option value={4}>4-person</option>
                          </select>
                        </label>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", color: "#666", fontSize: "13px" }}>
          Rounds are shown in the order they will be played. Saving renumbers them by date sequence.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            paddingTop: "8px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          {supportsMultiRoundTournament ? (
            <div style={{ color: "#666", fontSize: "13px" }}>
              Next step after saving: configure the multi-round tournament.
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: "13px" }}>
              Single-round event setup is complete after saving planned rounds.
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!isReadOnly ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={handleAddRound}
                disabled={isBusy || sortedRounds.length >= MAX_PLANNED_ROUND_COUNT}
              >
                Add Round
              </button>
            ) : null}
            {supportsMultiRoundTournament ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => void onTournamentSetupClick()}
              >
                Tournament Setup
              </button>
            ) : null}
            {!isReadOnly ? (
              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  ...(isBusy ? { opacity: 0.55, cursor: "not-allowed" } : {}),
                }}
                onClick={handleSave}
                disabled={isBusy}
              >
                {saving ? "Saving..." : "Save Planned Rounds"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
