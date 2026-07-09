"use client";

import { DialogProvider } from "@/providers/DialogProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <DialogProvider>{children}</DialogProvider>;
}