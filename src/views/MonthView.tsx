import { DOW } from "../calendar/calendarUtils";
import type { CalendarCell } from "../calendar/types";

interface MonthViewProps {
  weeks: (CalendarCell | null)[][];
  eventsByDate: Map<string, string[]>;
  selectedDateISO: string;
  today: string;
  onDateSelect: (dateISO: string) => void;
  onAddEvent: (dateISO: string) => void;
  onEditEvent: (dateISO: string, eventIndex: number, value: string) => void;
}

// -------------------------
// TAG HELPERS (HIDE LOGIC)
// -------------------------
function parseTaggedValue(raw: string): { labelId: string | null; text: string } {
  const v = (raw || "").trim();
  if (!v) return { labelId: null, text: "" };

  const m1 = v.match(/^__TAG:([A-Z0-9_]+)__\s*(.*)$/);
  if (m1) return { labelId: m1[1] || null, text: (m1[2] || "").trim() };

  const m2 = v.match(/^__([A-Z0-9_]+)__\s*(.*)$/);
  if (m2) return { labelId: m2[1] || null, text: (m2[2] || "").trim() };

  const m3 = v.match(/^\[([A-Z0-9_]+)\]\s*(.*)$/);
  if (m3) return { labelId: m3[1] || null, text: (m3[2] || "").trim() };

  return { labelId: null, text: v };
}

function labelToTheme(labelId: string | null) {
  if (labelId === "IMP")
    return "bg-rose-300 border-rose-500 text-rose-950 font-extrabold";

  if (labelId === "MEET")
    return "bg-sky-300 border-sky-500 text-sky-950 font-extrabold";

  if (labelId === "TASK")
    return "bg-violet-300 border-violet-500 text-violet-950 font-extrabold";

  if (labelId)
    return "bg-emerald-300 border-emerald-500 text-emerald-950 font-extrabold";

  // ✅ NORMAL EVENTS → SAME STYLE AS + BUTTON
  return "bg-sky-50 border-sky-300 text-slate-900 font-normal";
}




export default function MonthView({
  weeks,
  eventsByDate,
  selectedDateISO,
  today,
  onDateSelect,
  onAddEvent,
  onEditEvent,
}: MonthViewProps) {
  return (
    <div className="w-full h-full overflow-x-auto">
      {/* ⭐ Keeps UI EXACT on all devices */}
      <div className="min-w-[900px] h-full flex flex-col">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 sticky top-0 z-10 bg-teal-700 border-b border-emerald-950/40">
          {DOW.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-white uppercase border-r border-emerald-950/30 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          className="flex-1 grid"
          style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((cell, ci) => {
                if (!cell) {
                  return (
                    <div
                      key={ci}
                      className="border-r border-b border-slate-200 bg-slate-50"
                    />
                  );
                }

                const isToday = cell.dateISO === today;
                const isSelected = cell.dateISO === selectedDateISO;
                const events = eventsByDate.get(cell.dateISO) || [];

                return (
                  <div
                    key={ci}
                    onClick={() => onDateSelect(cell.dateISO)}
                    className={`group relative border-r border-b border-slate-200 p-2 cursor-pointer transition-colors
                      ${isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"}
                    `}
                  >
                    {/* Day Number */}
                    <div
                      className={`text-xs mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? "bg-slate-700 text-white font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      {cell.day}
                    </div>

                    {/* Events */}
                    <div className="mt-1 max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                      {events.map((rawEv, idx) => {
                        const parsed = parseTaggedValue(rawEv);
                        const theme = labelToTheme(parsed.labelId);

                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              // IMPORTANT: send RAW value to dashboard modal
                              onEditEvent(cell.dateISO, idx, rawEv);
                            }}
                         className={`px-3 py-2 rounded-xl truncate border shadow-sm ${theme}`}
                            title="Click to edit"
                          >
                            {parsed.text || "(No title)"}
                          </div>
                        );
                      })}
                    </div>

                    {/* + Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddEvent(cell.dateISO);
                      }}
                      className="h-7 mt-1 w-full rounded-md border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700
                                 opacity-0 transition-opacity hover:bg-blue-100 group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Add event for ${cell.dateISO}`}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
