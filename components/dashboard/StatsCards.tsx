import {
  AlertTriangle,
  ClipboardCheck,
  LoaderCircle,
  Map,
  PackageSearch,
} from "lucide-react";

import type { DashboardStats } from "@/services/dashboard/dashboardService";

type StatsCardsProps = {
  stats: DashboardStats | null;
  loading?: boolean;
};

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  variant: "blue" | "green" | "orange" | "red";
  loading?: boolean;
};

const variants = {
  blue: {
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-400",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    value: "text-orange-700 dark:text-orange-400",
  },
  red: {
    icon: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    value: "text-red-700 dark:text-red-400",
  },
};

function StatCard({
  title,
  value,
  description,
  icon,
  variant,
  loading = false,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
            {title}
          </p>

          <div
            className={`mt-2 flex min-h-9 items-center text-3xl font-black ${variants[variant].value}`}
          >
            {loading ? (
              <LoaderCircle
                size={28}
                className="animate-spin"
              />
            ) : (
              value
            )}
          </div>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${variants[variant].icon}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function StatsCards({
  stats,
  loading = false,
}: StatsCardsProps) {
  const statistiques: StatCardProps[] = [
    {
      title: "Équipements",
      value: stats?.equipements ?? 0,
      description: "Équipements enregistrés",
      icon: <PackageSearch size={24} />,
      variant: "blue",
    },
    {
      title: "Plans",
      value: stats?.plans ?? 0,
      description: "Plans disponibles",
      icon: <Map size={24} />,
      variant: "green",
    },
    {
      title: "Alertes",
      value: stats?.alertes ?? 0,
      description: "Équipements hors service",
      icon: <AlertTriangle size={24} />,
      variant: "red",
    },
    {
      title: "Vérifications",
      value: stats?.verifications ?? 0,
      description: "Vérifications enregistrées",
      icon: <ClipboardCheck size={24} />,
      variant: "orange",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statistiques.map((statistique) => (
        <StatCard
          key={statistique.title}
          {...statistique}
          loading={loading}
        />
      ))}
    </section>
  );
}