"use client";

import { ReactNode } from "react";

type Variant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "gray";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
}

export default function Badge({
  children,
  variant = "gray",
}: BadgeProps) {
  const styles = {
    primary: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-700",
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
        ${styles[variant]}
      `}
    >
      {children}
    </span>
  );
}