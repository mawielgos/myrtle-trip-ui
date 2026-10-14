import { sectionStyle, warningBoxStyle } from "../styles/uiStyles";
import { formatMoneyAmount } from "../utils/moneyFormat";
import type { useTripPrizeSetupController } from "./useTripPrizeSetupController";

type PrizeSetupState = ReturnType<typeof useTripPrizeSetupController>;
type Props = Pick<PrizeSetupState, "trip" | "activePlayerCount" | "totalPrizeMoneyCollected" | "totalPrizeMoneyDistributed" | "prizeMoneyRemaining" | "rosterHasActivePlayers" | "showPrizeSetupAsPendingRoster">;

export default function PrizeMoneySummary({ trip, activePlayerCount, totalPrizeMoneyCollected, totalPrizeMoneyDistributed, prizeMoneyRemaining, rosterHasActivePlayers, showPrizeSetupAsPendingRoster }: Props) {
  return <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Total Prize Money Collected
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>
            ${formatMoneyAmount(totalPrizeMoneyCollected)}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            {activePlayerCount} players × $
            {formatMoneyAmount(trip?.entryFee ?? 0)} entry fee
          </div>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Total Prize Money Distributed
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>
            ${formatMoneyAmount(totalPrizeMoneyDistributed)}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            Based on the current unsaved prize setup values
          </div>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Prize Money Remaining
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: "4px",
              color:
                rosterHasActivePlayers && prizeMoneyRemaining < 0
                  ? "#b00020"
                  : "#111",
            }}
          >
            {showPrizeSetupAsPendingRoster
              ? "Pending roster"
              : `$${formatMoneyAmount(prizeMoneyRemaining)}`}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            {showPrizeSetupAsPendingRoster
              ? "Add active players to calculate remaining prize money"
              : "Collected minus distributed"}
          </div>
        </div>
      </div>

      {showPrizeSetupAsPendingRoster ? (
        <div style={{ ...warningBoxStyle, marginBottom: "16px" }}>
          Prize amounts are configured, but this event has no active players
          yet. The remaining balance will be calculated after players are added
          to the roster.
        </div>
      ) : null}

  </>;
}
