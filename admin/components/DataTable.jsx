/**
 * Generic table for admin list views (orders, products, customers, etc).
 *
 * @param {{key: string, header: string, render?: (row: object) => React.ReactNode, align?: "left"|"right"}[]} columns
 * @param {object[]} rows
 * @param {boolean} [loading]
 * @param {string} [emptyMessage]
 * @param {(row: object) => void} [onRowClick] - if provided, rows become clickable
 * @param {{page: number, totalPages: number, onPageChange: (page: number) => void}} [pagination]
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyMessage = "Nothing here yet.",
  onRowClick,
  pagination,
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3 font-medium text-ink-muted whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-3">
                      <div className="h-3.5 rounded-sm bg-border/70 animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 px-3 text-center text-ink-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-border/60 last:border-0 hover:bg-bg/60 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-3 text-ink whitespace-nowrap ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
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
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-border text-sm">
          <span className="text-ink-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-sm border border-border text-ink disabled:opacity-40 hover:bg-bg transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-sm border border-border text-ink disabled:opacity-40 hover:bg-bg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
