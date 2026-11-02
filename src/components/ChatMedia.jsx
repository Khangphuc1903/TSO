import { useState } from "react";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";

const PLACEHOLDER = new Set(["[Hình ảnh]", "[Tệp đính kèm]"]);

export function ChatMessageBody({ m, mine }) {
  const url = fileHref(m.attachmentUrl, API_ORIGIN);
  const isImage =
    m.attachmentType === "image" ||
    /\.(jpe?g|png|webp|gif)$/i.test(m.attachmentUrl || "");
  const hideText = !m.content || PLACEHOLDER.has(m.content);
  const name = (m.attachmentUrl || "").split("/").pop();

  return (
    <>
      {!hideText && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
      {url && isImage && (
        <a href={url} target="_blank" rel="noreferrer" className="block mt-1">
          <img src={url} alt="" className="max-h-52 rounded-lg object-cover" />
        </a>
      )}
      {url && !isImage && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={`mt-1 inline-flex items-center gap-1.5 text-xs underline ${
            mine ? "text-white/90" : "text-brand-700"
          }`}
        >
          <FileText size={14} />
          {name || "Tải tệp"}
        </a>
      )}
    </>
  );
}

export function ChatComposer({ onSend, placeholder = "Nhắn tin...", disabled = false }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (disabled || sending) return;
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      await onSend({ content: text.trim(), file });
      setText("");
      setFile(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-3 border-t border-slate-100 space-y-2">
      {file && (
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
          <Paperclip size={14} />
          <span className="truncate flex-1">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <label className="h-10 w-10 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer shrink-0">
          <Paperclip size={16} />
          <input
            type="file"
            className="hidden"
            disabled={disabled || sending}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={disabled || sending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 text-sm transition-colors"
        >
          Gửi
          <Send size={15} />
        </button>
      </div>
    </form>
  );
}
