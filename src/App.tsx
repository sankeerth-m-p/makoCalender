import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Google-Sheet style Events + Calendar (React single-file app - TypeScript)
 * - 10 Event columns
 * - Month selection ONLY (no date picker)
 * - Add data by:
 *    1) Paste template table (TSV)  OR
 *    2) Upload CSV
 * - Events grid auto-generates all days of selected month
 * - Editing any cell updates calendar instantly
 *
 * FINAL CHANGES DONE:
 * 1) After login → always load CURRENT month/year
 * 2) Landing page shows ONLY Events/Calendar table
 * 3) Events header (blue) is sticky
 * 4) Tabs (Event Calendar / Events) sticky at bottom ONLY in landing page
 * 5) Add Event button is inside Events header (right side)
 * 6) Add Event page shows ONLY import section (no tables, no tabs)
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
const DOW: string[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

function mondayBasedIndex(jsDay: number): number {
  if (jsDay === 0) return 6;
  return jsDay - 1;
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
  const firstIdx = mondayBasedIndex(first.getDay());

  const weeks: (CalendarCell | null)[][] = [];
  let day = 1;

  for (let w = 0; w < 6; w++) {
    const week: (CalendarCell | null)[] = [];

    for (let col = 0; col < 6; col++) {
      const absolutePos = w * 7 + col;
      const shouldPlace = absolutePos >= firstIdx && day <= total;

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
  }

  return weeks;
}

function classNames(...xs: (string | boolean | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}

/* =======================
   MAIN APP (AFTER LOGIN)
======================= */
interface AppProps {
  session: Session;
  onLogout: () => void;
}

export default function App({ session, onLogout }: AppProps): JSX.Element {
  const now = new Date();
  const safeYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);

  const [tab, setTab] = useState<"events" | "calendar">("events");
  const [year, setYear] = useState<number>(safeYear);
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());

  // landing = show tables
  // addEvent = show ONLY import UI
  const [page, setPage] = useState<"landing" | "addEvent">("landing");

  const [rows, setRows] = useState<MonthRow[]>(buildMonthRows(year, monthIndex));
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    isoDate(year, monthIndex, 1)
  );

  const [pasteText, setPasteText] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadMonth() {
      try {
        const res = await fetch(
          `http://127.0.0.1:5000/events/month?year=${year}&month=${monthIndex + 1}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to load events");

        const data = await res.json();
        const base = buildMonthRows(year, monthIndex);

        base.forEach((r) => {
          if (data[r.dateISO]) {
            r.events = { ...r.events, ...data[r.dateISO] };
          }
        });

        setRows(base);
        setSelectedDateISO(isoDate(year, monthIndex, 1));
      } catch (e) {
        console.error(e);
        setRows(buildMonthRows(year, monthIndex));
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

  async function updateCell(dateISO: string, col: string, value: string): Promise<void> {
    const eventCol = Number(col.replace("Event ", ""));

    setRows((prev) =>
      prev.map((r) =>
        r.dateISO === dateISO ? { ...r, events: { ...r.events, [col]: value } } : r
      )
    );

    await fetch("http://127.0.0.1:5000/events/cell", {
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
      `http://127.0.0.1:5000/events/month?year=${year}&month=${monthIndex + 1}`,
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

    await fetch("http://127.0.0.1:5000/events/bulk", {
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
  }

  const headerTitle = useMemo(() => `${MONTHS[monthIndex]} ${year}`, [monthIndex, year]);

  function handleYearChange(rawValue: string): void {
    const n = Number(rawValue || MIN_YEAR);
    const clamped = Math.min(Math.max(n, MIN_YEAR), MAX_YEAR);
    setYear(clamped);
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0b5cad]" />
              <div>
                <div className="text-sm font-semibold">Makoni's Trade Intelligence</div>
                <div className="text-xs text-slate-500">
                  Logged in as <b>{session.username}</b>
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex gap-2">
                <select
                  value={monthIndex}
                  onChange={(e) => setMonthIndex(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border bg-white px-3 text-sm sm:w-[170px]"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={year}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="h-10 w-full rounded-lg border bg-white px-3 text-sm sm:w-28"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <button
                  onClick={() => setTab("events")}
                  className={classNames(
                    "h-10 w-full rounded-lg px-4 text-sm font-semibold sm:w-auto",
                    tab === "events" ? "bg-[#0b5cad] text-white" : "bg-slate-100"
                  )}
                >
                  Events
                </button>

                <button
                  onClick={() => setTab("calendar")}
                  className={classNames(
                    "h-10 w-full rounded-lg px-4 text-sm font-semibold sm:w-auto",
                    tab === "calendar" ? "bg-[#0b5cad] text-white" : "bg-slate-100"
                  )}
                >
                  Event Calendar
                </button>
              </div>

              <button
                onClick={onLogout}
                className="h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white sm:w-auto"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* ✅ LANDING PAGE = TABLES */}
        {page === "landing" ? (
          <>
            {tab === "events" ? (
              <EventsSheet
                headerTitle={headerTitle}
                rows={rows}
                selectedDateISO={selectedDateISO}
                setSelectedDateISO={setSelectedDateISO}
                updateCell={updateCell}
                onAddEvent={() => setPage("addEvent")}
              />
            ) : (
              <CalendarSheet
                headerTitle={headerTitle}
                year={year}
                monthIndex={monthIndex}
                weeks={calendarWeeks}
                selectedDateISO={selectedDateISO}
                setSelectedDateISO={setSelectedDateISO}
                eventsByDate={eventsByDate}
              />
            )}
          </>
        ) : (
          <>
            {/* ✅ ADD EVENT PAGE = ONLY IMPORT UI */}
            <div className="mb-5 grid gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-2 text-sm font-semibold">Add data (Paste template)</div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste copied table from Google Sheets (Date + Event 1..Event 10)\n\nExample:\nDate\tEvent 1\tEvent 2\n10-Feb-2026\tMeeting\tCall`}
                  className="h-28 w-full resize-none rounded-xl border bg-white p-3 text-sm outline-none"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <button
                    onClick={applyPaste}
                    className="w-full rounded-xl bg-[#0b5cad] px-4 py-2 text-sm font-semibold text-white sm:w-auto"
                  >
                    Import Paste
                  </button>
                  <button
                    onClick={() => setPasteText("")}
                    className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold sm:w-auto"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Upload CSV</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={onUploadFile}
                  className="w-full rounded-xl border bg-white p-2 text-sm"
                />

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">CSV columns required:</div>
                  <div>Date, Event 1, Event 2, … Event 10</div>
                  <div className="mt-2">Only the selected month data will be applied.</div>
                </div>

                <button
                  onClick={clearMonth}
                  className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Clear Month Data
                </button>

                <button
                  onClick={() => setPage("landing")}
                  className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom tabs ONLY in landing page */}
      {page === "landing" && (
        <div className="sticky bottom-0 z-40 border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 py-2">
            {/* Tabs are removed intentionally */}
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   EVENTS TABLE
======================= */
interface EventsSheetProps {
  headerTitle: string;
  rows: MonthRow[];
  selectedDateISO: string;
  setSelectedDateISO: (dateISO: string) => void;
  updateCell: (dateISO: string, col: string, value: string) => void;
  onAddEvent: () => void;
}

function EventsSheet({
  headerTitle,
  rows,
  selectedDateISO,
  setSelectedDateISO,
  updateCell,
  onAddEvent,
}: EventsSheetProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      {/* Sticky blue header */}
      <div className="sticky top-0 z-40 border-b bg-[#1f3b57] h-[56px] px-4 flex items-center">
        <div className="flex w-full items-center justify-between">
          <div className="text-sm font-semibold text-white">Events — {headerTitle}</div>

          <button
            onClick={onAddEvent}
            className="rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25"
          >
            Add Event
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[70vh]">
        <table className="min-w-[1400px] border-collapse">
          <thead>
            <tr className="sticky top-0 z-30 bg-[#2f5f49] text-white">
              <th className="sticky left-0 z-40 min-w-[140px] border border-white/10 px-3 py-3 text-left text-sm bg-[#2f5f49]">
                Date
              </th>

              {EVENT_COLS.map((c) => (
                <th
                  key={c}
                  className="min-w-[140px] border border-white/10 px-3 py-3 text-left text-sm"
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
                  className={classNames(
                    "hover:bg-slate-50",
                    isSelected ? "bg-[#eaf2ff]" : "bg-white"
                  )}
                >
                  <td
                    className={classNames(
                      "sticky left-0 z-10 border px-3 py-2 text-sm font-semibold",
                      isSelected ? "bg-[#eaf2ff]" : "bg-white"
                    )}
                    onClick={() => setSelectedDateISO(r.dateISO)}
                  >
                    {r.dateLabel}
                  </td>

                  {EVENT_COLS.map((c) => (
                    <td key={c} className="border p-0">
                      <input
                        value={r.events[c]}
                        onFocus={() => setSelectedDateISO(r.dateISO)}
                        onChange={(e) => updateCell(r.dateISO, c, e.target.value)}
                        className="h-10 w-full bg-transparent px-3 text-sm outline-none"
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
    </div>
  );
}

/* =======================
   CALENDAR TABLE
======================= */
interface CalendarSheetProps {
  headerTitle: string;
  year: number;
  monthIndex: number;
  weeks: (CalendarCell | null)[][];
  selectedDateISO: string;
  setSelectedDateISO: (dateISO: string) => void;
  eventsByDate: Map<string, string[]>;
}

function CalendarSheet({
  headerTitle,
  year,
  monthIndex,
  weeks,
  selectedDateISO,
  setSelectedDateISO,
  eventsByDate,
}: CalendarSheetProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b bg-[#1f3b57] px-4 py-3 text-sm font-semibold text-white">
        Event Calendar — {headerTitle}
      </div>

      <div className="grid gap-0 border-b lg:grid-cols-12">
        <div className="lg:col-span-3">
          <div className="border-b bg-[#274b6d] px-4 py-2 text-xs font-semibold text-white">
            Month
          </div>
          <div className="px-4 py-2 text-sm font-semibold">{MONTHS[monthIndex]}</div>
        </div>
        <div className="lg:col-span-3">
          <div className="border-b bg-[#274b6d] px-4 py-2 text-xs font-semibold text-white">
            Year
          </div>
          <div className="px-4 py-2 text-sm font-semibold">{year}</div>
        </div>
        <div className="lg:col-span-6" />
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-[#274b6d] text-white">
              {DOW.map((d) => (
                <th key={d} className="border border-white/10 px-3 py-3 text-left text-xs">
                  {d}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) => {
                  if (!cell) return <td key={ci} className="h-20 border bg-slate-50" />;

                  const isSelected = cell.dateISO === selectedDateISO;
                  const list = eventsByDate.get(cell.dateISO) || [];

                  return (
                    <td
                      key={ci}
                      className={classNames(
                        "h-24 border align-top",
                        isSelected ? "bg-[#0b5cad] text-white" : "bg-white"
                      )}
                      onClick={() => setSelectedDateISO(cell.dateISO)}
                    >
                      <div className="px-3 pt-2 text-xs font-semibold">
                        {MONTHS[monthIndex].slice(0, 3)} {cell.day}
                      </div>

                      <div className="px-3 pb-2 pt-1 text-[11px] leading-4">
                        {list.length === 0 ? (
                          <div className={classNames(isSelected ? "text-white/70" : "text-slate-400")}>
                            —
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {list.slice(0, 3).map((ev, idx) => (
                              <div
                                key={idx}
                                className={classNames(
                                  "truncate rounded-md px-2 py-0.5",
                                  isSelected ? "bg-white/15" : "bg-slate-100"
                                )}
                              >
                                {ev}
                              </div>
                            ))}
                            {list.length > 3 && (
                              <div className={classNames(isSelected ? "text-white/80" : "text-slate-500")}>
                                +{list.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Tip: Click any calendar date → then go to <b>Events</b> tab and edit Event 1..10.
        Calendar updates instantly.
      </div>
    </div>
  );
}
