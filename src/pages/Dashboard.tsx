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
  parseCSV,
  parseTSV,
  sortEventColumns,
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

type ModalMode = "add" | "edit";

// -----------------------------
// LABEL SYSTEM (same as grid)
// -----------------------------
type LabelColor =
  | "red"
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "yellow"
  | "pink"
  | "gray";

type Label = {
  id: string;
  name: string;
  color: LabelColor;
  isDefault?: boolean;
};

const LS_LABELS_KEY = "makoCalendar_labels_v1";

const TAG_PREFIX = "__TAG:";
const TAG_SUFFIX = "__";

function normalizeLabelId(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 16);
}

function buildTaggedValue(labelId: string | null, text: string) {
  const clean = text.trim();
  if (!clean) return "";
  if (!labelId) return clean;

  return `${TAG_PREFIX}${labelId}${TAG_SUFFIX} ${clean}`;
}

// Supports ALL formats (new + old)
function parseTaggedValue(raw: string): { labelId: string | null; text: string } {
  const v = (raw || "").trim();
  if (!v) return { labelId: null, text: "" };

  // NEW FORMAT: __TAG:IMP__ Something
  const m1 = v.match(/^__TAG:([A-Z0-9_]+)__\s*(.*)$/);
  if (m1) return { labelId: m1[1] || null, text: (m1[2] || "").trim() };

  // OLD FORMAT: __IMP__ Something
  const m2 = v.match(/^__([A-Z0-9_]+)__\s*(.*)$/);
  if (m2) return { labelId: m2[1] || null, text: (m2[2] || "").trim() };

  // VERY OLD FORMAT: [IMP] Something
  const m3 = v.match(/^\[([A-Z0-9_]+)\]\s*(.*)$/);
  if (m3) return { labelId: m3[1] || null, text: (m3[2] || "").trim() };

  return { labelId: null, text: v };
}

