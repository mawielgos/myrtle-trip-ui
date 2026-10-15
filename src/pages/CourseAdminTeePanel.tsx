import { buttonStyle, dangerButtonStyle, sectionStyle } from "../styles/uiStyles";
import { formatValue, formatCourseRating, formatNumber, hasMenRatingData, hasWomenRatingData } from "./courseAdminEditLogic";
import type { useCourseAdminEditController } from "./useCourseAdminEditController";

type Controller = ReturnType<typeof useCourseAdminEditController>;
type Props = Pick<Controller, "form" | "tees" | "activeTeeCount" | "sortedTees" | "isNew" | "courseDetail" | "navigateIfConfirmed" | "handleToggleTeeActive">;

export default function CourseAdminTeePanel({ form, tees, activeTeeCount, sortedTees, isNew, courseDetail, navigateIfConfirmed, handleToggleTeeActive }: Props) {
  return (
        <div style={{ minWidth: 0 }}>
          <div style={{ ...sectionStyle, marginBottom: "16px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Summary</h2>
            <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: "#444" }}>
              <div>
                Status: <strong>{form.active ? "Active" : "Inactive"}</strong>
              </div>
              <div>
                Tees: <strong>{tees.length}</strong>
              </div>
              <div>
                Active Tees: <strong>{activeTeeCount}</strong>
              </div>
              <div>
                Location: <strong>{formatValue(form.location)}</strong>
              </div>
            </div>
          </div>

          {!isNew && courseDetail ? (
            <div style={{ ...sectionStyle, marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <h2 style={{ margin: 0 }}>Tees</h2>
                <button
                  style={buttonStyle}
                  onClick={() => void navigateIfConfirmed(`/admin/courses/${courseDetail.courseId}/tees/new`)}
                >
                  Add Tee
                </button>
              </div>

              {tees.length === 0 ? (
                <div style={{ color: "#555", fontSize: "14px" }}>No tees defined yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "6px" }}>
                  {sortedTees.map((tee) => {
                    const menDataAvailable = hasMenRatingData(tee);
                    const womenDataAvailable = hasWomenRatingData(tee);

                    return (
                      <div
                        key={tee.teeId}
                        style={{
                          border: "1px solid #e1e5ea",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          background: tee.active ? "#fafafa" : "#f4f4f5",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: "8px",
                            alignItems: "start",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flexWrap: "wrap",
                                marginBottom: "2px",
                              }}
                            >
                              <span style={{ fontWeight: 800, fontSize: "15px", lineHeight: 1.15 }}>
                                {tee.teeName}
                              </span>
                              {tee.teeType === "COMBO" ? (
                                <span
                                  style={{
                                    border: "1px solid #bfdbfe",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: "999px",
                                    padding: "1px 6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Combo
                                </span>
                              ) : null}
                              {!tee.active ? (
                                <span
                                  style={{
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    padding: "1px 6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Inactive
                                </span>
                              ) : null}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px 10px",
                                fontSize: "12px",
                                color: "#374151",
                                lineHeight: 1.25,
                              }}
                            >
                              {menDataAvailable ? (
                                <span>
                                  <strong>(M)</strong> CR {formatCourseRating(tee.courseRating)} / Slope {formatNumber(tee.slope)}
                                </span>
                              ) : null}
                              {womenDataAvailable ? (
                                <span>
                                  <strong>(W)</strong> CR {formatCourseRating(tee.womenCourseRating)} / Slope {formatNumber(tee.womenSlope)}
                                </span>
                              ) : null}
                              {!menDataAvailable && !womenDataAvailable ? <span>CR/Slope —</span> : null}
                              <span>
                                Par {formatNumber(tee.parTotal)}
                                {tee.womenParTotal != null && tee.womenParTotal !== tee.parTotal
                                  ? ` / W ${tee.womenParTotal}`
                                  : ""}
                              </span>
                              <span>Yards {formatNumber(tee.yardageTotal)}</span>
                              <span>Effective {tee.effectiveDate ?? "1900-01-01"}</span>
                              {tee.retiredDate ? <span>Retired {tee.retiredDate}</span> : null}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              style={{ ...buttonStyle, padding: "5px 9px", fontSize: "12px" }}
                              onClick={() =>
                                navigateIfConfirmed(`/admin/courses/${courseDetail.courseId}/tees/${tee.teeId}`)
                              }
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                ...(tee.active ? dangerButtonStyle : buttonStyle),
                                padding: "5px 9px",
                                fontSize: "12px",
                              }}
                              onClick={() => handleToggleTeeActive(tee)}
                            >
                              {tee.active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
  );
}
