import { cn } from "@/lib/utils";
import type { Align, RenderCell, TableColumn } from "./table.types";

export type { TableColumn, RenderCell, Align };

export function Table<T>({
  columns,
  rows,
  rowKey,
  className,
  empty,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  className?: string;
  empty?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2 font-semibold",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && empty ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                      )}
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
    </div>
  );
}
