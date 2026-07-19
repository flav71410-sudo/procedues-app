import {
  BarChart3,
  PieChart,
} from "lucide-react";

import type {
  DashboardChartItem,
} from "@/services/dashboard/dashboardService";

type EquipmentChartsProps = {
  equipementsParType: DashboardChartItem[];
  equipementsParEtat: DashboardChartItem[];
  loading?: boolean;
};

type ProgressBarProps = {
  label: string;
  value: number;
  total: number;
};

function ProgressBar({
  label,
  value,
  total,
}: ProgressBarProps) {
  const pourcentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="truncate text-sm font-semibold text-gray-700 dark:text-slate-300">
          {label}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
            {pourcentage} %
          </span>

          <span className="min-w-8 text-right text-sm font-bold text-gray-900 dark:text-white">
            {value}
          </span>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${Math.min(
              Math.max(pourcentage, 0),
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse"
        >
          <div className="mb-2 flex justify-between">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="h-4 w-10 rounded bg-gray-200 dark:bg-slate-800" />
          </div>

          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
      {message}
    </div>
  );
}

export default function EquipmentCharts({
  equipementsParType,
  equipementsParEtat,
  loading = false,
}: EquipmentChartsProps) {
  const totalParType =
    equipementsParType.reduce(
      (total, item) => total + item.value,
      0
    );

  const totalParEtat =
    equipementsParEtat.reduce(
      (total, item) => total + item.value,
      0
    );

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <BarChart3 size={21} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Équipements par type
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Répartition réelle du parc enregistré
            </p>
          </div>
        </div>

        {loading ? (
          <ChartSkeleton />
        ) : equipementsParType.length === 0 ? (
          <EmptyChart message="Aucun équipement disponible pour générer les statistiques." />
        ) : (
          <div className="max-h-80 space-y-5 overflow-y-auto pr-2">
            {equipementsParType.map((item) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                total={totalParType}
              />
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <PieChart size={21} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              État des équipements
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Niveau de disponibilité du parc
            </p>
          </div>
        </div>

        {loading ? (
          <ChartSkeleton />
        ) : equipementsParEtat.length === 0 ? (
          <EmptyChart message="Aucun état d’équipement disponible." />
        ) : (
          <div className="max-h-80 space-y-5 overflow-y-auto pr-2">
            {equipementsParEtat.map((item) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                total={totalParEtat}
              />
            ))}
          </div>
        )}
      </article>
    </section>
  );
}