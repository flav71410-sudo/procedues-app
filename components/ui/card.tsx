"use client";

import { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function Card({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: CardProps) {
  return (
    <div
    className={`
  bg-white dark:bg-slate-900
  rounded-2xl
  shadow-sm
  border
  border-gray-200 dark:border-slate-800
  overflow-hidden
  text-gray-900 dark:text-white
  ${className}
`}
    >
      {(title || subtitle) && (
        <div className="px-6 py-5 border-b border-gray-100">
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

      <div className="p-6">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}