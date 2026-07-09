"use client";

import { ReactNode } from "react";

type Variant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";

type Props = {
  children: ReactNode;
  variant?: Variant;
};

export default function AppBadge({
  children,
  variant = "gray",
}: Props) {
  const variants = {
    primary:
      "bg-[#0078B8]/10 text-[#0078B8] dark:bg-[#0078B8]/20 dark:text-blue-300",
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warning:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    danger:
      "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    info:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    gray:
      "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-3
        py-1
        text-xs
        font-semibold
        ${variants[variant]}
      `}
    >
      {children}
    </span>
  );
}