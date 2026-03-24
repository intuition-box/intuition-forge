import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { createElement } from "react";
import cs from "@/styles/components.module.css";

interface ToastItem {
  id: number;
  msg: string;
  type: "success" | "error" | "warn" | "info";
}

interface ToastContextValue {
  toast: (msg: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: ToastItem["type"] = "info") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const typeClass: Record<ToastItem["type"], string | undefined> = {
    success: cs.toastSuccess,
    error: cs.toastError,
    warn: cs.toastWarn,
    info: cs.toastInfo,
  };

  return createElement(
    ToastContext.Provider,
    { value: { toast } },
    children,
    createElement(
      "div",
      { className: cs.toastContainer },
      toasts.map((t) =>
        createElement("div", { key: t.id, className: `${cs.toast} ${typeClass[t.type]}` }, t.msg)
      )
    )
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
