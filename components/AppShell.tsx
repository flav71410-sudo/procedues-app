"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  children: React.ReactNode;
};

const MODULE_PAR_ROUTE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/analytics": "analytics",
  "/consignes": "consignes",
  "/documents": "documents",
  "/maintenance": "maintenance",
  "/investissements": "investissements",
  "/planning": "planning",
  "/equipements": "equipements",
  "/plans": "plans",
  "/securite": "securite",
};

function moduleDeLaRoute(
  pathname: string
): string | null {
  const entree = Object.entries(
    MODULE_PAR_ROUTE
  ).find(
    ([route]) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  return entree?.[1] ?? null;
}

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    role,
    magasin,
    loading,
  } = useAuth();

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

  const moduleCourant =
    moduleDeLaRoute(pathname);

  const modulesAutorises =
    magasin?.modulesAutorises ?? null;

  const accesModuleAutorise =
    role === "SUPER_ADMIN" ||
    !moduleCourant ||
    !modulesAutorises ||
    modulesAutorises.includes(
      moduleCourant
    );

  useEffect(() => {
    if (
      loading ||
      accesModuleAutorise
    ) {
      return;
    }

    router.replace("/dashboard");
  }, [
    accesModuleAutorise,
    loading,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
      </div>
    );
  }

  if (!accesModuleAutorise) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 dark:bg-slate-950">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Module non autorisé
          </h1>

          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Ce module n’est pas activé pour le magasin actuellement consulté.
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace("/dashboard")
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

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