"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Euro,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import {
  type DashboardChartItem,
  type DashboardData,
  getDashboardData,
} from "@/services/dashboard/dashboardService";

function formatMontant(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pourcentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const contenu = (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {icon}
        </div>
        {href && (
          <span className="text-xs font-bold text-blue-600">
            Ouvrir
          </span>
        )}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </article>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {contenu}
    </Link>
  ) : (
    contenu
  );
}

function Barre({
  label,
  value,
  total,
  suffix = "",
}: {
  label: string;
  value: number;
  total: number;
  suffix?: string;
}) {
  const pct = pourcentage(value, total);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {value}{suffix} · {pct} %
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function Distribution({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: DashboardChartItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const top = items.slice(0, 8);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="font-black text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      {top.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Aucune donnée disponible.
        </div>
      ) : (
        <div className="space-y-5">
          {top.map((item) => (
            <Barre
              key={item.label}
              label={item.label}
              value={item.value}
              total={total}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function AnalyticsPage() {
  const {
    magasinActif,
    magasinsDisponibles,
    vueTousMagasins,
    peutChangerMagasin,
    changerMagasinActif,
    loading: authLoading,
  } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charger = useCallback(
    async (silent = false) => {
      if (authLoading) return;

      if (!vueTousMagasins && !magasinActif) {
        setData(null);
        setLoading(false);
        setError("Aucun magasin actif. Sélectionne un magasin.");
        return;
      }

      silent ? setRefreshing(true) : setLoading(true);
      setError(null);

      try {
        const resultat = await getDashboardData({
          magasinId: magasinActif?.id ?? null,
          tousMagasins: vueTousMagasins,
        });

        setData(resultat);
      } catch (currentError) {
        console.error("Erreur Analytics :", currentError);

        setError(
          currentError instanceof Error
            ? currentError.message
            : "Impossible de charger les données Analytics."
        );
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authLoading, magasinActif?.id, vueTousMagasins]
  );

  useEffect(() => {
    void charger();
  }, [charger]);

  const libelleVue = vueTousMagasins
    ? "Tous les magasins"
    : magasinActif?.nom ?? "Aucun magasin";

  const pilotage = data?.pilotage;

  const maintenanceTerminees = useMemo(() => {
    if (!pilotage) return 0;
    return Math.max(
      pilotage.maintenance.total - pilotage.maintenance.ouvertes,
      0
    );
  }, [pilotage]);

  const tauxMaintenance = pilotage
    ? pourcentage(
        maintenanceTerminees,
        pilotage.maintenance.total
      )
    : 0;

  const tauxInvestValides = pilotage
    ? pourcentage(
        pilotage.investissements.valides,
        pilotage.investissements.total
      )
    : 0;

  const tauxInvestSignes = pilotage
    ? pourcentage(
        pilotage.investissements.signes,
        pilotage.investissements.total
      )
    : 0;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1700px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <BarChart3 className="h-7 w-7" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Pilotage & tendances
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                Analytics
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Analyse consolidée des opérations, équipements et investissements.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {peutChangerMagasin && (
              <select
                value={
                  vueTousMagasins
                    ? "__TOUS__"
                    : magasinActif?.id ?? ""
                }
                onChange={(event) =>
                  changerMagasinActif(
                    event.target.value === "__TOUS__"
                      ? null
                      : event.target.value
                  )
                }
                className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="__TOUS__">
                  Tous les magasins
                </option>

                {magasinsDisponibles.map((magasin) => (
                  <option
                    key={magasin.id}
                    value={magasin.id}
                  >
                    {magasin.nom}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => void charger(true)}
              disabled={
                loading ||
                refreshing ||
                authLoading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Actualiser
            </button>
          </div>
        </header>

        <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Périmètre analysé
            </p>
            <p className="font-black text-slate-900 dark:text-white">
              {libelleVue}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          >
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-5 w-5" />
              Impossible de charger Analytics
            </div>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {loading || authLoading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              Chargement des indicateurs...
            </div>
          </div>
        ) : data && pilotage ? (
          <>
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                label="Disponibilité du parc"
                value={`${data.healthScore.score} %`}
                detail={`${data.healthScore.equipementsEnService} en service · ${data.healthScore.equipementsHorsService} HS`}
                icon={<Package className="h-5 w-5" />}
                href="/equipements"
              />

              <KpiCard
                label="Maintenances ouvertes"
                value={pilotage.maintenance.ouvertes}
                detail={`${pilotage.maintenance.retard} retard · ${pilotage.maintenance.critiques} critiques`}
                icon={<Wrench className="h-5 w-5" />}
                href="/maintenance"
              />

              <KpiCard
                label="Investissements"
                value={pilotage.investissements.total}
                detail={`${pilotage.investissements.enAttente} en attente`}
                icon={<TrendingUp className="h-5 w-5" />}
                href="/investissements"
              />

              <KpiCard
                label="Montant à arbitrer"
                value={formatMontant(
                  pilotage.investissements.montantEnAttenteHt
                )}
                detail="Devis en attente HT"
                icon={<Euro className="h-5 w-5" />}
                href="/investissements"
              />

              <KpiCard
                label="Planning semaine"
                value={pilotage.planning.semaine}
                detail={`${pilotage.planning.aujourdHui} aujourd'hui · ${pilotage.planning.retard} retard`}
                icon={<CalendarDays className="h-5 w-5" />}
                href="/planning"
              />

              <KpiCard
                label="Consignes actives"
                value={pilotage.consignes.actives}
                detail={`${pilotage.consignes.urgentes} urgentes · ${pilotage.consignes.avecFichier} avec fichier`}
                icon={<ClipboardList className="h-5 w-5" />}
                href="/consignes"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">
                      Performance maintenance
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Avancement et charge d'intervention.
                    </p>
                  </div>
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Traitement
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {tauxMaintenance} %
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Terminées
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">
                      {maintenanceTerminees}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Critiques
                    </p>
                    <p className="mt-2 text-2xl font-black text-red-600">
                      {pilotage.maintenance.critiques}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <Barre
                    label="Maintenances terminées"
                    value={maintenanceTerminees}
                    total={pilotage.maintenance.total}
                  />
                  <Barre
                    label="Maintenances ouvertes"
                    value={pilotage.maintenance.ouvertes}
                    total={pilotage.maintenance.total}
                  />
                  <Barre
                    label="Maintenances en retard"
                    value={pilotage.maintenance.retard}
                    total={Math.max(pilotage.maintenance.ouvertes, 1)}
                  />
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">
                      Investissements
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      État des devis et décisions budgétaires.
                    </p>
                  </div>
                  <Euro className="h-5 w-5 text-blue-600" />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Validés
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">
                      {pilotage.investissements.valides}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Signés
                    </p>
                    <p className="mt-2 text-2xl font-black text-blue-600">
                      {pilotage.investissements.signes}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      À arbitrer
                    </p>
                    <p className="mt-2 text-xl font-black text-amber-600">
                      {formatMontant(
                        pilotage.investissements.montantEnAttenteHt
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <Barre
                    label="Taux de validation"
                    value={pilotage.investissements.valides}
                    total={pilotage.investissements.total}
                  />
                  <Barre
                    label="Taux de signature"
                    value={pilotage.investissements.signes}
                    total={pilotage.investissements.total}
                  />
                  <Barre
                    label="En attente"
                    value={pilotage.investissements.enAttente}
                    total={pilotage.investissements.total}
                  />
                </div>

                <div className="mt-5 flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>Validation : {tauxInvestValides} %</span>
                  <span>Signature : {tauxInvestSignes} %</span>
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Distribution
                title="Équipements par type"
                subtitle="Répartition du parc par famille d'équipement."
                items={data.equipementsParType}
              />
              <Distribution
                title="État des équipements"
                subtitle="Disponibilité et état opérationnel du parc."
                items={data.equipementsParEtat}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">
                      Planning opérationnel
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Charge immédiate et échéances.
                    </p>
                  </div>
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Aujourd'hui", pilotage.planning.aujourdHui],
                    ["Cette semaine", pilotage.planning.semaine],
                    ["En retard", pilotage.planning.retard],
                    ["À venir", pilotage.planning.aVenir],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">
                      Qualité documentaire
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Consignes, pièces jointes et priorités.
                    </p>
                  </div>
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>

                <div className="mt-6 space-y-5">
                  <Barre
                    label="Consignes actives"
                    value={pilotage.consignes.actives}
                    total={Math.max(pilotage.consignes.total, 1)}
                  />
                  <Barre
                    label="Avec pièce jointe"
                    value={pilotage.consignes.avecFichier}
                    total={Math.max(pilotage.consignes.actives, 1)}
                  />
                  <Barre
                    label="Urgentes"
                    value={pilotage.consignes.urgentes}
                    total={Math.max(pilotage.consignes.actives, 1)}
                  />
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-slate-900 dark:text-white">
                    Liste des devis
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Devis et investissements nécessitant un suivi ou un arbitrage.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {pilotage.priorites.length === 0 ? (
                  <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    Aucun élément prioritaire détecté.
                  </div>
                ) : (
                  pilotage.priorites.slice(0, 8).map((item) => (
                    <Link
                      key={item.id}
                      href="/investissements"
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.titre}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.sousTitre}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.badge}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}