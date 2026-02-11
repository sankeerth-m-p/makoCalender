import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCalendarGrid,
  buildMonthRows,
  EVENT_COLS,
  MAX_YEAR,
  mergeImportedIntoMonth,
  MIN_YEAR,
  parseCSV,
  parseTSV,
} from "../calendar/calendarUtils";
import type { MonthRow, Session, ViewType } from "../calendar/types";
import DateBar from "../layout/DateBar";
import Sidebar from "../layout/Sidebar";
import TopBar from "../layout/TopBar";
import EventsGridView from "../views/EventsGridView";
import MonthView from "../views/MonthView";
import WeekView from "../views/WeekView";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";

interface DashboardProps {
  session: Session;
  onLogout: () => void;
}

export default function Dashboard({ session, onLogout }: DashboardProps) {
  const now = new Date();
  const safeYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);
// 🔽 Export refs
const monthRef = useRef<HTMLDivElement>(null);
const weekRef = useRef<HTMLDivElement>(null);
const eventsRef = useRef<HTMLDivElement>(null);

// 🔽 Download dropdown
const [showDownloadMenu, setShowDownloadMenu] = useState(false);
const downloadMenuRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<ViewType>("month");
  const [year, setYear] = useState<number>(safeYear);
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());

  const [showEventModal, setShowEventModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string>("");
  const [editingEventCol, setEditingEventCol] = useState<string>("Event 1");

  const [rows, setRows] = useState<MonthRow[]>(buildMonthRows(year, monthIndex));
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    now.toISOString().split("T")[0]
  );

  const [pasteText, setPasteText] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [miniMonthIndex, setMiniMonthIndex] = useState<number>(now.getMonth());
  const [miniYear, setMiniYear] = useState<number>(safeYear);
useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (
      showDownloadMenu &&
      downloadMenuRef.current &&
      !downloadMenuRef.current.contains(e.target as Node)
    ) {
      setShowDownloadMenu(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [showDownloadMenu]);

useEffect(() => {
  function handleEsc(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setShowDownloadMenu(false);
    }
  }

  document.addEventListener("keydown", handleEsc);
  return () => document.removeEventListener("keydown", handleEsc);
}, []);

  useEffect(() => {
    setRows(buildMonthRows(year, monthIndex));
  }, [year, monthIndex]);

  useEffect(() => {
    async function loadMonth() {
      try {
        const res = await fetch(
          `https://backend-m7hv.onrender.com/events/month?year=${year}&month=${monthIndex + 1}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to load events");

        const data = await res.json();

        setRows((prev) =>
          prev.map((r) =>
            data[r.dateISO]
              ? { ...r, events: { ...r.events, ...data[r.dateISO] } }
              : r
          )
        );
      } catch (e) {
        console.error(e);
      }
    }

    loadMonth();
  }, [year, monthIndex, session.token]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((r) => {
      const list = EVENT_COLS.map((c) => r.events[c]).filter(
        (x) => String(x || "").trim() !== ""
      );
      map.set(r.dateISO, list);
    });
    return map;
  }, [rows]);

  const calendarWeeks = useMemo(() => buildCalendarGrid(year, monthIndex), [year, monthIndex]);
  const miniCalendarWeeks = useMemo(
    () => buildCalendarGrid(miniYear, miniMonthIndex),
    [miniYear, miniMonthIndex]
  );

  async function updateCell(dateISO: string, col: string, value: string): Promise<void> {
    const eventCol = Number(col.replace("Event ", ""));

    setRows((prev) =>
      prev.map((r) =>
        r.dateISO === dateISO ? { ...r, events: { ...r.events, [col]: value } } : r
      )
    );

    await fetch("https://backend-m7hv.onrender.com/events/cell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        dateISO,
        eventCol,
        value,
      }),
    });
  }

  async function clearMonth(): Promise<void> {
    if (!confirm("Clear ALL events for this month?")) return;

    await fetch(
      `https://backend-m7hv.onrender.com/events/month?year=${year}&month=${monthIndex + 1}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      }
    );

    setRows(buildMonthRows(year, monthIndex));
  }

  async function bulkUpload(rowsToUpload: MonthRow[]) {
    const payload = {
      year,
      month: monthIndex + 1,
      rows: rowsToUpload.map((r) => ({
        dateISO: r.dateISO,
        events: Object.fromEntries(
          Object.entries(r.events).filter(([_, v]) => v && v.trim() !== "")
        ),
      })),
    };

    await fetch("https://backend-m7hv.onrender.com/events/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async function applyPaste(): Promise<void> {
    if (!pasteText.trim()) return;

    const tsv = parseTSV(pasteText);
    const csv = parseCSV(pasteText);
    const incoming = tsv.length >= 1 ? tsv : csv;

    if (!incoming.length) {
      alert("No data detected.");
      return;
    }

    const merged = mergeImportedIntoMonth(
      buildMonthRows(year, monthIndex),
      incoming,
      year,
      monthIndex
    );

    setRows(merged);
    setPasteText("");

    await bulkUpload(merged);

    alert("Imported & saved successfully!");
    setShowImportModal(false);
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const incoming = parseCSV(text);

    if (!incoming.length) {
      alert("Invalid CSV file.");
      return;
    }

    const merged = mergeImportedIntoMonth(
      buildMonthRows(year, monthIndex),
      incoming,
      year,
      monthIndex
    );

    setRows(merged);
    await bulkUpload(merged);
    alert("CSV imported & saved!");

    if (fileRef.current) fileRef.current.value = "";
    setShowImportModal(false);
  }

  function goToToday() {
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
    setMiniYear(today.getFullYear());
    setMiniMonthIndex(today.getMonth());
    setSelectedDateISO(todayISO);
  }

  function prevMonth() {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear(year - 1);
    } else {
      setMonthIndex(monthIndex - 1);
    }
  }

  function nextMonth() {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear(year + 1);
    } else {
      setMonthIndex(monthIndex + 1);
    }
  }

  function openEventModal(dateISO: string) {
    setEditingDate(dateISO);
    setShowEventModal(true);
  }

  function saveEventFromModal() {
    const value = (document.getElementById("eventInput") as HTMLInputElement)?.value || "";
    if (value.trim()) {
      updateCell(editingDate, editingEventCol, value);
    }
    setShowEventModal(false);
  }

  const today = new Date().toISOString().split("T")[0];
  const selectedEvents = eventsByDate.get(selectedDateISO) || [];
async function downloadPNG() {
  const target =
    view === "month"
      ? monthRef.current
      : view === "week"
      ? weekRef.current
      : eventsRef.current;

  if (!target) return;

  const dataUrl = await toPng(target, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = `${view}-${monthIndex + 1}-${year}.png`;
  link.href = dataUrl;
  link.click();
}

function downloadExcel() {
  const aoa: any[][] = [];

  aoa.push([`makoCalendar - ${year}`]);
  aoa.push(["Date", ...EVENT_COLS]);

  rows.forEach((r) => {
    aoa.push([r.dateISO, ...EVENT_COLS.map((c) => r.events[c] || "")]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, `${monthIndex + 1}-${year}`);
  XLSX.writeFile(wb, `calendar-${monthIndex + 1}-${year}.xlsx`);
}

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar session={session} onLogout={onLogout} />

      <DateBar
  monthIndex={monthIndex}
  setMonthIndex={setMonthIndex}
  year={year}
  setYear={setYear}
  view={view}
  setView={setView}
  goToToday={goToToday}
  prevMonth={prevMonth}
  nextMonth={nextMonth}
  showDownloadMenu={showDownloadMenu}
  setShowDownloadMenu={setShowDownloadMenu}
  onDownloadPNG={downloadPNG}
  onDownloadExcel={downloadExcel}
  downloadMenuRef={downloadMenuRef}
/>


      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        <Sidebar
          setShowImportModal={setShowImportModal}
          miniMonthIndex={miniMonthIndex}
          setMiniMonthIndex={setMiniMonthIndex}
          miniYear={miniYear}
          setMiniYear={setMiniYear}
          miniCalendarWeeks={miniCalendarWeeks}
          today={today}
          selectedDateISO={selectedDateISO}
          setSelectedDateISO={setSelectedDateISO}
          eventsByDate={eventsByDate}
          selectedEvents={selectedEvents}
          setYear={setYear}
          setMonthIndex={setMonthIndex}
        />

        {/* Calendar/Events View */}
        <div className="flex-1 overflow-auto bg-white">
          {view === "month" && (
            
<div ref={monthRef} className="h-full">

           <MonthView
  weeks={calendarWeeks}
  eventsByDate={eventsByDate}
  selectedDateISO={selectedDateISO}
  today={today}
  onDateSelect={setSelectedDateISO}
  onAddEvent={(dateISO) => {
    setEditingDate(dateISO);
    setShowEventModal(true);
  }}
/></div>

          )}

       {view === "week" && (
         <div ref={weekRef} className="h-full">
  <WeekView
    year={year}
    monthIndex={monthIndex}
    selectedDateISO={selectedDateISO}
    eventsByDate={eventsByDate}
    today={today}
    onChangeWeek={(newDateISO) => {
      setSelectedDateISO(newDateISO);

      // 👇 keep month/year in sync when week crosses months
      const d = new Date(newDateISO);
      setYear(d.getFullYear());
      setMonthIndex(d.getMonth());
    }}
  /></div>
)}


          {view === "events" && (  <div ref={eventsRef} className="h-full">
            <EventsGridView
              rows={rows}
              selectedDateISO={selectedDateISO}
              setSelectedDateISO={setSelectedDateISO}
              updateCell={updateCell}
              clearMonth={clearMonth}
            /></div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Add Event</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Column
                </label>
                <select
                  value={editingEventCol}
                  onChange={(e) => setEditingEventCol(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVENT_COLS.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Title
                </label>
                <input
                  id="eventInput"
                  type="text"
                  placeholder="Add title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEventFromModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Import Events</h2>
            </div>
           <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Paste Template Data
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste copied table from Google Sheets (Date + Event 1..Event 10)"
                  className="w-full min-h-[150px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={applyPaste}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                  >
                    Import Paste
                  </button>
                  <button
                    onClick={() => setPasteText("")}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={onUploadFile}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-xs font-semibold text-slate-700 mb-1">CSV Format Required:</div>
                <div className="text-xs text-slate-600">Date, Event 1, Event 2, ... Event 10</div>
              </div>

              <button
                onClick={clearMonth}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
              >
                Clear Month Data
              </button>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
