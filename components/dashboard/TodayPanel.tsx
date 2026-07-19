"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

type PlanningEvent = {
  id: string;
  titre: string;
  categorie: string;
  date_evenement: string;
  heure_debut: string | null;
  priorite: "basse" | "normale" | "haute" | "critique";
  statut: "planifie" | "en_cours" | "termine" | "annule";
};

function dateLocaleIso(date = new Date()) {
  const decalage = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - decalage)
    .toISOString()
    .slice(0, 10);
}

function formatHeure(heure: string | null) {
  return heure ? heure.slice(0, 5) : "—";
}

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function libelleEcheance(dateIso: string) {
  const aujourdHui = dateLocaleIso();

  if (dateIso < aujourdHui) return "En retard";
  if (dateIso === aujourdHui) return "Aujourd’hui";

  const demain = new Date();
  demain.setDate(demain.getDate() + 1);

  if (dateIso === dateLocaleIso(demain)) return "Demain";

  return formatDate(dateIso);
}

function classeEcheance(dateIso: string) {
  const aujourdHui = dateLocaleIso();

  if (dateIso < aujourdHui) {
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  if (dateIso === aujourdHui) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300";
  }

  return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
}

export default function TodayPanel() {
  const [evenements, setEvenements] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const chargerProchainesEcheances = useCallback(async () => {
    setLoading(true);
    setErreur("");

    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 365);

    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + 30);

    const { data, error } = await supabase
      .from("planning_evenements")
      .select(
        "id, titre, categorie, date_evenement, heure_debut, priorite, statut"
      )
      .eq("actif", true)
      .neq("statut", "annule")
      .gte("date_evenement", dateLocaleIso(dateDebut))
      .lte("date_evenement", dateLocaleIso(dateFin))
      .order("date_evenement", { ascending: true })
      .order("heure_debut", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(10);

    if (error) {
      console.error(
        "Erreur lors du chargement des prochaines échéances :",
        error
      );
      setErreur("Impossible de charger les prochaines échéances.");
      setEvenements([]);
      setLoading(false);
      return;
    }

    const liste = ((data || []) as PlanningEvent[])
      .filter(
        (evenement) =>
          evenement.statut !== "termine" ||
          evenement.date_evenement === dateLocaleIso()
      )
      .sort((a, b) => {
        const dateA = `${a.date_evenement}T${a.heure_debut || "23:59"}`;
        const dateB = `${b.date_evenement}T${b.heure_debut || "23:59"}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 8);

    setEvenements(liste);
    setLoading(false);
  }, []);

  useEffect(() => {
    void chargerProchainesEcheances();

    const channel = supabase
      .channel("dashboard-planning-evenements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_evenements",
        },
        () => {
          void chargerProchainesEcheances();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chargerProchainesEcheances]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <CalendarDays size={21} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Prochaines échéances
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Retards, contrôles du jour et 30 prochains jours
            </p>
          </div>
        </div>

        <Link
          href="/planning"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Planning
        </Link>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
          Chargement des échéances...
        </div>
      )}

      {!loading && erreur && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle size={18} />
          {erreur}
        </div>
      )}

      {!loading && !erreur && evenements.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
          <CheckCircle2
            className="mx-auto mb-2 text-green-600"
            size={28}
          />

          <p className="font-semibold text-gray-900 dark:text-white">
            Aucune échéance à venir
          </p>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Les événements actifs du planning apparaîtront ici.
          </p>
        </div>
      )}

      {!loading && !erreur && evenements.length > 0 && (
        <div className="space-y-3">
          {evenements.map((evenement) => (
            <Link
              key={evenement.id}
              href="/planning"
              className="flex gap-4 rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/20"
            >
              <div className="flex min-w-20 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 px-2 py-2 dark:bg-slate-900">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${classeEcheance(
                    evenement.date_evenement
                  )}`}
                >
                  {libelleEcheance(evenement.date_evenement)}
                </span>

                <div className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-slate-300">
                  <Clock3 size={12} />
                  {formatHeure(evenement.heure_debut)}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {evenement.titre}
                  </p>

                  {evenement.priorite === "critique" && (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      Critique
                    </span>
                  )}

                  {evenement.priorite === "haute" && (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                      Haute
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <Wrench size={14} />
                  {evenement.categorie}
                </div>

                {evenement.statut === "en_cours" && (
                  <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    En cours
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}