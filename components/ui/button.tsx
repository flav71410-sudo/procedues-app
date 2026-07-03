"use client";

import { ButtonHTMLAttributes } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      "bg-[#0078B8] hover:bg-[#00649a] text-white",

    secondary:
      "bg-gray-200 hover:bg-gray-300 text-gray-900",

    success:
      "bg-green-600 hover:bg-green-700 text-white",

    danger:
      "bg-red-600 hover:bg-red-700 text-white",

    outline:
      "border border-gray-300 bg-white hover:bg-gray-100 text-gray-900",
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`
        px-5
        py-3
        rounded-xl
        font-semibold
        transition
        duration-200
        disabled:opacity-50
        disabled:cursor-not-allowed
        shadow-sm
        ${styles[variant]}
        ${className}
      `}
    >
      {loading ? "Chargement..." : children}
    </button>
  );
}