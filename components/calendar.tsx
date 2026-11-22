"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays, addMonths, addWeeks, format, isSameMonth, isToday, parseISO, startOfMonth,
  startOfWeek, subDays, subMonths, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, List, Columns3, Square, Grid3x3, Filter, Clock3, CheckCircle2 } from "lucide-react";
import { useApp } from "./providers";
import { EventModal } from "./event-modal";
import { EmptyState, Segmented } from "./ui";
import { cn, durationLabel, formatHour, formatTime, minutesToTime, prettyDate, timeToMinutes } from "@/lib/utils";
import type { CalendarEvent, Task } from "@/lib/types";

type View = "day" | "week" | "month" | "agenda";
type Block = {
  key: string;
  id: number;
  kind: "event" | "task";
  title: string;
  date: string;
  start: number;
  end: number;
  color: string;
  status?: string;
  data: CalendarEvent | Task;
};

const HOUR_H = 58;
const DEFAULT_START = 7;
const DEFAULT_END = 22;

function iso(d: Date) { return format(d, "yyyy-MM-dd"); }
function mToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`; }

/** Group blocks into clusters of mutually-overlapping items, then lay each cluster out in columns. */
function layoutBlocks(blocks: Block[]): { block: Block; col: number; cols: number }[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: { block: Block; col: number; cols: number }[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const placed: { block: Block; col: number }[] = [];
    cluster.forEach((b) => {
      let col = columnEnds.findIndex((end) => end <= b.start);
      if (col === -1) { col = columnEnds.length; columnEnds.push(b.end); }
      else columnEnds[col] = b.end;
      placed.push({ block: b, col });
    });
    placed.forEach((p) => result.push({ ...p, cols: columnEnds.length }));
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((b) => {
    if (cluster.length && b.start >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  });
  flush();
  return result;
}

export function CalendarView() {
  const { data, updateEvent, updateTask, openTask } = useApp();
  const prefs = data?.preferences;
  const weekStart = prefs?.weekStart ?? 1;
  const prefStart = Number(prefs?.workStart?.slice(0, 2) ?? DEFAULT_START);
  const prefEnd = Number(prefs?.workEnd?.slice(0, 2) ?? DEFAULT_END);
  const [view, setView] = useState<View>((prefs?.defaultCalendarView as View) || "week");
  const [anchor, setAnchor] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState<{ date: string; time: string } | null>(null);
  const [drag, setDrag] = useState<{ key: string; dx: number; dy: number; mode: "move" | "resize" } | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: string; startX: number; startY: number; mode: "move" | "resize" } | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const handler = () => setAnchor(new Date());
    window.addEventListener("planner:today", handler);
    return () => window.removeEventListener("planner:today", handler);
  }, []);

  const blocks = useMemo<Block[]>(() => {
    const list: Block[] = [];
    (data?.events || []).forEach((e) => {
      if (filterCat && String(e.categoryId) !== filterCat) return;
      const s = new Date(e.startAt), en = new Date(e.endAt);
      list.push({
        key: `event-${e.id}`, id: e.id, kind: "event", title: e.title, date: iso(s),
        start: s.getHours() * 60 + s.getMinutes(), end: en.getHours() * 60 + en.getMinutes(),
        color: e.color || "#94A3B8", data: e,
      });
    });
    (data?.tasks || []).forEach((t) => {
      if (!t.scheduledDate || !t.startTime || t.status === "cancelled") return;
      if (filterCat && String(t.categoryId) !== filterCat) return;
      const start = timeToMinutes(t.startTime);
      const end = t.endTime ? timeToMinutes(t.endTime) : start + (t.estimatedMinutes || 60);
      list.push({
        key: `task-${t.id}`, id: t.id, kind: "task", title: t.title, date: t.scheduledDate,
        start, end: end <= start ? start + 60 : end,
        color: t.status === "completed" ? "#94A3B8" : t.priority === "urgent" ? "#E25656" : t.priority === "high" ? "#EE9A3C" : t.priority === "medium" ? "#5B8DEF" : "#7C6CF0",
        status: t.status, data: t,
      });
    });
    return list;
  }, [data, filterCat]);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    const start = startOfWeek(anchor, { weekStartsOn: weekStart as 0 | 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor, view, weekStart]);

  // Expand the visible range so an item outside the configured working hours never
  // renders above the day header or below the grid.
  const { dayStart, dayEnd } = useMemo(() => {
    const visible = new Set(days.map(iso));
    let start = Number.isFinite(prefStart) ? prefStart : DEFAULT_START;
    let end = Number.isFinite(prefEnd) ? prefEnd : DEFAULT_END;
    blocks.filter((b) => visible.has(b.date)).forEach((b) => {
      start = Math.min(start, Math.floor(b.start / 60));
      end = Math.max(end, Math.ceil(b.end / 60));
    });
    start = Math.max(0, Math.min(start, 23));
    end = Math.max(start + 6, Math.min(24, end));
    return { dayStart: start, dayEnd: end };
  }, [blocks, days, prefStart, prefEnd]);

  // Clip every block to the rendered range.
  const gridBlocks = useMemo(() => blocks.map((b) => ({
    ...b,
    start: Math.max(dayStart * 60, b.start),
    end: Math.min(dayEnd * 60, b.end),
  })).filter((b) => b.end > b.start), [blocks, dayStart, dayEnd]);

  const totalHeight = (dayEnd - dayStart) * HOUR_H;

  const goToday = () => setAnchor(new Date());
  const nav = (dir: number) => {
    if (view === "day") setAnchor((d) => addDays(d, dir));
    else if (view === "week") setAnchor((d) => addWeeks(d, dir));
    else if (view === "month") setAnchor((d) => addMonths(d, dir));
    else setAnchor((d) => addDays(d, dir * 7));
  };

  const rangeLabel = view === "day" ? format(anchor, "EEEE, MMMM d, yyyy")
    : view === "month" ? format(anchor, "MMMM yyyy")
      : `${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d, yyyy")}`;

  const startDrag = (e: React.PointerEvent, block: Block, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { key: block.key, startX: e.clientX, startY: e.clientY, mode };
    setDrag({ key: block.key, dx: 0, dy: 0, mode });
    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      setDrag({ key: dragRef.current.key, dx: ev.clientX - dragRef.current.startX, dy: ev.clientY - dragRef.current.startY, mode: dragRef.current.mode });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const info = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!info) return;
      const dy = ev.clientY - info.startY;
      const dx = ev.clientX - info.startX;
      const deltaMin = Math.round((dy / HOUR_H) * 60 / 15) * 15;
      const colWidth = gridRef.current?.querySelector("[data-day-col]")?.getBoundingClientRect().width || 160;
      const deltaDays = info.mode === "move" ? Math.round(dx / colWidth) : 0;
      if (!deltaMin && !deltaDays) return;

      if (block.kind === "event") {
        const ev = block.data as CalendarEvent;
        const s = new Date(ev.startAt), en = new Date(ev.endAt);
        const duration = en.getTime() - s.getTime();
        s.setDate(s.getDate() + deltaDays);
        en.setDate(en.getDate() + deltaDays);
        if (info.mode === "resize") {
          en.setMinutes(en.getMinutes() + deltaMin);
          if (en <= s) en.setTime(s.getTime() + 15 * 60000);
        } else { s.setMinutes(s.getMinutes() + deltaMin); en.setTime(s.getTime() + duration); }
        updateEvent(block.id, { startAt: s.toISOString(), endAt: en.toISOString() });
      } else {
        const t = block.data as Task;
        const newDate = iso(addDays(parseISO(block.date), deltaDays));
        if (info.mode === "resize") {
          const end = Math.max(block.start + 15, block.end + deltaMin);
          updateTask(t.id, { scheduledDate: newDate, endTime: mToTime(end) } as never);
        } else {
          const start = Math.min(dayEnd * 60 - 15, Math.max(dayStart * 60, block.start + deltaMin));
          const end = start + (block.end - block.start);
          updateTask(t.id, { scheduledDate: newDate, startTime: mToTime(start), endTime: mToTime(end) } as never);
        }
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clickSlot = (e: React.MouseEvent, day: Date) => {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.nativeEvent.offsetY;
    const minutes = Math.max(dayStart * 60, Math.min(dayEnd * 60 - 30, dayStart * 60 + Math.round((y / HOUR_H) * 60 / 15) * 15));
    setDraft({ date: iso(day), time: mToTime(minutes) });
  };

  const preview = (block: Block) => {
    if (!drag || drag.key !== block.key) return null;
    const dyMin = drag.mode === "resize" ? 0 : Math.round((drag.dy / HOUR_H) * 60 / 15) * 15;
    const deltaDays = drag.mode === "move" ? Math.round(drag.dx / ((gridRef.current?.querySelector("[data-day-col]")?.getBoundingClientRect().width || 160))) : 0;
    return { dyMin, deltaDays };
  };

  const renderGrid = (dayList: Date[]) => (
    <div className="calendar-wrap">
      <div className="cal-header" style={{ gridTemplateColumns: `64px repeat(${dayList.length}, minmax(0, 1fr))` }}>
        <div className="cal-time-col" />
        {dayList.map((d) => <div key={iso(d)} onClick={() => { setAnchor(d); setView("day"); }} style={{ padding: "10px 12px", textAlign: "center", cursor: "pointer", borderRight: "1px solid var(--border)" }}>
          <div className="tiny muted" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>{format(d, "EEE")}</div>
          <div className={cn("bold", isToday(d) && "active")} style={{ fontSize: 16, marginTop: 2, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 9, margin: "2px auto 0", background: isToday(d) ? "var(--primary)" : "transparent", color: isToday(d) ? "#fff" : "var(--text)" }}>{format(d, "d")}</div>
        </div>)}
      </div>
      <div className="cal-grid" style={{ gridTemplateColumns: `64px repeat(${dayList.length}, minmax(0, 1fr))`, height: totalHeight }} ref={gridRef}>
        <div className="cal-time-col" style={{ position: "relative" }}>
          {Array.from({ length: dayEnd - dayStart }, (_, i) => dayStart + i).map((h, i) => <div key={h} className="cal-hour-label" style={{ top: i === 0 ? 7 : (h - dayStart) * HOUR_H, transform: i === 0 ? "none" : "translateY(-50%)" }}>{formatHour(h)}</div>)}
        </div>
        {dayList.map((d) => {
          const dayBlocks = gridBlocks.filter((b) => b.date === iso(d));
          const laid = layoutBlocks(dayBlocks);
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const showNow = isToday(d) && nowMin >= dayStart * 60 && nowMin <= dayEnd * 60;
          return (
            <div key={iso(d)} data-day-col className="cal-col" onClick={(e) => clickSlot(e, d)}>
              {Array.from({ length: dayEnd - dayStart }, (_, i) => dayStart + i).map((h) => <React.Fragment key={h}>
                <div className="cal-hour-line" style={{ top: (h - dayStart) * HOUR_H }} />
                <div className="cal-hour-half" style={{ top: (h - dayStart) * HOUR_H + HOUR_H / 2 }} />
              </React.Fragment>)}
              {laid.map(({ block, col, cols }) => {
                const pv = preview(block);
                const top = ((block.start - dayStart * 60 + (pv?.dyMin || 0)) / 60) * HOUR_H;
                const height = Math.max(18, ((block.end - block.start + (drag?.key === block.key && drag.mode === "resize" ? (drag.dy / HOUR_H) * 60 : 0)) / 60) * HOUR_H - 2);
                const width = `calc(${100 / cols}% - 4px)`;
                const left = `calc(${col * (100 / cols)}% + 2px)`;
                const soft = block.kind === "task" && block.status === "completed";
                return (
                  <div key={block.key} data-block
                    className="cal-event"
                    style={{ top, height, left, width, background: `${block.color}${block.kind === "task" ? "26" : "20"}`, borderColor: `${block.color}80`, color: block.color, opacity: soft ? .6 : 1, cursor: "grab", userSelect: "none" }}
                    onPointerDown={(e) => startDrag(e, block, "move")}
                    onClick={(e) => { e.stopPropagation(); if (block.kind === "task") openTask(block.id); else setSelectedEvent(block.data as CalendarEvent); }}>
                    <div className="cal-event-title">{block.kind === "task" ? "◉ " : ""}{block.title}</div>
                    {height > 34 && <div className="cal-event-time">{cols > 1 ? `${mToTime(block.start).slice(0, 5)}–${mToTime(block.end).slice(0, 5)}` : `${formatTime(mToTime(block.start))} – ${formatTime(mToTime(block.end))}`}</div>}
                    {height > 70 && cols === 1 && block.kind === "task" && <div className="cal-event-time">Task · click to edit</div>}
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 7, cursor: "ns-resize" }} onPointerDown={(e) => startDrag(e, block, "resize")} />
                  </div>
                );
              })}
              {showNow && <div className="cal-now" style={{ top: ((nowMin - dayStart * 60) / 60) * HOUR_H }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  const monthGrid = () => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: weekStart as 0 | 1 });
    const daysArr = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return (
      <div className="calendar-wrap">
        <div className="cal-header" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="tiny muted" style={{ padding: 10, textAlign: "center" }}>{format(addDays(start, i), "EEE")}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {daysArr.map((d) => {
            const dayBlocks = blocks.filter((b) => b.date === iso(d));
            return <div key={iso(d)} className="cal-day-cell" style={{ opacity: isSameMonth(d, anchor) ? 1 : .45, cursor: "pointer" }}
              onClick={() => { setAnchor(d); setView("day"); }}>
              <div className="small bold" style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 8, background: isToday(d) ? "var(--primary)" : "transparent", color: isToday(d) ? "#fff" : "var(--text)" }}>{format(d, "d")}</div>
              <div className="col gap-4" style={{ marginTop: 6 }}>
                {dayBlocks.slice(0, 3).map((b) => <div key={b.key} className="tiny truncate" style={{ padding: "3px 6px", borderRadius: 5, background: `${b.color}20`, color: b.color }}>{b.title}</div>)}
                {dayBlocks.length > 3 && <div className="tiny muted">+{dayBlocks.length - 3} more</div>}
              </div>
            </div>;
          })}
        </div>
      </div>
    );
  };

  const agenda = () => {
    const upcoming = [...blocks].filter((b) => parseISO(b.date) >= subDays(now, 1)).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 80);
    const grouped: Record<string, Block[]> = {};
    upcoming.forEach((b) => { (grouped[b.date] ||= []).push(b); });
    return Object.keys(grouped).length === 0 ? <div className="card"><EmptyState icon={<CalendarDays size={22} />} title="Nothing scheduled" description="Your upcoming events and scheduled tasks will appear here." /></div>
      : <div className="col gap-16">{Object.entries(grouped).map(([date, list]) => (
        <div key={date} className="card card-pad">
          <div className="section-title" style={{ marginBottom: 10 }}>{prettyDate(date, { weekday: true })}<span className="chip">{list.length}</span></div>
          {list.map((b) => <button key={b.key} className="row gap-12 task-row" onClick={() => b.kind === "task" ? openTask(b.id) : setSelectedEvent(b.data as CalendarEvent)}>
            <span style={{ width: 4, height: 34, borderRadius: 3, background: b.color }} />
            <span className="small bold" style={{ width: 110, color: b.color }}>{formatTime(mToTime(b.start))} – {formatTime(mToTime(b.end))}</span>
            <span className="flex-1 small truncate text-2">{b.title}</span>
            <span className="chip">{b.kind === "task" ? "Task" : "Event"}</span>
          </button>)}
        </div>
      ))}</div>;
  };

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12">
        <div><h1 className="page-title">Calendar</h1><div className="page-subtitle">Stay organized and on top of your time</div></div>
        <div className="row gap-8 wrap">
          <Segmented value={view} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "agenda", label: "Agenda" }]} onChange={setView} />
          <button className="btn btn-primary" onClick={() => setDraft({ date: iso(anchor), time: "09:00" })}><Plus size={16} /> New event</button>
        </div>
      </div>

      <div className="card card-pad" style={{ padding: 12 }}>
        <div className="row between wrap gap-8">
          <div className="row gap-6">
            <button className="icon-btn" onClick={goToday} title="Jump to today" style={{ border: "1px solid var(--border)" }}>Today</button>
            <button className="icon-btn" onClick={() => nav(-1)}><ChevronLeft size={17} /></button>
            <button className="icon-btn" onClick={() => nav(1)}><ChevronRight size={17} /></button>
            <span className="bold" style={{ marginLeft: 6, fontSize: 15 }}>{rangeLabel}</span>
          </div>
          <div className="row gap-8">
            <select className="select" style={{ width: 160 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}><option value="">All categories</option>{(data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <span className="tiny muted row gap-4"><span className="chip-dot" style={{ background: "#7C6CF0" }} /> Tasks appear automatically</span>
          </div>
        </div>
      </div>

      {view === "month" ? monthGrid() : view === "agenda" ? agenda() : renderGrid(view === "day" ? days : days)}
      {view !== "month" && view !== "agenda" && <div className="row gap-16 wrap tiny muted">
        <span>Click an empty slot to create an event · drag blocks to reschedule · drag the bottom edge to resize</span>
        <span className="row gap-4"><span style={{ width: 3, height: 12, background: "var(--red)", borderRadius: 2 }} /> Current time</span>
      </div>}

      {selectedEvent && <EventModal open event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {draft && <EventModal open initialDate={draft.date} initialStart={draft.time} onClose={() => setDraft(null)} />}
    </div>
  );
}
