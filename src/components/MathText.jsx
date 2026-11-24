import { renderToString } from "katex";
import "katex/dist/katex.min.css";

export function normalizeLatex(value) {
  return String(value || "").replace(/\\\\/g, "\\");
}

export function renderLatexInline(latex, displayMode = false) {
  try {
    return {
      __html: renderToString(normalizeLatex(latex), {
        displayMode,
        throwOnError: false,
        strict: "ignore",
        trust: false,
        output: "htmlAndMathml",
      }),
    };
  } catch {
    return { __html: "" };
  }
}

export default function MathText({ text, className = "" }) {
  const source = normalizeLatex(text);
  if (!source) return null;

  const parts = [];
  const pattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+?\$)/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: source.slice(cursor, match.index) });
    }

    const token = match[0];
    if (token.startsWith("$$") && token.endsWith("$$")) {
      parts.push({ type: "math", value: token.slice(2, -2), display: true });
    } else if (token.startsWith("\\[")) {
      parts.push({ type: "math", value: token.slice(2, -2), display: true });
    } else if (token.startsWith("\\(")) {
      parts.push({ type: "math", value: token.slice(2, -2), display: false });
    } else {
      parts.push({ type: "math", value: token.slice(1, -1), display: false });
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < source.length) parts.push({ type: "text", value: source.slice(cursor) });

  return (
    <div className={`math-text break-words ${className}`}>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={index} className="whitespace-pre-wrap">
            {part.value}
          </span>
        ) : (
          <span
            key={index}
            className={part.display ? "block my-2 overflow-x-auto" : "inline-block mx-0.5"}
            dangerouslySetInnerHTML={renderLatexInline(part.value, part.display)}
          />
        )
      )}
    </div>
  );
}
