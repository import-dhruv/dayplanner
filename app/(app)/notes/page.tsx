"use client";

import React, { useMemo, useState } from "react";
import { StickyNote, Plus, Pin, Search, Trash2, Folder, Link2, Check, MoreHorizontal } from "lucide-react";
import { useApp } from "@/components/providers";
import { api } from "@/lib/api";
import { RichTextEditor } from "@/components/rich-text";
import { EmptyState, Field } from "@/components/ui";
import { cn, stripHtml } from "@/lib/utils";
import type { Note } from "@/lib/types";

export default function NotesPage() {
  const { data, refresh, updateNote, deleteNote, openTask, notify } = useApp();
  const notes = data?.notes || [];
  const folders = useMemo(() => [...new Set(notes.map((n) => n.folder || "General"))], [notes]);
  const [folder, setFolder] = useState("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Note | null>(null);

  const filtered = notes.filter((n) => (folder === "all" || n.folder === folder) && (!q || (n.title + " " + n.content).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  const select = (n: Note) => { setSelectedId(n.id); setDraft({ ...n }); };
  const create = async () => {
    try {
      const created = await api.notes.create({ title: "Untitled note", content: "", folder: folder === "all" ? "General" : folder }) as Note;
      await refresh();
      setSelectedId(created.id);
      setDraft({ ...created, tagNames: created.tagNames || [] });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not create note", "error");
    }
  };
  const save = async () => {
    if (!draft || !selectedId) return;
    if (await updateNote(selectedId, { title: draft.title, content: draft.content, folder: draft.folder, tagNames: draft.tagNames, isPinned: draft.isPinned, taskId: draft.taskId, projectId: draft.projectId })) notify("Note saved");
  };

  return (
    <div className="col gap-16">
      <div className="row between wrap gap-12"><div><h1 className="page-title">Notes</h1><div className="page-subtitle">Lightweight space for ideas, plans and knowledge</div></div><button className="btn btn-primary" onClick={create}><Plus size={15} /> New note</button></div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, .8fr) minmax(0, 1.6fr)", gap: 16, alignItems: "start" }} className="notes-layout">
        <div className="card card-pad">
          <div className="row gap-6"><Search size={15} className="muted" /><input className="input" style={{ border: "none", boxShadow: "none", padding: "4px 0" }} placeholder="Search notes..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="divider" />
          <button className={cn("nav-item", folder === "all" && "active")} onClick={() => setFolder("all")}><StickyNote size={15} /><span>All notes</span><span className="nav-count">{notes.length}</span></button>
          {folders.map((f) => <button key={f} className={cn("nav-item", folder === f && "active")} onClick={() => setFolder(f)}><Folder size={15} /><span className="truncate">{f}</span><span className="nav-count">{notes.filter((n) => n.folder === f).length}</span></button>)}
          <div className="divider" />
          <div className="tiny muted" style={{ padding: "0 10px" }}>Pinned notes appear in your right panel.</div>
        </div>

        <div className="col gap-16">
          <div className="card card-pad" style={{ display: "grid", gridTemplateColumns: "minmax(200px, .7fr) minmax(0, 1.3fr)", gap: 16 }}>
            <div style={{ borderRight: "1px solid var(--border)", paddingRight: 12, maxHeight: 560, overflowY: "auto" }}>
              {filtered.length === 0 && <div className="tiny muted" style={{ padding: 12 }}>No notes here yet.</div>}
              {filtered.map((n) => <button key={n.id} className="task-row" style={{ width: "100%", textAlign: "left", background: selectedId === n.id ? "var(--primary-soft)" : "transparent" }} onClick={() => select(n)}>
                <div className="flex-1"><div className="row gap-6"><span className="small bold truncate flex-1">{n.title || "Untitled"}</span>{n.isPinned && <Pin size={12} style={{ color: "var(--primary)" }} />}</div><div className="tiny muted truncate" style={{ marginTop: 4 }}>{stripHtml(n.content).slice(0, 70) || "Empty note"}</div><div className="tiny muted" style={{ marginTop: 5 }}>{n.folder} · {n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ""}</div></div>
              </button>)}
            </div>
            <div>
              {!draft ? <EmptyState icon={<StickyNote size={22} />} title="Select a note" description="Pick a note from the list, or create a new one to start writing." /> : <>
                <div className="row gap-8" style={{ marginBottom: 12 }}>
                  <input className="input bold" style={{ fontSize: 16, border: "none", boxShadow: "none", padding: "4px 0" }} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  <button className={cn("icon-btn", draft.isPinned && "btn-soft")} title="Pin" onClick={() => setDraft({ ...draft, isPinned: !draft.isPinned })}><Pin size={15} /></button>
                  <button className="icon-btn" title="Delete" onClick={() => { if (confirm("Delete this note?")) { deleteNote(draft.id); setDraft(null); setSelectedId(null); } }}><Trash2 size={15} /></button>
                </div>
                <RichTextEditor key={draft.id} value={draft.content} onChange={(html) => setDraft((d) => d ? { ...d, content: html } : d)} placeholder="Write your thoughts..." minHeight={260} />
                <div className="form-grid" style={{ marginTop: 14 }}>
                  <Field label="Folder"><input className="input" value={draft.folder} onChange={(e) => setDraft({ ...draft, folder: e.target.value })} /></Field>
                  <Field label="Tags (comma separated)"><input className="input" value={draft.tagNames.join(", ")} onChange={(e) => setDraft({ ...draft, tagNames: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
                  <Field label="Linked task"><select className="select" value={draft.taskId || ""} onChange={(e) => setDraft({ ...draft, taskId: e.target.value ? Number(e.target.value) : null })}><option value="">None</option>{(data?.tasks || []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
                  <Field label="Linked project"><select className="select" value={draft.projectId || ""} onChange={(e) => setDraft({ ...draft, projectId: e.target.value ? Number(e.target.value) : null })}><option value="">None</option>{(data?.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                </div>
                <div className="row gap-8" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={save}><Check size={15} /> Save note</button>
                  {draft.taskId && <button className="btn" onClick={() => openTask(draft.taskId!)}><Link2 size={14} /> Open linked task</button>}
                </div>
              </>}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`@media(max-width:1000px){.notes-layout{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
