"use client";

import React from "react";
import { Inbox, Plus, CalendarPlus, ArrowRight } from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { EmptyState } from "@/components/ui";
import { todayISO } from "@/lib/utils";

export default function InboxPage() {
  const { data, setQuickAddOpen, updateTask, openTask } = useApp();
  const tasks = (data?.tasks || []).filter((t) => !t.scheduledDate && t.status !== "cancelled" && t.status !== "completed");

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12">
        <div><h1 className="page-title">Inbox</h1><div className="page-subtitle">A parking lot for everything not yet planned</div></div>
        <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={15} /> Capture task</button>
      </div>
      <div className="card card-pad" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)" }}>
        <div className="row gap-10"><Inbox size={18} style={{ color: "var(--primary)" }} /><div className="small text-2"><b>{tasks.length} unscheduled task{tasks.length === 1 ? "" : "s"}</b> — give them a time slot on My Day or in the Calendar when you're ready.</div></div>
      </div>
      {tasks.length === 0 ? <div className="card"><EmptyState icon={<Inbox size={22} />} title="Inbox zero" description="Everything has a home. Capture a new thought whenever you need to." action={<button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> Capture task</button>} /></div>
        : <div className="card card-pad">
          <div className="col gap-4">{tasks.map((t) => <div key={t.id} className="row gap-8" style={{ alignItems: "center" }}>
            <div className="flex-1"><TaskRow task={t} /></div>
            <button className="btn btn-sm btn-soft" onClick={async () => { await updateTask(t.id, { scheduledDate: todayISO() } as never); }} title="Add to today"><CalendarPlus size={13} /> Today</button>
            <button className="btn btn-sm" onClick={() => openTask(t.id)}><ArrowRight size={13} /> Details</button>
          </div>)}</div>
        </div>}
    </div>
  );
}
