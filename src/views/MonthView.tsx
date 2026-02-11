import { DOW } from "../calendar/calendarUtils";
import type { CalendarCell } from "../calendar/types";

interface MonthViewProps {
  weeks: (CalendarCell | null)[][];
  eventsByDate: Map<string, string[]>;
  selectedDateISO: string;
  today: string;
  onDateSelect: (dateISO: string) => void;
  onAddEvent: (dateISO: string) => void;
}

export default function MonthView({
  weeks,
  eventsByDate,
  selectedDateISO,
  today,
  onDateSelect,
  onAddEvent,
}: MonthViewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        {DOW.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold text-slate-600 uppercase border-r border-slate-200 last:border-r-0"
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
                  className={`group relative border-r border-b border-slate-200 p-2 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* Add Event Button */}
                 

                  {/* Day Number */}
                  <div
                    className={`text-xs mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-600"
                    }`}
                  >
                    {cell.day}
                  </div>

                  {/* Events */}
                  <div className="mt-1 max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                    {events.map((ev, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded truncate"
                      >
                        {ev}
                      </div>
                    ))}
                  </div><button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddEvent(cell.dateISO);
                        }}
                        className="h-7 mt-1  w-full rounded-md border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 opacity-0 transition-opacity hover:bg-blue-100 group-hover:opacity-100 focus:opacity-100"
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
  );
}
