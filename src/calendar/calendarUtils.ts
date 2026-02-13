import type { CalendarCell, MonthRow, ParsedRow } from "./types";

export const MIN_YEAR = 1990;
export const MAX_YEAR = 2030;

export const MONTHS: string[] = [
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

export const DOW: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOW_SHORT: string[] = ["S", "M", "T", "W", "T", "F", "S"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDate(y: number, mIndex: number, d: number): string {
  return `${y}-${pad2(mIndex + 1)}-${pad2(d)}`;
}

export function niceCellDate(y: number, mIndex: number, d: number): string {
  const monthShort = MONTHS[mIndex].slice(0, 3);
  return `${d}-${monthShort}-${y}`;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function buildMonthRows(year: number, monthIndex: number): MonthRow[] {
  const total = daysInMonth(year, monthIndex);
  const rows: MonthRow[] = [];
  for (let d = 1; d <= total; d++) {
    rows.push({
      dateISO: isoDate(year, monthIndex, d),
      dateLabel: niceCellDate(year, monthIndex, d),
      events: {},
    });
  }
  return rows;
}

export function getEventColumnNumber(col: string): number | null {
  const m = String(col || "").trim().match(/^event\s*(\d+)$/i);
  if (!m) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function toEventColumn(num: number): string {
  return `Event ${num}`;
}

export function sortEventColumns(cols: string[]): string[] {
  return [...new Set(cols)]
    .filter((c) => getEventColumnNumber(c) !== null)
    .sort((a, b) => {
      const an = getEventColumnNumber(a) ?? 0;
      const bn = getEventColumnNumber(b) ?? 0;
      return an - bn;
    })
    .map((c) => toEventColumn(getEventColumnNumber(c) as number));
}

export function getEventColumnsFromRow(row: ParsedRow): string[] {
  return sortEventColumns(Object.keys(row));
}

export function getEventColumnsFromEventData(events: Record<string, string>): string[] {
  return sortEventColumns(Object.keys(events));
}

export function getNextEventColumn(events: Record<string, string>): string {
  const nums = getEventColumnsFromEventData(events)
    .map((c) => getEventColumnNumber(c))
    .filter((n): n is number => n !== null);
  const max = nums.length ? Math.max(...nums) : 0;
  return toEventColumn(max + 1);
}

export function parseCSV(text: string): ParsedRow[] {
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

export function parseTSV(text: string): ParsedRow[] {
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

export function normalizeIncomingRow(row: ParsedRow): ParsedRow {
  const out: ParsedRow = {};

  const dateKey =
    Object.keys(row).find((k) => k.trim().toLowerCase() === "date") || "Date";

  out.Date = row[dateKey] || "";

  getEventColumnsFromRow(row).forEach((col) => {
    const foundKey = Object.keys(row).find(
      (k) => getEventColumnNumber(k) === getEventColumnNumber(col)
    );
    out[col] = foundKey ? String(row[foundKey] || "").trim() : "";
  });

  return out;
}

export function parseAnyDateToISO(
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

export function mergeImportedIntoMonth(
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

    getEventColumnsFromRow(row).forEach((c) => {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== "") {
        target.events[c] = String(row[c]).trim();
      }
    });
  });

  return Array.from(map.values());
}

export function buildCalendarGrid(
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
