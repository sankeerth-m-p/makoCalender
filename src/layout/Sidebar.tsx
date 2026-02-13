import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  List,
  X,
} from "lucide-react";
import { DOW_SHORT, MONTHS } from "../calendar/calendarUtils";
import type { CalendarCell } from "../calendar/types";

interface SidebarProps {
  setShowImportModal: (value: boolean) => void;
  miniMonthIndex: number;
  setMiniMonthIndex: (value: number) => void;
  miniYear: number;
  setMiniYear: (value: number) => void;
  miniCalendarWeeks: (CalendarCell | null)[][];
  today: string;
  selectedDateISO: string;
  setSelectedDateISO: (value: string) => void;
  eventsByDate: Map<string, string[]>;
  selectedEvents: string[];
  setYear: (value: number) => void;
  setMonthIndex: (value: number) => void;

  // ⭐ NEW FOR RESPONSIVE
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
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


export default function Sidebar({
  setShowImportModal,
  miniMonthIndex,
  setMiniMonthIndex,
  miniYear,
  setMiniYear,
  miniCalendarWeeks,
  today,
  selectedDateISO,
  setSelectedDateISO,
  eventsByDate,
  selectedEvents,
  setYear,
  setMonthIndex,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = React.useState(true);
  const [showSelectedEvents, setShowSelectedEvents] = React.useState(true);

  const isTodaySelected = selectedDateISO === today;

  // Close drawer on ESC
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMobileOpen(false);
    }
    if (isMobileOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  // Sidebar body (same UI)
  const SidebarBody = (
    <div
      className="bg-white border-r border-slate-200 overflow-y-auto transition-all h-full"
      style={{ width: isCollapsed ? 70 : 330 }}
    >
      {/* Top Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-3">
        {/* Mobile close button (ONLY inside drawer) */}
        <div className="lg:hidden mb-2 flex justify-end">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="h-10 w-10 flex items-center justify-center border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            title="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {isCollapsed ? (
          <div className="space-y-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full h-10 flex items-center justify-center border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              title="Expand"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="w-full h-10 flex items-center justify-center bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition shadow-sm"
              title="Import Events"
            >
              <Plus size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-11 w-11 flex items-center justify-center border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              title="Collapse"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex-1 h-11 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Plus size={18} />
              Import Events
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-3 py-4 space-y-4">
          {/* Mini Calendar */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-teal-950/30 bg-teal-700">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CalendarDays size={16} className="text-white/90" />
                {MONTHS[miniMonthIndex]} {miniYear}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    miniMonthIndex === 0
                      ? (setMiniMonthIndex(11), setMiniYear(miniYear - 1))
                      : setMiniMonthIndex(miniMonthIndex - 1)
                  }
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={() =>
                    miniMonthIndex === 11
                      ? (setMiniMonthIndex(0), setMiniYear(miniYear + 1))
                      : setMiniMonthIndex(miniMonthIndex + 1)
                  }
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition"
                  title={showMiniCalendar ? "Hide calendar" : "Show calendar"}
                >
                  {showMiniCalendar ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              </div>
            </div>

            {showMiniCalendar && (
              <div className="px-4 py-4">
                {/* DOW */}
                <div className="grid grid-cols-7 text-center mb-2">
                  {DOW_SHORT.map((d) => (
                    <div
                      key={d}
                      className="text-[11px] font-bold text-slate-500 py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {miniCalendarWeeks.flat().map((cell, idx) => {
                    if (!cell) return <div key={idx} />;

                    const isToday = cell.dateISO === today;
                    const isSelected = cell.dateISO === selectedDateISO;
                    const hasEvents =
                      (eventsByDate.get(cell.dateISO) || []).length > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setYear(miniYear);
                          setMonthIndex(miniMonthIndex);
                          setSelectedDateISO(cell.dateISO);

                          // Close sidebar on mobile after selecting date
                          setIsMobileOpen(false);
                        }}
                        className={`relative aspect-square text-xs flex items-center justify-center rounded-xl cursor-pointer transition
                          ${
                            isToday
                              ? "bg-slate-600 text-white font-bold shadow-sm"
                              : isSelected
                              ? "bg-teal-50 text-teal-800 font-bold border border-teal-200"
                              : "text-slate-700 hover:bg-slate-100"
                          }
                        `}
                      >
                        {cell.day}

                        {/* Event dot */}
                        {hasEvents && !isToday && !isSelected && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-teal-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  Click a date to jump.
                </div>
              </div>
            )}
          </section>

          {/* Selected Day Events */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <List size={16} className="text-slate-600" />
                {isTodaySelected ? "TODAY" : selectedDateISO}
              </div>

              <button
                onClick={() => setShowSelectedEvents(!showSelectedEvents)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 transition"
                title={showSelectedEvents ? "Hide events" : "Show events"}
              >
                {showSelectedEvents ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>

            {showSelectedEvents && (
              <div className="px-4 py-4">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 bg-slate-50">
                    No events scheduled
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((rawEvent, idx) => {
                      const parsed = parseTaggedValue(rawEvent);
                      const theme = labelToTheme(parsed.labelId);

                      return (
                        <div
                          key={idx}
                          className={`px-3 py-2 rounded-xl border text-sm truncate ${theme}`}
                          title={parsed.text}
                        >
                          {parsed.text || "(No title)"}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar (unchanged) */}
      <div className="hidden lg:block h-full">{SidebarBody}</div>

      {/* Mobile drawer */}
      <div className="lg:hidden">
        {/* Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onMouseDown={() => setIsMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed top-0 left-0 z-50 h-full transition-transform duration-200 ease-out
                      ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {SidebarBody}
        </div>
      </div>
    </>
  );
}
