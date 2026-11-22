"use client";

import React, { useEffect, useState } from "react";
import {
  X, Trash2, CalendarDays, Clock3, Flag, CircleDot, FolderKanban, Tag as TagIcon,
  Plus, Check, NotebookPen, Timer, History, MoreHorizontal, Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "./providers";
import { RichTextEditor } from "./rich-text";
import { Field, PriorityChip, ProgressBar, StatusChip } from "./ui";
import { CATEGORY_COLORS, PRIORITIES, STATUSES, durationLabel, formatTime, prettyDate, cn } from "@/lib/utils";
import type { Priority, Status, Task } from "@/lib/types";

export function TaskDetailDrawer() {
  const { selectedTaskId, openTask, data, updateTask, deleteTask, toggleTask, notify, refresh, createNote } = useApp();
  const task = data?.tasks.find((t) => t.id === selectedTaskId) || null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [estMinutes, setEstMinutes] = useState("");
  const [subKind, setSubKind] = useState<"subtask" | "checklist">("subtask");

  useEffect(() => {
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setEstMinutes(String(task?.estimatedMinutes ?? 0));
  }, [task?.id, task?.title, task?.description, task?.estimatedMinutes]);

  if (!task) return null;

  const categories = data?.categories || [];
  const projects = data?.projects || [];
  const tags = data?.tags || [];
  const doneSubs = task.subtasks.filter((s) => s.isCompleted).length;
  const linkedNotes = (data?.notes || []).filter((n) => n.taskId === task.id);
  const entries = (data?.timeEntries || []).filter((e) => e.taskId === task.id);

  const patch = async (changes: Partial<Task>) => {
    await updateTask(task.id, changes as never);
  };

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    await api.tasks.addSubtask(task.id, { title: newSubtask.trim(), kind: subKind });
    setNewSubtask("");
    await refresh();
  };

  const toggleSub = async (id: number, value: boolean) => {
    await api.tasks.updateSubtask(id, { isCompleted: value });
    await refresh();
  };

  const removeSub = async (id: number) => {
    await api.tasks.deleteSubtask(id);
    await refresh();
  };

  const addTagById = async (tagId: number) => {
    if (task.tagIds.includes(tagId)) return;
    await patch({ tagIds: [...task.tagIds, tagId] } as never);
  };

  const createAndAttachTag = async () => {
    if (!newTag.trim()) return;
    const existing = tags.find((t) => t.name.toLowerCase() === newTag.trim().toLowerCase());
    if (existing) await addTagById(existing.id);
    else {
      const tag = await api.tags.create({ name: newTag.trim() });
      await refresh();
      await patch({ tagIds: [...task.tagIds, tag.id] } as never);
    }
    setNewTag("");
  };

  return (
    <>
      <div className="overlay" style={{ justifyContent: "flex-end", padding: 0, background: "rgba(22,22,40,.22)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) openTask(null); }}>
        <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <div className="row gap-8">
              <span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>Task details</span>
              <span className="tiny muted">#{task.id}</span>
            </div>
            <div className="row gap-4">
              <button className="icon-btn" title="Delete task" onClick={() => { if (confirm("Delete this task?")) deleteTask(task.id); }}><Trash2 size={17} /></button>
              <button className="icon-btn" onClick={() => openTask(null)} aria-label="Close"><X size={18} /></button>
            </div>
          </div>
          <div className="drawer-body">
            <div className="row gap-12" style={{ alignItems: "flex-start" }}>
              <input
                type="checkbox" className="checkbox" style={{ marginTop: 6 }}
                checked={task.status === "completed"}
                onChange={(e) => toggleTask(task.id, e.target.checked)}
              />
              <input
                className="input bold"
                style={{ fontSize: 17, border: "none", padding: "4px 0", background: "transparent", boxShadow: "none", letterSpacing: "-.02em" }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { if (title.trim() && title !== task.title) patch({ title: title.trim() }); }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            </div>

            <div className="row gap-6 wrap" style={{ margin: "14px 0 6px" }}>
              <StatusChip status={task.status} />
              <PriorityChip priority={task.priority} />
              {task.dueDate && <span className="chip"><CalendarDays size={12} />{prettyDate(task.dueDate)}{task.dueTime ? ` · ${formatTime(task.dueTime)}` : ""}</span>}
              {task.estimatedMinutes > 0 && <span className="chip"><Clock3 size={12} />{durationLabel(task.estimatedMinutes)} est.</span>}
            </div>

            <div className="divider" />

            <div className="col gap-16">
              <Field label="Description">
                <RichTextEditor value={description} onChange={setDescription} placeholder="Add a detailed description..." minHeight={130} />
                <button className="btn btn-sm btn-soft" style={{ alignSelf: "flex-start" }} onClick={() => patch({ description })}>Save description</button>
              </Field>

              <div>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="section-title"><Check size={15} /> Checklist & subtasks {task.subtasks.length > 0 && <span className="tiny muted">({doneSubs}/{task.subtasks.length})</span>}</span>
                </div>
                {task.subtasks.length > 0 && <div style={{ marginBottom: 10 }}><ProgressBar value={task.subtasks.length ? (doneSubs / task.subtasks.length) * 100 : 0} color="var(--mint)" /></div>}
                <div className="col gap-4">
                  {task.subtasks.map((s) => (
                    <div key={s.id} className="row gap-8 task-row" style={{ padding: "7px 10px" }}>
                      <input type="checkbox" className="checkbox" checked={s.isCompleted} onChange={(e) => toggleSub(s.id, e.target.checked)} />
                      <span className={cn("small flex-1", s.isCompleted && "muted")} style={s.isCompleted ? { textDecoration: "line-through" } : undefined}>{s.title}</span>
                      <span className="tiny muted">{s.kind === "checklist" ? "Checklist" : "Subtask"}</span>
                      <button className="icon-btn sm" onClick={() => removeSub(s.id)}><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="row gap-6" style={{ marginTop: 8 }}>
                  <select className="select" style={{ width: 120 }} value={subKind} onChange={(e) => setSubKind(e.target.value as never)}><option value="subtask">Subtask</option><option value="checklist">Checklist</option></select>
                  <input className="input" placeholder="Add an item..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }} />
                  <button className="btn btn-sm btn-soft" onClick={addSubtask}><Plus size={14} /></button>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Status">
                  <select className="select" value={task.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                    {Object.entries(STATUSES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className="select" value={task.priority} onChange={(e) => patch({ priority: e.target.value as Priority })}>
                    {Object.entries(PRIORITIES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select className="select" value={task.categoryId ?? ""} onChange={(e) => patch({ categoryId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Project">
                  <select className="select" value={task.projectId ?? ""} onChange={(e) => patch({ projectId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Scheduled date">
                  <input type="date" className="input" value={task.scheduledDate || ""} onChange={(e) => patch({ scheduledDate: e.target.value || null })} />
                </Field>
                <Field label="Due date">
                  <input type="date" className="input" value={task.dueDate || ""} onChange={(e) => patch({ dueDate: e.target.value || null })} />
                </Field>
                <Field label="Start time">
                  <input type="time" className="input" value={task.startTime || ""} onChange={(e) => patch({ startTime: e.target.value || null })} />
                </Field>
                <Field label="End time">
                  <input type="time" className="input" value={task.endTime || ""} onChange={(e) => patch({ endTime: e.target.value || null })} />
                </Field>
                <Field label="Estimated (min)">
                  <input type="number" min="0" className="input" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} onBlur={() => patch({ estimatedMinutes: Number(estMinutes || 0) })} />
                </Field>
                <Field label="Actual (min)">
                  <input className="input" value={task.actualMinutes} readOnly />
                </Field>
                <Field label="Repeat">
                  <select className="select" value={task.recurrence} onChange={(e) => patch({ recurrence: e.target.value as never })}>
                    {["none", "daily", "weekdays", "weekly", "biweekly", "monthly", "yearly"].map((r) => <option key={r} value={r}>{r === "none" ? "Does not repeat" : r[0].toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Reminder">
                  <select className="select" value={task.reminderMinutes ?? 0} onChange={(e) => patch({ reminderMinutes: Number(e.target.value) || null })}>
                    <option value="0">None</option><option value="5">5 min before</option><option value="15">15 min before</option><option value="30">30 min before</option><option value="60">1 hour before</option>
                  </select>
                </Field>
              </div>

              <div>
                <span className="label"><TagIcon size={12} style={{ verticalAlign: -2 }} /> Tags</span>
                <div className="row gap-6 wrap" style={{ marginTop: 8 }}>
                  {task.tagIds.map((id) => {
                    const t = tags.find((x) => x.id === id);
                    if (!t) return null;
                    return <button key={id} className="chip" style={{ background: `${t.color}22`, color: t.color }} onClick={() => patch({ tagIds: task.tagIds.filter((x) => x !== id) } as never)}>{t.name} <X size={11} /></button>;
                  })}
                  <input className="input" style={{ width: 130, height: 26, padding: "2px 8px" }} placeholder="+ Add tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createAndAttachTag(); }} />
                </div>
              </div>

              <div>
                <span className="section-title"><Link2 size={15} /> Depends on</span>
                <div className="row gap-6 wrap" style={{ marginTop: 8 }}>
                  {(task.dependencyIds || []).map((id) => {
                    const dep = data?.tasks.find((t) => t.id === id);
                    if (!dep) return null;
                    return <span key={id} className="chip">{dep.title.slice(0, 40)}<button onClick={() => patch({ dependencyIds: (task.dependencyIds || []).filter((x) => x !== id) } as never)}><X size={11} /></button></span>;
                  })}
                  <select className="select" style={{ width: 210, height: 28, padding: "2px 8px" }} value="" onChange={async (e) => {
                    const id = Number(e.target.value);
                    if (id) await patch({ dependencyIds: [...(task.dependencyIds || []), id] } as never);
                  }}>
                    <option value="">+ Add dependency</option>
                    {(data?.tasks || []).filter((t) => t.id !== task.id && !(task.dependencyIds || []).includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.title.slice(0, 48)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <span className="section-title"><Link2 size={15} /> Attachments</span>
                <div className="col gap-4" style={{ marginTop: 8 }}>
                  {task.attachments.map((a) => <div key={a.id} className="row gap-8 small">
                    <a href={a.url} download={a.filename} className="flex-1 truncate" style={{ color: "var(--primary)" }}>{a.filename}</a>
                    <span className="tiny muted">{Math.round(a.size / 1024)} KB</span>
                    <button className="icon-btn sm" onClick={async () => { await api.tasks.deleteAttachment(a.id); await refresh(); }}><Trash2 size={12} /></button>
                  </div>)}
                  <label className="btn btn-sm" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
                    <Plus size={13} /> Attach file
                    <input type="file" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024) { notify("Files must be under 4 MB", "error"); return; }
                      const reader = new FileReader();
                      reader.onload = async () => { await api.tasks.addAttachment(task.id, file.name, String(reader.result)); await refresh(); notify("File attached"); };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              </div>

              <div>
                <span className="section-title"><Timer size={15} /> Time tracking</span>
                <div className="row gap-6" style={{ marginTop: 8 }}>
                  <input className="input" type="number" min="1" placeholder="Minutes spent" style={{ maxWidth: 140 }} value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} />
                  <button className="btn btn-sm btn-soft" onClick={async () => {
                    const m = Number(timeMinutes);
                    if (m > 0) { await api.timeEntries.create({ taskId: task.id, minutes: m }); await refresh(); setTimeMinutes(""); notify("Time logged"); }
                  }}>Log time</button>
                </div>
                {entries.map((e) => <div key={e.id} className="row between small" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="muted">{e.startedAt ? new Date(e.startedAt).toLocaleString() : "Entry"}</span>
                  <span className="row gap-8"><b>{durationLabel(e.minutes)}</b><button className="icon-btn sm" onClick={async () => { await api.timeEntries.delete(e.id); await refresh(); }}><Trash2 size={12} /></button></span>
                </div>)}
              </div>

              <div>
                <span className="section-title"><NotebookPen size={15} /> Linked notes</span>
                <div className="col gap-6" style={{ marginTop: 8 }}>
                  {linkedNotes.map((n) => <div key={n.id} className="row gap-8 small"><Link2 size={12} className="muted" />{n.title}</div>)}
                  <button className="btn btn-sm" onClick={async () => { await createNote({ title: task.title + " — notes", taskId: task.id }); notify("Note created and linked"); }}><Plus size={13} /> New linked note</button>
                </div>
              </div>

              <div>
                <span className="section-title"><History size={15} /> Activity</span>
                <div className="col gap-4 small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  {task.createdAt && <span>Created {new Date(task.createdAt).toLocaleString()}</span>}
                  {task.updatedAt && <span>Last updated {new Date(task.updatedAt).toLocaleString()}</span>}
                  {task.completedAt && <span>Completed {new Date(task.completedAt).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
