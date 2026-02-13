import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCalendarGrid,
  buildMonthRows,
  getEventColumnNumber,
  getEventColumnsFromEventData,
  getNextEventColumn,
  MAX_YEAR,
  mergeImportedIntoMonth,
  MIN_YEAR,
  normalizeIncomingRow,
  parseAnyDateToISO,
  parseCSV,
  parseTSV,
  sortEventColumns,
} from "../calendar/calendarUtils";
import type { MonthRow, ParsedRow, Session, ViewType } from "../calendar/types";
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

type ModalMode = "add" | "edit";

type EventCellRef = {
  dateISO: string;
  col: string;
};

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
};

export default function Dashboard({ session, onLogout }: DashboardProps) {
  const now = new Date();
  const safeYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);

  // ⭐ RESPONSIVE: mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  // ⭐ modal mode + which event is being edited
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingDate, setEditingDate] = useState<string>("");
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(
    null
  );
  const [editingEventValue, setEditingEventValue] = useState<string>("");

  const [rows, setRows] = useState<MonthRow[]>(buildMonthRows(year, monthIndex));

  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    now.toISOString().split("T")[0]
  );

  const [pasteText, setPasteText] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [miniMonthIndex, setMiniMonthIndex] = useState<number>(now.getMonth());
  const [miniYear, setMiniYear] = useState<number>(safeYear);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "Confirm",
    message: "",
    confirmLabel: "Confirm",
  });
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  const toastIdRef = useRef(0);

  function pushToast(message: string, type: ToastType = "info"): void {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }

  function askConfirm(
    message: string,
    title = "Confirm Action",
    confirmLabel = "Delete"
  ): Promise<boolean> {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel,
    });
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }

  function closeConfirmWith(result: boolean): void {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  }

  // Close download menu outside click
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

  // ESC closes download menu
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDownloadMenu(false);
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    setRows(buildMonthRows(year, monthIndex));
  }, [year, monthIndex]);

  // Load month events
  useEffect(() => {
    async function loadMonth() {
      try {
        const res = await fetch(
          `https://backend-m7hv.onrender.com/events/month?year=${year}&month=${
            monthIndex + 1
          }`,
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
      const list = getEventColumnsFromEventData(r.events)
        .map((c) => r.events[c])
        .filter((x) => String(x || "").trim() !== "");
      map.set(r.dateISO, list);
    });
    return map;
  }, [rows]);

  const allEventCols = useMemo(() => {
    const cols = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r.events).forEach((c) => cols.add(c));
    });

    // Keep a stable baseline of Event 1..Event 10.
    for (let i = 1; i <= 10; i++) {
      cols.add(`Event ${i}`);
    }

    return sortEventColumns(Array.from(cols));
  }, [rows]);

  const calendarWeeks = useMemo(
    () => buildCalendarGrid(year, monthIndex),
    [year, monthIndex]
  );

  const miniCalendarWeeks = useMemo(
    () => buildCalendarGrid(miniYear, miniMonthIndex),
    [miniYear, miniMonthIndex]
  );

  // ⭐ Helper: get actual column name from event index
  function getColumnForEventIndex(dateISO: string, eventIndex: number): string {
    const row = rows.find((r) => r.dateISO === dateISO);
    if (!row) return "Event 1";

    const cols = getEventColumnsFromEventData(row.events);
    return cols[eventIndex] || cols[0] || "Event 1";
  }

  async function updateCell(
    dateISO: string,
    col: string,
    value: string
  ): Promise<void> {
    const eventCol = getEventColumnNumber(col);
    if (!eventCol) return;

    setRows((prev) =>
      prev.map((r) => {
        if (r.dateISO !== dateISO) return r;
        const nextEvents = { ...r.events };
        if (String(value || "").trim() === "") {
          delete nextEvents[col];
        } else {
          nextEvents[col] = value;
        }
        return { ...r, events: nextEvents };
      })
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
    const ok = await askConfirm(
      "Clear ALL events for this month?",
      "Clear Month Data",
      "Clear"
    );
    if (!ok) return;

    try {
      const res = await fetch(
        `https://backend-m7hv.onrender.com/events/month?year=${year}&month=${
          monthIndex + 1
        }`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to clear month.");
      setRows(buildMonthRows(year, monthIndex));
      pushToast("Month data cleared.", "success");
    } catch {
      pushToast("Failed to clear month data.", "error");
    }
  }

  async function uploadImportedRows(importedRows: ParsedRow[]): Promise<number> {
    const updates = new Map<string, { dateISO: string; eventCol: number; value: string }>();

    importedRows.forEach((raw) => {
      const row = normalizeIncomingRow(raw);
      const dateISO = parseAnyDateToISO(row.Date, year, monthIndex);
      if (!dateISO) return;

      Object.entries(row).forEach(([key, rawValue]) => {
        if (String(key).trim().toLowerCase() === "date") return;
        const eventCol = getEventColumnNumber(key);
        const value = String(rawValue || "").trim();
        if (!eventCol || !value) return;
        updates.set(`${dateISO}__${eventCol}`, { dateISO, eventCol, value });
      });
    });

    if (!updates.size) return 0;

    const responses = await Promise.all(
      Array.from(updates.values()).map((item) =>
        fetch("https://backend-m7hv.onrender.com/events/cell", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(item),
        })
      )
    );

    if (responses.some((res) => !res.ok)) {
      throw new Error("Some events failed to upload.");
    }

    return updates.size;
  }

  async function applyPaste(): Promise<void> {
    if (!pasteText.trim()) return;

    const tsv = parseTSV(pasteText);
    const csv = parseCSV(pasteText);
    const incoming = tsv.length >= 1 ? tsv : csv;

    if (!incoming.length) {
      pushToast("No data detected.", "error");
      return;
    }

    const merged = mergeImportedIntoMonth(rows, incoming, year, monthIndex);

    setRows(merged);
    setPasteText("");

    try {
      await uploadImportedRows(incoming);
      pushToast("Imported and saved successfully.", "success");
      setShowImportModal(false);
    } catch {
      pushToast("Import failed. Please try again.", "error");
    }
  }

  async function onUploadFile(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const incoming = parseCSV(text);

    if (!incoming.length) {
      pushToast("Invalid CSV file.", "error");
      return;
    }

    const ok = await askConfirm(
      `Import ${incoming.length} row(s) from "${file.name}"?`,
      "Confirm CSV Import",
      "Import"
    );
    if (!ok) {
      if (fileRef.current) fileRef.current.value = "";
      pushToast("CSV import canceled.", "info");
      return;
    }

    const merged = mergeImportedIntoMonth(rows, incoming, year, monthIndex);

    setRows(merged);
    try {
      await uploadImportedRows(incoming);
      pushToast("CSV imported and saved.", "success");
      setShowImportModal(false);
    } catch {
      pushToast("CSV import failed. Please try again.", "error");
    }

    if (fileRef.current) fileRef.current.value = "";
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

  // ⭐ OPEN MODAL: ADD
  function openAddEventModal(dateISO: string) {
    setModalMode("add");
    setEditingDate(dateISO);
    setEditingEventIndex(null);
    setEditingEventValue("");
    setShowEventModal(true);

    setTimeout(() => {
      const el = document.getElementById("eventInput") as HTMLInputElement | null;
      if (el) el.focus();
    }, 0);
  }

  // ⭐ OPEN MODAL: EDIT
  function openEditEventModal(
    dateISO: string,
    eventIndex: number,
    currentValue: string
  ) {
    setModalMode("edit");
    setEditingDate(dateISO);
    setEditingEventIndex(eventIndex);
    setEditingEventValue(currentValue || "");
    setShowEventModal(true);

    setTimeout(() => {
      const el = document.getElementById("eventInput") as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  // ⭐ SAVE (ADD OR EDIT)
  function saveEventFromModal() {
    const value =
      (document.getElementById("eventInput") as HTMLInputElement)?.value || "";

    if (!value.trim()) {
      setShowEventModal(false);
      return;
    }

    if (modalMode === "add") {
      const targetRow = rows.find((r) => r.dateISO === editingDate);
      const nextCol = getNextEventColumn(targetRow?.events ?? {});
      void updateCell(editingDate, nextCol, value);
      setShowEventModal(false);
      return;
    }

    if (modalMode === "edit") {
      if (editingEventIndex === null) {
        setShowEventModal(false);
        return;
      }

      const col = getColumnForEventIndex(editingDate, editingEventIndex);
      void updateCell(editingDate, col, value);
      setShowEventModal(false);
      return;
    }

    setShowEventModal(false);
  }

  async function deleteEventFromModal() {
    if (modalMode !== "edit") {
      setShowEventModal(false);
      return;
    }

    if (editingEventIndex === null) {
      setShowEventModal(false);
      return;
    }

    const ok = await askConfirm("Delete this event?", "Delete Event", "Delete");
    if (!ok) return;
    const col = getColumnForEventIndex(editingDate, editingEventIndex);
    try {
      await updateCell(editingDate, col, "");
      setShowEventModal(false);
      pushToast("Event deleted.", "success");
    } catch {
      pushToast("Failed to delete event.", "error");
    }
  }

  // ⭐ NEW: Delete multiple events
  async function deleteManyEvents(items: EventCellRef[]): Promise<void> {
    const normalized = items
      .map((item) => {
        const eventCol = getEventColumnNumber(item.col);
        return eventCol ? { dateISO: item.dateISO, eventCol, col: item.col } : null;
      })
      .filter((x): x is { dateISO: string; eventCol: number; col: string } => x !== null);

    if (!normalized.length) return;

    setRows((prev) =>
      prev.map((r) => {
        const targets = normalized.filter((item) => item.dateISO === r.dateISO);
        if (!targets.length) return r;
        const nextEvents = { ...r.events };
        targets.forEach((item) => {
          delete nextEvents[item.col];
        });
        return { ...r, events: nextEvents };
      })
    );

    await fetch("https://backend-m7hv.onrender.com/events/delete-bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        items: normalized.map((item) => ({
          dateISO: item.dateISO,
          eventCol: item.eventCol,
        })),
      }),
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const selectedEvents = eventsByDate.get(selectedDateISO) || [];

  async function sharePNG() {
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

    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const file = new File(
      [blob],
      `calendar-${view}-${monthIndex + 1}-${year}.png`,
      { type: "image/png" }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "makoCalendar",
        text: `Sharing ${view} view`,
        files: [file],
      });
    } else {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = file.name;
      link.click();
    }
  }

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
    const aoa: string[][] = [];

    aoa.push([`makoCalendar - ${year}`]);
    aoa.push(["Date", ...allEventCols]);

    rows.forEach((r) => {
      aoa.push([r.dateISO, ...allEventCols.map((c) => r.events[c] || "")]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, `${monthIndex + 1}-${year}`);
    XLSX.writeFile(wb, `calendar-${monthIndex + 1}-${year}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-slate-100">
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
        onSharePNG={sharePNG}
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Content */}
      <div className="flex h-[calc(100vh-128px)]">
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
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Calendar / Events */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          <div className="h-full p-3">
            <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto">
              {view === "month" && (
                <div ref={monthRef} className="h-full">
                  <MonthView
                    weeks={calendarWeeks}
                    eventsByDate={eventsByDate}
                    selectedDateISO={selectedDateISO}
                    today={today}
                    onDateSelect={setSelectedDateISO}
                    onAddEvent={(dateISO) => openAddEventModal(dateISO)}
                    onEditEvent={(dateISO, eventIndex, value) =>
                      openEditEventModal(dateISO, eventIndex, value)
                    }
                  />
                </div>
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

                      const d = new Date(newDateISO);
                      setYear(d.getFullYear());
                      setMonthIndex(d.getMonth());
                    }}
                    onEditEvent={(dateISO, eventIndex, value) =>
                      openEditEventModal(dateISO, eventIndex, value)
                    }
                  />
                </div>
              )}

              {view === "events" && (
                <div ref={eventsRef} className="h-full">
                  <EventsGridView
                    rows={rows}
                    eventCols={allEventCols}
                    selectedDateISO={selectedDateISO}
                    setSelectedDateISO={setSelectedDateISO}
                    updateCell={updateCell}
                    deleteManyEvents={deleteManyEvents}
                    clearMonth={clearMonth}
                    requestConfirm={askConfirm}
                    notify={pushToast}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {modalMode === "add" ? "Add Event" : "Edit Event"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Title
                </label>
                <input
                  id="eventInput"
                  type="text"
                  placeholder="Add title"
                  defaultValue={modalMode === "edit" ? editingEventValue : ""}
                  className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalMode === "edit" && (
                <div className="text-xs text-slate-500">
                  Tip: Click Save to update this event.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              {modalMode === "edit" && (
                <button
                  onClick={() => void deleteEventFromModal()}
                  className="px-4 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 h-10 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveEventFromModal}
                className="px-4 h-10 bg-teal-700 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Import Events</h2>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Paste Template Data
                </label>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste copied table from Google Sheets (Date + Event 1..Event 10)"
                  className="w-full min-h-40 px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={applyPaste}
                    className="px-4 h-10 bg-teal-700 hover:bg-slate-700 text-white rounded-xl transition font-semibold"
                  >
                    Import Paste
                  </button>

                  <button
                    onClick={() => setPasteText("")}
                    className="px-4 h-10 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm
                             file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                             file:bg-teal-700 file:text-white hover:file:bg-slate-700
                             file:cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-bold text-slate-700 mb-1">
                  CSV Format Required:
                </div>
                <div className="text-xs text-slate-600">
                  Date, Event 1, Event 2, ... Event 10
                </div>
              </div>

              <button
                onClick={clearMonth}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-semibold"
              >
                Clear Month Data
              </button>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 h-10 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">
                {confirmDialog.title}
              </h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700">
              {confirmDialog.message}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => closeConfirmWith(false)}
                className="h-10 rounded-xl border border-slate-300 px-4 text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => closeConfirmWith(true)}
                className="h-10 rounded-xl bg-red-600 px-4 font-semibold text-white transition hover:bg-red-700"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-4 z-80 flex w-full max-w-xs flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
