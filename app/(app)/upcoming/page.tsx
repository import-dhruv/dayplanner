"use client";

import React, { useMemo, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { CalendarClock, CalendarDays, Plus } from "lucide-react";
import { useApp } from "@/components/providers";
import { TaskRow } from "@/components/task-row";
import { EmptyState, Segmented } from "@/components/ui";
import { prettyDate, todayISO } from "@/lib/utils";
import type { Task, CalendarEvent } from "@/lib/types";

export default function UpcomingPage() {
  const { data, setQuickAddOpen, openTask } = useApp();
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const today = todayISO();

  const days = useMemo(() => {
    const result: { date: string; tasks: Task[]; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < Number(range); i++) {
      const key = format(addDays(new Date(), i), "yyyy-MM-dd");
      const tasks = (data?.tasks || []).filter((t) => (t.scheduledDate === key || t.dueDate === key) && t.status !== "cancelled");
      const events = (data?.events || []).filter((e) => format(new Date(e.startAt), "yyyy-MM-dd") === key);
      if (tasks.length || events.length) result.push({ date: key, tasks, events });
    }
    return result;
  }, [data, range]);

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12">
        <div><h1 className="page-title">Upcoming</h1><div className="page-subtitle">Everything on the horizon, day by day</div></div>
        <div className="row gap-8"><Segmented value={range} options={[{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }]} onChange={setRange} /><button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={15} /> New task</button></div>
      </div>
      {days.length === 0 ? <div className="card"><EmptyState icon={<CalendarClock size={22} />} title="Clear horizon" description={`Nothing scheduled in the next ${range} days. That's a good thing — or a chance to plan ahead.`} action={<button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}>Plan something</button>} /></div>
        : days.map((d) => <div key={d.date} className="card card-pad">
          <div className="row gap-8" style={{ marginBottom: 10 }}>
            <span className="section-title"><CalendarDays size={15} />{prettyDate(d.date, { weekday: true })}</span>
            {d.date === today && <span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>Today</span>}
            <div style={{ flex: 1 }} /><span className="tiny muted">{d.tasks.length} tasks · {d.events.length} events</span>
          </div>
          <div className="col gap-4">
            {d.events.map((e) => <button key={e.id} className="task-row" onClick={() => window.dispatchEvent(new CustomEvent("planner:open-event", { detail: e.id }))}>
              <span style={{ width: 4, height: 30, borderRadius: 3, background: e.color || "#94A3B8" }} />
              <div className="flex-1"><div className="small bold">{e.title}</div><div className="tiny muted">{new Date(e.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(e.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div>
              <span className="chip">Event</span>
            </button>)}
            {d.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>)}
    </div>
  );
}
