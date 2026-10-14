import type { CSSProperties } from "react";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { formatWholeDollarCurrency } from "../utils/moneyFormat";
import { buttonStyle, pageContainerWideStyle, sectionStyle } from "../styles/uiStyles";
import type { TripDetail } from "../types/trip";
import type {
  PlayerPublishRow,
  RoundPrizeColumn,
  TournamentPositionColumn,
} from "./tripWinningDetailLogic";
import { formatPaidAt } from "./tripWinningDetailLogic";

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: "#fff",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #c7ccd1",
  padding: "8px 10px",
  fontSize: "14px",
  fontWeight: 700,
  color: "#111",
  verticalAlign: "bottom",
  lineHeight: 1.2,
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px 10px",
  fontSize: "14px",
  lineHeight: 1.25,
  verticalAlign: "top",
};

const centeredTextStyle: CSSProperties = { textAlign: "center" };
const numberCellStyle: CSSProperties = { ...tdStyle, textAlign: "right", whiteSpace: "nowrap" };
const totalRowStyle: CSSProperties = {
  ...tdStyle,
  borderTop: "1px solid #c7ccd1",
  borderBottom: "none",
  fontWeight: 700,
};

type Props = {
  trip: TripDetail;
  columns: RoundPrizeColumn[];
  tournamentColumns: TournamentPositionColumn[];
  rows: PlayerPublishRow[];
  totalPayout: number;
  totalPaid: number;
  totalUnpaid: number;
  unpaidCount: number;
  savingPlayerId: number | null;
  savingAllPaid: boolean;
  onMoneyDistribution: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  onMarkAllPaid: () => void;
  onTogglePaid: (playerId: number, paid: boolean) => void;
};

export function TripWinningDetailBody({
  trip,
  columns,
  tournamentColumns,
  rows,
  totalPayout,
  totalPaid,
  totalUnpaid,
  unpaidCount,
  savingPlayerId,
  savingAllPaid,
  onMoneyDistribution,
  onPrint,
  onExportCsv,
  onMarkAllPaid,
  onTogglePaid,
}: Props) {
  return (
    <div style={pageContainerWideStyle} className="winning-detail-print-root">
      <PageHeader
        title="Winning Detail"
        subtitle={`${trip.tripName} - Published payout summary`}
        className="winning-detail-no-print"
        actions={
          <>
            <TripDetailButton tripId={trip.tripId} />
            <ReportsButton tripId={trip.tripId} />
            <WorkflowBackButton label="Back to Event Detail" to={`/trips/${trip.tripId}`} />
            <button type="button" style={buttonStyle} onClick={onMoneyDistribution}>
              Money Distribution
            </button>
            <button type="button" style={buttonStyle} onClick={onPrint}>Print</button>
            <button type="button" style={buttonStyle} onClick={onExportCsv}>Export CSV</button>
          </>
        }
      />

      <div className="winning-detail-print-header print-only">
        <h1 className="winning-detail-print-title">Winning Detail</h1>
        <div className="winning-detail-print-subtitle">
          {trip.tripName} - Published payout summary
        </div>
      </div>

      <section className="winning-detail-print-table-wrap" style={{ ...sectionStyle, maxWidth: "100%", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "12px" }}>
          <h2 className="winning-detail-section-title" style={{ margin: 0, fontSize: "20px", lineHeight: 1.2 }}>
            Winning Detail
          </h2>
          <div className="winning-detail-screen-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} disabled={savingAllPaid || unpaidCount === 0} onClick={onMarkAllPaid}>
              {savingAllPaid ? "Saving..." : "Mark All Paid"}
            </button>
            <div style={{ fontSize: "13px", color: "#555", fontWeight: 700, textAlign: "right" }}>
              <div>Total Payout: {formatWholeDollarCurrency(totalPayout)}</div>
              <div>Paid: {formatWholeDollarCurrency(totalPaid)}</div>
              <div>Unpaid: {formatWholeDollarCurrency(totalUnpaid)}</div>
            </div>
          </div>
        </div>

        <table style={{ ...tableStyle, minWidth: Math.max(900, 430 + columns.length * 125 + tournamentColumns.length * 110), maxWidth: "100%" }}>
          <colgroup>
            <col style={{ width: "190px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "82px" }} />
            <col style={{ width: "58px" }} />
            {columns.map((column) => <col key={column.key} style={{ width: "125px" }} />)}
            {tournamentColumns.map((column) => <col key={column.key} style={{ width: "110px" }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Money</th>
              <th style={{ ...thStyle, ...centeredTextStyle }}>Paid</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Rank</th>
              {columns.map((column) => (
                <th key={column.key} style={{ ...thStyle, ...centeredTextStyle }}>
                  <div>{column.roundName}</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px", fontWeight: 600 }}>
                    {[column.dayLabel, column.dateLabel].filter(Boolean).join(" - ")}
                  </div>
                </th>
              ))}
              {tournamentColumns.map((column) => (
                <th key={column.key} style={{ ...thStyle, ...centeredTextStyle }}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isUnpaidWinner = row.totalMoney > 0 && !row.paid;
              const rowBackground = isUnpaidWinner ? "#fff7ed" : index % 2 === 0 ? "#fff" : "#f7f7f7";
              return (
                <tr key={row.playerKey} style={{ background: rowBackground }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.playerName}</td>
                  <td style={{ ...numberCellStyle, fontWeight: 700 }}>{formatWholeDollarCurrency(row.totalMoney)}</td>
                  <td style={{ ...tdStyle, ...centeredTextStyle }}>
                    {row.totalMoney > 0 ? (
                      <label className="winning-detail-paid-label" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }} title={row.paidAt ? `Paid ${formatPaidAt(row.paidAt)}` : undefined}>
                        <input type="checkbox" checked={row.paid} disabled={savingPlayerId === row.playerId} onChange={(event) => onTogglePaid(row.playerId, event.target.checked)} />
                        {row.paid ? "Paid" : "Open"}
                      </label>
                    ) : ""}
                  </td>
                  <td style={numberCellStyle}>{row.totalMoney > 0 ? row.rank : ""}</td>
                  {columns.map((column) => <td key={column.key} style={tdStyle}>{row.roundCells[column.key] ?? ""}</td>)}
                  {tournamentColumns.map((column) => <td key={column.key} style={{ ...tdStyle, ...centeredTextStyle }}>{row.tournamentPositions[column.key] ?? ""}</td>)}
                </tr>
              );
            })}
            <tr>
              <td style={{ ...totalRowStyle, textAlign: "right" }}>Total Payout:</td>
              <td style={{ ...totalRowStyle, textAlign: "right" }}>{formatWholeDollarCurrency(totalPayout)}</td>
              <td style={{ ...totalRowStyle, textAlign: "center" }}>{formatWholeDollarCurrency(totalPaid)}</td>
              <td style={totalRowStyle} />
              {columns.map((column) => <td key={column.key} style={totalRowStyle} />)}
              {tournamentColumns.map((column) => <td key={column.key} style={totalRowStyle} />)}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
