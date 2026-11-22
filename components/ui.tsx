"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn, PRIORITIES, STATUSES } from "@/lib/utils";
import type { Category, Priority, Status } from "@/lib/types";

export function Modal({
  open, onClose, title, subtitle, children, footer, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cn("modal", wide && "wide")}>
        <div className="modal-head">
          <div>
            <h3 className="section-title" style={{ fontSize: 17 }}>{title}</h3>
            {subtitle && <p className="small muted" style={{ margin: "4px 0 0" }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open, onClose, title, message, confirmLabel = "Delete", onConfirm, danger = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={cn("btn", danger ? "btn-danger" : "btn-primary")} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>}>
      <div className="row gap-12">
        <div className={cn("stat-icon", danger ? "red-soft" : "primary-soft")} style={{ background: danger ? "var(--red-soft)" : "var(--primary-soft)", color: danger ? "var(--red)" : "var(--primary)" }}>
          <AlertTriangle size={18} />
        </div>
        <p className="m-0 text-2 small" style={{ lineHeight: 1.6 }}>{message}</p>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div>
        <div className="bold" style={{ fontSize: 14, color: "var(--text)" }}>{title}</div>
        <p className="small m-0" style={{ maxWidth: 320, lineHeight: 1.6 }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={cn(value === o.value && "active")} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, color, height = 7 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="progress" style={{ height }}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || "var(--primary)" }} />
    </div>
  );
}

export function PriorityChip({ priority, onClick }: { priority: Priority; onClick?: () => void }) {
  const meta = PRIORITIES[priority] || PRIORITIES.none;
  const content = <><span className="chip-dot" style={{ background: meta.dot }} />{meta.label}</>;
  if (onClick) return <button className="chip" style={{ background: meta.soft, color: meta.color }} onClick={onClick}>{content}</button>;
  return <span className="chip" style={{ background: meta.soft, color: meta.color }}>{content}</span>;
}

export function StatusChip({ status }: { status: Status }) {
  const meta = STATUSES[status] || STATUSES.not_started;
  return <span className="chip" style={{ background: meta.soft, color: meta.color }}><span className="chip-dot" style={{ background: meta.color }} />{meta.label}</span>;
}

export function CategoryChip({ category, categoryList }: { category: number | null; categoryList: Category[] }) {
  const cat = categoryList.find((c) => c.id === category);
  if (!cat) return null;
  return <span className="chip" style={{ background: `${cat.color}1c`, color: cat.color }}><span className="workspace-dot" style={{ background: cat.color }} />{cat.name}</span>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" className="row gap-8" onClick={() => onChange(!checked)} style={{ background: "none", border: "none", padding: 0 }}>
      <span style={{ width: 34, height: 20, borderRadius: 12, background: checked ? "var(--primary)" : "var(--border-strong)", position: "relative", transition: "background .2s", flex: "0 0 auto" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 17 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      </span>
      {label && <span className="small text-2">{label}</span>}
    </button>
  );
}

export function ToastList({ toasts }: { toasts: { id: number; message: string; kind: "ok" | "error" }[] }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.kind === "ok" ? <Check size={15} /> : <AlertTriangle size={15} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ title: string; message: string; confirmLabel?: string; onConfirm: () => void } | null>(null);
  const confirm = (title: string, message: string, onConfirm: () => void, confirmLabel?: string) => setState({ title, message, onConfirm, confirmLabel });
  const node = state ? (
    <ConfirmModal open onClose={() => setState(null)} title={state.title} message={state.message} confirmLabel={state.confirmLabel} onConfirm={() => { state.onConfirm(); setState(null); }} />
  ) : null;
  return { confirm, node };
}
