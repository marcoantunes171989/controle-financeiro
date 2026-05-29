import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileX, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

interface TableProps<T extends { id?: string }> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
}

export default function Table<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado",
  className,
  onRowClick,
  defaultSortKey,
  defaultSortDir = "asc",
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  function handleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  const sortedData = (() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    return [...data].sort((a, b) => {
      const aVal = col?.sortValue
        ? col.sortValue(a)
        : (a as Record<string, unknown>)[sortKey];
      const bVal = col?.sortValue
        ? col.sortValue(b)
        : (b as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal ?? "").localeCompare(String(bVal ?? ""), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey) return <ChevronsUpDown size={12} className="opacity-40 shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-primary shrink-0" />
      : <ChevronDown size={12} className="text-primary shrink-0" />;
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border", className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted border-b border-border z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                onClick={() => handleSort(col)}
                className={cn(
                  "px-4 py-3 font-medium text-muted-foreground whitespace-nowrap select-none",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right",
                  (!col.align || col.align === "left") && "text-left",
                  col.sortable && "cursor-pointer hover:text-foreground transition-colors"
                )}
              >
                <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                  {col.header}
                  {col.sortable && <SortIcon colKey={col.key} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileX size={32} />
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                className={cn("hover:bg-muted/50 transition-colors", onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.key === "acoes" && "cursor-default"
                    )}
                    onClick={col.key === "acoes" ? (e) => e.stopPropagation() : undefined}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
