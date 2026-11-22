"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Trash2, Clock3, ListChecks, CalendarDays, GripVertical, Pencil } from "lucide-react";
import { useApp } from "./providers";
import { Modal, PriorityChip } from "./ui";
import { cn, durationLabel, formatTime, prettyDate, relativeDue, stripHtml } from "@/lib/utils";
import type { Status, Task } from "@/lib/types";

type Column = { id: string; label: string; color: string; custom?: boolean };

const BASE_COLUMNS: Column[] = [
  { id: "not_started", label: "Todo", color: "#94A3B8" },
  { id: "in_progress", label: "In Progress", color: "#7C6CF0" },
  { id: "in_review", label: "In Review", color: "#F59E0B" },
  { id: "completed", label: "Done", color: "#34D399" },
];

const COLUMNS_KEY = "dayplanner_kanban_columns";

function Card({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { data, openTask } = useApp();
  const attributes = useDraggable({ id: `task-${task.id}`, data: { taskId: task.id }, disabled: overlay });
  const style = { transform: CSS.Translate.toString(attributes.transform), opacity: attributes.isDragging ? 0.35 : 1 };
  const cat = data?.categories.find((c) => c.id === task.categoryId);
  const project = data?.projects.find((p) => p.id === task.projectId);
  const done = task.subtasks.filter((s) => s.isCompleted).length;
  const due = relativeDue(task.dueDate);

  return (
    <div ref={attributes.setNodeRef} {...attributes.attributes} {...attributes.listeners}
      className={cn("kanban-card", overlay && "dragging")} style={style} onClick={() => !overlay && openTask(task.id)}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row gap-4 wrap">
          {cat && <span className="chip" style={{ background: `${cat.color}1c`, color: cat.color }}>{cat.name}</span>}
          {project && <span className="chip"><span className="chip-dot" style={{ background: project.color }} />{project.name}</span>}
        </div>
        <GripVertical size={14} className="muted" style={{ cursor: "grab" }} />
      </div>
      <div className="bold small" style={{ lineHeight: 1.45, marginBottom: 6 }}>{task.title}</div>
      {task.description && <div className="tiny muted" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>{stripHtml(task.description)}</div>}
      {task.subtasks.length > 0 && <div style={{ marginTop: 9 }}>
        <div className="row between tiny muted" style={{ marginBottom: 4 }}><span>Subtasks</span><span>{done}/{task.subtasks.length}</span></div>
        <div className="subtask-track"><div className="subtask-fill" style={{ width: `${(done / task.subtasks.length) * 100}%` }} /></div>
      </div>}
      <div className="row between wrap gap-6" style={{ marginTop: 11 }}>
        <div className="row gap-4 wrap">
          <PriorityChip priority={task.priority} />
          {task.estimatedMinutes > 0 && <span className="chip"><Clock3 size={11} />{durationLabel(task.estimatedMinutes)}</span>}
          {task.subtasks.length > 0 && <span className="chip"><ListChecks size={11} />{done}/{task.subtasks.length}</span>}
        </div>
      </div>
      {(task.dueDate || task.startTime) && <div className="row gap-6" style={{ marginTop: 9 }}>
        {task.dueDate && <span className={cn("tiny row gap-4", due.overdue ? "text-red" : "muted")} style={due.overdue ? { color: "var(--red)" } : undefined}><CalendarDays size={11} />{due.label}</span>}
        {task.startTime && <span className="tiny muted row gap-4"><Clock3 size={11} />{formatTime(task.startTime)}</span>}
      </div>}
    </div>
  );
}

function ColumnView({ column, tasks, onAdd, onRename, onDelete }: {
  column: Column;
  tasks: Task[];
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });
  return (
    <div ref={setNodeRef} className={cn("kanban-column", isOver && "drag-over")}>
      <div className="row between" style={{ padding: "4px 4px 10px" }}>
        <div className="row gap-6"><span style={{ width: 8, height: 8, borderRadius: 3, background: column.color }} /><span className="small bold">{column.label}</span><span className="chip">{tasks.length}</span></div>
        <div className="row gap-2">
          <button className="icon-btn sm" title="Add task" onClick={onAdd}><Plus size={14} /></button>
          {column.custom && <>
            <button className="icon-btn sm" title="Rename column" onClick={onRename}><Pencil size={13} /></button>
            <button className="icon-btn sm" title="Delete column" onClick={onDelete}><Trash2 size={13} /></button>
          </>}
        </div>
      </div>
      <div className="col gap-8">
        {tasks.map((t) => <Card key={t.id} task={t} />)}
        {tasks.length === 0 && <div className="tiny muted" style={{ padding: 14, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 10 }}>Drop tasks here</div>}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { updateTask, notify, quickAddOpen, setQuickAddOpen } = useApp();
  const [columns, setColumns] = useState<Column[]>(BASE_COLUMNS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [columnModal, setColumnModal] = useState<{ mode: "add" | "rename"; column?: Column } | null>(null);
  const [columnName, setColumnName] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<string>("not_started");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "[]");
      if (Array.isArray(stored)) setColumns([...BASE_COLUMNS, ...stored]);
    } catch { /* ignore */ }
  }, []);
  const persist = (cols: Column[]) => {
    setColumns(cols);
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(cols.filter((c) => c.custom)));
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(Number(String(e.active.id).replace("task-", "")));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const taskId = Number(String(e.active.id).replace("task-", ""));
    const overId = String(e.over.id);
    const columnId = overId.startsWith("col-") ? overId.slice(4) : null;
    let status = columnId;
    if (!status) {
      const overTask = tasks.find((t) => t.id === Number(overId.replace("task-", "")));
      if (overTask) status = overTask.status;
    }
    if (status && status !== tasks.find((t) => t.id === taskId)?.status) {
      const patch: Record<string, unknown> = { status };
      if (status === "completed") patch.completedAt = null;
      const ok = await updateTask(taskId, patch as never);
      if (ok) {
        const t = tasks.find((x) => x.id === taskId);
        notify(`${t?.title || "Task"} moved to ${columns.find((c) => c.id === status)?.label || status}`);
      }
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {columns.map((col) => (
            <ColumnView key={col.id} column={col} tasks={tasks.filter((t) => t.status === col.id || (!columns.some((c) => c.id === t.status) && col.id === "not_started"))}
              onAdd={() => { setDefaultStatus(col.id); window.dispatchEvent(new CustomEvent("planner:quick-add-status", { detail: col.id })); setQuickAddOpen(true); }}
              onRename={() => { setColumnModal({ mode: "rename", column: col }); setColumnName(col.label); }}
              onDelete={() => { if (confirm(`Delete the "${col.label}" column? Tasks in it will move to Todo.`)) { tasks.filter((t) => t.status === col.id).forEach((t) => updateTask(t.id, { status: "not_started" } as never)); persist(columns.filter((c) => c.id !== col.id)); } }} />
          ))}
          <button className="btn" style={{ minHeight: 60, borderStyle: "dashed" }} onClick={() => { setColumnModal({ mode: "add" }); setColumnName(""); }}><Plus size={15} /> Add column</button>
        </div>
        <DragOverlay>{activeTask && <div style={{ width: 250, transform: "rotate(2deg)" }}><Card task={activeTask} overlay /></div>}</DragOverlay>
      </DndContext>

      <Modal open={!!columnModal} onClose={() => setColumnModal(null)} title={columnModal?.mode === "add" ? "New column" : "Rename column"}
        footer={<>
          <button className="btn" onClick={() => setColumnModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!columnName.trim()) return;
            if (columnModal?.mode === "add") {
              const id = columnName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
              if (columns.some((c) => c.id === id)) { notify("A column with that name already exists", "error"); return; }
              persist([...columns, { id, label: columnName.trim(), color: "#A78BFA", custom: true }]);
            } else if (columnModal?.column) {
              persist(columns.map((c) => c.id === columnModal.column!.id ? { ...c, label: columnName.trim() } : c));
            }
            setColumnModal(null);
          }}>Save</button>
        </>}>
        <div className="field"><label className="label">Column name</label><input className="input" value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="e.g. Blocked" /></div>
      </Modal>
    </>
  );
}
