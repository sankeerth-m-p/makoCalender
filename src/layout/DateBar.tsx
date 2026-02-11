import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronDown,
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
  onDownloadExcel: () => void; onSharePNG: () => void;
  downloadMenuRef: React.RefObject<HTMLDivElement>;
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
  for (let y = MAX_YEAR; y >= MIN_YEAR; y--) {
    list.push(y);
  }
  return list;
}, []);
const selectedRef = React.useRef<HTMLDivElement>(null);

React.useEffect(() => {
  if (open && selectedRef.current) {
    selectedRef.current.scrollIntoView({
      block: "center",
    });
  }
}, [open]);


  return (
    <div ref={ref} className="relative w-28">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-700 flex justify-between items-center"
      >
        {year}
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {YEARS.map((y) => (
  <div
    key={y}
    ref={y === year ? selectedRef : null}
    onClick={() => {
      setYear(y);
      setOpen(false);
    }}
    className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${
      y === year ? "bg-blue-50 text-blue-600 font-semibold" : ""
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
  onDownloadExcel, onSharePNG,
  downloadMenuRef,
}: DateBarProps) {

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-4 flex-wrap">

          {/* Date label */}
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarDays size={18} className="text-slate-600" />
            {MONTHS[monthIndex]} {year}
          </div>

        

          {/* Year input */}
       <div className="flex items-center gap-4 flex-wrap">

  {/* Month selector */}
  <select
    value={monthIndex}
    onChange={(e) => setMonthIndex(Number(e.target.value))}
    className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
  >
    {MONTHS.map((m, idx) => (
      <option key={idx} value={idx}>{m}</option>
    ))}
  </select>

  {/* Year dropdown */}
  <YearDropdown year={year} setYear={setYear} />

</div>




          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={nextMonth}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Today */}
          <button
            onClick={goToToday}
            className="px-4 h-9 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Today
          </button>
        </div>

        {/* RIGHT SECTION – VIEW SWITCH */}
       {/* RIGHT SECTION – VIEW SWITCH + DOWNLOAD */}
<div className="flex items-center gap-2">
  <div className="flex gap-1">
    <button
      onClick={() => setView("month")}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        view === "month"
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } rounded-l-md border border-slate-300`}
    >
      Month
    </button>

    <button
      onClick={() => setView("week")}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        view === "week"
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } border-t border-b border-slate-300`}
    >
      Week
    </button>

    <button
      onClick={() => setView("events")}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        view === "events"
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } rounded-r-md border border-slate-300`}
    >
      Events
    </button>
  </div>

  {/* DOWNLOAD DROPDOWN */}
  <div className="relative gap-2 flex" ref={downloadMenuRef}>
    <button
      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
      className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium"
    >
      Download ▾
    </button>
<button
  onClick={onSharePNG}
  className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800"
>
  Share
</button>

    {showDownloadMenu && (
      <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-50">
        <button
          onClick={() => {
            setShowDownloadMenu(false);
            onDownloadPNG();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
        >
          PNG Image
        </button>

        <button
          onClick={() => {
            setShowDownloadMenu(false);
            onDownloadExcel();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
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
