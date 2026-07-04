"use client";

import { ReactNode } from "react";

type Variant = "danger" | "warning" | "info" | "success";

type Props = {
  variant?: Variant;
  children: ReactNode;
};

export default function AlertBox({
  variant = "info",
  children,
}: Props) {
  const styles = {
    danger:
      "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300",
    warning:
      "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300",
    info:
      "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300",
    success:
      "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300",
  };

  return (
    <div
      className={`
        rounded-xl
        border
        p-4
        text-sm
        font-medium
        ${styles[variant]}
      `}
    >
      {children}
    </div>
  );
}