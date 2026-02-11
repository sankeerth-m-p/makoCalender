export interface Session {
  username: string;
  token: string;
}

export interface EventData {
  [key: string]: string;
}

export interface MonthRow {
  dateISO: string;
  dateLabel: string;
  events: EventData;
}

export interface CalendarCell {
  day: number;
  dateISO: string;
}

export interface ParsedRow {
  [key: string]: string;
}

export type ViewType = "month" | "week" | "events";
