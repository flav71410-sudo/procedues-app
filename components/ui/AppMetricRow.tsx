"use client";

import { ReactNode } from "react";

type Variant = "danger" | "warning" | "info" | "success";

type Props = {
  variant: Variant;
  icon: ReactNode;
  value: number | string;
  label: string;
};

export default function AppMetricRow({
  variant,
  icon,
  value,
  label,
}: Props) {
  const styles = {
    danger: {
      box: "border-red-500/70 bg-red-950/30 text-red-300",
      icon: "bg-red-500/15 text-red-300",
      value: "text-red-400",
    },
    warning: {
      box: "border-orange-500/70 bg-orange-950/30 text-orange-300",
      icon: "bg-orange-500/15 text-orange-300",
      value: "text-orange-400",
    },
    info: {
      box: "border-blue-500/70 bg-blue-950/30 text-blue-300",
      icon: "bg-blue-500/15 text-blue-300",
      value: "text-blue-400",
    },
    success: {
      box: "border-emerald-500/70 bg-emerald-950/30 text-emerald-300",
      icon: "bg-emerald-500/15 text-emerald-300",
      value: "text-emerald-400",
    },
  };

  return (
    <div
      className={`
        flex items-center gap-6 rounded-2xl border p-6
        ${styles[variant].box}
      `}
    >
      <div
        className={`
          flex h-16 w-16 items-center justify-center rounded-2xl text-3xl
          ${styles[variant].icon}
        `}
      >
        {icon}
      </div>

      <div className="flex items-center gap-5">
        <span className={`text-4xl font-bold ${styles[variant].value}`}>
          {value}
        </span>

        <span className="text-xl font-semibold text-white">
          {label}
        </span>
      </div>
    </div>
  );
}