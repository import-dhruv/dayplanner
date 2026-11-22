"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, CalendarPlus, LayoutDashboard, ListTodo, CalendarDays, CalendarClock, Inbox, StickyNote, FolderKanban, CheckCircle2, BarChart3, Settings, CornerDownLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "./providers";
import type { SearchResult } from "@/lib/types";

const PAGES = [
  { label: "My Day", href: "/day", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Upcoming", href: "/upcoming", icon: CalendarClock },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Completed", href: "/completed", icon: CheckCircle2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const KIND_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  task: ListTodo, project: FolderKanban, event: CalendarDays, note: StickyNote,
};

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setQuickAddOpen, setEventDraft, openTask } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandOpen) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [commandOpen]);

  useEffect(() => {
    if (!commandOpen || !q.trim()) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      api.search(q).then((r) => { if (!cancelled) { setResults(r); setActive(0); } }).catch(() => {});
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, commandOpen]);

  const items = useMemo(() => {
    const actions = [
      { key: "a1", label: "New task", sub: "Shortcut: N", icon: Plus, run: () => setQuickAddOpen(true) },
      { key: "a2", label: "New calendar event", sub: "Shortcut: C", icon: CalendarPlus, run: () => setEventDraft({}) },
      ...PAGES.map((p) => ({ key: `p${p.href}`, label: `Go to ${p.label}`, sub: "Navigation", icon: p.icon, run: () => router.push(p.href) })),
    ].filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));
    const found = results.map((r) => ({
      key: `${r.kind}${r.id}`,
      label: r.title,
      sub: `${r.kind} · ${r.subtitle}`,
      icon: KIND_ICON[r.kind] || Search,
      run: () => {
        if (r.kind === "task") { openTask(r.id); }
        else router.push(r.href);
      },
    }));
    return [...actions, ...found];
  }, [q, results, router, setQuickAddOpen, setEventDraft, openTask]);

  if (!commandOpen) return null;

  const choose = (index: number) => {
    const item = items[index];
    if (!item) return;
    item.run();
    setCommandOpen(false);
  };

  return (
    <div className="overlay" style={{ alignItems: "flex-start", paddingTop: "12vh" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setCommandOpen(false); }}>
      <div className="modal" style={{ width: "min(620px, 100%)" }}>
        <div className="row gap-10" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <Search size={18} className="muted" />
          <input ref={inputRef} className="input" style={{ border: "none", boxShadow: "none", padding: 0, fontSize: 15, background: "transparent" }}
            placeholder="Search tasks, projects, notes or run a command..." value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter") { e.preventDefault(); choose(active); }
            }} />
          <span className="kbd">ESC</span>
        </div>
        <div className="modal-body" style={{ padding: 8, maxHeight: 420 }}>
          {items.length === 0 && <div className="empty-state" style={{ padding: 28 }}><span className="small muted">No results for “{q}”</span></div>}
          {items.map((item, i) => (
            <button key={item.key} onMouseEnter={() => setActive(i)} onClick={() => choose(i)}
              className="row gap-10" style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", textAlign: "left", background: i === active ? "var(--primary-soft)" : "transparent" }}>
              <span style={{ color: i === active ? "var(--primary)" : "var(--muted)" }}><item.icon size={16} /></span>
              <span className="flex-1 small bold truncate">{item.label}</span>
              <span className="tiny muted">{item.sub}</span>
              {i === active && <CornerDownLeft size={13} className="muted" />}
            </button>
          ))}
        </div>
        <div className="modal-foot" style={{ justifyContent: "space-between", padding: "10px 18px" }}>
          <span className="tiny muted">↑↓ navigate · ↵ select</span>
          <span className="tiny muted"><span className="kbd">⌘</span> + <span className="kbd">K</span> to toggle</span>
        </div>
      </div>
    </div>
  );
}
