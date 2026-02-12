import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronDown,
  Menu,
} from "lucide-react";
import { MAX_YEAR, MIN_YEAR, MONTHS } from "../calendar/calendarUtils";
import type { ViewType } from "../calendar/types";
import React from "react";

interface DateBarProps {
  monthIndex: number;
  setMonthIndex: (value: number) => void;
  year: number;
  setYear: (value: number) => void;
  view: ViewType;
  setView: (view: ViewType) => void;
  goToToday: () => void;
  prevMonth: () => void;
  nextMonth: () => void;
  showDownloadMenu: boolean;
  setShowDownloadMenu: (v: boolean) => void;
  onDownloadPNG: () => void;
  onDownloadExcel: () => void;
  onSharePNG: () => void;
 downloadMenuRef: React.RefObject<HTMLDivElement | null>;

  // ⭐ NEW
  onToggleSidebar: () => void;
}

function YearDropdown({
  year,
  setYear,
}: {
  year: number;
  setYear: (year: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const YEARS = React.useMemo(() => {
    const list: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) list.push(y);
    return list;
  }, []);

  const selectedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <div ref={ref} className="relative w-28">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-sm font-medium text-slate-800 flex justify-between items-center hover:bg-slate-50 transition"
      >
        {year}
        <ChevronDown size={16} className="text-slate-600" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {YEARS.map((y) => (
            <div
              key={y}
              ref={y === year ? selectedRef : null}
              onClick={() => {
                setYear(y);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition ${
                y === year
                  ? "bg-teal-50 text-teal-800 font-semibold"
                  : "text-slate-700"
              }`}
            >
              {y}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DateBar({
  monthIndex,
  setMonthIndex,
  year,
  setYear,
  view,
  setView,
  goToToday,
  prevMonth,
  nextMonth,
  showDownloadMenu,
  setShowDownloadMenu,
  onDownloadPNG,
  onDownloadExcel,
  onSharePNG,
  downloadMenuRef,
  onToggleSidebar,
}: DateBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* ⭐ Mobile Sidebar Button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            title="Menu"
          >
            <Menu size={18} />
          </button>

          {/* Title label */}
          <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800">
            <CalendarDays size={18} className="text-teal-700" />
            {MONTHS[monthIndex]} {year}
          </div>

          {/* Month + Year */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={monthIndex}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
              className="h-10 px-3 border border-slate-300 rounded-xl bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <YearDropdown year={year} setYear={setYear} />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={nextMonth}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Today */}
          <button
            onClick={goToToday}
            className="h-10 px-4 text-sm font-semibold rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 transition"
          >
            Today
          </button>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switch */}
          <div className="flex rounded-xl overflow-hidden border border-slate-300 bg-slate-50">
            <button
              onClick={() => setView("month")}
              className={`px-4 h-10 text-sm font-semibold transition ${
                view === "month"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              Month
            </button>

            <button
              onClick={() => setView("week")}
              className={`px-4 h-10 text-sm font-semibold transition border-l border-r border-slate-300 ${
                view === "week"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              Week
            </button>

            <button
              onClick={() => setView("events")}
              className={`px-4 h-10 text-sm font-semibold transition ${
                view === "events"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              Events
            </button>
          </div>

          {/* Download + Share */}
          <div className="relative flex items-center gap-2" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="h-10 px-4 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              Download ▾
            </button>

            <button
              onClick={onSharePNG}
              className="h-10 px-4 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              Share
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadPNG();
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition"
                >
                  PNG Image
                </button>

                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadExcel();
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition"
                >
                  Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
