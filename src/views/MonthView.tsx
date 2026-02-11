import { DOW } from "../calendar/calendarUtils";
import type { CalendarCell } from "../calendar/types";

interface MonthViewProps {
  weeks: (CalendarCell | null)[][];
  year: number;
  monthIndex: number;
  eventsByDate: Map<string, string[]>;
  selectedDateISO: string;
  today: string;
  onDateClick: (dateISO: string) => void;
}

export default function MonthView({
  weeks,
  year,
  monthIndex,
  eventsByDate,
  selectedDateISO,
  today,
  onDateClick,
}: MonthViewProps) {
  void year;
  void monthIndex;

  return (
    <div className="h-full flex flex-col">
      {/* Weekday Headers */}
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
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
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
                  onClick={() => onDateClick(cell.dateISO)}
                  className={`border-r border-b border-slate-200 p-2 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? "bg-blue-600 text-white font-bold" : "text-slate-600"
                    }`}
                  >
                    {cell.day}
                  </div>

                  <div className="text-xs mt-1 space-y-1">
                    {events.slice(0, 3).map((ev, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded truncate"
                      >
                        {ev}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-slate-500 text-[10px]">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
