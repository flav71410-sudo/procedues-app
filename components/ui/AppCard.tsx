"use client";

import { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function AppCard({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: Props) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-gray-200
        dark:border-slate-800
        bg-white
        dark:bg-slate-900
        shadow-sm
        text-gray-900
        dark:text-white
        overflow-hidden
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-5">
          {title && (
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="p-6">{children}</div>

      {footer && (
        <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}