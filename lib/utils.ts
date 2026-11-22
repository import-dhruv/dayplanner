import { format, parseISO, isToday, isTomorrow, addDays, differenceInCalendarDays } from "date-fns";
import type { Priority, Status } from "./types";

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function dateISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function shiftDate(iso: string, days: number): string {
  return dateISO(addDays(parseISO(iso), days));
}

export function prettyDate(iso: string | null | undefined, opts: { weekday?: boolean } = {}): string {
  if (!iso) return "No date";
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, opts.weekday ? "EEE, MMM d" : "MMM d, yyyy");
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw || "0", 10);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function durationLabel(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function relativeDue(iso: string | null | undefined): { label: string; overdue: boolean; soon: boolean } {
  if (!iso) return { label: "", overdue: false, soon: false };
  const days = differenceInCalendarDays(parseISO(iso), new Date());
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true, soon: false };
  if (days === 0) return { label: "Due today", overdue: false, soon: true };
  if (days === 1) return { label: "Due tomorrow", overdue: false, soon: true };
  return { label: prettyDate(iso), overdue: false, soon: days <= 3 };
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const PRIORITIES: Record<Priority, { label: string; color: string; soft: string; dot: string }> = {
  urgent: { label: "Urgent", color: "#DC2626", soft: "#FEECEC", dot: "#EF4444" },
  high: { label: "High", color: "#D97706", soft: "#FEF3E2", dot: "#F59E0B" },
  medium: { label: "Medium", color: "#2563EB", soft: "#E9F1FF", dot: "#5B8DEF" },
  low: { label: "Low", color: "#0F766E", soft: "#E3F7F3", dot: "#14B8A6" },
  none: { label: "No priority", color: "#6B7280", soft: "#F1F2F6", dot: "#A9AEBE" },
};

export const STATUSES: Record<Status, { label: string; color: string; soft: string }> = {
  not_started: { label: "Not Started", color: "#6B7280", soft: "#F1F2F6" },
  in_progress: { label: "In Progress", color: "#7C6CF0", soft: "#F0EDFF" },
  in_review: { label: "In Review", color: "#D97706", soft: "#FEF3E2" },
  completed: { label: "Completed", color: "#059669", soft: "#E4F9F1" },
  cancelled: { label: "Cancelled", color: "#9CA3AF", soft: "#F1F2F6" },
};

export const KANBAN_COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "not_started", label: "Todo", color: "#94A3B8" },
  { id: "in_progress", label: "In Progress", color: "#7C6CF0" },
  { id: "in_review", label: "In Review", color: "#F59E0B" },
  { id: "completed", label: "Done", color: "#34D399" },
];

export const CATEGORY_COLORS = [
  "#7C6CF0", "#5B8DEF", "#34D399", "#F472B6", "#F59E0B", "#22D3EE", "#A78BFA", "#FB7185", "#64748B", "#10B981",
];

export function eventColorFor(event: { color?: string; categoryId?: number | null }, categories: { id: number; color: string }[]): string {
  if (event.color) return event.color;
  const cat = categories.find((c) => c.id === event.categoryId);
  return cat?.color || "#94A3B8";
}

export function stripHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent || "";
}

/** Lightweight natural-language task parsing (no AI / external API). */
export function parseQuickAdd(input: string, baseDate = new Date()) {
  let text = input.trim();
  let scheduledDate: string | null = null;
  let startTime: string | null = null;
  let estimatedMinutes = 0;

  const today = format(baseDate, "yyyy-MM-dd");
  const tomorrow = dateISO(addDays(baseDate, 1));

  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    scheduledDate = dateMatch[1];
    text = text.replace(dateMatch[0], " ");
  } else if (/\btomorrow\b/i.test(text)) {
    scheduledDate = tomorrow;
    text = text.replace(/\btomorrow\b/gi, " ");
  } else if (/\btoday\b/i.test(text)) {
    scheduledDate = today;
    text = text.replace(/\btoday\b/gi, " ");
  } else {
    const dayMatch = text.match(/\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (dayMatch) {
      const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const target = names.indexOf(dayMatch[1].toLowerCase());
      let delta = (target - baseDate.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      scheduledDate = dateISO(addDays(baseDate, delta));
      text = text.replace(dayMatch[0], " ");
    }
  }

  const timeMatch = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2] || "0", 10);
    if (timeMatch[3].toLowerCase() === "pm" && h < 12) h += 12;
    if (timeMatch[3].toLowerCase() === "am" && h === 12) h = 0;
    startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    text = text.replace(timeMatch[0], " ");
  } else {
    const military = text.match(/\b(?:at\s+)?(\d{1,2}):(\d{2})\b/);
    if (military) {
      startTime = `${String(parseInt(military[1], 10)).padStart(2, "0")}:${military[2]}`;
      text = text.replace(military[0], " ");
    }
  }

  const hourDuration = text.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minDuration = text.match(/\bfor\s+(\d+)\s*(?:minutes?|mins?|m)\b/i);
  if (hourDuration) {
    estimatedMinutes = Math.round(parseFloat(hourDuration[1]) * 60);
    text = text.replace(hourDuration[0], " ");
  } else if (minDuration) {
    estimatedMinutes = parseInt(minDuration[1], 10);
    text = text.replace(minDuration[0], " ");
  }

  text = text.replace(/\b(at|for|on)\b/gi, " ").replace(/\s+/g, " ").trim();
  const title = text.replace(/^[,\s-]+|[,\s-]+$/g, "");

  return {
    title: title || input.trim(),
    scheduledDate: scheduledDate || today,
    startTime,
    endTime: startTime && estimatedMinutes ? minutesToTime(timeToMinutes(startTime) + estimatedMinutes) : null,
    estimatedMinutes,
  };
}
