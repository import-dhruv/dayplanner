"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ListTodo, CalendarDays, CalendarClock, Inbox, StickyNote, FolderKanban,
  CheckCircle2, BarChart3, Settings, Search, Plus, Bell, PanelLeftClose, PanelLeft,
  PanelRightClose, PanelRight, Sun, Moon, Monitor, ChevronDown, MoreHorizontal, LogOut,
  Download, Upload, UserRound, ChevronsUpDown, X, Sparkles, Check, TrendingUp, Flag,
  Clock3, CircleAlert, Heart, BookOpen, FlaskConical, Code2, Rocket, Activity, Circle,
  Menu, Trash2,
} from "lucide-react";
import { useApp } from "./providers";
import { api } from "@/lib/api";
import { Modal, Toggle, Field } from "./ui";
import { CATEGORY_COLORS, cn, durationLabel, prettyDate, relativeDue, todayISO } from "@/lib/utils";
import type { Category, Preferences } from "@/lib/types";

const MAIN_NAV = [
  { label: "My Day", href: "/day", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Upcoming", href: "/upcoming", icon: CalendarClock },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Completed", href: "/completed", icon: CheckCircle2 },
];

const DEFAULT_WORKSPACES: { name: string; icon: React.ComponentType<{ size?: number }>; color: string }[] = [
  { name: "Personal", icon: Heart, color: "#34D399" },
  { name: "Learning", icon: BookOpen, color: "#8B7CF6" },
  { name: "Research", icon: FlaskConical, color: "#EC4899" },
  { name: "Development", icon: Code2, color: "#5B8DEF" },
  { name: "Startup", icon: Rocket, color: "#F59E0B" },
  { name: "Health & Fitness", icon: Activity, color: "#22D3EE" },
];

