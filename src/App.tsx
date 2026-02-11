import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * makoCalendar - Google Calendar Style Events Manager
 * Redesigned with Tailwind CSS and blue/slate theme
 */

const MIN_YEAR = 1990;
const MAX_YEAR = 2030;

export interface Session {
  username: string;
  token: string;
}

interface EventData {
  [key: string]: string;
}

interface MonthRow {
  dateISO: string;
  dateLabel: string;
  events: EventData;
}

interface CalendarCell {
  day: number;
  dateISO: string;
}

interface ParsedRow {
  [key: string]: string;
}

const MONTHS: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EVENT_COLS: string[] = Array.from({ length: 10 }, (_, i) => `Event ${i + 1}`);
const DOW: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_SHORT: string[] = ["S", "M", "T", "W", "T", "F", "S"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(y: number, mIndex: number, d: number): string {
  return `${y}-${pad2(mIndex + 1)}-${pad2(d)}`;
}

function niceCellDate(y: number, mIndex: number, d: number): string {
  const monthShort = MONTHS[mIndex].slice(0, 3);
  return `${d}-${monthShort}-${y}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildMonthRows(year: number, monthIndex: number): MonthRow[] {
  const total = daysInMonth(year, monthIndex);
  const rows: MonthRow[] = [];
  for (let d = 1; d <= total; d++) {
    rows.push({
      dateISO: isoDate(year, monthIndex, d),
      dateLabel: niceCellDate(year, monthIndex, d),
      events: Object.fromEntries(EVENT_COLS.map((c) => [c, ""])),
    });
  }
  return rows;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const obj: ParsedRow = {};
    header.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }

  return rows;
}

function parseTSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t+$/g, ""))
    .filter((l) => l.trim().length > 0);

  if (!lines.length) return [];

  const header = lines[0].split("\t").map((h) => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj: ParsedRow = {};
    header.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }

  return rows;
}

function normalizeIncomingRow(row: ParsedRow): ParsedRow {
  const out: ParsedRow = {};

  const dateKey =
    Object.keys(row).find((k) => k.trim().toLowerCase() === "date") || "Date";

  out.Date = row[dateKey] || "";

  EVENT_COLS.forEach((c) => {
    const target = c.toLowerCase().replace(/\s+/g, "");

    const foundKey = Object.keys(row).find((k) => {
      const cleaned = k.toLowerCase().replace(/\s+/g, "");
      return cleaned === target;
    });

    out[c] = foundKey ? String(row[foundKey] || "").trim() : "";
  });

  return out;
}

function parseAnyDateToISO(
  value: string,
  fallbackYear: number,
  fallbackMonthIndex: number
): string | null {
  const v = String(value || "").trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const m1 = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m1) {
    const d = Number(m1[1]);
    const mon = m1[2].toLowerCase();
    const y = Number(m1[3]);
    const idx = MONTHS.findIndex((m) => m.slice(0, 3).toLowerCase() === mon);
    if (idx >= 0) return isoDate(y, idx, d);
  }

  const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) {
    const d = Number(m2[1]);
    const mo = Number(m2[2]) - 1;
    const y = Number(m2[3]);
    if (mo >= 0 && mo <= 11) return isoDate(y, mo, d);
  }

  if (/^\d{1,2}$/.test(v)) {
    const d = Number(v);
    if (d >= 1 && d <= 31) return isoDate(fallbackYear, fallbackMonthIndex, d);
  }

  return null;
}

function mergeImportedIntoMonth(
  baseRows: MonthRow[],
  importedRows: ParsedRow[],
  year: number,
  monthIndex: number
): MonthRow[] {
  const map = new Map(baseRows.map((r) => [r.dateISO, r]));

  importedRows.forEach((raw) => {
    const row = normalizeIncomingRow(raw);
    const dateISO = parseAnyDateToISO(row.Date, year, monthIndex);
    if (!dateISO) return;

    const [y, m] = dateISO.split("-").map(Number);
    if (y !== year || m !== monthIndex + 1) return;

    const target = map.get(dateISO);
    if (!target) return;

    EVENT_COLS.forEach((c) => {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== "") {
        target.events[c] = String(row[c]).trim();
      }
    });
  });

  return Array.from(map.values());
}

function buildCalendarGrid(
  year: number,
  monthIndex: number
): (CalendarCell | null)[][] {
  const total = daysInMonth(year, monthIndex);
  const first = new Date(year, monthIndex, 1);
  const firstDay = first.getDay();

  const weeks: (CalendarCell | null)[][] = [];
  let day = 1;

  for (let w = 0; w < 6; w++) {
    const week: (CalendarCell | null)[] = [];

    for (let col = 0; col < 7; col++) {
      const absolutePos = w * 7 + col;
      const shouldPlace = absolutePos >= firstDay && day <= total;

      if (shouldPlace) {
        week.push({
          day,
          dateISO: isoDate(year, monthIndex, day),
        });
        day++;
      } else {
        week.push(null);
      }
    }

    weeks.push(week);
    if (day > total) break;
  }

  return weeks;
}

/* =======================
   MAIN APP
======================= */
interface AppProps {
  session: Session;
  onLogout: () => void;
}

export default function App({ session, onLogout }: AppProps): JSX.Element {
  const now = new Date();
  const safeYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);

  const [view, setView] = useState<"month" | "week" | "events">("month");
  const [year, setYear] = useState<number>(safeYear);
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());

  const [showEventModal, setShowEventModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string>("");
  const [editingEventCol, setEditingEventCol] = useState<string>("Event 1");

  const [rows, setRows] = useState<MonthRow[]>(buildMonthRows(year, monthIndex));
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    now.toISOString().split('T')[0]
  );

  const [pasteText, setPasteText] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [miniMonthIndex, setMiniMonthIndex] = useState<number>(now.getMonth());
  const [miniYear, setMiniYear] = useState<number>(safeYear);

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
  const miniCalendarWeeks = useMemo(() => buildCalendarGrid(miniYear, miniMonthIndex), [miniYear, miniMonthIndex]);

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
    const todayISO = today.toISOString().split('T')[0];
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
    const value = (document.getElementById('eventInput') as HTMLInputElement)?.value || '';
    if (value.trim()) {
      updateCell(editingDate, editingEventCol, value);
    }
    setShowEventModal(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const selectedEvents = eventsByDate.get(selectedDateISO) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-700 border-b border-slate-600 px-6 py-3 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left - App name and navigation */}
          <div className="flex items-center gap-6 flex-wrap">
            <h1 className="text-2xl font-semibold text-white">makoCalendar</h1>

            <div className="flex gap-2 items-center flex-wrap">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors text-sm font-medium"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              >
                ←
              </button>
              <button
                onClick={nextMonth}
                className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {/* Right - User info and logout */}
          <div className="flex items-center gap-4">
            <span className="text-slate-200 text-sm">
              {session.username}
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Date Selector Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Month:</label>
              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Year:</label>
              <input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={year}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= MIN_YEAR && val <= MAX_YEAR) {
                    setYear(val);
                  }
                }}
                className="w-24 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="text-lg font-semibold text-slate-800 ml-4">
              {MONTHS[monthIndex]} {year}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } rounded-l-md border border-slate-300`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } border-t border-b border-slate-300`}
            >
              Week
            </button>
            <button
              onClick={() => setView('events')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'events'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } rounded-r-md border border-slate-300`}
            >
              Events
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all mb-6 flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Import Events
          </button>

          {/* Mini Calendar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold text-slate-700">
                {MONTHS[miniMonthIndex]} {miniYear}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (miniMonthIndex === 0) {
                      setMiniMonthIndex(11);
                      setMiniYear(miniYear - 1);
                    } else {
                      setMiniMonthIndex(miniMonthIndex - 1);
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded transition-colors text-slate-600"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    if (miniMonthIndex === 11) {
                      setMiniMonthIndex(0);
                      setMiniYear(miniYear + 1);
                    } else {
                      setMiniMonthIndex(miniMonthIndex + 1);
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded transition-colors text-slate-600"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DOW_SHORT.map((d) => (
                <div key={d} className="text-xs font-medium text-slate-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {miniCalendarWeeks.flat().map((cell, idx) => {
                if (!cell) {
                  return <div key={idx} className="py-1" />;
                }
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
                    className={`py-1 text-xs cursor-pointer rounded-full aspect-square flex items-center justify-center transition-colors ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : isSelected
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : hasEvents
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events for Selected Date */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Events on {selectedDateISO}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No events</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900"
                  >
                    {event}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar/Events View */}
        <div className="flex-1 overflow-auto bg-white">
          {view === 'month' && (
            <MonthView
              weeks={calendarWeeks}
              year={year}
              monthIndex={monthIndex}
              eventsByDate={eventsByDate}
              selectedDateISO={selectedDateISO}
              today={today}
              onDateClick={openEventModal}
            />
          )}

          {view === 'week' && (
            <WeekView
              year={year}
              monthIndex={monthIndex}
              selectedDateISO={selectedDateISO}
              eventsByDate={eventsByDate}
              today={today}
            />
          )}

          {view === 'events' && (
            <EventsGridView
              rows={rows}
              selectedDateISO={selectedDateISO}
              setSelectedDateISO={setSelectedDateISO}
              updateCell={updateCell}
              clearMonth={clearMonth}
            />
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Import Events</h2>
            </div>
            <div className="p-6 space-y-6">
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
                    onClick={() => setPasteText('')}
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
                <div className="text-xs text-slate-600">Date, Event 1, Event 2, … Event 10</div>
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

/* =======================
   MONTH VIEW
======================= */
interface MonthViewProps {
  weeks: (CalendarCell | null)[][];
  year: number;
  monthIndex: number;
  eventsByDate: Map<string, string[]>;
  selectedDateISO: string;
  today: string;
  onDateClick: (dateISO: string) => void;
}

function MonthView({
  weeks,
  year,
  monthIndex,
  eventsByDate,
  selectedDateISO,
  today,
  onDateClick,
}: MonthViewProps): JSX.Element {
  return (
    <div className="h-full flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
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
                    isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`text-xs mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
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

/* =======================
   WEEK VIEW
======================= */
interface WeekViewProps {
  year: number;
  monthIndex: number;
  selectedDateISO: string;
  eventsByDate: Map<string, string[]>;
  today: string;
}

function WeekView({
  year,
  monthIndex,
  selectedDateISO,
  eventsByDate,
  today,
}: WeekViewProps): JSX.Element {
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
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
        <div className="border-r border-slate-200" />
        {weekDays.map((d, idx) => {
          const dateISO = d.toISOString().split('T')[0];
          const isToday = dateISO === today;
          return (
            <div
              key={idx}
              className="p-3 text-center border-r border-slate-200 bg-slate-50"
            >
              <div className="text-xs text-slate-600 uppercase">
                {DOW[idx]}
              </div>
              <div
                className={`text-2xl mt-1 inline-flex items-center justify-center w-10 h-10 rounded-full ${
                  isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-800'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {Array.from({ length: 24 }).map((_, hour) => (
            <React.Fragment key={hour}>
              <div className="border-r border-b border-slate-200 p-2 text-right text-xs text-slate-500">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((d, idx) => (
                <div
                  key={idx}
                  className="border-r border-b border-slate-200 min-h-[60px] bg-white"
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =======================
   EVENTS GRID VIEW
======================= */
interface EventsGridViewProps {
  rows: MonthRow[];
  selectedDateISO: string;
  setSelectedDateISO: (dateISO: string) => void;
  updateCell: (dateISO: string, col: string, value: string) => void;
  clearMonth: () => void;
}

function EventsGridView({
  rows,
  selectedDateISO,
  setSelectedDateISO,
  updateCell,
  clearMonth,
}: EventsGridViewProps): JSX.Element {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[1400px] border-collapse">
        <thead>
          <tr className="bg-slate-50 sticky top-0 z-10">
            <th className="sticky left-0 z-11 min-w-[140px] border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700 bg-slate-50">
              Date
            </th>
            {EVENT_COLS.map((c) => (
              <th
                key={c}
                className="min-w-[140px] border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelected = r.dateISO === selectedDateISO;
            return (
              <tr
                key={r.dateISO}
                className={`transition-colors ${
                  isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <td
                  onClick={() => setSelectedDateISO(r.dateISO)}
                  className={`sticky left-0 z-1 border border-slate-200 px-3 py-3 text-sm font-medium cursor-pointer ${
                    isSelected ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  {r.dateLabel}
                </td>
                {EVENT_COLS.map((c) => (
                  <td key={c} className="border border-slate-200 p-0">
                    <input
                      value={r.events[c]}
                      onFocus={() => setSelectedDateISO(r.dateISO)}
                      onChange={(e) => updateCell(r.dateISO, c, e.target.value)}
                      className="w-full h-full px-3 py-3 border-none bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                      placeholder=""
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}