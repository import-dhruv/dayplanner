"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, ChevronDown, ChevronRight, Clock3, Flag, CalendarDays, ListTodo, CheckCircle2,
  CirclePlay, Sun, Sunset, Moon, Sunrise, ArrowRight, Timer, Pencil, Sparkles, MoreHorizontal,
  GripVertical, X,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { EmptyState, Field, Modal, PriorityChip, ProgressBar } from "@/components/ui";
import { api } from "@/lib/api";
import { cn, durationLabel, formatHour, formatTime, greeting, prettyDate, timeToMinutes, todayISO, stripHtml } from "@/lib/utils";
import type { Task } from "@/lib/types";

function StatCard({ icon, label, value, color, soft }: { icon: React.ReactNode; label: string; value: string | number; color: string; soft: string }) {
  return (
    <div className="card stat-card card-hover">
      <div className="row between"><span className="small muted">{label}</span><span className="stat-icon" style={{ background: soft, color }}>{icon}</span></div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function PrioritySlot({ rank, task, onPick, onClear }: { rank: number; task?: Task; onPick: () => void; onClear: () => void }) {
  const { toggleTask, openTask } = useApp();
  if (!task) return (
    <button className="card card-pad card-hover" style={{ minHeight: 116, borderStyle: "dashed", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}
      onClick={onPick}>
      <span className="row gap-8 muted"><span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>#{rank}</span><Plus size={15} /></span>
      <span className="small muted">Choose priority #{rank}</span>
    </button>
  );
  return (
    <div className="card card-pad card-hover" style={{ minHeight: 116, borderColor: "var(--primary-border)", background: "var(--surface)" }}>
      <div className="row between">
        <span className="row gap-6"><span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>#{rank}</span><PriorityChip priority={task.priority} /></span>
        <button className="icon-btn sm" onClick={onClear}><X size={13} /></button>
      </div>
      <div className="row gap-8" style={{ marginTop: 10, alignItems: "flex-start" }}>
        <input type="checkbox" className="checkbox" checked={task.status === "completed"} onChange={(e) => toggleTask(task.id, e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <button className="flex-1" style={{ textAlign: "left", background: "none", border: "none", padding: 0 }} onClick={() => openTask(task.id)}>
          <div className="bold small truncate" style={task.status === "completed" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{task.title}</div>
          <div className="tiny muted truncate" style={{ marginTop: 4 }}>{stripHtml(task.description).slice(0, 90) || "No description"}</div>
        </button>
      </div>
      <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
        {task.estimatedMinutes > 0 && <span className="tiny muted row gap-4"><Clock3 size={11} />{durationLabel(task.estimatedMinutes)}</span>}
        {task.dueDate && <span className="tiny muted row gap-4"><CalendarDays size={11} />{prettyDate(task.dueDate)}</span>}
      </div>
    </div>
  );
}

type SectionKey = "morning" | "afternoon" | "evening" | "anytime";
const SECTIONS: { key: SectionKey; label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; defaultTime: string }[] = [
  { key: "morning", label: "Morning", icon: Sunrise, color: "#F59E0B", defaultTime: "09:00" },
  { key: "afternoon", label: "Afternoon", icon: Sun, color: "#5B8DEF", defaultTime: "14:00" },
  { key: "evening", label: "Evening", icon: Moon, color: "#8B7CF6", defaultTime: "19:00" },
  { key: "anytime", label: "Anytime", icon: Clock3, color: "#94A3B8", defaultTime: "" },
];

function sectionFor(task: Task): SectionKey {
  if (!task.startTime) return "anytime";
  const m = timeToMinutes(task.startTime);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "evening";
}

function DailyTimeline() {
  const { data, openTask, updateTask } = useApp();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const today = todayISO();
  const startHour = 7, endHour = 22;
  const pxPerMin = 1.05;
  const dayStart = startHour * 60;
  const totalHeight = (endHour - startHour) * 60 * pxPerMin;

  const blocks = useMemo(() => {
    const items: { id: string; title: string; start: number; end: number; color: string; kind: "task" | "event"; ref: Task | { id: number } }[] = [];
    (data?.events || []).forEach((e) => {
      const s = new Date(e.startAt), en = new Date(e.endAt);
      if (s.toDateString() !== now.toDateString()) return;
      const sm = s.getHours() * 60 + s.getMinutes(), em = en.getHours() * 60 + en.getMinutes();
      if (em <= dayStart || sm >= endHour * 60) return;
      items.push({ id: `e${e.id}`, title: e.title, start: Math.max(sm, dayStart), end: Math.min(em, endHour * 60), color: e.color || "#94A3B8", kind: "event", ref: e });
    });
    (data?.tasks || []).filter((t) => t.scheduledDate === today && t.startTime && t.status !== "cancelled").forEach((t) => {
      const sm = timeToMinutes(t.startTime);
      const em = t.endTime ? timeToMinutes(t.endTime) : sm + (t.estimatedMinutes || 60);
      if (em <= dayStart || sm >= endHour * 60) return;
      items.push({ id: `t${t.id}`, title: t.title, start: Math.max(sm, dayStart), end: Math.min(em, endHour * 60), color: t.status === "completed" ? "#94A3B8" : t.priority === "urgent" ? "#E25656" : t.priority === "high" ? "#EE9A3C" : "#7C6CF0", kind: "task", ref: t });
    });
    return items.sort((a, b) => a.start - b.start);
  }, [data, today, now, dayStart]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMin >= dayStart && nowMin <= endHour * 60;
  const unscheduled = (data?.tasks || []).filter((t) => !t.scheduledDate && t.status !== "completed" && t.status !== "cancelled").slice(0, 5);

  return (
    <div className="card card-pad">
      <div className="row between" style={{ marginBottom: 16 }}>
        <div><div className="section-title"><Clock3 size={16} /> Daily timeline</div><div className="section-sub">Your planned day at a glance</div></div>
        <span className="chip" style={{ background: "var(--red-soft)", color: "var(--red)" }}><span className="chip-dot" style={{ background: "var(--red)" }} /> Now {formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)}</span>
      </div>
      <div style={{ position: "relative", height: totalHeight, paddingLeft: 58 }}>
        {Array.from({ length: endHour - startHour }, (_, i) => startHour + i).map((h) => (
          <div key={h} style={{ position: "absolute", left: 0, right: 0, top: (h * 60 - dayStart) * pxPerMin, height: 60 * pxPerMin, borderTop: "1px solid var(--border)" }}>
            <span className="tiny muted" style={{ position: "absolute", left: 0, top: -7, background: "var(--surface)", paddingRight: 8 }}>{formatHour(h)}</span>
          </div>
        ))}
        {blocks.map((b) => {
          const top = (b.start - dayStart) * pxPerMin;
          const height = Math.max(24, (b.end - b.start) * pxPerMin - 3);
          return <button key={b.id} onClick={() => b.kind === "task" ? openTask(b.ref.id) : window.dispatchEvent(new CustomEvent("planner:open-event", { detail: b.ref.id }))}
            style={{ position: "absolute", left: 66, right: 4, top, height, background: `${b.color}1f`, borderLeft: `3px solid ${b.color}`, borderRadius: 7, padding: "5px 9px", textAlign: "left", overflow: "hidden", zIndex: 3 }}
            title={`${b.title} · ${formatTime(`${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}`)}`}>
            <div className="bold small truncate" style={{ color: b.color }}>{b.title}</div>
            <div className="tiny muted truncate">{formatTime(`${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}`)} – {formatTime(`${String(Math.floor(b.end / 60)).padStart(2, "0")}:${String(b.end % 60).padStart(2, "0")}`)} · {b.kind}</div>
          </button>;
        })}
        {showNow && <div style={{ position: "absolute", left: 52, right: 0, top: (nowMin - dayStart) * pxPerMin, height: 2, background: "var(--red)", zIndex: 5 }}><span style={{ position: "absolute", left: -5, top: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--red)" }} /></div>}
      </div>
      {unscheduled.length > 0 && <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}><Timer size={15} /> Unscheduled tasks <span className="tiny muted">({unscheduled.length})</span></div>
        <div className="col gap-4">{unscheduled.map((t) => <TaskRow key={t.id} task={t} compact />)}</div>
        <div className="tiny muted" style={{ marginTop: 8 }}>Click a task to set a start time and add it to your timeline.</div>
      </div>}
    </div>
  );
}

function EveningReview() {
  const { data, saveReview, notify } = useApp();
  const today = todayISO();
  const existing = data?.reviews.find((r) => r.date === today);
  const [form, setForm] = useState({ completedText: "", notCompletedText: "", achievements: "", moveToTomorrow: "", productivityRating: 0, reflection: "" });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (existing) setForm({ completedText: existing.completedText, notCompletedText: existing.notCompletedText, achievements: existing.achievements, moveToTomorrow: existing.moveToTomorrow, productivityRating: existing.productivityRating, reflection: existing.reflection });
  }, [existing?.id]);

  const todays = (data?.tasks || []).filter((t) => t.scheduledDate === today);
  const completed = todays.filter((t) => t.status === "completed");
  const plannedTime = todays.reduce((s, t) => s + t.estimatedMinutes, 0);
  const actualTime = todays.reduce((s, t) => s + t.actualMinutes, 0);

  return (
    <div className="card card-pad">
      <div className="row between" style={{ cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <div><div className="section-title"><Moon size={16} /> Evening review</div><div className="section-sub">Reflect, learn, and carry forward</div></div>
        {open ? <ChevronDown size={16} className="muted" /> : <ChevronRight size={16} className="muted" />}
      </div>
      <div className="grid-4" style={{ marginTop: 16 }}>
        <div><div className="tiny muted">Planned</div><div className="bold">{todays.length} tasks</div></div>
        <div><div className="tiny muted">Completed</div><div className="bold" style={{ color: "var(--mint)" }}>{completed.length} tasks</div></div>
        <div><div className="tiny muted">Planned time</div><div className="bold">{durationLabel(plannedTime)}</div></div>
        <div><div className="tiny muted">Tracked time</div><div className="bold">{durationLabel(actualTime)}</div></div>
      </div>
      {open && <div className="col gap-14" style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <div className="form-grid">
          <Field label="What did you complete?"><textarea className="textarea" rows={2} value={form.completedText} onChange={(e) => setForm({ ...form, completedText: e.target.value })} /></Field>
          <Field label="What didn't get done?"><textarea className="textarea" rows={2} value={form.notCompletedText} onChange={(e) => setForm({ ...form, notCompletedText: e.target.value })} /></Field>
          <Field label="Biggest achievements"><textarea className="textarea" rows={2} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} /></Field>
          <Field label="Move to tomorrow"><textarea className="textarea" rows={2} value={form.moveToTomorrow} onChange={(e) => setForm({ ...form, moveToTomorrow: e.target.value })} /></Field>
        </div>
        <Field label="How productive was today?"><div className="row gap-6">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={cn("btn", form.productivityRating === n ? "btn-soft" : "")} onClick={() => setForm({ ...form, productivityRating: n })}>{n}</button>)}</div></Field>
        <Field label="Personal reflection"><textarea className="textarea" rows={3} value={form.reflection} onChange={(e) => setForm({ ...form, reflection: e.target.value })} placeholder="What went well? What would you change?" /></Field>
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={async () => { if (await saveReview(today, form)) notify("Daily review saved"); }}>Save review</button>
      </div>}
    </div>
  );
}

export default function MyDayPage() {
  const { data, updateTask, selectPriority, setQuickAddOpen, openTask, setCommandOpen, updatePreferences } = useApp();
  const [clock, setClock] = useState(new Date());
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusText, setFocusText] = useState(data?.preferences.focusMessage || "");
  const [pickerRank, setPickerRank] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(t); }, []);

  const today = todayISO();
  const tasks = data?.tasks || [];
  const todays = tasks.filter((t) => t.scheduledDate === today && t.status !== "cancelled");
  const completed = todays.filter((t) => t.status === "completed").length;
  const inProgress = todays.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
  const remaining = todays.length - completed;
  const pct = todays.length ? Math.round((completed / todays.length) * 100) : 0;
  const priorities = tasks.filter((t) => t.isDailyPriority).sort((a, b) => (a.priorityRank || 9) - (b.priorityRank || 9));

  const sections = SECTIONS.map((s) => ({ ...s, tasks: todays.filter((t) => sectionFor(t) === s.key && (!filter || t.title.toLowerCase().includes(filter.toLowerCase()))) }));

  const handleDrop = async (target: Task | null, section: SectionKey) => {
    if (!dragId) return;
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged) return;
    if (target && target.id !== dragId) {
      const ids = todays.map((t) => t.id).filter((id) => id !== dragId);
      ids.splice(ids.indexOf(target.id), 0, dragId);
      await updateTask(dragId, { sortOrder: ids.indexOf(dragId) });
    }
    const sec = SECTIONS.find((s) => s.key === section);
    if (sec && sec.defaultTime && sectionFor(dragged) !== section) {
      await updateTask(dragId, { startTime: sec.defaultTime, scheduledDate: dragged.scheduledDate || today });
    }
    setDragId(null);
  };

  return (
    <div className="col gap-20">
      <div className="row between wrap gap-12">
        <div>
          <h1 className="page-title">{greeting()}, {data?.user.name?.split(" ")[0] || "friend"} <span style={{ fontSize: 22 }}>👋</span></h1>
          <div className="page-subtitle row gap-8 wrap"><CalendarDays size={13} />{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<span>·</span><Clock3 size={13} />{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="small row gap-6" style={{ marginTop: 10, color: "var(--primary)" }}>
            <Sparkles size={13} />
            {editingFocus ? <input className="input" style={{ width: 260, height: 28, padding: "2px 8px" }} autoFocus value={focusText} onChange={(e) => setFocusText(e.target.value)}
              onBlur={async () => { await updatePreferences({ focusMessage: focusText }); setEditingFocus(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setFocusText(data?.preferences.focusMessage || ""); setEditingFocus(false); } }} />
              : <>{data?.preferences.focusMessage || "Make today count."}<button className="icon-btn sm" title="Edit focus message" onClick={() => { setFocusText(data?.preferences.focusMessage || ""); setEditingFocus(true); }}><Pencil size={11} /></button></>}
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={() => setCommandOpen(true)}><Search size={15} /> Search</button>
          <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={16} /> New task</button>
        </div>
      </div>

      <div className="grid-4">
        <StatCard icon={<ListTodo size={17} />} label="Total tasks" value={todays.length} color="var(--primary)" soft="var(--primary-soft)" />
        <StatCard icon={<CheckCircle2 size={17} />} label="Completed" value={completed} color="var(--mint)" soft="var(--mint-soft)" />
        <StatCard icon={<CirclePlay size={17} />} label="In progress" value={inProgress} color="var(--orange)" soft="var(--orange-soft)" />
        <StatCard icon={<Flag size={17} />} label="Remaining" value={remaining} color="var(--blue)" soft="var(--blue-soft)" />
      </div>

      <div className="card card-pad">
        <div className="row between"><span className="section-title">Daily progress</span><span className="bold" style={{ color: "var(--primary)", fontSize: 18 }}>{pct}%</span></div>
        <div style={{ marginTop: 12 }}><ProgressBar value={pct} /></div>
        <div className="row between tiny muted" style={{ marginTop: 8 }}><span>{completed} of {todays.length} tasks completed today</span><span>{durationLabel(todays.filter((t) => t.status === "completed").reduce((s, t) => s + t.estimatedMinutes, 0))} of {durationLabel(todays.reduce((s, t) => s + t.estimatedMinutes, 0))} planned</span></div>
      </div>

      <div>
        <div className="row between" style={{ marginBottom: 12 }}><div><div className="section-title"><Flag size={16} /> Today's priorities</div><div className="section-sub">Pick the three things that matter most</div></div><span className="tiny muted">{priorities.length}/3 selected</span></div>
        <div className="grid-3">
          {[1, 2, 3].map((rank) => {
            const t = priorities.find((p) => p.priorityRank === rank);
            return <PrioritySlot key={rank} rank={rank} task={t} onPick={() => setPickerRank(rank)} onClear={() => t && selectPriority(t.id, 0)} />;
          })}
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div className="col gap-16">
          <div className="card card-pad">
            <div className="row between wrap gap-8" style={{ marginBottom: 10 }}>
              <div><div className="section-title"><ListTodo size={16} /> Today's tasks</div><div className="section-sub">Drag to reorder · move between sections to reschedule</div></div>
              <div className="row gap-6"><input className="input" style={{ width: 150, height: 32 }} placeholder="Filter tasks..." value={filter} onChange={(e) => setFilter(e.target.value)} /><button className="btn btn-sm btn-soft" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> Add</button></div>
            </div>
            {todays.length === 0 ? <EmptyState icon={<ListTodo size={22} />} title="A fresh page" description="Add a task or pick a priority to start planning your day." action={<button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> Add a task</button>} /> :
              sections.map((sec) => (
                <div key={sec.key} style={{ marginBottom: 10 }}>
                  <button className="row gap-8" style={{ background: "none", border: "none", padding: "8px 4px", width: "100%" }} onClick={() => setCollapsed((c) => ({ ...c, [sec.key]: !c[sec.key] }))}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(null, sec.key)}>
                    {collapsed[sec.key] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    <sec.icon size={15} style={{ color: sec.color }} />
                    <span className="small bold">{sec.label}</span>
                    <span className="tiny muted">{sec.tasks.length}</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </button>
                  {!collapsed[sec.key] && <div className="col gap-2">
                    {sec.tasks.length === 0 && <div className="tiny muted" style={{ padding: "6px 14px" }}>Nothing here yet</div>}
                    {sec.tasks.map((t) => <TaskRow key={t.id} task={t} draggable onDragStart={() => setDragId(t.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); handleDrop(t, sec.key); }} />)}
                  </div>}
                </div>
              ))}
          </div>
          <EveningReview />
        </div>
        <DailyTimeline />
      </div>

      <Modal open={pickerRank !== null} onClose={() => setPickerRank(null)} title={`Choose priority #${pickerRank}`} subtitle="Select a task to feature as one of today's top three.">
        <div className="col gap-4" style={{ maxHeight: 380, overflowY: "auto" }}>
          {(data?.tasks || []).filter((t) => t.status !== "completed" && t.status !== "cancelled").slice(0, 40).map((t) => (
            <button key={t.id} className="task-row" onClick={async () => { if (pickerRank !== null) await selectPriority(t.id, pickerRank); setPickerRank(null); }}>
              <input type="checkbox" className="checkbox" readOnly checked={false} onClick={(e) => e.preventDefault()} />
              <div className="flex-1"><div className="small bold truncate">{t.title}</div><div className="tiny muted truncate">{stripHtml(t.description).slice(0, 70)}</div></div>
              {t.scheduledDate && <span className="chip">{prettyDate(t.scheduledDate)}</span>}
            </button>
          ))}
        </div>
      </Modal>

      <style jsx global>{`
        @media (max-width: 1100px){ .grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
