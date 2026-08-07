"use client";

import { useMemo } from "react";
import {
  Building2,
  CalendarDays,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { roleLabel } from "@/lib/permissions";
import { useAuth } from "@/providers/AuthProvider";

function initiales(
  prenom?: string | null,
  nom?: string | null
) {
  const valeur = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`
    .trim()
    .toUpperCase();

  return valeur || "CM";
}

export default function DashboardHeader() {
  const {
    user,
    profil,
    role,
    magasin,
    loading,
  } = useAuth();

  const dateFormatee = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const prenom =
    profil?.prenom?.trim() ||
    profil?.nom?.trim() ||
    "Utilisateur";

  const nomComplet =
    [profil?.prenom, profil?.nom]
      .filter(Boolean)
      .join(" ") ||
    profil?.email ||
    user?.email ||
    "Utilisateur";

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="relative p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              {loading ? (
                <ShieldCheck
                  size={30}
                  className="animate-pulse"
                />
              ) : (
                <span className="text-lg font-black">
                  {initiales(
                    profil?.prenom,
                    profil?.nom
                  )}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Tableau de bord
              </p>

              <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                {loading
                  ? "Bonjour..."
                  : `Bonjour ${prenom} 👋`}
              </h1>

              {!loading && user && profil && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <UserRound size={15} />
                      {nomComplet}
                    </span>

                    <span className="text-gray-300 dark:text-slate-700">
                      •
                    </span>

                    <span className="font-semibold">
                      {roleLabel(role)}
                    </span>
                  </div>

                  <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                    <Building2 size={15} />
                    {magasin?.nom ??
                      (role === "SUPER_ADMIN"
                        ? "Tous les magasins"
                        : "Magasin non attribué")}
                  </p>
                </div>
              )}

              {!loading && !user && (
                <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  Utilisateur non connecté.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              <CalendarDays size={14} />
              Aujourd’hui
            </p>

            <p className="mt-1 font-bold capitalize text-gray-900 dark:text-white">
              {dateFormatee}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
