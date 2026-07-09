"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextType = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function show(type: ToastType, title: string, description?: string) {
    const id = Date.now();

    setToasts((current) => [
      ...current,
      { id, type, title, description },
    ]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }

  const styles = {
    success: {
      icon: <CheckCircle size={22} />,
      className:
        "border-emerald-500/40 bg-emerald-950 text-emerald-200",
    },
    error: {
      icon: <XCircle size={22} />,
      className: "border-red-500/40 bg-red-950 text-red-200",
    },
    info: {
      icon: <Info size={22} />,
      className: "border-blue-500/40 bg-blue-950 text-blue-200",
    },
    warning: {
      icon: <AlertTriangle size={22} />,
      className:
        "border-orange-500/40 bg-orange-950 text-orange-200",
    },
  };

  return (
    <ToastContext.Provider
      value={{
        success: (title, description) => show("success", title, description),
        error: (title, description) => show("error", title, description),
        info: (title, description) => show("info", title, description),
        warning: (title, description) => show("warning", title, description),
      }}
    >
      {children}

      <div className="fixed right-6 top-24 z-[9999] space-y-3">
        {toasts.map((toast) => {
          const current = styles[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex w-96 gap-3 rounded-2xl border p-4 shadow-2xl ${current.className}`}
            >
              <div>{current.icon}</div>

              <div>
                <p className="font-bold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-sm opacity-80">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast doit être utilisé dans ToastProvider");
  }

  return context;
}