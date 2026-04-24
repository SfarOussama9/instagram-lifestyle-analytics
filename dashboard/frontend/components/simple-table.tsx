type Props = {
  columns: string[];
  rows: Array<Record<string, string | number | null | undefined>>;
};

export function SimpleTable({ columns, rows }: Props) {
  return (
    <div className="max-w-full overflow-x-auto rounded-3xl border border-black/[0.06] bg-white">
      <table className="min-w-[640px] w-full divide-y divide-black/[0.06] text-left text-sm text-inkSoft">
        <thead className="bg-[rgba(221,42,123,0.04)] text-xs uppercase tracking-[0.24em] text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 font-semibold sm:px-4">
                {column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {rows.map((row, index) => (
            <tr key={index} className="transition hover:bg-[rgba(221,42,123,0.03)]">
              {columns.map((column) => (
                <td key={column} className="px-3 py-3 text-ink sm:px-4">
                  {typeof row[column] === "number" ? Number(row[column]).toFixed(2) : String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
