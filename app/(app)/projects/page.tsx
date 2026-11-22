"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, CalendarDays, ListChecks, ArrowUpRight, Pencil, Folder } from "lucide-react";
import { useApp } from "@/components/providers";
import { EmptyState, ProgressBar } from "@/components/ui";
import { ProjectModal } from "@/components/project-modal";
import { cn, durationLabel, prettyDate, relativeDue } from "@/lib/utils";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { data } = useApp();
  const [modal, setModal] = useState<{ project?: Project | null } | null>(null);
  const projects = data?.projects || [];
  const tasks = data?.tasks || [];

  const stats = useMemo(() => Object.fromEntries(projects.map((p) => {
    const list = tasks.filter((t) => t.projectId === p.id);
    const done = list.filter((t) => t.status === "completed").length;
    return [p.id, { total: list.length, done, pct: list.length ? Math.round((done / list.length) * 100) : 0, time: list.reduce((s, t) => s + t.estimatedMinutes, 0), next: list.filter((t) => t.dueDate && t.status !== "completed").sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0] }];
  })), [projects, tasks]);

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12"><div><h1 className="page-title">Projects</h1><div className="page-subtitle">{projects.length} project{projects.length === 1 ? "" : "s"} · long-term work, clearly organized</div></div><button className="btn btn-primary" onClick={() => setModal({})}><Plus size={15} /> New project</button></div>
      {projects.length === 0 ? <div className="card"><EmptyState icon={<FolderKanban size={22} />} title="No projects yet" description="Group related tasks into projects to see progress on the things that matter." action={<button className="btn btn-primary btn-sm" onClick={() => setModal({})}><Plus size={14} /> Create a project</button>} /></div>
        : <div className="grid-3">{projects.map((p) => {
          const s = stats[p.id] || { total: 0, done: 0, pct: 0, time: 0, next: null };
          const due = s.next?.dueDate ? relativeDue(s.next.dueDate) : null;
          return <div key={p.id} className="card card-pad card-hover col gap-12" style={{ borderTop: `3px solid ${p.color}` }}>
            <div className="row between">
              <div className="stat-icon" style={{ background: `${p.color}1c`, color: p.color }}><Folder size={17} /></div>
              <div className="row gap-2">
                <button className="icon-btn sm" onClick={() => setModal({ project: p })}><Pencil size={14} /></button>
                <Link href={`/projects/${p.id}`} className="icon-btn sm"><ArrowUpRight size={15} /></Link>
              </div>
            </div>
            <div><Link href={`/projects/${p.id}`} className="bold" style={{ fontSize: 16, letterSpacing: "-.02em" }}>{p.name}</Link><div className="tiny muted truncate" style={{ marginTop: 4 }}>{p.description || "No description"}</div></div>
            <div className="row gap-8 wrap tiny"><span className="chip"><ListChecks size={11} />{s.total} tasks</span><span className="chip">{s.done} done</span><span className="chip">{durationLabel(s.time)}</span></div>
            <div><div className="row between tiny muted" style={{ marginBottom: 6 }}><span>Progress</span><span>{s.pct}%</span></div><ProgressBar value={s.pct} color={p.color} /></div>
            <div className="row between tiny muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              {p.targetDate ? <span className="row gap-4"><CalendarDays size={11} />Target {prettyDate(p.targetDate)}</span> : <span>No deadline</span>}
              {due && <span className={cn(due.overdue && "text-red")} style={due.overdue ? { color: "var(--red)" } : undefined}>{due.label}</span>}
            </div>
          </div>;
        })}</div>}
      {modal && <ProjectModal open onClose={() => setModal(null)} project={modal.project} />}
    </div>
  );
}
