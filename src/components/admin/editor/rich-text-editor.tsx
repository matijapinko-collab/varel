"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Link as LinkIcon, Unlink, ImagePlus, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, Minus, RemoveFormatting,
} from "lucide-react";

/** Classic (WordPress-style) rich text editor with Visual/HTML modes. */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your post…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap-content focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  function switchTo(next: "visual" | "html") {
    if (next === "html" && editor) {
      setHtmlDraft(editor.getHTML());
    } else if (next === "visual" && editor) {
      editor.commands.setContent(htmlDraft || "");
      onChange(editor.getHTML());
    }
    setMode(next);
  }

  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1">
        {mode === "visual" && editor ? (
          <Toolbar editor={editor} />
        ) : (
          <span className="px-2 py-1 text-xs text-muted">Editing raw HTML — it will be sanitized on save.</span>
        )}
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => switchTo("visual")}
            className={`px-2 py-1 ${mode === "visual" ? "bg-primary text-primary-foreground" : "hover:bg-soft"}`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => switchTo("html")}
            className={`px-2 py-1 ${mode === "html" ? "bg-primary text-primary-foreground" : "hover:bg-soft"}`}
          >
            HTML
          </button>
        </div>
      </div>

      {mode === "visual" ? (
        <EditorContent editor={editor} className="min-h-[360px] px-4 py-3 text-sm" />
      ) : (
        <textarea
          value={htmlDraft}
          onChange={(e) => {
            setHtmlDraft(e.target.value);
            onChange(e.target.value);
          }}
          className="min-h-[360px] w-full resize-y bg-card px-4 py-3 font-mono text-xs outline-none"
        />
      )}

      <style>{`
        .tiptap-content { min-height: 340px; }
        .tiptap-content p { margin: 0 0 0.75rem; }
        .tiptap-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
        .tiptap-content h3 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .tiptap-content h4 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .tiptap-content ul { list-style: disc; padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap-content blockquote { border-left: 3px solid var(--color-border, #ddd); padding-left: 1rem; color: #666; margin: 0 0 0.75rem; }
        .tiptap-content pre { background: rgba(0,0,0,0.06); padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; }
        .tiptap-content a { color: var(--color-primary, #2563eb); text-decoration: underline; }
        .tiptap-content img { max-width: 100%; height: auto; border-radius: 0.5rem; }
        .tiptap-content hr { margin: 1.25rem 0; border: none; border-top: 1px solid var(--color-border, #ddd); }
        .tiptap-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const active = "bg-soft text-primary";
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <select
        aria-label="Paragraph style"
        value={
          editor.isActive("heading", { level: 2 }) ? "h2" :
          editor.isActive("heading", { level: 3 }) ? "h3" :
          editor.isActive("heading", { level: 4 }) ? "h4" : "p"
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(v[1]) as 2 | 3 | 4 }).run();
        }}
        className="mr-1 h-7 rounded border border-border bg-background px-1 text-xs"
      >
        <option value="p">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
      </select>

      <Btn on={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={14} /></Btn>
      <Btn on={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={14} /></Btn>
      <Btn on={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={14} /></Btn>
      <Btn on={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={14} /></Btn>
      <Btn on={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote size={14} /></Btn>
      <Btn on={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bulleted list"><List size={14} /></Btn>
      <Btn on={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={14} /></Btn>
      <Btn on={editor.isActive("link")} onClick={setLink} title="Link"><LinkIcon size={14} /></Btn>
      <Btn on={false} onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link"><Unlink size={14} /></Btn>
      <Btn on={false} onClick={addImage} title="Insert image"><ImagePlus size={14} /></Btn>
      <Btn on={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft size={14} /></Btn>
      <Btn on={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center"><AlignCenter size={14} /></Btn>
      <Btn on={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right"><AlignRight size={14} /></Btn>
      <Btn on={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><Code size={14} /></Btn>
      <Btn on={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line"><Minus size={14} /></Btn>
      <Btn on={false} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><RemoveFormatting size={14} /></Btn>
      <Btn on={false} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={14} /></Btn>
      <Btn on={false} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={14} /></Btn>
    </div>
  );
}

function Btn({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded hover:bg-soft ${on ? "bg-soft text-primary" : "text-muted"}`}
    >
      {children}
    </button>
  );
}
