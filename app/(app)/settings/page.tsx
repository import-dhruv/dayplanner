"use client";

import React, { useRef, useState } from "react";
import { Settings as SettingsIcon, UserRound, Palette, CalendarDays, Bell, Database, Keyboard, Download, Upload, LogOut, Sparkles, Check } from "lucide-react";
import { useApp } from "@/components/providers";
import { Field, Toggle } from "@/components/ui";
import { CATEGORY_COLORS, cn } from "@/lib/utils";
import type { Preferences } from "@/lib/types";

export default function SettingsPage() {
  const { data, updatePreferences, updateProfile, exportBackup, importBackup, seed, logout, notify } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data?.user.name || "");
  const [focus, setFocus] = useState(data?.preferences.focusMessage || "");
  const [browserNotifs, setBrowserNotifs] = useState(typeof window !== "undefined" && localStorage.getItem("dayplanner_browser_notifs") === "true" && typeof Notification !== "undefined" && Notification.permission === "granted");
  const prefs = data?.preferences as Preferences | undefined;
  if (!data || !prefs) return null;

  const set = async (key: keyof Preferences, value: unknown) => { await updatePreferences({ [key]: value } as never); };

  return (
    <div className="col gap-16" style={{ maxWidth: 900 }}>
      <div><h1 className="page-title">Settings</h1><div className="page-subtitle">Make Dayplanner feel like yours</div></div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 16 }}><UserRound size={16} /> Profile</div>
        <div className="row gap-16 wrap" style={{ alignItems: "flex-start" }}>
          <div className="avatar" style={{ background: data.user.avatarColor, width: 56, height: 56, fontSize: 20 }}>{data.user.name[0]?.toUpperCase()}</div>
          <div className="flex-1" style={{ minWidth: 260 }}>
            <div className="form-grid">
              <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Email"><input className="input" value={data.user.email} readOnly /></Field>
            </div>
            <div className="row gap-8" style={{ marginTop: 12 }}>
              <span className="label">Avatar color</span>
              {CATEGORY_COLORS.slice(0, 7).map((c) => <button key={c} onClick={() => updateProfile({ avatarColor: c })} style={{ width: 24, height: 24, borderRadius: 7, background: c, border: data.user.avatarColor === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />)}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={async () => { if (await updateProfile({ name })) notify("Profile saved"); }}>Save profile</button>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 16 }}><Palette size={16} /> Appearance</div>
        <div className="grid-2">
          <Field label="Theme"><div className="row gap-8">{(["light", "dark", "system"] as const).map((t) => <button key={t} className={cn("btn", prefs.theme === t && "btn-soft")} onClick={() => set("theme", t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div></Field>
          <Field label="Compact mode"><Toggle checked={prefs.compactMode} onChange={(v) => set("compactMode", v)} label="Denser layout" /></Field>
        </div>
        <div style={{ marginTop: 14 }}><Field label="Morning focus message"><input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} onBlur={() => set("focusMessage", focus)} placeholder="A small reminder for each morning" /></Field></div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 16 }}><CalendarDays size={16} /> Planning & calendar</div>
        <div className="grid-2">
          <Field label="Week starts on"><div className="row gap-8"><button className={cn("btn", prefs.weekStart === 1 && "btn-soft")} onClick={() => set("weekStart", 1)}>Monday</button><button className={cn("btn", prefs.weekStart === 0 && "btn-soft")} onClick={() => set("weekStart", 0)}>Sunday</button></div></Field>
          <Field label="Default calendar view"><select className="select" value={prefs.defaultCalendarView} onChange={(e) => set("defaultCalendarView", e.target.value)}>{["day", "week", "month", "agenda"].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></Field>
          <Field label="Work day starts"><input type="time" className="input" value={prefs.workStart} onChange={(e) => set("workStart", e.target.value)} /></Field>
          <Field label="Work day ends"><input type="time" className="input" value={prefs.workEnd} onChange={(e) => set("workEnd", e.target.value)} /></Field>
          <Field label="Default reminder"><select className="select" value={prefs.reminderMinutes} onChange={(e) => set("reminderMinutes", Number(e.target.value))}><option value="0">None</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></select></Field>
          <Field label="Show weekends"><Toggle checked={prefs.showWeekends} onChange={(v) => set("showWeekends", v)} label={prefs.showWeekends ? "Yes" : "No"} /></Field>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 12 }}><Bell size={16} /> Notifications</div>
        <div className="row between wrap gap-12">
          <div><div className="small bold">Browser notifications</div><div className="tiny muted" style={{ marginTop: 4 }}>Get a desktop notification when a reminder is due. In-app reminders are always shown in the bell menu.</div></div>
          <Toggle checked={browserNotifs} onChange={async (v) => {
            if (v && typeof Notification !== "undefined") {
              const permission = await Notification.requestPermission();
              if (permission !== "granted") { notify("Browser permission was not granted", "error"); return; }
            }
            localStorage.setItem("dayplanner_browser_notifs", String(v));
            setBrowserNotifs(v);
            notify(v ? "Browser notifications enabled" : "Browser notifications disabled");
          }} label={browserNotifs ? "Enabled" : "Disabled"} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 12 }}><Keyboard size={16} /> Keyboard shortcuts</div>
        <div className="grid-2">
          {[
            ["N", "New task"], ["C", "New calendar event"], ["T", "Jump to today"], ["/", "Search / command palette"], ["Esc", "Close dialog"], ["⌘ / Ctrl + K", "Toggle command palette"],
          ].map(([key, label]) => <div key={key} className="row between small" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}><span className="text-2">{label}</span><span className="kbd">{key}</span></div>)}
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginBottom: 12 }}><Database size={16} /> Data & backup</div>
        <div className="row gap-8 wrap">
          <button className="btn" onClick={exportBackup}><Download size={15} /> Export backup (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const payload = JSON.parse(await file.text());
              if (await importBackup(payload)) notify("Backup restored");
            } catch (err) { notify(err instanceof Error ? err.message : "Invalid backup file", "error"); }
            e.target.value = "";
          }} />
          <button className="btn btn-soft" onClick={async () => { const r = await seed(); notify(r ? "Demo workspace created" : "Workspace already has data", r ? "ok" : "error"); }}><Sparkles size={15} /> Load demo data</button>
        </div>
        <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.7 }}>Your data lives in PostgreSQL and persists across refreshes. Export regularly if this is your only copy. Importing replaces your current workspace.</div>
      </div>

      <div className="card card-pad" style={{ borderColor: "var(--border-strong)" }}>
        <div className="row between wrap gap-12">
          <div><div className="section-title"><Bell size={16} /> Session</div><div className="section-sub" style={{ marginTop: 4 }}>Signed in as {data.user.email}</div></div>
          <button className="btn btn-danger" onClick={() => { logout(); window.location.href = "/"; }}><LogOut size={15} /> Sign out</button>
        </div>
      </div>
    </div>
  );
}
