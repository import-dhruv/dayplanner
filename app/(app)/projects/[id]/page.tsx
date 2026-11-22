"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Folder, CalendarDays, ListChecks, Pencil, Plus, Clock3, StickyNote, CheckCircle2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { ProjectModal } from "@/components/project-modal";
import { EmptyState, ProgressBar } from "@/components/ui";
import { cn, durationLabel, prettyDate, relativeDue } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, setQuickAddOpen } = useApp();
  const [edit, setEdit] = useState(false);
  const project = data?.projects.find((p) => p.id === id);
  if (!project) return <div className="card"><EmptyState icon={<Folder size={22} />} title="Project not found" description="It may have been deleted." action={<Link href="/projects" className="btn btn-sm btn-soft">Back to projects</Link>} /></div>;
  const tasks = (data?.tasks || []).filter((t) => t.projectId === id);
  const done = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const notes = (data?.notes || []).filter((n) => n.projectId === id);
  const upcoming = tasks.filter((t) => t.dueDate && t.status !== "completed").sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const events = (data?.events || []).filter((e) => e.projectId === id);

  return (
    <div className="col gap-16">
      <div className="row gap-10"><Link href="/projects" className="icon-btn"><ArrowLeft size={17} /></Link><div className="flex-1"><h1 className="page-title">{project.name}</h1><div className="page-subtitle">{project.description || "Project workspace"}</div></div><button className="btn" onClick={() => setEdit(true)}><Pencil size={14} /> Edit project</button><button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={15} /> Add task</button></div>

      <div className="grid-4">
        {[
          [ListChecks, "Total tasks", String(tasks.length)],
          [CheckCircle2, "Completed", String(done)],
          [Clock3, "Planned time", durationLabel(tasks.reduce((s, t) => s + t.estimatedMinutes, 0))],
          [CalendarDays, "Deadline", project.targetDate ? prettyDate(project.targetDate) : "—"],
        ].map(([Icon, label, value]: any) => <div key={label} className="card stat-card card-hover"><div className="row between"><span className="small muted">{label}</span><span className="stat-icon" style={{ background: `${project.color}1c`, color: project.color }}><Icon size={16} /></span></div><div className="stat-value" style={{ fontSize: 21 }}>{value}</div></div>)}
      </div>

      <div className="grid-2">
        <div className="col gap-16">
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 12 }}><ListChecks size={16} /> Project tasks</div>
            {tasks.length === 0 ? <EmptyState icon={<ListChecks size={22} />} title="No tasks linked" description="Add tasks and assign them to this project to track progress." /> : <div className="col gap-2">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>}
          </div>
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 12 }}><StickyNote size={16} /> Project notes</div>
            <div className="small text-2" style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{project.notes || <span className="muted">No project notes yet. Edit the project to add some.</span>}</div>
          </div>
        </div>
        <div className="col gap-16">
          <div className="card card-pad">
            <div className="row between"><span className="section-title">Overall progress</span><span className="bold" style={{ color: project.color, fontSize: 18 }}>{pct}%</span></div>
            <div style={{ marginTop: 12 }}><ProgressBar value={pct} color={project.color} /></div>
            <div className="tiny muted" style={{ marginTop: 8 }}>{done} of {tasks.length} tasks completed</div>
          </div>
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 10 }}><CalendarDays size={16} /> Upcoming deadlines</div>
            {upcoming.length === 0 ? <div className="small muted">No upcoming deadlines.</div> : upcoming.slice(0, 6).map((t) => {
              const rel = relativeDue(t.dueDate);
              return <div key={t.id} className="row between small" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}><span className="truncate flex-1">{t.title}</span><span className={cn("tiny", rel.overdue && "text-red")} style={rel.overdue ? { color: "var(--red)" } : undefined}>{rel.label}</span></div>;
            })}
          </div>
          {events.length > 0 && <div className="card card-pad"><div className="section-title" style={{ marginBottom: 10 }}><CalendarDays size={16} /> Calendar events</div>{events.map((e) => <div key={e.id} className="small" style={{ padding: "6px 0" }}><div className="bold">{e.title}</div><div className="tiny muted">{new Date(e.startAt).toLocaleString()}</div></div>)}</div>}
        </div>
      </div>
      {edit && <ProjectModal open onClose={() => setEdit(false)} project={project} />}
    </div>
  );
}
