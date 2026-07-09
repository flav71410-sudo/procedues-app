"use client";

import { ReactNode } from "react";
import {
  TriangleAlert,
  ShieldAlert,
  FileText,
  Users,
} from "lucide-react";

type Variant = "danger" | "warning" | "info" | "success";

type Props = {
  variant?: Variant;
  children: ReactNode;
};

export default function AlertBox({
  variant = "info",
  children,
}: Props) {
  const variants = {
    danger: {
      icon: <ShieldAlert size={20} />,
      className:
        "border-red-500/40 bg-red-950/20 hover:bg-red-950/35 text-red-300",
    },

    warning: {
      icon: <TriangleAlert size={20} />,
      className:
        "border-orange-500/40 bg-orange-950/20 hover:bg-orange-950/35 text-orange-300",
    },

    info: {
      icon: <FileText size={20} />,
      className:
        "border-blue-500/40 bg-blue-950/20 hover:bg-blue-950/35 text-blue-300",
    },

    success: {
      icon: <Users size={20} />,
      className:
        "border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/35 text-emerald-300",
    },
  };

  const current = variants[variant];

  return (
    <div
      className={`
        group
        flex
        items-center
        gap-4
        rounded-2xl
        border
        px-5
        py-4
        transition-all
        duration-200
        cursor-default
        ${current.className}
      `}
    >
      <div
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-black/20
          group-hover:scale-110
          transition-transform
        "
      >
        {current.icon}
      </div>

      <div className="flex-1 font-semibold text-white">
        {children}
      </div>
    </div>
  );
}