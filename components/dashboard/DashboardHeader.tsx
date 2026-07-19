"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nom: string | null;
  prenom: string | null;
  role: string | null;
  secteur: string | null;
  actif: boolean | null;
};

function formaterRole(role: string | null) {
  const valeur = role?.trim().toUpperCase();

  switch (valeur) {
    case "ADMIN":
      return "Administrateur";
    case "DM":
      return "Direction magasin";
    case "PERMANENT":
      return "Permanent";
    default:
      return role?.trim() || "Utilisateur";
  }
}

function initialesProfil(profile: Profile | null) {
  const prenom = profile?.prenom?.trim() || "";
  const nom = profile?.nom?.trim() || "";

  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`
    .toUpperCase()
    .trim();

  return initiales || "CM";
}

export default function DashboardHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const dateFormatee = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  useEffect(() => {
    let actif = true;

    async function chargerProfil() {
      setLoading(true);
      setErreur("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!actif) {
        return;
      }

      if (userError || !user) {
        setErreur("Utilisateur non connecté.");
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profils")
        .select("id, nom, prenom, role, secteur, actif")
        .eq("id", user.id)
        .maybeSingle();

      if (!actif) {
        return;
      }

      if (error) {
        console.error(
          "Erreur lors du chargement du profil utilisateur :",
          error.message
        );
        setErreur("Impossible de charger le profil utilisateur.");
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setErreur("Aucun profil associé à ce compte.");
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }

    void chargerProfil();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void chargerProfil();
    });

    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, []);

  const prenom =
    profile?.prenom?.trim() ||
    profile?.nom?.trim() ||
    "Utilisateur";

  const nomComplet = [
    profile?.prenom?.trim(),
    profile?.nom?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const role = formaterRole(profile?.role ?? null);
  const secteur = profile?.secteur?.trim() || null;
  const compteActif = profile?.actif !== false;

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
                  {initialesProfil(profile)}
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

              {!loading && !erreur && profile && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <UserRound size={15} />
                      {nomComplet || prenom}
                    </span>

                    <span className="text-gray-300 dark:text-slate-700">
                      •
                    </span>

                    <span className="font-semibold">
                      {role}
                    </span>

                    {secteur && (
                      <>
                        <span className="text-gray-300 dark:text-slate-700">
                          •
                        </span>

                        <span className="font-semibold">
                          Secteur {secteur}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                    <Building2 size={15} />
                    Castorama Claye-Souilly
                  </p>
                </div>
              )}

              {!loading && erreur && (
                <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  {erreur}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                <CalendarDays size={14} />
                Aujourd’hui
              </p>

              <p className="mt-1 font-bold capitalize text-gray-900 dark:text-white">
                {dateFormatee}
              </p>
            </div>

            {!loading && profile && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  compteActif
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-950/20 dark:text-green-300"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300"
                }`}
              >
                {compteActif ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}

                {compteActif
                  ? "Compte actif"
                  : "Compte désactivé"}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}