import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  List
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
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = React.useState(true);
  const [showSelectedEvents, setShowSelectedEvents] = React.useState(true);

  const isTodaySelected = selectedDateISO === today;

  return (
    <div
      className="bg-white border-r border-slate-200 py-4 px-2 overflow-y-auto transition-all"
      style={{ width: isCollapsed ? 64 : 320 }}
    >
      {/* Top controls */}
      <div className="sticky top-0 bg-white pb-4">
  {isCollapsed ? (
    /* COLLAPSED: stacked */
    <div className="space-y-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full h-10 flex items-center justify-center border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
      >
        <ChevronRight size={18} />
      </button>

      <button
        onClick={() => setShowImportModal(true)}
        className="w-full h-10 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        <Plus size={18} />
      </button>
    </div>
  ) : (
    /* EXPANDED: inline */
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="h-10 w-10 flex items-center justify-center border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={() => setShowImportModal(true)}
        className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Import Events
      </button>
    </div>
  )}
</div>


      {!isCollapsed && (
        <>
          {/* Mini Calendar */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarDays size={16} />
                {MONTHS[miniMonthIndex]} {miniYear}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    miniMonthIndex === 0
                      ? (setMiniMonthIndex(11), setMiniYear(miniYear - 1))
                      : setMiniMonthIndex(miniMonthIndex - 1)
                  }
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={() =>
                    miniMonthIndex === 11
                      ? (setMiniMonthIndex(0), setMiniYear(miniYear + 1))
                      : setMiniMonthIndex(miniMonthIndex + 1)
                  }
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  {showMiniCalendar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {showMiniCalendar && (
              <>
                <div className="grid grid-cols-7 text-center mb-1">
                  {DOW_SHORT.map((d) => (
                    <div key={d} className="text-[11px] font-medium text-slate-500 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {miniCalendarWeeks.flat().map((cell, idx) => {
                    if (!cell) return <div key={idx} />;

                    const isToday = cell.dateISO === today;
                    const isSelected = cell.dateISO === selectedDateISO;
                    const hasEvents = (eventsByDate.get(cell.dateISO) || []).length > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setYear(miniYear);
                          setMonthIndex(miniMonthIndex);
                          setSelectedDateISO(cell.dateISO);
                        }}
                        className={`aspect-square text-xs flex items-center justify-center rounded-full cursor-pointer transition-colors
                          ${
                            isToday
                              ? "bg-blue-600 text-white font-semibold"
                              : isSelected
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : hasEvents
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "text-slate-600 hover:bg-slate-50"
                          }
                        `}
                      >
                        {cell.day}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Selected Day Events */}
          <section className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <List size={16} />
                {isTodaySelected ? "TODAY" : selectedDateISO}
              </div>

              <button
                onClick={() => setShowSelectedEvents(!showSelectedEvents)}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
              >
                {showSelectedEvents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showSelectedEvents && (
              <>
                {selectedEvents.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                    No events scheduled
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm text-slate-700"
                      >
                        {event}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
