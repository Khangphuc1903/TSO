const TONES = {
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  success: "bg-verified-50 text-verified-700 border-verified-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-red-50 text-red-700 border-red-100",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  solid: "bg-brand-600 text-white border-transparent",
};

export function Badge({ children, tone = "neutral", dot = false, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${
        TONES[tone] || TONES.neutral
      } ${className}`}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export default Badge;
