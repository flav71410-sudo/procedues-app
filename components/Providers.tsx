"use client";

import type { ReactNode } from "react";

import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthProvider } from "@/providers/AuthProvider";

export default function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>{children}</AuthProvider>
      </DialogProvider>
    </ToastProvider>
  );
}
