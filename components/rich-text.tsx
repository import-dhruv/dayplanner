"use client";

import React, { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading3, RemoveFormatting } from "lucide-react";

export function RichTextEditor({
  value, onChange, placeholder = "Write something...", minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);

  useEffect(() => {
    if (ref.current && value !== lastValue.current) {
      // Only sync when the change came from outside (e.g. loading a different task).
      ref.current.innerHTML = value || "";
      lastValue.current = value;
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) {
      lastValue.current = ref.current.innerHTML;
      onChange(lastValue.current);
    }
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  };

  return (
    <div>
      <div className="editor-toolbar">
        <button type="button" className="icon-btn sm" title="Bold" onClick={() => exec("bold")}><Bold size={14} /></button>
        <button type="button" className="icon-btn sm" title="Italic" onClick={() => exec("italic")}><Italic size={14} /></button>
        <button type="button" className="icon-btn sm" title="Underline" onClick={() => exec("underline")}><Underline size={14} /></button>
        <span style={{ width: 1, background: "var(--border)", margin: "4px 3px" }} />
        <button type="button" className="icon-btn sm" title="Bulleted list" onClick={() => exec("insertUnorderedList")}><List size={14} /></button>
        <button type="button" className="icon-btn sm" title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered size={14} /></button>
        <button type="button" className="icon-btn sm" title="Heading" onClick={() => exec("formatBlock", "h3")}><Heading3 size={14} /></button>
        <span style={{ width: 1, background: "var(--border)", margin: "4px 3px" }} />
        <button type="button" className="icon-btn sm" title="Link" onClick={addLink}><Link2 size={14} /></button>
        <button type="button" className="icon-btn sm" title="Clear formatting" onClick={() => exec("removeFormat")}><RemoveFormatting size={14} /></button>
      </div>
      <div
        ref={ref}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={() => {
          if (!ref.current) return;
          lastValue.current = ref.current.innerHTML;
          onChange(lastValue.current);
        }}
      />
    </div>
  );
}
