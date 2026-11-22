"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, clearToken, getToken, setToken } from "@/lib/api";
import type { BootstrapData, Preferences, TaskInput, User } from "@/lib/types";

type Toast = { id: number; message: string; kind: "ok" | "error" };

interface AppContextValue {
  user: User | null;
  data: BootstrapData | null;
  loading: boolean;
  authLoading: boolean;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  selectedTaskId: number | null;
  openTask: (id: number | null) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (v: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  eventDraft: { date?: string; startAt?: string } | null;
  setEventDraft: (v: { date?: string; startAt?: string } | null) => void;
  toasts: Toast[];
  notify: (message: string, kind?: "ok" | "error") => void;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, timezone?: string) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  logout: () => void;
  createTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: number, input: TaskInput) => Promise<boolean>;
  deleteTask: (id: number) => Promise<boolean>;
  toggleTask: (id: number, completed?: boolean) => Promise<boolean>;
  selectPriority: (id: number, rank: number) => Promise<boolean>;
  reorderTasks: (ids: number[], field?: string) => Promise<boolean>;
  createEvent: (input: Record<string, unknown>) => Promise<boolean>;
  updateEvent: (id: number, input: Record<string, unknown>) => Promise<boolean>;
  deleteEvent: (id: number) => Promise<boolean>;
  duplicateEvent: (id: number) => Promise<boolean>;
  createCategory: (input: { name: string; color?: string; icon?: string }) => Promise<boolean>;
  updateCategory: (id: number, input: { name?: string; color?: string; icon?: string }) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;
  createProject: (input: Record<string, unknown>) => Promise<boolean>;
  updateProject: (id: number, input: Record<string, unknown>) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
  createTag: (name: string) => Promise<number | null>;
  deleteTag: (id: number) => Promise<boolean>;
  updatePreferences: (input: Partial<Preferences>) => Promise<boolean>;
  updateProfile: (input: Partial<User>) => Promise<boolean>;
  createNote: (input: Record<string, unknown>) => Promise<boolean>;
  updateNote: (id: number, input: Record<string, unknown>) => Promise<boolean>;
  deleteNote: (id: number) => Promise<boolean>;
  saveReview: (day: string, input: Record<string, unknown>) => Promise<boolean>;
  addTimeEntry: (input: { taskId?: number | null; minutes: number; note?: string }) => Promise<boolean>;
  deleteTimeEntry: (id: number) => Promise<boolean>;
  seed: () => Promise<boolean>;
  exportBackup: () => Promise<void>;
  importBackup: (payload: unknown) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [systemDark, setSystemDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState<{ date?: string; startAt?: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const result = await api.bootstrap();
      setData(result);
      setUser(result.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setUser(null);
        setData(null);
      }
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", handler);
    if (getToken()) refresh().catch(() => setAuthLoading(false));
    else {
      setAuthLoading(false);
      setLoading(false);
    }
    return () => media.removeEventListener("change", handler);
  }, [refresh]);

  const prefTheme = data?.preferences?.theme || "light";
  const theme: "light" | "dark" = prefTheme === "system" ? (systemDark ? "dark" : "light") : prefTheme === "dark" ? "dark" : "light";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    try {
      await fn();
      await refresh();
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Something went wrong", "error");
      return false;
    }
  }, [refresh, notify]);

  const doLogin = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const result = await api.auth.login({ email, password });
      setToken(result.accessToken);
      await refresh();
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Login failed", "error");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [refresh, notify]);

  const doRegister = useCallback(async (name: string, email: string, password: string, timezone?: string) => {
    setAuthLoading(true);
    try {
      const result = await api.auth.register({ name, email, password, timezone });
      setToken(result.accessToken);
      await refresh();
      notify("Welcome! Your workspace is ready.");
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Registration failed", "error");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [refresh, notify]);

  // Global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setQuickAddOpen(false);
        setSelectedTaskId(null);
        setEventDraft(null);
        (document.activeElement as HTMLElement)?.blur?.();
        return;
      }
      if (typing) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setQuickAddOpen(true); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setEventDraft({}); }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("planner:today"));
      }
      if (e.key === "/") { e.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    user, data, loading, authLoading, theme,
    sidebarCollapsed, setSidebarCollapsed,
    rightPanelOpen, setRightPanelOpen,
    selectedTaskId,
    openTask: (id) => setSelectedTaskId(id),
    quickAddOpen, setQuickAddOpen,
    commandOpen, setCommandOpen,
    eventDraft, setEventDraft,
    toasts, notify, refresh,
    login: doLogin,
    register: doRegister,
    demoLogin: () => doLogin("dhruv@planner.local", "password123"),
    logout: () => { clearToken(); setUser(null); setData(null); setSelectedTaskId(null); },
    createTask: (input) => run(() => api.tasks.create(input)),
    updateTask: (id, input) => run(() => api.tasks.update(id, input)),
    deleteTask: (id) => run(async () => { await api.tasks.delete(id); setSelectedTaskId(null); }),
    toggleTask: (id, completed) => run(() => api.tasks.complete(id, completed)),
    selectPriority: (id, rank) => run(() => api.tasks.selectPriority(id, rank)),
    reorderTasks: (ids, field) => run(() => api.tasks.reorder(ids, field)),
    createEvent: (input) => run(() => api.events.create(input as never)),
    updateEvent: (id, input) => run(() => api.events.update(id, input)),
    deleteEvent: (id) => run(() => api.events.delete(id)),
    duplicateEvent: (id) => run(() => api.events.duplicate(id)),
    createCategory: (input) => run(() => api.categories.create(input)),
    updateCategory: (id, input) => run(() => api.categories.update(id, input)),
    deleteCategory: (id) => run(() => api.categories.delete(id)),
    createProject: (input) => run(() => api.projects.create(input)),
    updateProject: (id, input) => run(() => api.projects.update(id, input)),
    deleteProject: (id) => run(() => api.projects.delete(id)),
    createTag: async (name) => {
      try {
        const tag = await api.tags.create({ name });
        await refresh();
        return tag.id;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Could not create tag", "error");
        return null;
      }
    },
    deleteTag: (id) => run(() => api.tags.delete(id)),
    updatePreferences: (input) => run(() => api.preferences.update(input)),
    updateProfile: (input) => run(() => api.auth.update(input)),
    createNote: (input) => run(() => api.notes.create(input as never)),
    updateNote: (id, input) => run(() => api.notes.update(id, input as never)),
    deleteNote: (id) => run(() => api.notes.delete(id)),
    saveReview: (day, input) => run(() => api.reviews.save(day, input)),
    addTimeEntry: (input) => run(() => api.timeEntries.create(input)),
    deleteTimeEntry: (id) => run(() => api.timeEntries.delete(id)),
    seed: () => run(() => api.seed()),
    exportBackup: async () => {
      try {
        const backup = await api.export();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dayplanner-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify("Backup downloaded");
      } catch (err) {
        notify(err instanceof Error ? err.message : "Export failed", "error");
      }
    },
    importBackup: (payload) => run(() => api.import(payload)),
  }), [user, data, loading, authLoading, theme, sidebarCollapsed, rightPanelOpen, selectedTaskId, quickAddOpen, commandOpen, eventDraft, toasts, notify, refresh, doLogin, doRegister, run]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
