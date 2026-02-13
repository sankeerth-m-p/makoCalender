import { useEffect, useMemo, useState } from "react";
import type { MonthRow } from "../calendar/types";

type EventCellRef = {
  dateISO: string;
  col: string;
};

interface EventsGridViewProps {
  rows: MonthRow[];
  eventCols: string[];
  selectedDateISO: string;
  setSelectedDateISO: (dateISO: string) => void;
  updateCell: (dateISO: string, col: string, value: string) => void;
  deleteManyEvents: (items: EventCellRef[]) => Promise<void>;
  clearMonth: () => void;
  requestConfirm: (
    message: string,
    title?: string,
    confirmLabel?: string
  ) => Promise<boolean>;
  notify: (message: string, type?: "success" | "error" | "info") => void;
}

type EditKey = string; // `${dateISO}__${col}`

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

/**
 * Supports:
 * __TAG:IMP__ Title (new)
 * __IMP__ Title     (old)
 * [IMP] Title       (very old)
 */
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

function colorToClasses(color: LabelColor) {
  if (color === "red")
    return "bg-rose-300 text-rose-950 font-extrabold border border-rose-500";

  if (color === "blue")
    return "bg-sky-300 text-sky-950 font-extrabold border border-sky-500";

  if (color === "purple")
    return "bg-violet-300 text-violet-950 font-extrabold border border-violet-500";

  if (color === "green")
    return "bg-emerald-300 text-emerald-950 font-extrabold border border-emerald-500";

  if (color === "orange")
    return "bg-orange-300 text-orange-950 font-extrabold border border-orange-500";

  if (color === "yellow")
    return "bg-yellow-300 text-yellow-950 font-extrabold border border-yellow-500";

  if (color === "pink")
    return "bg-pink-300 text-pink-950 font-extrabold border border-pink-500";

  return "bg-slate-200 text-slate-950 font-bold border border-slate-400";
}

