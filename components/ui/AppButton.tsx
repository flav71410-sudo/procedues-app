"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  loading?: boolean;
};

export default function AppButton({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: Props) {
  const variants = {
    primary:
      "bg-[#0078B8] hover:bg-[#00649a] text-white border-[#0078B8]",
    secondary:
      "bg-white dark:bg-slate-900 text-gray-800 dark:text-white border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
    danger:
      "bg-red-600 hover:bg-red-700 text-white border-red-600",
    ghost:
      "bg-transparent text-gray-700 dark:text-slate-200 border-transparent hover:bg-gray-100 dark:hover:bg-slate-800",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        px-5
        py-3
        text-sm
        font-semibold
        shadow-sm
        transition
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {loading ? "Chargement..." : children}
    </button>
  );
}