"use client";

import { ReactNode } from "react";

import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthProvider } from "@/providers/AuthProvider";

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
          {children}
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  );
}