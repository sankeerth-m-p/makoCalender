import type { MonthRow } from "../calendar/types";

interface EventsGridViewProps {
  rows: MonthRow[];
  eventCols: string[];
  selectedDateISO: string;
  setSelectedDateISO: (dateISO: string) => void;
  updateCell: (dateISO: string, col: string, value: string) => void;
  clearMonth: () => void;
}

export default function EventsGridView({
  rows,
  eventCols,
  selectedDateISO,
  setSelectedDateISO,
  updateCell,
  clearMonth,
}: EventsGridViewProps) {
  void clearMonth;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-350 border-collapse">
        <thead>
          <tr className="bg-slate-50 sticky top-0 z-10">
            <th className="sticky left-0 z-11 min-w-35 border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700 bg-slate-50">
              Date
            </th>
            {eventCols.map((c) => (
              <th
                key={c}
                className="min-w-35 border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelected = r.dateISO === selectedDateISO;
            return (
              <tr
                key={r.dateISO}
                className={`transition-colors ${
                  isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <td
                  onClick={() => setSelectedDateISO(r.dateISO)}
                  className={`sticky left-0 z-1 border border-slate-200 px-3 py-3 text-sm font-medium cursor-pointer ${
                    isSelected ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  {r.dateLabel}
                </td>
                {eventCols.map((c) => (
                  <td key={c} className="border border-slate-200 p-0">
                    <input
                      value={r.events[c] || ""}
                      onFocus={() => setSelectedDateISO(r.dateISO)}
                      onChange={(e) => updateCell(r.dateISO, c, e.target.value)}
                      className="w-full h-full px-3 py-3 border-none bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                      placeholder=""
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
