import { useMemo, useState } from "react";
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedCount = selectedKeys.size;

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
      <div className="z-20 flex h-12 items-center justify-end border-b border-slate-200 bg-white px-3">
        <button
          type="button"
          onClick={() => void handleDeleteSelected()}
          disabled={selectedCount === 0}
          className="h-8 w-40 rounded-md border border-red-200 bg-red-50 px-3 text-center text-xs font-semibold tabular-nums text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {selectedLabel}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-350 border-collapse">
          <thead>
            <tr className="bg-slate-50 sticky top-0 z-10">
            <th className="sticky left-0 z-11 min-w-35 border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700">
              Date
            </th>
            {eventCols.map((c) => (
              <th
                key={c}
                className="min-w-35 border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700"
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
                  isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <td
                  onClick={() => setSelectedDateISO(r.dateISO)}
                  className={`sticky left-0 z-1 cursor-pointer border border-slate-200 px-3 py-3 text-sm font-medium ${
                    isSelected ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <span>{r.dateLabel}</span>
                </td>
                {eventCols.map((c) => {
                  const cellValue = r.events[c] || "";
                  const hasEvent = String(cellValue).trim() !== "";
                  const checked = selectedKeys.has(makeKey(r.dateISO, c));

                  return (
                    <td key={c} className="border border-slate-200 p-0">
                      <div className="group flex items-center gap-2 px-2 py-2">
                        {hasEvent && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(r.dateISO, c)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                            aria-label={`Select ${c} for ${r.dateISO}`}
                          />
                        )}
                        <input
                          value={cellValue}
                          onFocus={() => setSelectedDateISO(r.dateISO)}
                          onChange={(e) => updateCell(r.dateISO, c, e.target.value)}
                          className="w-full rounded border-none bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                          placeholder=""
                        />
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
