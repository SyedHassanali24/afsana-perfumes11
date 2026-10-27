/** Generic responsive admin data table. */
export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyMessage = "Nothing here yet.",
  onRowClick,
  pagination,
}) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-[11px] uppercase tracking-wide font-semibold text-ink-muted whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/60">
                {columns.map((col) => (
                  <td key={col.key} className="py-3.5 px-4">
                    <div className="h-3 rounded-full bg-border/70 animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="py-14 px-4 text-center text-ink-muted">{emptyMessage}</td></tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border/60 last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-bg/70" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 text-ink whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-border text-sm">
          <span className="text-ink-muted">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => pagination.onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3.5 py-2 rounded-lg border border-border text-ink disabled:opacity-40 hover:bg-bg transition-colors flex-1 sm:flex-none">Previous</button>
            <button onClick={() => pagination.onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3.5 py-2 rounded-lg border border-border text-ink disabled:opacity-40 hover:bg-bg transition-colors flex-1 sm:flex-none">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
