import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ToastContext } from "./ToastContext";

const STYLES = {
  success: { icon: CheckCircle2, bar: "bg-verified-600", iconColor: "text-verified-600" },
  error: { icon: AlertCircle, bar: "bg-red-500", iconColor: "text-red-500" },
  info: { icon: Info, bar: "bg-brand-500", iconColor: "text-brand-500" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 4200) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      if (duration !== 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      info: (message, opts) => push(message, "info", opts?.duration),
      success: (message, opts) => push(message, "success", opts?.duration ?? 3200),
      error: (message, opts) => push(message, "error", opts?.duration ?? 5200),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-0 top-0 z-[100] flex w-full flex-col items-end gap-2 p-4 sm:w-auto"
      >
        {toasts.map((t) => {
          const S = STYLES[t.type] || STYLES.info;
          const Icon = S.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-slide-in-right"
            >
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${S.bar}`} />
              <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
                <Icon size={19} className={`mt-0.5 shrink-0 ${S.iconColor}`} />
                <p className="flex-1 text-sm font-medium leading-snug text-slate-800">{t.message}</p>
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => dismiss(t.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-ring"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
