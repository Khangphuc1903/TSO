import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

/** Invariant hook: `const { info, success, error } = useToast()`. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được dùng bên trong <ToastProvider>");
  return ctx;
}

export default useToast;
