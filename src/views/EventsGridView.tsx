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
}

type EditKey = string; // `${dateISO}__${col}`

export default function EventsGridView({
  rows,
  eventCols,
  selectedDateISO,
  setSelectedDateISO,
  updateCell,
  deleteManyEvents,
  clearMonth,
}: EventsGridViewProps) {
  void clearMonth;

  // ✅ Local draft values (typing does NOT call backend)
  const [draft, setDraft] = useState<Record<EditKey, string>>({});

  // ✅ Selection state for bulk delete
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedCount = selectedKeys.size;

  // ⭐ When rows change (month change / reload), clear drafts and selections
  useEffect(() => {
    setDraft({});
    setSelectedKeys(new Set());
  }, [rows]);

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

  function getCellValue(r: MonthRow, col: string): string {
    const k = keyOf(r.dateISO, col);
    if (draft[k] !== undefined) return draft[k];
    return r.events[col] || "";
  }

  function isDirty(r: MonthRow, col: string): boolean {
    const k = keyOf(r.dateISO, col);
    if (draft[k] === undefined) return false;
    return (draft[k] || "") !== (r.events[col] || "");
  }

  async function commit(r: MonthRow, col: string) {
    const k = keyOf(r.dateISO, col);
    const newVal = (draft[k] ?? r.events[col] ?? "").trimEnd();

    // if no changes, do nothing
    if (newVal === (r.events[col] || "")) {
      // remove draft
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[k];
        return copy;
      });
      return;
    }

    // ✅ Save to backend only ONCE
    await updateCell(r.dateISO, col, newVal);

    // remove draft after save
    setDraft((prev) => {
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
  }

  function cancel(r: MonthRow, col: string) {
    const k = keyOf(r.dateISO, col);
    setDraft((prev) => {
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
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

  async function handleDeleteSelected(): Promise<void> {
    if (!selectedCount) return;
    if (!confirm(`Delete ${selectedCount} selected event(s)?`)) return;

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

    await deleteManyEvents(validItems);
    setSelectedKeys(new Set());
  }

  const selectedLabel = useMemo(
    () => `Delete Selected (${selectedCount})`,
    [selectedCount]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Delete Selected Button */}
      <div className="z-20 flex h-12 items-center justify-end border-b border-slate-200 bg-white px-4">
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
            {/* ✅ GREEN SHEET HEADER */}
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
                    ${
                      isSelected
                        ? "bg-emerald-50"
                        : "bg-white hover:bg-slate-50"
                    }
                  `}
                >
                  {/* ✅ Sticky Date Column */}
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
                    const value = getCellValue(r, c);
                    const isImportant =
                      value.trim().startsWith("!") ||
                      value.toUpperCase().startsWith("[IMP]");
                    const cellValue = r.events[c] || "";
                    const hasEvent = String(cellValue).trim() !== "";
                    const checked = selectedKeys.has(makeKey(r.dateISO, c));

                    return (
                      <td key={c} className="border border-slate-200 p-0">
                        <div className="relative flex items-center gap-2 px-2">
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
                            value={value}
                            onFocus={() => setSelectedDateISO(r.dateISO)}
                            onChange={(e) => {
                              const k = keyOf(r.dateISO, c);
                              setDraft((prev) => ({
                                ...prev,
                                [k]: e.target.value,
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commit(r, c);
                              }

                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancel(r, c);
                              }
                            }}
                            className={`
                              w-full h-full px-2 py-3 pr-12
                              border-none bg-transparent text-sm
                              focus:outline-none
                              focus:ring-2 focus:ring-inset
                              transition
                              ${
                                isImportant
                                  ? "text-rose-800 font-semibold focus:bg-rose-50 focus:ring-rose-500/60"
                                  : "text-slate-800 focus:bg-emerald-50 focus:ring-emerald-500/60"
                              }
                            `}
                            placeholder=""
                          />

                          {/* Save button when dirty */}
                          {dirty && (
                            <button
                              type="button"
                              onClick={() => commit(r, c)}
                              className="
                                absolute right-2 top-1/2 -translate-y-1/2
                                h-7 w-7 rounded-md
                                bg-emerald-600 text-white font-bold
                                hover:bg-emerald-700 transition
                                flex items-center justify-center
                              "
                              title="Save (✔)"
                              aria-label="Save cell"
                            >
                              ✓
                            </button>
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
  );
}