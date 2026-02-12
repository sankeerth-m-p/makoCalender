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
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[1400px] border-collapse">
        <thead>
          {/* ✅ GREEN SHEET HEADER */}
          <tr className="sticky top-0 z-20 bg-teal-700">
            <th
              className="
                sticky left-0 z-30 min-w-[160px]
                border border-emerald-950/40
                px-4 py-3 text-left text-sm font-bold text-white
                bg-teal-700
              "
            >
              Date
            </th>

            {eventCols.map((c) => (
              <th
                key={c}
                className="
                  min-w-[160px]
                  border border-emerald-950/40
                  px-4 py-3 text-left text-sm font-bold text-white
                "
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
                className={`transition-colors
                  ${
                    isSelected
                      ? "bg-emerald-50"
                      : "bg-white hover:bg-slate-50"
                  }
                `}
              >
                {/* ✅ Sticky Date Column */}
                <td
                  onClick={() => setSelectedDateISO(r.dateISO)}
                  className={`
                    sticky left-0 z-10
                    border border-slate-200
                    px-4 py-3 text-sm font-semibold cursor-pointer
                    ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-white text-slate-800"
                    }
                  `}
                >
                  {r.dateLabel}
                </td>
                {eventCols.map((c) => (
                  <td key={c} className="border border-slate-200 p-0">
                    <input
                      value={r.events[c] || ""}
                      onFocus={() => setSelectedDateISO(r.dateISO)}
                      onChange={(e) => updateCell(r.dateISO, c, e.target.value)}
                      className="
                        w-full h-full px-4 py-3
                        border-none bg-transparent text-sm text-slate-800
                        focus:outline-none
                        focus:bg-emerald-50
                        focus:ring-2 focus:ring-emerald-500/60 focus:ring-inset
                        transition
                      "
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