function Sidebar() {
  const { data, refresh, sidebarCollapsed, setSidebarCollapsed, createCategory, updateCategory, deleteCategory } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [catModal, setCatModal] = useState<Category | "new" | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);

  const isNewCat = catModal === "new";
  const editingCat = catModal && typeof catModal === "object" ? catModal : null;

  const moveCategory = async (dir: -1 | 1) => {
    if (!editingCat || !data) return;
    const ids = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id);
    const idx = ids.indexOf(editingCat.id);
    const next = idx + dir;
    if (next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    await api.categories.reorder(ids);
    await refresh();
  };

  const openCat = (cat: Category | "new") => {
    setCatModal(cat);
    setCatName(cat === "new" ? "" : cat.name);
    setCatColor(cat === "new" ? CATEGORY_COLORS[0] : cat.color);
  };

  const tasks = data?.tasks || [];
  const counts: Record<string, number> = {
    "/tasks": tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
    "/inbox": tasks.filter((t) => !t.scheduledDate && t.status !== "completed").length,
    "/completed": tasks.filter((t) => t.status === "completed").length,
  };

  return (
    <aside className={cn("sidebar", sidebarCollapsed && "collapsed")}>
      <div className="sidebar-inner">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div className="flex-1 truncate">
            <div className="brand-name">Dayplanner</div>
            <div className="tiny muted">personal workspace</div>
          </div>
          <button className="icon-btn sm" onClick={() => setSidebarCollapsed((v) => !v)} title="Collapse sidebar">
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-label">Main menu</div>
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cn("nav-item", pathname === item.href && "active")} title={item.label}>
              <span className="nav-icon"><item.icon size={17} /></span>
              <span>{item.label}</span>
              {counts[item.href] !== undefined && <span className="nav-count">{counts[item.href]}</span>}
            </Link>
          ))}
          <Link href="/analytics" className={cn("nav-item", pathname === "/analytics" && "active")} title="Analytics">
            <span className="nav-icon"><BarChart3 size={17} /></span><span>Analytics</span>
          </Link>

          <div className="row between" style={{ marginTop: 4 }}>
            <div className="nav-label" style={{ paddingBottom: 0 }}>My pages</div>
            <button className="icon-btn sm" title="New workspace" onClick={() => openCat("new")}><Plus size={14} /></button>
          </div>
          {DEFAULT_WORKSPACES.slice(0, showAllWorkspaces ? 99 : 4).map((w) => {
            const match = data?.categories.find((c) => c.name.toLowerCase() === w.name.toLowerCase() || (w.name === "Health & Fitness" && c.name.toLowerCase().includes("health")));
            return (
              <button key={w.name} className="nav-item" onClick={() => router.push(`/tasks${match ? `?category=${match.id}` : ""}`)} title={w.name}>
                <span className="nav-icon workspace-dot" style={{ background: match?.color || w.color, width: 10, height: 10, borderRadius: 4 }} />
                <span className="truncate">{w.name}</span>
              </button>
            );
          })}
          {showAllWorkspaces && DEFAULT_WORKSPACES.slice(4).map((w) => {
            const match = data?.categories.find((c) => c.name.toLowerCase() === w.name.toLowerCase());
            return (
              <button key={w.name} className="nav-item" onClick={() => router.push(`/tasks${match ? `?category=${match.id}` : ""}`)} title={w.name}>
                <span className="nav-icon workspace-dot" style={{ background: match?.color || w.color, width: 10, height: 10, borderRadius: 4 }} />
                <span className="truncate">{w.name}</span>
              </button>
            );
          })}
          {(data?.categories || []).filter((c) => !DEFAULT_WORKSPACES.some((w) => w.name.toLowerCase() === c.name.toLowerCase())).map((c) => (
            <div key={c.id} className="row group" style={{ position: "relative" }}>
              <button className="nav-item" onClick={() => router.push(`/tasks?category=${c.id}`)} title={c.name}>
                <span className="nav-icon workspace-dot" style={{ background: c.color, width: 10, height: 10, borderRadius: 4 }} />
                <span className="truncate">{c.name}</span>
              </button>
              <button className="icon-btn sm" style={{ position: "absolute", right: 4, opacity: .6 }} onClick={() => openCat(c)}><MoreHorizontal size={14} /></button>
            </div>
          ))}
          <button className="nav-item" onClick={() => setShowAllWorkspaces((v) => !v)}>
            <span className="nav-icon"><ChevronDown size={16} style={{ transform: showAllWorkspaces ? "rotate(180deg)" : "none" }} /></span>
            <span>{showAllWorkspaces ? "Show less" : "Show more"}</span>
          </button>
        </div>

        <div className="col gap-4" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <Link href="/settings" className={cn("nav-item", pathname === "/settings" && "active")}><span className="nav-icon"><Settings size={17} /></span><span>Settings</span></Link>
          <div className="row gap-8" style={{ padding: "8px 10px", borderRadius: 9, background: "var(--surface-2)" }}>
            <div className="avatar" style={{ background: data?.user.avatarColor || "#7C6CF0" }}>{data?.user.name?.[0]?.toUpperCase() || "D"}</div>
            <div className="flex-1 truncate"><div className="small bold truncate">{data?.user.name || "Friend"}</div><div className="tiny muted truncate">{data?.user.email}</div></div>
            <ChevronsUpDown size={14} className="muted" />
          </div>
        </div>
      </div>

      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={isNewCat ? "New workspace" : "Edit workspace"}
        footer={<>
          {editingCat && <>
            <button className="btn btn-sm" title="Move up" onClick={() => moveCategory(-1)}>↑</button>
            <button className="btn btn-sm" title="Move down" onClick={() => moveCategory(1)}>↓</button>
            <button className="btn btn-danger" style={{ marginRight: "auto" }} onClick={() => { deleteCategory(editingCat.id); setCatModal(null); }}><Trash2 size={14} /> Delete</button>
          </>}
          <button className="btn" onClick={() => setCatModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => {
            if (!catName.trim()) return;
            const ok = isNewCat ? await createCategory({ name: catName.trim(), color: catColor, icon: "Circle" }) : editingCat ? await updateCategory(editingCat.id, { name: catName.trim(), color: catColor }) : false;
            if (ok) setCatModal(null);
          }}>Save</button>
        </>}>
        <div className="col gap-16">
          <Field label="Name"><input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Workspace name" /></Field>
          <Field label="Color"><div className="row gap-6 wrap">{CATEGORY_COLORS.map((c) => <button key={c} onClick={() => setCatColor(c)} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: catColor === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />)}</div></Field>
        </div>
      </Modal>
    </aside>
  );
}

