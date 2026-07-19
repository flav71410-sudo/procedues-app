import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import type {
  DashboardAlert,
} from "@/services/dashboard/dashboardService";

type AlertsPanelProps = {
  alertes: DashboardAlert[];
  loading?: boolean;
};

const styles = {
  urgent: {
    point: "bg-red-500",
    container:
      "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-950/20",
    title: "text-red-900 dark:text-red-300",
  },

  warning: {
    point: "bg-orange-500",
    container:
      "border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-950/20",
    title: "text-orange-900 dark:text-orange-300",
  },
};

export default function AlertsPanel({
  alertes,
  loading = false,
}: AlertsPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={21} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Alertes prioritaires
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Données analysées depuis Supabase
            </p>
          </div>
        </div>

        <Link
          href="/equipements"
          className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Voir tout
          <ArrowRight size={16} />
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <LoaderCircle
            size={30}
            className="animate-spin text-blue-600"
          />
        </div>
      ) : alertes.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <CheckCircle2
            size={38}
            className="text-emerald-500"
          />

          <p className="mt-3 font-bold text-gray-900 dark:text-white">
            Aucune alerte
          </p>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Aucun point prioritaire n’a été détecté.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map((alerte) => (
            <Link
              key={alerte.id}
              href={alerte.href}
              className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                styles[alerte.level].container
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    styles[alerte.level].point
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-bold ${
                      styles[alerte.level].title
                    }`}
                  >
                    {alerte.title}
                  </p>

                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    {alerte.description}
                  </p>
                </div>

                <ArrowRight
                  size={17}
                  className="mt-1 shrink-0 text-gray-400"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}