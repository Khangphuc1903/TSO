import { useState } from "react";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
import MathText from "./MathText";

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
      {!hideText && <MathText text={m.content} />}
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

export function ChatComposer({ onSend, placeholder = "Nhắn tin...", disabled = false, mathMode = false }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  const insertSymbol = (symbol) => {
    setText((current) => `${current}${symbol}`);
  };

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
        {mathMode ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${placeholder} Có thể dùng $\\frac{x}{y}$ hoặc $$\\int f(x)dx$$`}
            disabled={disabled || sending}
            rows={2}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        )}
        <button
          type="submit"
          disabled={disabled || sending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 text-sm transition-colors"
        >
          Gửi
          <Send size={15} />
        </button>
      </div>
      {mathMode && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              ["Phân số", "\\frac{}{}"],
              ["Căn", "\\sqrt{}"],
              ["Mũ", "^{2}"],
              ["Chỉ số", "_{1}"],
              ["Σ", "\\sum"],
              ["∫", "\\int"],
              ["lim", "\\lim"],
              ["π", "\\pi"],
              ["∞", "\\infty"],
            ].map(([label, latex]) => (
              <button
                key={label}
                type="button"
                onClick={() => insertSymbol(` $${latex}$ `)}
                disabled={disabled || sending}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              disabled={disabled || sending}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-brand-700"
            >
              {preview ? "Đóng xem trước" : "Xem trước"}
            </button>
            <button
              type="button"
              onClick={() => setText((current) =>
                `${current}${current ? "\n\n" : ""}1. Phân tích đề bài:\n2. Dữ kiện đã cho:\n3. Yêu cầu cần tìm:\n4. Công thức/định lý áp dụng: $$...$$\n5. Các bước giải:\n6. Giải thích từng bước:\n7. Kết quả cuối cùng:\n8. Kiểm tra lại kết quả:`
              )}
              disabled={disabled || sending}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-brand-700"
            >
              Mẫu lời giải
            </button>
          </div>
          {preview && (
            <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {text.trim() ? <MathText text={text} /> : <p className="text-xs text-slate-400">Chưa có nội dung</p>}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