function RightPanel() {
  const { data, rightPanelOpen, setRightPanelOpen, openTask, selectedTaskId, updatePreferences } = useApp();
  const router = useRouter();
  if (!rightPanelOpen || !data) return null;
  const today = todayISO();
  const tasks = data.tasks;
  const todays = tasks.filter((t) => t.scheduledDate === today && t.status !== "cancelled");
  const done = todays.filter((t) => t.status === "completed").length;
  const pct = todays.length ? Math.round((done / todays.length) * 100) : 0;
  const priorities = tasks.filter((t) => t.isDailyPriority).sort((a, b) => (a.priorityRank || 9) - (b.priorityRank || 9));
  const deadlines = tasks.filter((t) => t.dueDate && t.status !== "completed" && t.status !== "cancelled").sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).slice(0, 4);
  const selected = tasks.find((t) => t.id === selectedTaskId);
  const upcomingEvents = data.events.filter((e) => new Date(e.endAt) >= new Date()).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 3);

  return (
    <aside className="right-panel">
      <div className="row between" style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--surface)", zIndex: 2 }}>
        <span className="section-title">Your day</span>
        <button className="icon-btn sm" onClick={() => setRightPanelOpen(false)} title="Hide panel"><PanelRightClose size={16} /></button>
      </div>
      <div style={{ padding: "18px 20px 40px" }} className="col gap-20">
        <div className="card card-pad">
          <div className="row between"><span className="section-title"><TrendingUp size={15} /> Daily progress</span><span className="bold" style={{ color: "var(--primary)" }}>{pct}%</span></div>
          <div className="progress" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="row between tiny muted" style={{ marginTop: 8 }}><span>{done} of {todays.length} tasks done</span><span>{durationLabel(todays.filter((t) => t.status === "completed").reduce((s, t) => s + t.estimatedMinutes, 0))} focused</span></div>
        </div>

        <div>
          <div className="row between" style={{ marginBottom: 8 }}><span className="section-title"><Flag size={15} /> Today's priorities</span><span className="tiny muted">{priorities.length}/3</span></div>
          <div className="col gap-6">
            {priorities.length === 0 && <div className="small muted">No priorities selected yet. Pick up to 3 tasks in My Day.</div>}
            {priorities.map((t) => (
              <button key={t.id} className="task-row" style={{ padding: "9px 10px", border: "1px solid var(--border)" }} onClick={() => openTask(t.id)}>
                <span className="chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>#{t.priorityRank}</span>
                <span className="flex-1 small bold truncate" style={{ textDecoration: t.status === "completed" ? "line-through" : "none" }}>{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="row between" style={{ marginBottom: 8 }}><span className="section-title"><CalendarClock size={15} /> Upcoming deadlines</span></div>
          <div className="col gap-6">
            {deadlines.length === 0 && <div className="small muted">Nothing due soon. Enjoy the breathing room.</div>}
            {deadlines.map((t) => {
              const rel = relativeDue(t.dueDate);
              return <button key={t.id} className="row gap-8 task-row" style={{ padding: "8px 10px" }} onClick={() => openTask(t.id)}>
                <span className="chip-dot" style={{ background: rel.overdue ? "var(--red)" : "var(--orange)" }} />
                <span className="flex-1 small truncate text-2">{t.title}</span>
                <span className={cn("tiny", rel.overdue ? "text-red" : "muted")} style={rel.overdue ? { color: "var(--red)" } : undefined}>{rel.label}</span>
              </button>;
            })}
          </div>
        </div>

        {upcomingEvents.length > 0 && <div>
          <div className="section-title" style={{ marginBottom: 8 }}><CalendarDays size={15} /> Next events</div>
          <div className="col gap-6">
            {upcomingEvents.map((e) => <div key={e.id} className="row gap-8 small" style={{ paddingLeft: 4 }}>
              <span style={{ width: 3, height: 26, borderRadius: 3, background: e.color }} />
              <div className="flex-1"><div className="bold truncate">{e.title}</div><div className="tiny muted">{new Date(e.startAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div></div>
            </div>)}
          </div>
        </div>}

        <div>
          <div className="row between" style={{ marginBottom: 8 }}><span className="section-title"><StickyNote size={15} /> Quick notes</span><button className="icon-btn sm" onClick={() => router.push("/notes")}><Plus size={14} /></button></div>
          {data.notes.filter((n) => n.isPinned).slice(0, 2).map((n) => <div key={n.id} className="card card-pad" style={{ marginBottom: 8, background: "var(--surface-2)" }}>
            <div className="small bold truncate">{n.title}</div>
            <div className="tiny muted" style={{ marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.content.replace(/<[^>]+>/g, " ").slice(0, 140)}</div>
          </div>)}
          {data.notes.filter((n) => n.isPinned).length === 0 && <div className="small muted">Pin a note to keep it here.</div>}
        </div>

        {selected && <div className="card card-pad" style={{ borderColor: "var(--primary-border)", background: "var(--primary-soft)" }}>
          <div className="tiny muted">Selected task</div>
          <div className="bold small" style={{ margin: "5px 0 8px" }}>{selected.title}</div>
          <button className="btn btn-sm btn-soft btn-block" onClick={() => openTask(selected.id)}>Open details</button>
        </div>}

        <div className="tiny muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 14, lineHeight: 1.7 }}>
          Tip: press <span className="kbd">N</span> for a new task, <span className="kbd">C</span> for an event, <span className="kbd">⌘K</span> to search.
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { data, theme, updatePreferences, setQuickAddOpen, setCommandOpen, rightPanelOpen, setRightPanelOpen, sidebarCollapsed, setSidebarCollapsed, logout, exportBackup, updateProfile } = useApp();
  const router = useRouter();
  const [themeOpen, setThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = (data?.reminders || []).filter((r) => !r.isRead).length;
  const overdue = (data?.tasks || []).filter((t) => t.dueDate && t.dueDate < todayISO() && t.status !== "completed" && t.status !== "cancelled").length;

  const setTheme = async (t: "light" | "dark" | "system") => { await updatePreferences({ theme: t }); setThemeOpen(false); };

  return (
    <header className="topbar">
      <button className="icon-btn" onClick={() => setSidebarCollapsed((v) => !v)} title="Toggle sidebar"><Menu size={18} /></button>
      <button className="row gap-8" style={{ background: "transparent", border: "none" }} onClick={() => setCommandOpen(true)}>
        <span className="small muted" style={{ display: "none" }}>Search</span>
      </button>
      <button className="btn btn-ghost row gap-8" style={{ color: "var(--muted)" }} onClick={() => setCommandOpen(true)}>
        <Search size={16} /><span className="small">Search anything...</span><span className="kbd">⌘K</span>
      </button>
      <div className="flex-1" />
      <div className="row gap-6">
        <div style={{ position: "relative" }}>
          <button className="icon-btn" title="Theme" onClick={() => setThemeOpen((v) => !v)}>
            {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          {themeOpen && <div className="card" style={{ position: "absolute", right: 0, top: 42, width: 160, padding: 6, zIndex: 60, boxShadow: "var(--shadow-lg)" }}>
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([key, Icon, label]) => (
              <button key={key} className="nav-item" onClick={() => setTheme(key)}><Icon size={15} /><span>{label}</span>{data?.preferences.theme === key && <Check size={14} style={{ marginLeft: "auto", color: "var(--primary)" }} />}</button>
            ))}
          </div>}
        </div>
        <div style={{ position: "relative" }}>
          <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen((v) => !v)}>
            <Bell size={17} />{(unread + overdue) > 0 && <span style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: "50%", background: "var(--red)", border: "1.5px solid var(--surface)" }} />}
          </button>
          {notifOpen && <div className="card" style={{ position: "absolute", right: 0, top: 42, width: 290, padding: 10, zIndex: 60, boxShadow: "var(--shadow-lg)" }}>
            <div className="section-title" style={{ padding: "4px 6px 10px" }}>Notifications</div>
            {overdue > 0 && <div className="row gap-8 small" style={{ padding: "8px 6px", background: "var(--red-soft)", borderRadius: 8, color: "var(--red)" }}><CircleAlert size={15} />{overdue} overdue task{overdue > 1 ? "s" : ""}</div>}
            {(data?.reminders || []).slice(0, 4).map((r) => <div key={r.id} className="small" style={{ padding: "7px 6px", borderBottom: "1px solid var(--border)" }}>
              <div className="bold truncate">{r.message || "Reminder"}</div>
              <div className="tiny muted">{new Date(r.remindAt).toLocaleString()}</div>
            </div>)}
            {unread + overdue === 0 && <div className="small muted" style={{ padding: 10 }}>You're all caught up.</div>}
          </div>}
        </div>
        <button className="icon-btn" title={rightPanelOpen ? "Hide panel" : "Show panel"} onClick={() => setRightPanelOpen((v) => !v)}>
          {rightPanelOpen ? <PanelRightClose size={17} /> : <PanelRight size={17} />}
        </button>
        <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}><Plus size={16} /> Quick add</button>
        <div style={{ position: "relative" }}>
          <button className="avatar" style={{ background: data?.user.avatarColor || "#7C6CF0" }} onClick={() => setProfileOpen((v) => !v)}>{data?.user.name?.[0]?.toUpperCase() || "D"}</button>
          {profileOpen && <div className="card" style={{ position: "absolute", right: 0, top: 42, width: 210, padding: 6, zIndex: 60, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <div className="small bold truncate">{data?.user.name}</div><div className="tiny muted truncate">{data?.user.email}</div>
            </div>
            <button className="nav-item" onClick={() => { router.push("/settings"); setProfileOpen(false); }}><UserRound size={15} /><span>Settings</span></button>
            <button className="nav-item" onClick={() => { exportBackup(); setProfileOpen(false); }}><Download size={15} /><span>Export data</span></button>
            <button className="nav-item" onClick={() => { logout(); router.push("/"); }}><LogOut size={15} /><span>Sign out</span></button>
          </div>}
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { setQuickAddOpen } = useApp();
  const items = [
    { href: "/day", label: "My Day", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: ListTodo },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/notes", label: "Notes", icon: StickyNote },
  ];
  return (
    <nav className="mobile-nav">
      {items.slice(0, 2).map((i) => <Link key={i.href} href={i.href} className={cn(pathname === i.href && "active")}><i.icon size={19} />{i.label}</Link>)}
      <button onClick={() => setQuickAddOpen(true)} style={{ background: "var(--primary)", color: "#fff", borderRadius: 12, width: 44, height: 44, justifyContent: "center" }}><Plus size={22} /></button>
      {items.slice(2).map((i) => <Link key={i.href} href={i.href} className={cn(pathname === i.href && "active")}><i.icon size={19} />{i.label}</Link>)}
    </nav>
  );
}

function Onboarding() {
  const { user, data, updateProfile, updatePreferences, seed, refresh } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || "");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [weekStart, setWeekStart] = useState(1);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("20:00");
  const [view, setView] = useState<"day" | "week" | "month" | "agenda">("week");
  const [busy, setBusy] = useState(false);

  if (!user || user.onboarded || !data) return null;

  const finish = async (withDemo: boolean) => {
    setBusy(true);
    await updateProfile({ name: name.trim() || "Friend", onboarded: true });
    await updatePreferences({ theme, weekStart, workStart, workEnd, defaultCalendarView: view });
    if (withDemo) await seed();
    await refresh();
    setBusy(false);
  };

  return (
    <div className="overlay">
      <div className="modal wide">
        <div className="modal-head">
          <div><h3 className="section-title" style={{ fontSize: 18 }}><Sparkles size={17} className="muted" /> Welcome to Dayplanner</h3><p className="small muted" style={{ margin: "5px 0 0" }}>Let's set up your personal command center. Step {step + 1} of 2.</p></div>
        </div>
        <div className="modal-body">
          {step === 0 ? <div className="col gap-16">
            <Field label="What should we call you?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></Field>
            <Field label="Appearance"><div className="row gap-8">{(["light", "dark", "system"] as const).map((t) => <button key={t} className={cn("btn", theme === t ? "btn-soft" : "")} onClick={() => setTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div></Field>
            <Field label="Week starts on"><div className="row gap-8"><button className={cn("btn", weekStart === 1 ? "btn-soft" : "")} onClick={() => setWeekStart(1)}>Monday</button><button className={cn("btn", weekStart === 0 ? "btn-soft" : "")} onClick={() => setWeekStart(0)}>Sunday</button></div></Field>
          </div> : <div className="col gap-16">
            <div className="form-grid">
              <Field label="Work day starts"><input type="time" className="input" value={workStart} onChange={(e) => setWorkStart(e.target.value)} /></Field>
              <Field label="Work day ends"><input type="time" className="input" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} /></Field>
            </div>
            <Field label="Preferred calendar view"><div className="row gap-8">{["day", "week", "month", "agenda"].map((v) => <button key={v} className={cn("btn", view === v ? "btn-soft" : "")} onClick={() => setView(v as "day" | "week" | "month" | "agenda")}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div></Field>
            <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
              <div className="bold small">Start with a demo workspace?</div>
              <p className="small muted" style={{ margin: "5px 0 0", lineHeight: 1.6 }}>We'll add a few example projects, tasks and events so you can explore. Everything is editable and removable.</p>
            </div>
          </div>}
        </div>
        <div className="modal-foot">
          {step === 1 && <button className="btn" style={{ marginRight: "auto" }} onClick={() => setStep(0)}>Back</button>}
          {step === 0 ? <button className="btn btn-primary" onClick={() => setStep(1)}>Continue</button> : <>
            <button className="btn" disabled={busy} onClick={() => finish(false)}>Start empty</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => finish(true)}>{busy ? "Setting up..." : "Create demo workspace"}</button>
          </>}
        </div>
      </div>
    </div>
  );
}

function ReminderEngine() {
  const { data, refresh } = useApp();
  useEffect(() => {
    const timer = setInterval(async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (localStorage.getItem("dayplanner_browser_notifs") !== "true") return;
      const due = (data?.reminders || []).filter((r) => !r.isRead && new Date(r.remindAt) <= new Date());
      for (const r of due) {
        try {
          new Notification("Dayplanner reminder", { body: r.message || "A task or event needs your attention." });
          await api.reminders.update(r.id, { isRead: true });
        } catch { /* ignore */ }
      }
      if (due.length) await refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [data?.reminders, refresh]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user, rightPanelOpen } = useApp();
  if (loading || !user) return null;
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <main className="main-scroll"><div className="content">{children}</div></main>
      </div>
      {rightPanelOpen && <RightPanel />}
      <MobileNav />
      <ReminderEngine />
      <Onboarding />
    </div>
  );
}
