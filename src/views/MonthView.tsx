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
                     {events.map((ev, idx) => {
  const isImportant =
    ev.trim().startsWith("!") || ev.toUpperCase().startsWith("[IMP]");

  return (
    <div
      key={idx}
      onClick={(e) => {
        e.stopPropagation();
        onEditEvent(cell.dateISO, idx, ev);
      }}
      className={`px-2 py-0.5 rounded truncate ${
        isImportant
          ? "bg-rose-100 text-rose-800 border border-rose-200 font-semibold"
          : "bg-blue-100 text-blue-800"
      }`}
      title={isImportant ? "Important event (Click to edit)" : "Click to edit"}
    >
      {ev}
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
