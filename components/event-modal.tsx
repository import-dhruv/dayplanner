"use client";

import React, { useEffect, useState } from "react";
import { Trash2, Copy, CalendarDays } from "lucide-react";
import { useApp } from "./providers";
import { Field, Modal } from "./ui";
import { CATEGORY_COLORS, dateISO } from "@/lib/utils";
import type { CalendarEvent, Recurrence } from "@/lib/types";

export function EventModal({ open, onClose, event, initialDate, initialStart }: {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  initialDate?: string;
  initialStart?: string;
}) {
  const { data, createEvent, updateEvent, deleteEvent, duplicateEvent, notify } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(initialDate || dateISO(new Date()));
  const [start, setStart] = useState(initialStart || "09:00");
  const [end, setEnd] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("#7C6CF0");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [reminder, setReminder] = useState("0");

  useEffect(() => {
    if (!open) return;
    if (event) {
      const s = new Date(event.startAt);
      const e = new Date(event.endAt);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const t = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      setTitle(event.title); setDescription(event.description || ""); setDate(iso(s)); setStart(t(s)); setEnd(t(e));
      setAllDay(event.allDay); setLocation(event.location || ""); setColor(event.color || "#7C6CF0");
      setCategory(event.categoryId ? String(event.categoryId) : ""); setProject(event.projectId ? String(event.projectId) : "");
      setTask(event.taskId ? String(event.taskId) : ""); setRecurrence(event.recurrence || "none");
      setReminder(String(event.reminderMinutes ?? 0));
    } else {
      setTitle(""); setDescription(""); setDate(initialDate || dateISO(new Date()));
      setStart(initialStart || "09:00"); setEnd(initialStart ? `${String(Number(initialStart.slice(0, 2)) + 1).padStart(2, "0")}:${initialStart.slice(3)}` : "10:00");
      setAllDay(false); setLocation(""); setColor("#7C6CF0"); setCategory(""); setProject(""); setTask("");
      setRecurrence("none"); setReminder("0");
    }
  }, [open, event, initialDate, initialStart]);

  const save = async () => {
    if (!title.trim()) { notify("Please enter an event title", "error"); return; }
    const startAt = new Date(`${date}T${start || "00:00"}:00`);
    const endAt = new Date(`${date}T${end || "23:59"}:00`);
    if (endAt <= startAt && !allDay) { notify("End time must be after start time", "error"); return; }
    const payload = {
      title: title.trim(), description, startAt: startAt.toISOString(), endAt: endAt.toISOString(),
      allDay, location, color, categoryId: category ? Number(category) : null,
      projectId: project ? Number(project) : null, taskId: task ? Number(task) : null,
      recurrence, reminderMinutes: Number(reminder) || null,
    };
    const ok = event ? await updateEvent(event.id, payload) : await createEvent(payload);
    if (ok) { notify(event ? "Event updated" : "Event created"); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? "Edit event" : "New event"} subtitle="Schedule time for what matters."
      wide
      footer={<>
        {event && <>
          <button className="btn btn-ghost" style={{ marginRight: "auto" }} onClick={async () => { if (await duplicateEvent(event.id)) onClose(); }}><Copy size={14} /> Duplicate</button>
          <button className="btn btn-danger" onClick={async () => { if (confirm("Delete this event?")) { await deleteEvent(event.id); onClose(); } }}><Trash2 size={14} /> Delete</button>
        </>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save event</button>
      </>}>
      <div className="col gap-16">
        <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" autoFocus /></Field>
        <Field label="Description"><textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." /></Field>
        <div className="form-grid">
          <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="All day"><select className="select" value={allDay ? "yes" : "no"} onChange={(e) => setAllDay(e.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select></Field>
          <Field label="Start"><input type="time" className="input" disabled={allDay} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End"><input type="time" className="input" disabled={allDay} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Field label="Location"><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Reminder"><select className="select" value={reminder} onChange={(e) => setReminder(e.target.value)}><option value="0">None</option><option value="5">5 min before</option><option value="15">15 min before</option><option value="30">30 min before</option><option value="60">1 hour before</option></select></Field>
          <Field label="Category"><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">None</option>{data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Project"><select className="select" value={project} onChange={(e) => setProject(e.target.value)}><option value="">None</option>{data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Linked task"><select className="select" value={task} onChange={(e) => setTask(e.target.value)}><option value="">None</option>{data?.tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
          <Field label="Repeat"><select className="select" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>{["none", "daily", "weekdays", "weekly", "biweekly", "monthly", "yearly"].map((r) => <option key={r} value={r}>{r === "none" ? "Does not repeat" : r[0].toUpperCase() + r.slice(1)}</option>)}</select></Field>
        </div>
        <div>
          <span className="label row gap-6"><CalendarDays size={13} /> Color</span>
          <div className="row gap-6 wrap" style={{ marginTop: 8 }}>
            {CATEGORY_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: color === c ? "2.5px solid var(--text)" : "2px solid transparent", boxShadow: "0 0 0 1px var(--border)" }} />)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
