import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";

import type {
  DashboardHealthScore,
} from "@/services/dashboard/dashboardService";

type Props = {
  healthScore: DashboardHealthScore | null;
  loading?: boolean;
};

function getScoreStyle(score: number) {
  if (score >= 90) {
    return {
      label: "Excellent",
      icon: CheckCircle2,
      text: "text-emerald-700 dark:text-emerald-400",
      background:
        "bg-emerald-100 dark:bg-emerald-500/10",
      bar: "bg-emerald-500",
      border:
        "border-emerald-200 dark:border-emerald-500/20",
    };
  }

  if (score >= 75) {
    return {
      label: "Satisfaisant",
      icon: Gauge,
      text: "text-blue-700 dark:text-blue-400",
      background:
        "bg-blue-100 dark:bg-blue-500/10",
      bar: "bg-blue-500",
      border:
        "border-blue-200 dark:border-blue-500/20",
    };
  }

  if (score >= 50) {
    return {
      label: "À surveiller",
      icon: AlertTriangle,
      text: "text-orange-700 dark:text-orange-400",
      background:
        "bg-orange-100 dark:bg-orange-500/10",
      bar: "bg-orange-500",
      border:
        "border-orange-200 dark:border-orange-500/20",
    };
  }

  return {
    label: "Critique",
    icon: ShieldAlert,
    text: "text-red-700 dark:text-red-400",
    background:
      "bg-red-100 dark:bg-red-500/10",
    bar: "bg-red-500",
    border:
      "border-red-200 dark:border-red-500/20",
  };
}

export default function HealthScoreCard({
  healthScore,
  loading = false,
}: Props) {
  const score = healthScore?.score ?? 0;
  const style = getScoreStyle(score);
  const Icon = style.icon;

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950 ${style.border}`}
    >
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.background} ${style.text}`}
            >
              {loading ? (
                <LoaderCircle
                  size={25}
                  className="animate-spin"
                />
              ) : (
                <Icon size={25} />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Santé du magasin
              </p>

              <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                Indice de disponibilité du parc
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-slate-400">
                Indicateur interne calculé à partir de l’état et
                de la qualité des fiches équipements.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span
                className={`text-sm font-bold ${style.text}`}
              >
                {loading ? "Calcul en cours..." : style.label}
              </span>

              <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                {loading ? "—" : `${score} %`}
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                style={{
                  width: loading ? "0%" : `${score}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              En service
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loading
                ? "—"
                : healthScore?.equipementsEnService ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              Hors service
            </p>

            <p className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">
              {loading
                ? "—"
                : healthScore?.equipementsHorsService ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              À contrôler
            </p>

            <p className="mt-2 text-2xl font-black text-orange-600 dark:text-orange-400">
              {loading
                ? "—"
                : healthScore?.equipementsAControler ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              Fiches incomplètes
            </p>

            <p className="mt-2 text-2xl font-black text-violet-600 dark:text-violet-400">
              {loading
                ? "—"
                : healthScore?.fichesIncompletes ?? 0}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}