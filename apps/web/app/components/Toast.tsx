"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-5 py-3 rounded-2xl font-bold text-sm shadow-lg backdrop-blur-xl animate-slide-in ${
              t.type === "success"
                ? "bg-primary-fixed text-primary"
                : t.type === "error"
                  ? "bg-error-container text-error"
                  : "bg-surface-highest text-on-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === "success" && <span>✓</span>}
              {t.type === "error" && <span>✕</span>}
              {t.type === "info" && <span>ℹ</span>}
              {t.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
