"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, ListTodo, TriangleAlert, TrendingUp, FolderKanban } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { EmptyState, ProgressBar } from "@/components/ui";
import { durationLabel, todayISO } from "@/lib/utils";
import type { Analytics } from "@/lib/types";

const COLORS = ["#7C6CF0", "#5B8DEF", "#34D399", "#F472B6", "#F59E0B", "#22D3EE", "#A78BFA"];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.analytics().then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="card"><EmptyState icon={<BarChart3 size={22} />} title="Could not load analytics" description={error} /></div>;
  if (!data) return <div className="muted">Loading analytics...</div>;
  const s = data.summary;
  const rate = s.total ? Math.round((s.completed / s.total) * 100) : 0;

  return (
    <div className="col gap-16">
      <div><h1 className="page-title">Analytics</h1><div className="page-subtitle">Understand where your time goes — not a scoreboard</div></div>
      <div className="grid-4">
        {[
          [ListTodo, "Total tasks", s.total, "var(--primary)", "var(--primary-soft)"],
          [CheckCircle2, "Completed", s.completed, "var(--mint)", "var(--mint-soft)"],
          [Clock3, "Tracked time", durationLabel(s.trackedMinutes), "var(--blue)", "var(--blue-soft)"],
          [TriangleAlert, "Overdue", s.overdue, "var(--red)", "var(--red-soft)"],
        ].map(([Icon, label, value, color, soft]: any) => <div key={label} className="card stat-card card-hover"><div className="row between"><span className="small muted">{label}</span><span className="stat-icon" style={{ background: soft, color }}><Icon size={16} /></span></div><div className="stat-value" style={{ fontSize: 23 }}>{value}</div></div>)}
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 4 }}><TrendingUp size={16} /> Daily completion</div>
          <div className="section-sub" style={{ marginBottom: 16 }}>Tasks completed over the last 14 days</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.daily} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="completed" name="Completed" fill="#7C6CF0" radius={[5, 5, 0, 0]} />
              <Bar dataKey="created" name="Created" fill="#DDD8FF" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 4 }}><TrendingUp size={16} /> Weekly trend</div>
          <div className="section-sub" style={{ marginBottom: 16 }}>Completed tasks per week</div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data.weekly} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C6CF0" stopOpacity={.35} /><stop offset="100%" stopColor="#7C6CF0" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="start" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#7C6CF0" fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 12 }}><Clock3 size={16} /> Time spent by category</div>
          {data.byCategory.length === 0 ? <div className="small muted">Log time on tasks to see this breakdown.</div> : <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="minutes" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => durationLabel(v)} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>}
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 12 }}><TrendingUp size={16} /> Most productive days</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byWeekday} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" name="Completed" fill="#34D399" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="row between"><span className="section-title">Monthly completion</span><span className="bold">{rate}% all-time</span></div>
          <div style={{ marginTop: 10 }}><ProgressBar value={rate} /></div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.monthly} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="completed" fill="#8B7CF6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 14 }}><FolderKanban size={16} /> Project progress</div>
          <div className="col gap-12">
            {s.pending} pending · {s.overdue} overdue · {durationLabel(s.trackedMinutes)} tracked
            <div className="divider" style={{ margin: 0 }} />
            <div className="small muted">Open a project to see its detailed progress, upcoming deadlines and linked tasks.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
