"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, CalendarDays, LayoutDashboard, BarChart3, ArrowRight } from "lucide-react";
import { useApp } from "./providers";

export function AuthScreen() {
  const { login, register, demoLogin, authLoading } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") await login(email, password);
    else await register(name, email, password);
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>
      <div style={{ padding: "6vw 7vw", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 620 }}>
        <div className="row gap-10" style={{ marginBottom: 40 }}>
          <div className="brand-mark" style={{ width: 42, height: 42, fontSize: 20 }}>D</div>
          <div><div style={{ fontWeight: 750, fontSize: 19, letterSpacing: "-.04em" }}>Dayplanner</div><div className="tiny muted">your personal command center</div></div>
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 750, letterSpacing: "-.05em", lineHeight: 1.15, margin: "0 0 14px" }}>
          Plan your day.<br /><span style={{ color: "var(--primary)" }}>Own your time.</span>
        </h1>
        <p className="text-2" style={{ fontSize: 15, lineHeight: 1.7, maxWidth: 430, margin: "0 0 30px" }}>
          A calm, focused space for your tasks, schedule, projects and notes — designed to answer the five questions every morning.
        </p>
        <div className="col gap-12" style={{ marginBottom: 36 }}>
          {[
            [LayoutDashboard, "My Day — priorities, tasks and a live timeline"],
            [CalendarDays, "Calendar — time blocking that stays in sync with tasks"],
            [CheckCircle2, "Projects & Kanban — see what's in progress at a glance"],
            [BarChart3, "Analytics — understand where your time actually goes"],
          ].map(([Icon, text]: any) => <div key={text} className="row gap-10 small"><span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon size={16} /></span><span className="text-2">{text}</span></div>)}
        </div>
        <div className="tiny muted">Built for one person. Private by default. Local-first storage in PostgreSQL.</div>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: 30, background: "var(--surface)", borderLeft: "1px solid var(--border)" }}>
        <div style={{ width: "min(400px, 100%)" }}>
          <div className="row gap-8" style={{ marginBottom: 22 }}>
            <button className={mode === "login" ? "btn btn-soft" : "btn btn-ghost"} onClick={() => setMode("login")}>Sign in</button>
            <button className={mode === "register" ? "btn btn-soft" : "btn btn-ghost"} onClick={() => setMode("register")}>Create account</button>
          </div>
          <h2 style={{ fontSize: 24, letterSpacing: "-.04em", margin: "0 0 6px" }}>{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
          <p className="small muted" style={{ margin: "0 0 24px" }}>{mode === "login" ? "Sign in to continue planning your day." : "A few details and you're ready to go."}</p>
          <form onSubmit={submit} className="col gap-14">
            {mode === "register" && <div className="field"><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required /></div>}
            <div className="field"><label className="label">Email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
            <div className="field"><label className="label">Password</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required /></div>
            <button className="btn btn-primary btn-block" disabled={authLoading} style={{ height: 42, marginTop: 6 }}>{authLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button>
          </form>
          <div className="row gap-10" style={{ margin: "22px 0" }}><div style={{ flex: 1, height: 1, background: "var(--border)" }} /><span className="tiny muted">OR</span><div style={{ flex: 1, height: 1, background: "var(--border)" }} /></div>
          <button className="btn btn-block" style={{ height: 42 }} onClick={async () => { await demoLogin(); }}><Sparkles size={16} /> Explore the demo workspace</button>
          <div className="tiny muted" style={{ textAlign: "center", marginTop: 14 }}>Demo account: dhruv@planner.local / password123</div>
        </div>
      </div>
      <style jsx>{`@media(max-width:900px){ div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr} }`}</style>
    </div>
  );
}
