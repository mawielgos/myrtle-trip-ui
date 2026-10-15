import type { HandicapCardDetailResponse, HandicapCardsResponse } from "../types/handicapCard";
import { formatHandicapMethod } from "../utils/handicapMethod";
import { formatDecimal, formatScoreValue } from "./handicapCardsLogic";

type Props = {
  detailCards: HandicapCardDetailResponse[];
  data: HandicapCardsResponse | null;
};

export default function HandicapCardsPrintReport({ detailCards, data }: Props) {
  return (
      <div className="handicap-cards-print-report">
        {detailCards.length === 0 ? (
          <div>Click Print to load detailed handicap cards.</div>
        ) : (
          detailCards.map((detail) => (
            <div
              key={`print-card-${detail.playerId}`}
              className="handicap-card-print-card"
            >
              <h1 className="handicap-card-print-title">
                {detail.playerName} Handicap Card
              </h1>
              <div className="handicap-card-print-subtitle">
                {detail.tripName} - As of{" "}
                {detail.asOfDate ?? data?.asOfDate ?? ""}
              </div>
              <div className="handicap-card-print-metrics">
                <div className="handicap-card-print-metric">
                  Event Index<strong>{formatDecimal(detail.tripIndex)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Pending Index
                  <strong>{formatDecimal(detail.pendingTripIndex)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Method
                  <strong>{formatHandicapMethod(detail.handicapMethod)}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Eligible<strong>{detail.eligibleScoreCount ?? ""}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Window<strong>{detail.windowScoreCount ?? ""}</strong>
                </div>
                <div className="handicap-card-print-metric">
                  Used<strong>{detail.usedScoreCount ?? ""}</strong>
                </div>
              </div>
              <table className="handicap-card-print-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Gross</th>
                    <th>Adj</th>
                    <th>CR</th>
                    <th>Slope</th>
                    <th>Diff</th>
                    <th>Holes</th>
                    <th>Source</th>
                    <th>Used</th>
                    <th>Pending</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.scores ?? []).map((score) => (
                    <tr key={score.scoreHistoryEntryId}>
                      <td>{score.scoreDate ?? ""}</td>
                      <td>{score.courseName ?? ""}</td>
                      <td>{formatScoreValue(score.grossScore)}</td>
                      <td>{formatScoreValue(score.adjustedGrossScore)}</td>
                      <td>{formatDecimal(score.courseRating)}</td>
                      <td>{score.slope ?? ""}</td>
                      <td>{formatDecimal(score.differential)}</td>
                      <td>{score.holesPlayed ?? ""}</td>
                      <td>{score.sourceType ?? ""}</td>
                      <td>{score.usedInIndex ? "Y" : ""}</td>
                      <td>{score.pendingForCalculationDate ? "Y" : ""}</td>
                      <td>{score.exclusionReason ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
  );
}
