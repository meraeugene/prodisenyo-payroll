"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TbBold, TbH2, TbItalic, TbList } from "react-icons/tb";

export default function EngineerReportEditor({ onChange }: { onChange: (json: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: { attributes: { class: "min-h-[180px] px-4 py-3 text-sm leading-6 outline-none" } },
    onUpdate: ({ editor: current }) => onChange(JSON.stringify(current.getJSON())),
  });
  if (!editor) return <div className="min-h-[220px] animate-pulse rounded-[6px] bg-[#f3f6f4]" />;
  const button = "grid h-8 w-8 place-items-center rounded-[4px] text-[#4e5861] hover:bg-[#eaf2ed] hover:text-[#087332]";
  return <div className="overflow-hidden rounded-[6px] border border-[#d9e2dc] bg-white"><div className="flex gap-1 border-b border-[#e1e7e3] bg-[#f8faf8] p-2"><button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={button} aria-label="Bold"><TbBold /></button><button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={button} aria-label="Italic"><TbItalic /></button><button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={button} aria-label="Heading"><TbH2 /></button><button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={button} aria-label="Bullet list"><TbList /></button></div><EditorContent editor={editor} /></div>;
}