function colorToButtonClasses(color: LabelColor, active: boolean) {
  const base = "px-4 py-2 rounded-xl font-bold text-sm transition border";

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
      ? "bg-slate-700 text-white border-slate-700"
      : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200"
  }`;
}

export default function EventsGridView({
  rows,
  eventCols,
  selectedDateISO,
  setSelectedDateISO,
  updateCell,
  deleteManyEvents,
  clearMonth,
  requestConfirm,
  notify,
}: EventsGridViewProps) {
  void clearMonth;

  // drafts
  const [draft, setDraft] = useState<Record<EditKey, string>>({});

  // ✅ Selection state for bulk delete
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedCount = selectedKeys.size;
  
  const selectableKeys = useMemo(() => {
    const keys: string[] = [];
    rows.forEach((r) => {
      eventCols.forEach((c) => {
        if (String(r.events[c] || "").trim() !== "") {
          keys.push(makeKey(r.dateISO, c));
        }
      });
    });
    return keys;
  }, [rows, eventCols]);
  
  const totalSelectable = selectableKeys.length;
  const allSelected = totalSelectable > 0 && selectedCount === totalSelectable;

  // labels
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

  // persist custom labels
  useEffect(() => {
    const custom = labels.filter((l) => !l.isDefault);
    localStorage.setItem(LS_LABELS_KEY, JSON.stringify(custom));
  }, [labels]);

  // ⭐ When rows change (month change / reload), clear drafts and selections
  useEffect(() => {
    setDraft({});
    setSelectedKeys(new Set());
  }, [rows]);

  // modal edit event
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDateISO, setModalDateISO] = useState("");
  const [modalCol, setModalCol] = useState("");
  const [modalText, setModalText] = useState("");
  const [modalLabelId, setModalLabelId] = useState<string | null>(null);

  // label manager UI
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>("green");

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState<LabelColor>("green");

  const [isCleaningDeletedLabel, setIsCleaningDeletedLabel] = useState(false);

  function keyOf(dateISO: string, col: string): EditKey {
    return `${dateISO}__${col}`;
  }

  function makeKey(dateISO: string, col: string): string {
    return `${dateISO}|||${col}`;
  }

  function parseKey(key: string): EventCellRef | null {
    const idx = key.indexOf("|||");
    if (idx < 0) return null;
    const dateISO = key.slice(0, idx);
    const col = key.slice(idx + 3);
    if (!dateISO || !col) return null;
    return { dateISO, col };
  }

  function getLabelById(id: string | null) {
    if (!id) return null;
    return labels.find((l) => l.id === id) || null;
  }

  function getCellRaw(r: MonthRow, col: string) {
    const k = keyOf(r.dateISO, col);
    return draft[k] !== undefined ? draft[k] : r.events[col] || "";
  }

  function getCellText(r: MonthRow, col: string) {
    return parseTaggedValue(getCellRaw(r, col)).text;
  }

  function getCellLabelId(r: MonthRow, col: string) {
    return parseTaggedValue(getCellRaw(r, col)).labelId;
  }

  function isDirty(r: MonthRow, col: string): boolean {
    const k = keyOf(r.dateISO, col);
    if (draft[k] === undefined) return false;
    return (draft[k] || "") !== (r.events[col] || "");
  }

  function toggleSelected(dateISO: string, col: string): void {
    const key = makeKey(dateISO, col);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll(): void {
    if (!totalSelectable) return;
    setSelectedKeys((prev) => {
      const allAlreadySelected =
        prev.size === totalSelectable &&
        selectableKeys.every((k) => prev.has(k));
      if (allAlreadySelected) return new Set();
      return new Set(selectableKeys);
    });
  }

  async function handleDeleteSingle(dateISO: string, col: string): Promise<void> {
    const ok = await requestConfirm("Delete this event?", "Delete Event", "Delete");
    if (!ok) return;
    
    try {
      await deleteManyEvents([{ dateISO, col }]);
      notify("Event deleted.", "success");
    } catch {
      notify("Failed to delete event.", "error");
      return;
    }

    const key = makeKey(dateISO, col);
    setSelectedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleDeleteSelected(): Promise<void> {
    if (!selectedCount) return;
    
    const ok = await requestConfirm(
      `Delete ${selectedCount} selected event(s)?`,
      "Delete Selected Events",
      "Delete"
    );
    if (!ok) return;

    const items = Array.from(selectedKeys)
      .map(parseKey)
      .filter((x): x is EventCellRef => x !== null);

    const validItems = items.filter((item) => {
      const row = rows.find((r) => r.dateISO === item.dateISO);
      return row ? String(row.events[item.col] || "").trim() !== "" : false;
    });

    if (!validItems.length) {
      setSelectedKeys(new Set());
      return;
    }

    try {
      await deleteManyEvents(validItems);
      setSelectedKeys(new Set());
      notify(`${validItems.length} event(s) deleted.`, "success");
    } catch {
      notify("Failed to delete selected events.", "error");
    }
  }

  function openEditModal(r: MonthRow, col: string) {
    setSelectedDateISO(r.dateISO);

    const parsed = parseTaggedValue(getCellRaw(r, col));

    setModalDateISO(r.dateISO);
    setModalCol(col);
    setModalText(parsed.text);
    setModalLabelId(parsed.labelId);

    // reset panels
    setShowAddLabel(false);
    setNewLabelName("");
    setNewLabelColor("green");

    setEditingLabelId(null);
    setEditLabelName("");
    setEditLabelColor("green");

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalDateISO("");
    setModalCol("");
    setModalText("");
    setModalLabelId(null);

    setShowAddLabel(false);
    setNewLabelName("");
    setNewLabelColor("green");

    setEditingLabelId(null);
    setEditLabelName("");
    setEditLabelColor("green");
  }

  async function saveModal() {
    if (!modalDateISO || !modalCol) return;

    const newRaw = buildTaggedValue(modalLabelId, modalText);
    const k = keyOf(modalDateISO, modalCol);

    // ✅ 1) Update UI immediately
    setDraft((prev) => ({ ...prev, [k]: newRaw }));

    // ✅ 2) Close modal immediately (NO WAIT)
    closeModal();

    // ✅ 3) Save in background
    try {
      await updateCell(modalDateISO, modalCol, newRaw);

      // remove draft after save
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[k];
        return copy;
      });
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  }

  // -------------------------------
  // LABEL CRUD
  // -------------------------------

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

  function cancelEditLabel() {
    setEditingLabelId(null);
    setEditLabelName("");
    setEditLabelColor("green");
  }

  function saveEditLabel() {
    if (!editingLabelId) return;

    const newName = editLabelName.trim().slice(0, 16);
    if (!newName) return;

    setLabels((prev) =>
      prev.map((l) => {
        if (l.id !== editingLabelId) return l;
        return {
          ...l,
          name: newName,
          color: editLabelColor,
        };
      })
    );

    cancelEditLabel();
  }

  /**
   * ✅ Auto-clean all events that use deleted label
   */
  async function cleanupEventsForDeletedLabel(labelId: string) {
    setIsCleaningDeletedLabel(true);

    try {
      for (const r of rows) {
        for (const col of eventCols) {
          const raw = r.events[col] || "";
          if (!raw) continue;

          const parsed = parseTaggedValue(raw);

          if (parsed.labelId === labelId) {
            const cleaned = parsed.text;
            await updateCell(r.dateISO, col, cleaned);
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

  const modalLabel = useMemo(
    () => getLabelById(modalLabelId),
    [modalLabelId, labels]
  );

  const selectedLabel = useMemo(
    () => `Delete Selected (${selectedCount})`,
    [selectedCount]
  );
  
  const selectAllLabel = useMemo(
    () =>
      allSelected
        ? `Unselect All (${selectedCount})`
        : "Select All",
    [allSelected, selectedCount]
  );

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Delete Selected Button */}
        <div className="z-20 flex h-12 items-center justify-end gap-2 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={totalSelectable === 0}
            className="h-9 min-w-36 rounded-xl border border-slate-300 bg-white px-3 text-center text-xs font-semibold tabular-nums text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 transition"
          >
            {selectAllLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteSelected()}
            disabled={selectedCount === 0}
            className="h-9 w-40 rounded-xl border border-red-200 bg-red-50 px-3 text-center text-xs font-semibold tabular-nums text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 transition"
          >
            {selectedLabel}
          </button>
        </div>

        {/* Grid Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead>
              <tr className="sticky top-0 z-20 bg-teal-700">
                <th
                  className="
                    sticky left-0 z-30 min-w-[160px]
                    border border-emerald-950/40
                    px-4 py-3 text-left text-sm font-bold text-white
                    bg-teal-700
                  "
                >
                  Date
                </th>

                {eventCols.map((c) => (
                  <th
                    key={c}
                    className="
                      min-w-[160px]
                      border border-emerald-950/40
                      px-4 py-3 text-left text-sm font-bold text-white
                    "
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
                    className={`transition-colors
                      ${isSelected ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}
                    `}
                  >
                    <td
                      onClick={() => setSelectedDateISO(r.dateISO)}
                      className={`
                        sticky left-0 z-10
                        border border-slate-200
                        px-4 py-3 text-sm font-semibold cursor-pointer
                        ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-white text-slate-800"
                        }
                      `}
                    >
                      {r.dateLabel}
                    </td>

                    {eventCols.map((c) => {
                      const dirty = isDirty(r, c);

                      const text = getCellText(r, c);
                      const labelId = getCellLabelId(r, c);
                      const label = getLabelById(labelId);

                      const cellValue = r.events[c] || "";
                      const hasEvent = String(cellValue).trim() !== "";
                      const checked = selectedKeys.has(makeKey(r.dateISO, c));

                      return (
                        <td key={c} className="border border-slate-200 p-0">
                          <div className="group relative flex items-center gap-2 px-2">
                            {/* Checkbox for selection */}
                            {hasEvent && (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelected(r.dateISO, c)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-3.5 w-3.5 shrink-0 accent-teal-600"
                                aria-label={`Select ${c} for ${r.dateISO}`}
                              />
                            )}

                            {/* Input field */}
                            <input
                              value={text}
                              readOnly
                              onClick={() => openEditModal(r, c)}
                              className={`
                                min-w-0 w-full h-full px-2 py-3
                                border-0 text-sm cursor-pointer
                                focus:outline-none
                                ${dirty ? "pr-12" : "pr-2"}
                                ${
                                  label
                                    ? colorToClasses(label.color)
                                    : "bg-transparent text-slate-800"
                                }
                              `}
                            />

                            {hasEvent && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteSingle(r.dateISO, c)}
                                className="h-6 w-6 shrink-0 rounded-md border border-red-200 bg-red-50 text-[11px] font-bold leading-none text-red-700 opacity-0 transition hover:bg-red-100 group-hover:opacity-100 focus:opacity-100"
                                title="Delete event"
                              >
                                X
                              </button>
                            )}

                            {dirty && (
                              <div
                                className="
                                  absolute right-10 top-1/2 -translate-y-1/2
                                  h-7 w-7 rounded-md
                                  bg-emerald-600 text-white font-bold
                                  flex items-center justify-center
                                "
                                title="Saved"
                              >
                                ✓
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Edit Event
              </h2>
            </div>

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
                  className={`
                    w-full rounded-xl border-2 px-4 py-3 text-lg
                    outline-none transition
                    border-blue-500 focus:ring-2 focus:ring-blue-400
                    ${
                      modalLabel
                        ? colorToClasses(modalLabel.color)
                        : "bg-white text-slate-900"
                    }
                  `}
                />
              </div>

              {/* Label Buttons */}
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

                      {!l.isDefault && active && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditLabel(l)}
                            className="
                              h-9 w-9 rounded-xl border border-slate-200
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
                              h-9 w-9 rounded-xl border border-slate-200
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
                    px-4 py-2 rounded-xl font-bold text-sm transition border
                    ${
                      modalLabelId === null
                        ? "bg-slate-700 text-white border-slate-700"
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
                    px-4 py-2 rounded-xl font-bold text-sm transition
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

            <div className="px-8 py-6 border-t border-slate-200 flex justify-end gap-4">
              <button
                type="button"
                onClick={closeModal}
                className="
                  rounded-xl border border-slate-300
                  px-6 py-3 text-lg font-medium
                  text-slate-700 hover:bg-slate-50 transition
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveModal}
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
    </>
  );
}