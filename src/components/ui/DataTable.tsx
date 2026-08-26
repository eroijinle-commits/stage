import { DataTableProps, DataTableColumn } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { SkeletonRow } from "./Skeleton";

function SortIcon({ column, sortColumn, sortDirection }: { column: string; sortColumn?: string; sortDirection?: "asc" | "desc" }) {
  if (sortColumn !== column) return <ChevronsUpDown size={12} className="text-muted-foreground/50" />;
  return sortDirection === "asc" ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
}

export default function DataTable<T>({
  columns, data, rowKey, selectable, selectedRows = [], onRowSelect, onSelectAll,
  sortColumn, sortDirection, onSort, pagination, loading, emptyState, onRowClick,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm font-mono border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-8 px-3 py-2.5 text-left">
                  <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="accent-primary w-3.5 h-3.5 cursor-pointer" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  className={cn(
                    "px-3 py-2.5 text-xs text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && "cursor-pointer hover:text-foreground select-none",
                  )}
                >
                  <div className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                    {col.header}
                    {col.sortable && <SortIcon column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} cols={columns.length + (selectable ? 1 : 0)} />)
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12 text-muted-foreground text-xs">{emptyState ?? "No data"}</td></tr>
            ) : (
              data.map((row) => {
                const id = rowKey(row);
                const isSelected = selectedRows.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-muted/30",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onRowSelect?.(id, e.target.checked); }}
                          className="accent-primary w-3.5 h-3.5 cursor-pointer" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-3 py-2.5 whitespace-nowrap", col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs font-mono text-muted-foreground">
          <span>{pagination.total} results</span>
          <div className="flex items-center gap-1">
            <button disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-muted transition-colors">Prev</button>
            <span className="px-2 text-foreground">{pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}</span>
            <button disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)} onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
