"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";

import AlertsPanel from "@/components/dashboard/AlertsPanel";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EquipmentCharts from "@/components/dashboard/EquipmentCharts";
import HealthScoreCard from "@/components/dashboard/HealthScoreCard";
import QuickActions from "@/components/dashboard/QuickActions";
import SupervisionCenter from "@/components/dashboard/SupervisionCenter";
import { AppButton } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import {
  type DashboardData,
  type DashboardPilotageItem,
  getDashboardData,
} from "@/services/dashboard/dashboardService";

function formatMontant(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function PilotageCard({
  title,
  value,
  detail,
  href,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  detail: string;
  href: string;
  icon: React.ReactNode;
  accent: "blue" | "amber" | "red" | "emerald";
}) {
  const classes = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  }[accent];

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${classes}`}>
          {icon}
        </div>
        <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </Link>
  );
}

function niveauClasses(niveau: DashboardPilotageItem["niveau"]) {
  if (niveau === "urgent") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200";
  }
  if (niveau === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";
}

function ListePilotage({
  title,
  subtitle,
  items,
  empty,
  href,
}: {
  title: string;
  subtitle: string;
  items: DashboardPilotageItem[];
  empty: string;
  href: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Link href={href} className="text-sm font-bold text-blue-600 hover:text-blue-700">
          Voir tout
        </Link>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            {empty}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-xl border p-4 transition hover:shadow-sm ${niveauClasses(item.niveau)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.titre}</p>
                    <p className="mt-1 truncate text-xs opacity-75">{item.sousTitre}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold dark:bg-black/20">
                    {item.badge}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardClient() {
  const {
    magasinActif,
    magasinsDisponibles,
    vueTousMagasins,
    peutChangerMagasin,
    changerMagasinActif,
    loading: chargementAuth,
  } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chargerDashboard = useCallback(
    async (manualRefresh = false) => {
      if (chargementAuth) return;

      if (!vueTousMagasins && !magasinActif) {
        setDashboardData(null);
        setLoading(false);
        setError("Aucun magasin actif. Sélectionne un magasin.");
        return;
      }

      manualRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      try {
        const data = await getDashboardData({
          magasinId: magasinActif?.id ?? null,
          tousMagasins: vueTousMagasins,
        });
        setDashboardData(data);
      } catch (dashboardError) {
        console.error("Erreur lors du chargement du dashboard :", dashboardError);
        setDashboardData(null);
        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : "Impossible de charger les données du dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [chargementAuth, magasinActif?.id, vueTousMagasins]
  );

  useEffect(() => {
    void chargerDashboard();
  }, [chargerDashboard]);

  const libelleVue = vueTousMagasins
    ? "Tous les magasins"
    : magasinActif?.nom ?? "Aucun magasin";

  const pilotage = dashboardData?.pilotage;
  const busy = loading || chargementAuth;

  return (
    <main className="space-y-6">
      <DashboardHeader />

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Centre de pilotage
            </p>
            <p className="truncate font-bold text-slate-900 dark:text-white">{libelleVue}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {peutChangerMagasin && (
            <select
              value={vueTousMagasins ? "__TOUS__" : magasinActif?.id ?? ""}
              onChange={(event) =>
                changerMagasinActif(event.target.value === "__TOUS__" ? null : event.target.value)
              }
              className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="__TOUS__">Tous les magasins</option>
              {magasinsDisponibles.map((magasin) => (
                <option key={magasin.id} value={magasin.id}>
                  {magasin.nom}
                </option>
              ))}
            </select>
          )}

          <AppButton
            variant="secondary"
            loading={refreshing}
            disabled={busy || refreshing}
            onClick={() => void chargerDashboard(true)}
          >
            <RefreshCw size={17} />
            Actualiser
          </AppButton>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-bold">Impossible de charger certaines données</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {busy ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Chargement du centre de pilotage...
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PilotageCard
              title="Maintenances ouvertes"
              value={pilotage?.maintenance.ouvertes ?? 0}
              detail={`${pilotage?.maintenance.retard ?? 0} en retard · ${pilotage?.maintenance.critiques ?? 0} critiques`}
              href="/maintenance"
              icon={<Wrench className="h-5 w-5" />}
              accent={(pilotage?.maintenance.retard ?? 0) > 0 ? "red" : "blue"}
            />

            <PilotageCard
              title="Investissements en attente"
              value={pilotage?.investissements.enAttente ?? 0}
              detail={`${formatMontant(pilotage?.investissements.montantEnAttenteHt ?? 0)} HT à arbitrer`}
              href="/investissements"
              icon={<TrendingUp className="h-5 w-5" />}
              accent={(pilotage?.investissements.enAttente ?? 0) > 0 ? "amber" : "emerald"}
            />

            <PilotageCard
              title="Planning cette semaine"
              value={pilotage?.planning.semaine ?? 0}
              detail={`${pilotage?.planning.aujourdHui ?? 0} aujourd'hui · ${pilotage?.planning.retard ?? 0} en retard`}
              href="/planning"
              icon={<CalendarDays className="h-5 w-5" />}
              accent={(pilotage?.planning.retard ?? 0) > 0 ? "red" : "blue"}
            />

            <PilotageCard
              title="Consignes actives"
              value={pilotage?.consignes.actives ?? 0}
              detail={`${pilotage?.consignes.urgentes ?? 0} urgentes · ${pilotage?.consignes.avecFichier ?? 0} avec fichier`}
              href="/consignes"
              icon={<ClipboardList className="h-5 w-5" />}
              accent={(pilotage?.consignes.urgentes ?? 0) > 0 ? "amber" : "emerald"}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 dark:text-white">À traiter en priorité</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Les éléments qui demandent ton attention en premier.
                </p>
              </div>
            </div>

            <div className="p-4">
              {(pilotage?.priorites.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Aucun élément prioritaire détecté pour le moment.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {pilotage?.priorites.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`rounded-xl border p-4 transition hover:shadow-sm ${niveauClasses(item.niveau)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{item.titre}</p>
                          <p className="mt-1 truncate text-xs opacity-75">{item.sousTitre}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold dark:bg-black/20">
                          {item.badge}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ListePilotage
              title="Planning à venir"
              subtitle="Les prochains événements et contrôles."
              items={pilotage?.prochainsEvenements ?? []}
              empty="Aucun événement prévu dans les 30 prochains jours."
              href="/planning"
            />
            <ListePilotage
              title="Maintenances prioritaires"
              subtitle="Interventions ouvertes à suivre."
              items={pilotage?.maintenancesPrioritaires ?? []}
              empty="Aucune maintenance ouverte."
              href="/maintenance"
            />
            <ListePilotage
              title="Investissements à suivre"
              subtitle="Devis en attente de validation ou de signature."
              items={pilotage?.investissementsPrioritaires ?? []}
              empty="Aucun investissement en attente."
              href="/investissements"
            />
            <ListePilotage
              title="Consignes récentes"
              subtitle="Dernières consignes actives publiées."
              items={pilotage?.consignesRecentes ?? []}
              empty="Aucune consigne active."
              href="/consignes"
            />
          </section>

          <HealthScoreCard healthScore={dashboardData?.healthScore ?? null} loading={false} />
          <AlertsPanel alertes={dashboardData?.alertes ?? []} loading={false} />
          <SupervisionCenter supervision={dashboardData?.supervision ?? null} loading={false} />
          <EquipmentCharts
            equipementsParType={dashboardData?.equipementsParType ?? []}
            equipementsParEtat={dashboardData?.equipementsParEtat ?? []}
            loading={false}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-black text-slate-900 dark:text-white">Actions rapides</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Accès direct aux principales fonctions de Casto Manager.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <QuickActions />
            </div>
          </section>
        </>
      )}
    </main>
  );
}