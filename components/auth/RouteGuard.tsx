"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/providers/ToastProvider";
import { DialogProvider } from "@/providers/DialogProvider";
import { AuthProvider } from "@/providers/AuthProvider";

import RouteGuard from "@/components/auth/RouteGuard";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({
  children,
}: ProvidersProps) {
  return (
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <RouteGuard>{children}</RouteGuard>
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  );
}