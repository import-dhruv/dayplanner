"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { AuthScreen } from "@/components/auth-screen";
import { AppShell } from "@/components/app-shell";
import { QuickAdd } from "@/components/quick-add";
import { CommandPalette } from "@/components/command-palette";
import { TaskDetailDrawer } from "@/components/task-detail";
import { EventModal } from "@/components/event-modal";
import { ToastList } from "@/components/ui";

function EventHost() {
  const { eventDraft, setEventDraft, data } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    const handler = (e: Event) => setOpenId((e as CustomEvent).detail);
    window.addEventListener("planner:open-event", handler);
    return () => window.removeEventListener("planner:open-event", handler);
  }, []);
  const found = openId ? data?.events.find((x) => x.id === openId) : null;
  if (eventDraft) return <EventModal open onClose={() => setEventDraft(null)} initialDate={eventDraft.date} initialStart={eventDraft.startAt} />;
  if (found) return <EventModal open event={found} onClose={() => setOpenId(null)} />;
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authLoading, user, toasts } = useApp();
  if (authLoading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}><div className="brand-mark" style={{ animation: "pulse 1.2s infinite" }}>D</div><style jsx>{`@keyframes pulse{50%{transform:scale(1.08);opacity:.8}}`}</style></div>;
  }
  if (!user) return <AuthScreen />;
  return (
    <>
      <AppShell>{children}</AppShell>
      <QuickAdd />
      <CommandPalette />
      <TaskDetailDrawer />
      <EventHost />
      <ToastList toasts={toasts} />
    </>
  );
}
