import { DOW, pad2 } from "../calendar/calendarUtils";

interface WeekViewProps {
  year: number;
  monthIndex: number;
  selectedDateISO: string;
  eventsByDate: Map<string, string[]>;
  today: string;
  onChangeWeek: (newDateISO: string) => void;
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




export default function WeekView({
  year,
  monthIndex,
  selectedDateISO,
  eventsByDate,
  today,
  onChangeWeek,
  onEditEvent,
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
    <div className="w-full h-full overflow-x-auto">
      {/* Keeps UI exact */}
      <div className="min-w-[1000px] h-full flex flex-col bg-white">
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

        {/* ONE GRID for header + row */}
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
                      ? "bg-slate-700 text-white font-bold"
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
              <div
                key={idx}
                className="border-r border-slate-200 p-2 min-h-15 bg-white"
              >
                <div
                  className={`text-xs mt-1 space-y-1 ${
                    events.length > 10 ? "max-h-56 overflow-y-auto pr-1" : ""
                  }`}
                >
                  {events.map((rawEv, eventIdx) => {
                    const parsed = parseTaggedValue(rawEv);
                    const theme = labelToTheme(parsed.labelId);

                    return (
                      <div
                        key={eventIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          // IMPORTANT: send RAW to modal
                          onEditEvent(dateISO, eventIdx, rawEv);
                        }}
                     className={`px-3 py-2 rounded-xl truncate cursor-pointer border shadow-sm ${theme}`}
                        title="Click to edit"
                      >
                        {parsed.text || "(No title)"}
                      </div>
                    );
                  })}

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
    </div>
  );
}
