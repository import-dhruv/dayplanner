"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, RotateCcw, Trash2, Search } from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { EmptyState } from "@/components/ui";
import { prettyDate, durationLabel } from "@/lib/utils";

export default function CompletedPage() {
  const { data, toggleTask, deleteTask, setQuickAddOpen } = useApp();
  const [q, setQ] = useState("");
  const completed = useMemo(() => (data?.tasks || []).filter((t) => t.status === "completed" && (!q || t.title.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")), [data?.tasks, q]);
  const grouped: Record<string, typeof completed> = {};
  completed.forEach((t) => { const key = t.completedAt ? format(new Date(t.completedAt), "yyyy-MM-dd") : "Earlier"; (grouped[key] ||= []).push(t); });
  const totalTime = completed.reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12">
        <div><h1 className="page-title">Completed</h1><div className="page-subtitle">{completed.length} finished tasks · {durationLabel(totalTime)} of planned work</div></div>
        <div className="row gap-8"><div className="row gap-6"><Search size={15} className="muted" /><input className="input" style={{ width: 200 }} placeholder="Search completed..." value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      </div>
      {completed.length === 0 ? <div className="card"><EmptyState icon={<CheckCircle2 size={22} />} title="Nothing completed yet" description="Finished tasks will collect here. Every small win counts." action={<button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}><PlusIcon /> Add a task</button>} /></div>
        : Object.entries(grouped).map(([date, list]) => <div key={date} className="card card-pad">
          <div className="row gap-8" style={{ marginBottom: 8 }}><span className="section-title"><CheckCircle2 size={15} />{date === "Earlier" ? "Earlier" : prettyDate(date, { weekday: true })}</span><span className="chip">{list.length}</span></div>
          <div className="col gap-2">{list.map((t) => <div key={t.id} className="row gap-8" style={{ alignItems: "center" }}>
            <div className="flex-1"><TaskRow task={t} compact /></div>
            <button className="icon-btn sm" title="Restore to todo" onClick={() => toggleTask(t.id, false)}><RotateCcw size={14} /></button>
            <button className="icon-btn sm" title="Delete" onClick={() => { if (confirm("Delete this task permanently?")) deleteTask(t.id); }}><Trash2 size={14} /></button>
          </div>)}</div>
        </div>)}
    </div>
  );
}

function PlusIcon() { return <CheckCircle2 size={14} />; }
