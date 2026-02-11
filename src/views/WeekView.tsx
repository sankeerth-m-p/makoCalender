import React from "react";
import { DOW, pad2 } from "../calendar/calendarUtils";

interface WeekViewProps {
  year: number;
  monthIndex: number;
  selectedDateISO: string;
  eventsByDate: Map<string, string[]>;
  today: string;
  onChangeWeek: (newDateISO: string) => void;
}


export default function WeekView({
  year,
  monthIndex,
  selectedDateISO,
  eventsByDate,
  today,
  onChangeWeek,
}: WeekViewProps) {

  void year;
  void monthIndex;
function shiftWeek(days: number) {
  const d = new Date(selectedDateISO);
  d.setDate(d.getDate() + days);
  onChangeWeek(toLocalISO(d));
}

  function toLocalISO(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  const selectedDate = new Date(selectedDateISO);
  const dayOfWeek = selectedDate.getDay();
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - dayOfWeek);

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
    {/* Week Navigation */}
<div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
  <button
    onClick={() => shiftWeek(-7)}
    className="px-3 py-1 text-sm rounded hover:bg-slate-100"
  >
    ← Prev
  </button>

  <div className="text-sm font-semibold text-slate-700">
    Week of {weekStart.toDateString()}
  </div>

  <button
    onClick={() => shiftWeek(7)}
    className="px-3 py-1 text-sm rounded hover:bg-slate-100"
  >
    Next →
  </button>
</div>


      {/* All-day events */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
        <div className="border-r border-slate-200 p-2 text-right text-xs text-slate-500">
          All-day
        </div>
        {weekDays.map((d, idx) => {
          const dateISO = toLocalISO(d);
          const events = eventsByDate.get(dateISO) || [];
          return (
            <div
              key={idx}
              className="border-r border-slate-200 p-2 min-h-[60px] bg-white"
            >
              <div className="text-xs mt-1 space-y-1">
                {events.map((ev, eventIdx) => (
                  <div
                    key={eventIdx}
                    className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded truncate"
                  >
                    {ev}
                  </div>
                ))}
                {/* {events.length > 3 && (
                  <div className="text-slate-500 text-[10px]">
                    +{events.length - 3} more
                  </div>
                )} */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      {/* <div className="flex-1  overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {Array.from({ length: 24 }).map((_, hour) => (
            <React.Fragment key={hour}>
              <div className="border-r border-b border-slate-200 p-2 text-right text-xs text-slate-500">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {weekDays.map((_, idx) => (
                <div
                  key={idx}
                  className="border-r border-b border-slate-200 min-h-[60px] bg-white"
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div> */}
    </div>
  );
}
