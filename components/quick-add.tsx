"use client";

import React, { useEffect, useState } from "react";
import { Plus, Sparkles, CalendarPlus } from "lucide-react";
import { useApp } from "./providers";
import { Field, Modal } from "./ui";
import { parseQuickAdd, todayISO, formatTime } from "@/lib/utils";
import type { Priority, Status } from "@/lib/types";

export function QuickAdd() {
  const { quickAddOpen, setQuickAddOpen, data, createTask, createEvent, notify } = useApp();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("60");
  const [priority, setPriority] = useState<Priority>("none");
  const [status, setStatus] = useState<Status>("not_started");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [asEvent, setAsEvent] = useState(false);

  useEffect(() => {
    if (!quickAddOpen) return;
    setText(""); setTitle(""); setDate(todayISO()); setStart(""); setDuration("60");
    setPriority("none"); setCategory(""); setProject(""); setAsEvent(false);
  }, [quickAddOpen]);

  useEffect(() => {
    const handler = (e: Event) => setStatus((e as CustomEvent).detail || "not_started");
    window.addEventListener("planner:quick-add-status", handler);
    return () => window.removeEventListener("planner:quick-add-status", handler);
  }, []);

  const parse = (value: string) => {
    setText(value);
    const p = parseQuickAdd(value);
    setTitle(p.title);
    if (p.scheduledDate) setDate(p.scheduledDate);
    if (p.startTime) setStart(p.startTime);
    if (p.estimatedMinutes) setDuration(String(p.estimatedMinutes));
  };

  const save = async () => {
    if (!title.trim()) { notify("Please enter a title", "error"); return; }
    const minutes = Number(duration) || 0;
    if (asEvent) {
      if (!start) { notify("Choose a start time for the event", "error"); return; }
      const [h, m] = start.split(":").map(Number);
      const startAt = new Date(`${date}T${start}:00`);
      const endAt = new Date(startAt.getTime() + (minutes || 60) * 60000);
      const ok = await createEvent({
        title: title.trim(), startAt: startAt.toISOString(), endAt: endAt.toISOString(),
        categoryId: category ? Number(category) : null, projectId: project ? Number(project) : null,
        color: "#7C6CF0", description: "",
      });
      if (ok) { notify("Event added to calendar"); setQuickAddOpen(false); }
      return;
    }
    const end = start && minutes ? `${String(Math.floor((Number(start.split(":")[0]) * 60 + Number(start.split(":")[1]) + minutes) / 60)).padStart(2, "0")}:${String((Number(start.split(":")[1]) + minutes) % 60).padStart(2, "0")}` : null;
    const ok = await createTask({
      title: title.trim(), scheduledDate: date || null, startTime: start || null, endTime: end,
      estimatedMinutes: minutes, priority, categoryId: category ? Number(category) : null,
      projectId: project ? Number(project) : null, status,
    });
    if (ok) { notify("Task added"); setQuickAddOpen(false); }
  };

  return (
    <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick add"
      subtitle="Type naturally — we'll fill in the details for you."
      footer={<>
        <button className="btn" onClick={() => setQuickAddOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={save}><Plus size={15} /> Add {asEvent ? "event" : "task"}</button>
      </>}>
      <div className="col gap-16">
        <div className="field">
          <label className="label">What do you need to do?</label>
          <textarea className="textarea" rows={2} placeholder="e.g. Study linear algebra tomorrow at 8 AM for 2 hours" value={text} onChange={(e) => parse(e.target.value)} />
          <span className="tiny muted row gap-4"><Sparkles size={12} /> Parsed details appear below — edit anything you like.</span>
        </div>
        <div className="form-grid">
          <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" /></Field>
          <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Start time"><input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Duration (minutes)"><input type="number" min="0" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="Priority"><select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="none">No priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
          <Field label="Status"><select className="select" value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
          <Field label="Category"><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">No category</option>{data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Project"><select className="select" value={project} onChange={(e) => setProject(e.target.value)}><option value="">No project</option>{data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Type"><select className="select" value={asEvent ? "event" : "task"} onChange={(e) => setAsEvent(e.target.value === "event")}><option value="task">Task</option><option value="event">Calendar event</option></select></Field>
        </div>
        {start && <div className="small muted row gap-6"><CalendarPlus size={13} /> Scheduled {formatTime(start)}{Number(duration) ? ` · ${duration} minutes` : ""} on {date}</div>}
      </div>
    </Modal>
  );
}
