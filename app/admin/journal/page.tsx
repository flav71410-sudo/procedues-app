"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type LigneJournal = {
  id: string;
  utilisateur_nom: string | null;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

function classeAction(action: string) {
  const valeur = action.trim().toLowerCase();

  if (valeur.includes("création") || valeur.includes("creation")) {
    return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300";
  }

  if (valeur.includes("modification")) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300";
  }

  if (valeur.includes("suppression")) {
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  if (valeur.includes("connexion")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(dateIso));
}

export default function JournalAdminPage() {
  const [lignes, setLignes] = useState<LigneJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [moduleFiltre, setModuleFiltre] = useState("tous");

  const chargerJournal = useCallback(async () => {
    setLoading(true);
    setErreur("");

    const { data, error } = await supabase
      .from("journal_activite")
      .select("id, utilisateur_nom, action, module, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erreur chargement journal :", error.message);
      setErreur("Impossible de charger le journal d’activité.");
      setLignes([]);
      setLoading(false);
      return;
    }

    setLignes((data || []) as LigneJournal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void chargerJournal();
  }, [chargerJournal]);

  const modules = useMemo(() => {
    return Array.from(
      new Set(lignes.map((ligne) => ligne.module?.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [lignes]);

  const lignesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return lignes.filter((ligne) => {
      const correspondModule =
        moduleFiltre === "tous" || ligne.module === moduleFiltre;

      const correspondRecherche =
        terme === "" ||
        ligne.utilisateur_nom?.toLowerCase().includes(terme) ||
        ligne.action.toLowerCase().includes(terme) ||
        ligne.module.toLowerCase().includes(terme) ||
        ligne.details?.toLowerCase().includes(terme);

      return correspondModule && correspondRecherche;
    });
  }, [lignes, moduleFiltre, recherche]);

  return (
    <AppShell>
      <main className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Activity size={25} />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Administration
                </p>

                <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                  Journal système
                </h1>

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  Suivi des dernières actions réalisées dans l’application.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void chargerJournal()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Clock3 size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Entrées chargées</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{lignes.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Résultats affichés</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{lignesFiltrees.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <Filter size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Modules suivis</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{modules.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un utilisateur, une action, un module..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <select
              value={moduleFiltre}
              onChange={(event) => setModuleFiltre(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="tous">Tous les modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>
        </section>

        {erreur && (
          <section className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle size={19} />
            {erreur}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Détails</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {loading && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-900" />
                    </td>
                  </tr>
                ))}

                {!loading && lignesFiltrees.map((ligne) => (
                  <tr key={ligne.id} className="transition hover:bg-gray-50 dark:hover:bg-slate-900/60">
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-slate-400">{formatDate(ligne.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                        <UserRound size={16} className="text-gray-400" />
                        {ligne.utilisateur_nom || "Inconnu"}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-700 dark:text-slate-300">{ligne.module}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeAction(ligne.action)}`}>{ligne.action}</span>
                    </td>
                    <td className="max-w-xl px-5 py-4 text-gray-600 dark:text-slate-400">{ligne.details || "—"}</td>
                  </tr>
                ))}

                {!loading && lignesFiltrees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Activity size={30} className="mx-auto mb-3 text-gray-300 dark:text-slate-700" />
                      <p className="font-semibold text-gray-900 dark:text-white">Aucune activité trouvée</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Modifie les filtres ou attends une nouvelle action.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}