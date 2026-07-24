"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/Header";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ferme automatiquement le menu après un changement de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Bloque le défilement de la page quand le menu mobile est ouvert
  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 dark:bg-slate-950 dark:text-white">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1800px] p-3 sm:p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}