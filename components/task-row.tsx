"use client";

import React from "react";
import { GripVertical, CalendarDays, Clock3, ListChecks, FolderKanban, Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useApp } from "./providers";
import { CategoryChip, PriorityChip, StatusChip } from "./ui";
import { cn, durationLabel, formatTime, relativeDue, stripHtml } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function TaskRow({
  task, draggable = false, onDragStart, onDragOver, onDrop, compact = false,
}: {
  task: Task;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  compact?: boolean;
}) {
  const { data, toggleTask, openTask, deleteTask } = useApp();
  const prio = task.priority;
  const color = prio === "urgent" ? "var(--red)" : prio === "high" ? "var(--orange)" : prio === "medium" ? "var(--blue)" : prio === "low" ? "var(--mint)" : "var(--border-strong)";
  const doneSubs = task.subtasks.filter((s) => s.isCompleted).length;
  const due = relativeDue(task.dueDate);
  const project = data?.projects.find((p) => p.id === task.projectId);
  const desc = stripHtml(task.description || "");

  return (
    <div className={cn("task-row", task.status === "completed" && "done")}
      draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      onClick={() => openTask(task.id)}>
      {draggable && <GripVertical size={15} className="muted" style={{ cursor: "grab", marginTop: 2, flex: "0 0 auto" }} />}
      <input type="checkbox" className="checkbox" style={{ marginTop: 2 }} checked={task.status === "completed"}
        onClick={(e) => e.stopPropagation()} onChange={(e) => toggleTask(task.id, e.target.checked)} />
      <div className="priority-bar" style={{ background: color }} />
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="task-title truncate">{task.title}</div>
        {!compact && desc && <div className="tiny muted truncate" style={{ marginTop: 3, maxWidth: 560 }}>{desc}</div>}
        <div className="task-meta">
          {(task.startTime || task.endTime) && <span className="chip"><Clock3 size={11} />{task.startTime ? formatTime(task.startTime) : "—"}{task.endTime ? ` – ${formatTime(task.endTime)}` : ""}</span>}
          {task.estimatedMinutes > 0 && <span className="chip">{durationLabel(task.estimatedMinutes)}</span>}
          {task.dueDate && <span className={cn("chip", due.overdue && "text-red")} style={due.overdue ? { background: "var(--red-soft)", color: "var(--red)" } : undefined}><CalendarDays size={11} />{due.label}</span>}
          {task.subtasks.length > 0 && <span className="chip"><ListChecks size={11} />{doneSubs}/{task.subtasks.length}</span>}
          {project && <span className="chip"><FolderKanban size={11} />{project.name}</span>}
          <CategoryChip category={task.categoryId} categoryList={data?.categories || []} />
          {task.status !== "not_started" && <StatusChip status={task.status} />}
          {prio !== "none" && <PriorityChip priority={prio} />}
        </div>
        {!compact && task.subtasks.length > 0 && <div style={{ marginTop: 6, maxWidth: 180 }}><div className="subtask-track"><div className="subtask-fill" style={{ width: `${(doneSubs / task.subtasks.length) * 100}%` }} /></div></div>}
      </div>
      <div className="row gap-6 task-actions" style={{ opacity: 0, transition: "opacity .15s" }} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn sm" title="Edit" onClick={() => openTask(task.id)}><Pencil size={13} /></button>
        <button className="icon-btn sm" title="Delete" onClick={() => { if (confirm("Delete this task?")) deleteTask(task.id); }}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
