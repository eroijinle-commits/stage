import React, { useMemo, useState } from "react";
import { useBetHistory } from "@/hooks/useBetHistory";
import { DataTable, Badge, Select } from "@/components/ui";
import { DataTableColumn, BetHistoryRow } from "@/lib/contracts/ui.contract";
import { BetStatus } from "@/lib/contracts/db.contract";
import SlipDetailModal from "@/components/SlipDetailModal";

const STATUS_VARIANT: Record<BetStatus, "success" | "error" | "warning" | "neutral" | "info"> = {
  won: "success",
  lost: "error",
  pending: "warning",
  cancelled: "neutral",
  cashout: "info",
  settled: "neutral",
  voided: "warning",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "voided", label: "Voided" },
];

export default function HistoryPage() {
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const {
    bets: history,
    isLoading,
    error,
    totalCount,
    page,
    pageSize,
    setPage,
    filter,
    setFilter,
  } = useBetHistory();

  const [sortColumn, setSortColumn] = React.useState("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let rows = filter.status ? history.filter((r) => r.status === filter.status) : history;
    rows = [...rows].sort((a, b) => {
      const av = a[sortColumn as keyof BetHistoryRow] ?? null;
      const bv = b[sortColumn as keyof BetHistoryRow] ?? null;
      const cmp = av === null ? -1 : bv === null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [history, filter.status, sortColumn, sortDir]);

  const handleSort = (col: string) => {
    if (col === sortColumn) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(col);
      setSortDir("desc");
    }
  };

  const columns: DataTableColumn<BetHistoryRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (r) => (
        <span className="text-[10px] tabular-nums">
          {new Date(r.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "matches",
      header: "Fixture",
      render: (r) => <span className="text-xs">{r.matches[0]}</span>,
    },
    {
      key: "market",
      header: "Market",
      render: (r) => <span className="text-xs text-muted-foreground">{r.market}</span>,
    },
    {
      key: "totalOdds",
      header: "Odds",
      align: "right",
      sortable: true,
      render: (r) => <span className="tabular-nums">{r.totalOdds.toFixed(2)}</span>,
    },
    {
      key: "stake",
      header: "Stake",
      align: "right",
      sortable: true,
      render: (r) => <span className="tabular-nums">₦{r.stake.toLocaleString("en-NG")}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (r) => (
        <Badge variant={STATUS_VARIANT[r.status]} size="sm">
          {r.status}
        </Badge>
      ),
    },
    {
      key: "profit",
      header: "P/L",
      align: "right",
      sortable: true,
      render: (r) =>
        r.profit !== null ? (
          <span
            className={`tabular-nums font-medium ${r.profit >= 0 ? "text-bet-won" : "text-bet-lost"}`}
          >
            {r.profit >= 0 ? "+" : ""}₦{r.profit.toLocaleString("en-NG")}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const totals = useMemo(() => {
    const bets = filtered.filter((r) => r.status !== "pending");
    const won = bets.filter((r) => r.status === "won").length;
    const totalStake = bets.reduce((s, r) => s + r.stake, 0);
    const totalPL = bets.reduce((s, r) => s + (r.profit ?? 0), 0);
    return {
      won,
      total: bets.length,
      totalStake,
      totalPL,
      winRate: bets.length ? ((won / bets.length) * 100).toFixed(1) : "0.0",
    };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-muted-foreground">
        Loading bet history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-bet-lost">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span>
            Win rate: <span className="text-foreground">{totals.winRate}%</span>
          </span>
          <span>·</span>
          <span>
            Total stake:{" "}
            <span className="text-foreground">₦{totals.totalStake.toLocaleString("en-NG")}</span>
          </span>
          <span>·</span>
          <span>
            P/L:{" "}
            <span className={totals.totalPL >= 0 ? "text-bet-won" : "text-bet-lost"}>
              {totals.totalPL >= 0 ? "+" : ""}₦{totals.totalPL.toLocaleString("en-NG")}
            </span>
          </span>
        </div>
        <div className="ml-auto w-40">
          <Select
            options={STATUS_OPTIONS}
            value={filter.status ?? ""}
            onChange={(v) => {
              setFilter({ status: (v || null) as BetStatus | null });
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(r) => r.id}
          sortColumn={sortColumn}
          sortDirection={sortDir}
          onSort={handleSort}
          onRowClick={(row) => setSelectedBetId(row.id)}
          pagination={{ page, pageSize, total: totalCount, onPageChange: setPage }}
        />
      </div>
      <SlipDetailModal betId={selectedBetId} onClose={() => setSelectedBetId(null)} />
    </div>
  );
}
