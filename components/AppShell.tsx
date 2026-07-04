"use client";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/Header";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-8 text-gray-900 dark:text-white">
          {children}
        </main>
      </div>
    </div>
  );
}