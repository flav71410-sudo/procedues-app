"use client";

import { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function AppEmptyState({
  icon = "📭",
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 text-5xl">{icon}</div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}