function colorToButtonClasses(color: LabelColor, active: boolean) {
  const base = "px-5 py-2 rounded-2xl font-extrabold text-sm transition border";

  if (color === "red")
    return `${base} ${
      active
        ? "bg-rose-600 text-white border-rose-600"
        : "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200"
    }`;

  if (color === "blue")
    return `${base} ${
      active
        ? "bg-sky-600 text-white border-sky-600"
        : "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200"
    }`;

  if (color === "purple")
    return `${base} ${
      active
        ? "bg-violet-600 text-white border-violet-600"
        : "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200"
    }`;

  if (color === "green")
    return `${base} ${
      active
        ? "bg-emerald-600 text-white border-emerald-600"
        : "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
    }`;

  if (color === "orange")
    return `${base} ${
      active
        ? "bg-orange-600 text-white border-orange-600"
        : "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
    }`;

  if (color === "yellow")
    return `${base} ${
      active
        ? "bg-yellow-500 text-white border-yellow-500"
        : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"
    }`;

  if (color === "pink")
    return `${base} ${
      active
        ? "bg-pink-600 text-white border-pink-600"
        : "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200"
    }`;

  return `${base} ${
    active
      ? "bg-slate-800 text-white border-slate-800"
      : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200"
  }`;
}

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

  const [rows, setRows] = useState<MonthRow[]>(buildMonthRows(year, monthIndex));

  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    now.toISOString().split("T")[0]
  );

  const [pasteText, setPasteText] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [miniMonthIndex, setMiniMonthIndex] = useState<number>(now.getMonth());
  const [miniYear, setMiniYear] = useState<number>(safeYear);

  // ----------------------------
  // LABELS
  // ----------------------------
  const [labels, setLabels] = useState<Label[]>(() => {
    const defaults: Label[] = [
      { id: "IMP", name: "IMP", color: "red", isDefault: true },
      { id: "MEET", name: "MEET", color: "blue", isDefault: true },
      { id: "TASK", name: "TASK", color: "purple", isDefault: true },
    ];

    try {
      const saved = localStorage.getItem(LS_LABELS_KEY);
      if (!saved) return defaults;

      const parsed = JSON.parse(saved) as Label[];

      const map = new Map<string, Label>();
      defaults.forEach((l) => map.set(l.id, l));

      parsed.forEach((l) => {
        if (!l?.id) return;
        const id = normalizeLabelId(l.id);
        if (!id) return;

        if (id === "IMP" || id === "MEET" || id === "TASK") return;

        map.set(id, {
          id,
          name: (l.name || id).toString().slice(0, 16),
          color: (l.color || "green") as LabelColor,
          isDefault: false,
        });
      });

      return Array.from(map.values());
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    const custom = labels.filter((l) => !l.isDefault);
    localStorage.setItem(LS_LABELS_KEY, JSON.stringify(custom));
  }, [labels]);

  // ----------------------------
  // MODAL STATES (CONTROLLED)
  // ----------------------------
  const [modalText, setModalText] = useState("");
  const [modalLabelId, setModalLabelId] = useState<string | null>(null);

  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>("green");

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState<LabelColor>("green");

  const [isCleaningDeletedLabel, setIsCleaningDeletedLabel] = useState(false);

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
    const cols: string[] = [];
    rows.forEach((r) => {
      cols.push(...Object.keys(r.events));
    });
    const sorted = sortEventColumns(cols);
    return sorted.length ? sorted : ["Event 1"];
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

    // optimistic UI
    setRows((prev) =>
      prev.map((r) =>
        r.dateISO === dateISO
          ? { ...r, events: { ...r.events, [col]: value } }
          : r
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

    setRows(buildMonthRows(year, monthIndex));
  }

  async function bulkUpload(rowsToUpload: MonthRow[]) {
    const payload = {
      year,
      month: monthIndex + 1,
      rows: rowsToUpload.map((r) => ({
        dateISO: r.dateISO,
        events: Object.fromEntries(
          Object.entries(r.events).filter(([, v]) => v && v.trim() !== "")
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

    const merged = mergeImportedIntoMonth(rows, incoming, year, monthIndex);

    setRows(merged);
    setPasteText("");

    await bulkUpload(merged);

    alert("Imported & saved successfully!");
    setShowImportModal(false);
  }

  async function onUploadFile(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const incoming = parseCSV(text);

    if (!incoming.length) {
      alert("Invalid CSV file.");
      return;
    }

    const merged = mergeImportedIntoMonth(rows, incoming, year, monthIndex);

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

  function getLabelById(id: string | null) {
    if (!id) return null;
    return labels.find((l) => l.id === id) || null;
  }

  function cancelEditLabel() {
    setEditingLabelId(null);
    setEditLabelName("");
    setEditLabelColor("green");
  }

  function addNewLabel() {
    const id = normalizeLabelId(newLabelName);
    if (!id) return;

    if (labels.some((l) => l.id === id)) {
      setModalLabelId(id);
      setShowAddLabel(false);
      setNewLabelName("");
      return;
    }

    if (id === "IMP" || id === "MEET" || id === "TASK") return;

    const newLabel: Label = {
      id,
      name: id,
      color: newLabelColor,
      isDefault: false,
    };

    setLabels((prev) => [...prev, newLabel]);
    setModalLabelId(id);

    setShowAddLabel(false);
    setNewLabelName("");
    setNewLabelColor("green");
  }

  function startEditLabel(label: Label) {
    if (label.isDefault) return;

    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);

    setShowAddLabel(false);
  }

  function saveEditLabel() {
    if (!editingLabelId) return;

    const newName = editLabelName.trim().slice(0, 16);
    if (!newName) return;

    setLabels((prev) =>
      prev.map((l) => {
        if (l.id !== editingLabelId) return l;
        return { ...l, name: newName, color: editLabelColor };
      })
    );

    cancelEditLabel();
  }

  async function cleanupEventsForDeletedLabel(labelId: string) {
    setIsCleaningDeletedLabel(true);

    try {
      for (const r of rows) {
        for (const col of allEventCols) {
          const raw = r.events[col] || "";
          if (!raw) continue;

          const parsed = parseTaggedValue(raw);
          if (parsed.labelId === labelId) {
            await updateCell(r.dateISO, col, parsed.text);
          }
        }
      }
    } finally {
      setIsCleaningDeletedLabel(false);
    }
  }

  async function deleteLabel(labelId: string) {
    const label = getLabelById(labelId);
    if (!label) return;
    if (label.isDefault) return;

    setLabels((prev) => prev.filter((l) => l.id !== labelId));

    if (modalLabelId === labelId) setModalLabelId(null);
    if (editingLabelId === labelId) cancelEditLabel();

    await cleanupEventsForDeletedLabel(labelId);
  }

  // ⭐ OPEN MODAL: ADD
  function openAddEventModal(dateISO: string) {
    setModalText("");
    setModalLabelId(null);

    setModalMode("add");
    setEditingDate(dateISO);
    setEditingEventIndex(null);

    setShowAddLabel(false);
    setNewLabelName("");
    setNewLabelColor("green");

    cancelEditLabel();
    setShowEventModal(true);
  }

  // ⭐ OPEN MODAL: EDIT
  function openEditEventModal(
    dateISO: string,
    eventIndex: number,
    currentValue: string
  ) {
    // ✅ RESET FIRST (prevents 1-frame showing raw)
    setModalText("");
    setModalLabelId(null);

    setModalMode("edit");
    setEditingDate(dateISO);
    setEditingEventIndex(eventIndex);

    // parse raw value
    const parsed = parseTaggedValue(currentValue || "");
    setModalText(parsed.text);
    setModalLabelId(parsed.labelId);

    setShowAddLabel(false);
    setNewLabelName("");
    setNewLabelColor("green");

    cancelEditLabel();
    setShowEventModal(true);
  }

  // ⭐ SAVE (ADD OR EDIT) - optimistic close
  function saveEventFromModal() {
    const finalRaw = buildTaggedValue(modalLabelId, modalText);

    if (!finalRaw.trim()) {
      setShowEventModal(false);
      return;
    }

    // close instantly
    setShowEventModal(false);

    if (modalMode === "add") {
      const targetRow = rows.find((r) => r.dateISO === editingDate);
      const nextCol = getNextEventColumn(targetRow?.events ?? {});
      updateCell(editingDate, nextCol, finalRaw);
      return;
    }

    if (modalMode === "edit") {
      if (editingEventIndex === null) return;
      const col = getColumnForEventIndex(editingDate, editingEventIndex);
      updateCell(editingDate, col, finalRaw);
      return;
    }
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
                    clearMonth={() => {}}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal (NEW LABEL UI) */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-200">
              <h2 className="text-3xl font-extrabold text-slate-900">
                {modalMode === "add" ? "Add Event" : "Edit Event"}
              </h2>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-5">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Event Title
                </label>

                <input
                  autoFocus
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="Enter event title"
                  className="
                    w-full rounded-xl border-2 px-4 py-3 text-lg
                    outline-none transition
                    border-blue-500 focus:ring-2 focus:ring-blue-400
                    bg-white text-slate-900
                  "
                />
              </div>

              {/* Labels */}
              <div className="flex flex-wrap gap-3 items-center">
                {labels.map((l) => {
                  const active = modalLabelId === l.id;

                  return (
                    <div key={l.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalLabelId(l.id);
                          if (l.isDefault) cancelEditLabel();
                        }}
                        className={colorToButtonClasses(l.color, active)}
                      >
                        {l.name}
                      </button>

                      {/* Only for custom + selected */}
                      {!l.isDefault && active && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditLabel(l)}
                            className="
                              h-10 w-10 rounded-2xl border border-slate-200
                              bg-white text-slate-700 hover:bg-slate-50
                              font-bold
                            "
                            title="Edit label"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            disabled={isCleaningDeletedLabel}
                            onClick={() => deleteLabel(l.id)}
                            className={`
                              h-10 w-10 rounded-2xl border border-slate-200
                              bg-white font-bold
                              ${
                                isCleaningDeletedLabel
                                  ? "text-slate-400 cursor-not-allowed"
                                  : "text-rose-700 hover:bg-rose-50"
                              }
                            `}
                            title="Delete label"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Clear */}
                <button
                  type="button"
                  onClick={() => {
                    setModalLabelId(null);
                    cancelEditLabel();
                  }}
                  className={`
                    px-5 py-2 rounded-2xl font-extrabold text-sm transition border
                    ${
                      modalLabelId === null
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200"
                    }
                  `}
                >
                  CLEAR
                </button>

                {/* Add */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLabel((s) => !s);
                    cancelEditLabel();
                  }}
                  className="
                    px-5 py-2 rounded-2xl font-extrabold text-sm transition
                    bg-emerald-700 text-white hover:bg-emerald-800
                  "
                >
                  + Add Label
                </button>
              </div>

              {isCleaningDeletedLabel && (
                <div className="text-sm font-semibold text-slate-600">
                  Cleaning events for deleted label... please wait...
                </div>
              )}

              {/* Add Label Panel */}
              {showAddLabel && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Label Name
                      </label>
                      <input
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="EXAM / TRAVEL / BIRTHDAY"
                        className="
                          w-full rounded-xl border border-slate-300
                          px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/60
                        "
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Color
                      </label>
                      <select
                        value={newLabelColor}
                        onChange={(e) =>
                          setNewLabelColor(e.target.value as LabelColor)
                        }
                        className="
                          w-full rounded-xl border border-slate-300
                          px-3 py-2 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/60
                        "
                      >
                        <option value="red">Red</option>
                        <option value="blue">Blue</option>
                        <option value="purple">Purple</option>
                        <option value="green">Green</option>
                        <option value="orange">Orange</option>
                        <option value="yellow">Yellow</option>
                        <option value="pink">Pink</option>
                        <option value="gray">Gray</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddLabel(false);
                        setNewLabelName("");
                        setNewLabelColor("green");
                      }}
                      className="
                        px-4 py-2 rounded-xl font-bold text-sm
                        bg-white border border-slate-300
                        text-slate-700 hover:bg-slate-100
                      "
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={addNewLabel}
                      className="
                        px-4 py-2 rounded-xl font-bold text-sm
                        bg-emerald-700 text-white hover:bg-emerald-800
                      "
                    >
                      Create Label
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Label Panel */}
              {editingLabelId && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-slate-900">
                      Edit Label:{" "}
                      <span className="text-emerald-700">{editingLabelId}</span>
                    </p>

                    <button
                      type="button"
                      onClick={cancelEditLabel}
                      className="
                        px-3 py-1 rounded-lg
                        bg-slate-100 hover:bg-slate-200
                        text-slate-700 font-bold
                      "
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Label Display Name
                      </label>
                      <input
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        className="
                          w-full rounded-xl border border-slate-300
                          px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/60
                        "
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Color
                      </label>
                      <select
                        value={editLabelColor}
                        onChange={(e) =>
                          setEditLabelColor(e.target.value as LabelColor)
                        }
                        className="
                          w-full rounded-xl border border-slate-300
                          px-3 py-2 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/60
                        "
                      >
                        <option value="red">Red</option>
                        <option value="blue">Blue</option>
                        <option value="purple">Purple</option>
                        <option value="green">Green</option>
                        <option value="orange">Orange</option>
                        <option value="yellow">Yellow</option>
                        <option value="pink">Pink</option>
                        <option value="gray">Gray</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEditLabel}
                      className="
                        px-4 py-2 rounded-xl font-bold text-sm
                        bg-white border border-slate-300
                        text-slate-700 hover:bg-slate-100
                      "
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveEditLabel}
                      className="
                        px-4 py-2 rounded-xl font-bold text-sm
                        bg-emerald-700 text-white hover:bg-emerald-800
                      "
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-200 flex justify-end gap-4">
              <button
                onClick={() => setShowEventModal(false)}
                className="
                  rounded-xl border border-slate-300
                  px-6 py-3 text-lg font-medium
                  text-slate-700 hover:bg-slate-50 transition
                "
              >
                Cancel
              </button>

              <button
                onClick={saveEventFromModal}
                className="
                  rounded-xl bg-emerald-700
                  px-7 py-3 text-lg font-bold
                  text-white hover:bg-emerald-800 transition
                "
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal (unchanged) */}
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
                  className="w-full min-h-[160px] px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
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
    </div>
  );
}
