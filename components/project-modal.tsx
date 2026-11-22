"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "./providers";
import { Field, Modal } from "./ui";
import { CATEGORY_COLORS } from "@/lib/utils";
import type { Project } from "@/lib/types";

export function ProjectModal({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project | null }) {
  const { createProject, updateProject, deleteProject } = useApp();
  const [form, setForm] = useState({ name: "", description: "", color: "#5B8DEF", icon: "FolderKanban", startDate: "", targetDate: "", notes: "", status: "active" });
  React.useEffect(() => {
    if (open) setForm(project ? { name: project.name, description: project.description, color: project.color, icon: project.icon, startDate: project.startDate || "", targetDate: project.targetDate || "", notes: project.notes || "", status: project.status } : { name: "", description: "", color: "#5B8DEF", icon: "FolderKanban", startDate: "", targetDate: "", notes: "", status: "active" });
  }, [open, project]);
  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit project" : "New project"} subtitle="Organize long-term work into a focused space."
      footer={<>
        {project && <button className="btn btn-danger" style={{ marginRight: "auto" }} onClick={() => { if (confirm("Delete this project? Its tasks will remain but become unlinked.")) { deleteProject(project.id); onClose(); } }}><Trash2 size={14} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => {
          if (!form.name.trim()) return;
          const payload = { ...form, startDate: form.startDate || null, targetDate: form.targetDate || null };
          const ok = project ? await updateProject(project.id, payload) : await createProject(payload);
          if (ok) onClose();
        }}>Save project</button>
      </>}>
      <div className="col gap-14">
        <Field label="Project name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AI Research" /></Field>
        <Field label="Description"><textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Start date"><input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="Target deadline"><input type="date" className="input" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
          <Field label="Status"><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></Field>
          <Field label="Color"><div className="row gap-6 wrap">{CATEGORY_COLORS.map((c) => <button key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: form.color === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />)}</div></Field>
        </div>
        <Field label="Project notes"><textarea className="textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
