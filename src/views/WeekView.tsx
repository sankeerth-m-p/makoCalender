
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

  function toLocalISO(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function shiftWeek(days: number) {
    const d = new Date(selectedDateISO);
    d.setDate(d.getDate() + days);
    onChangeWeek(toLocalISO(d));
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
    <div className="h-full flex flex-col bg-white">
      {/* Week Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-30">
        <button
          onClick={() => shiftWeek(-7)}
          className="h-9 px-4 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
        >
          ← Prev
        </button>

        <div className="text-sm font-bold text-slate-800">
          Week of {weekStart.toDateString()}
        </div>

        <button
          onClick={() => shiftWeek(7)}
          className="h-9 px-4 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
        >
          Next →
        </button>
      </div>

      {/* ✅ ONE GRID for header + row with SAME divide-x */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] divide-x divide-slate-200 border-b border-slate-200">
        {/* Left empty block in header */}
        <div className="bg-teal-700 sticky top-[56px] z-20" />

        {/* Header days */}
        {weekDays.map((d, idx) => {
          const dateISO = toLocalISO(d);
          const isToday = dateISO === today;

          return (
            <div
              key={idx}
              className="bg-teal-700 sticky top-[56px] z-20 py-3 text-center"
            >
              <div className="text-xs text-white/90 uppercase font-semibold tracking-wide">
                {DOW[idx]}
              </div>

              <div
                className={`text-2xl mt-2 inline-flex items-center justify-center w-10 h-10 rounded-full
                ${
                  isToday
                    ? "bg-[#314158] text-white font-bold"
                    : "bg-white/10 text-white font-semibold"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}

        {/* All-day label */}
        <div className="px-3 py-3 text-right text-xs font-semibold text-slate-600 bg-slate-50">
          All-day
        </div>

        {/* All-day events cells */}
        {weekDays.map((d, idx) => {
          const dateISO = toLocalISO(d);
          const events = eventsByDate.get(dateISO) || [];

          return (
            <div key={idx} className="p-2 min-h-[140px] bg-white">
              <div className="text-xs mt-1 space-y-2">
                {events.map((ev, eventIdx) => (
                  <div
                    key={eventIdx}
                    className="bg-blue-50 border border-blue-200 text-slate-800 px-3 py-2 rounded-lg truncate"
                    title={ev}
                  >
                    {ev}
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-[11px] text-slate-400 italic">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty space */}
      <div className="flex-1 bg-white" />
    </div>
  );
}
