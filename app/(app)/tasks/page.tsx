"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, List, LayoutGrid, Filter, X, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { KanbanBoard } from "@/components/kanban";
import { EmptyState, Segmented } from "@/components/ui";
import { PRIORITIES, STATUSES, cn, todayISO } from "@/lib/utils";
import type { Priority, Status, Task } from "@/lib/types";

function TasksContent() {
  const { data, setQuickAddOpen, reorderTasks } = useApp();
  const params = useSearchParams();
  const [view, setView] = useState<"list" | "board">("list");
  const [group, setGroup] = useState("none");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState(params.get("category") || "");
  const [project, setProject] = useState(params.get("project") || "");
  const [tag, setTag] = useState("");
  const [due, setDue] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);

  const tasks = useMemo(() => {
    let list = [...(data?.tasks || [])];
    if (q) list = list.filter((t) => (t.title + " " + t.description).toLowerCase().includes(q.toLowerCase()));
    if (priority) list = list.filter((t) => t.priority === priority);
    if (status) list = list.filter((t) => t.status === status);
    if (category) list = list.filter((t) => String(t.categoryId) === category);
    if (project) list = list.filter((t) => String(t.projectId) === project);
    if (tag) list = list.filter((t) => t.tagIds.includes(Number(tag)));
    if (due === "today") list = list.filter((t) => t.scheduledDate === todayISO() || t.dueDate === todayISO());
    if (due === "overdue") list = list.filter((t) => t.dueDate && t.dueDate < todayISO() && t.status !== "completed");
    if (due === "week") {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      list = list.filter((t) => (t.dueDate || t.scheduledDate || "") >= todayISO() && (t.dueDate || t.scheduledDate || "") <= end);
    }
    return list;
  }, [data?.tasks, q, priority, status, category, project, tag, due]);

  const groups = useMemo(() => {
    if (group === "none") return [{ key: "all", label: "All tasks", tasks }];
    if (group === "status") return Object.entries(STATUSES).map(([key, v]) => ({ key, label: v.label, tasks: tasks.filter((t) => t.status === key) }));
    if (group === "priority") return Object.entries(PRIORITIES).map(([key, v]) => ({ key, label: v.label, tasks: tasks.filter((t) => t.priority === key) }));
    if (group === "project") {
      const keys = [...new Set(tasks.map((t) => t.projectId))];
      const result = keys.map((id) => ({ key: String(id), label: data?.projects.find((p) => p.id === id)?.name || "No project", tasks: tasks.filter((t) => t.projectId === id) }));
      if (tasks.some((t) => !t.projectId)) result.push({ key: "none", label: "No project", tasks: tasks.filter((t) => !t.projectId) });
      return result;
    }
    const keys = [...new Set(tasks.map((t) => t.categoryId))];
    const result = keys.map((id) => ({ key: String(id), label: data?.categories.find((c) => c.id === id)?.name || "Uncategorized", tasks: tasks.filter((t) => t.categoryId === id) }));
    if (tasks.some((t) => !t.categoryId)) result.push({ key: "none", label: "Uncategorized", tasks: tasks.filter((t) => !t.categoryId) });
    return result;
  }, [tasks, group, data?.projects, data?.categories]);

  const reorder = async (target: Task) => {
    if (!dragId || dragId === target.id) return;
    const ids = tasks.map((t) => t.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(target.id), 0, dragId);
    await reorderTasks(ids);
    setDragId(null);
  };

  const activeFilters = [priority, status, category, project, tag, due].filter(Boolean).length;
  const clear = () => { setPriority(""); setStatus(""); setCategory(""); setProject(""); setTag(""); setDue(""); setQ(""); };

  return (
    <div className="col gap-18">
      <div className="row between wrap gap-12">
        <div><h1 className="page-title">Tasks</h1><div className="page-subtitle">{tasks.length} task{tasks.length === 1 ? "" : "s"} · {(data?.tasks || []).filter((t) => t.status === "completed").length} completed overall</div></div>
        <div className="row gap-8">
          <Segmented value={view} options={[{ value: "list", label: "List" }, { value: "board", label: "Board" }]} onChange={setView} />
          <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={16} /> New task</button>
        </div>
      </div>

      <div className="card card-pad" style={{ padding: 12 }}>
        <div className="row gap-8 wrap">
          <div className="row gap-8 flex-1" style={{ minWidth: 200 }}><Search size={16} className="muted" /><input className="input" style={{ border: "none", boxShadow: "none", padding: "6px 0" }} placeholder="Search tasks..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className={cn("btn btn-sm", showFilters ? "btn-soft" : "")} onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={14} /> Filters {activeFilters > 0 && <span className="chip">{activeFilters}</span>}</button>
          {activeFilters > 0 && <button className="btn btn-sm btn-ghost" onClick={clear}><X size={13} /> Clear</button>}
        </div>
        {showFilters && <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option>{Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{(data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="select" value={project} onChange={(e) => setProject(e.target.value)}><option value="">All projects</option>{(data?.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All tags</option>{(data?.tags || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select className="select" value={due} onChange={(e) => setDue(e.target.value)}><option value="">Any time</option><option value="today">Today</option><option value="overdue">Overdue</option><option value="week">Next 7 days</option></select>
          <select className="select" value={group} onChange={(e) => setGroup(e.target.value)}><option value="none">No grouping</option><option value="status">Group by status</option><option value="priority">Group by priority</option><option value="project">Group by project</option><option value="category">Group by category</option></select>
        </div>}
      </div>

      {tasks.length === 0 ? <div className="card"><EmptyState icon={<Filter size={22} />} title="No matching tasks" description="Try adjusting your filters, or create a new task to get started." action={<button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> New task</button>} /></div>
        : view === "board" ? <KanbanBoard tasks={tasks} />
        : <div className="col gap-16">
          {groups.filter((g) => g.tasks.length > 0).map((g) => (
            <div key={g.key} className="card card-pad">
              <div className="row gap-8" style={{ marginBottom: 8 }}><span className="section-title">{g.label}</span><span className="chip">{g.tasks.length}</span><div style={{ flex: 1 }} /><span className="tiny muted">drag to reorder</span></div>
              <div className="col gap-2">{g.tasks.map((t) => <TaskRow key={t.id} task={t} draggable onDragStart={() => setDragId(t.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(t)} />)}</div>
            </div>
          ))}
          {groups.every((g) => g.tasks.length === 0) && <div className="card"><EmptyState icon={<List size={22} />} title="Nothing to show" description="No tasks match the current filters." /></div>}
        </div>}
    </div>
  );
}

export default function TasksPage() {
  return <Suspense fallback={<div className="muted">Loading tasks...</div>}><TasksContent /></Suspense>;
}
