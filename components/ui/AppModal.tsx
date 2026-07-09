"use client";

import { ReactNode } from "react";
import AppButton from "./AppButton";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export default function AppModal({
  open,
  title,
  subtitle,
  children,
  onClose,
  footer,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          {footer || (
            <AppButton variant="secondary" onClick={onClose}>
              Fermer
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
}