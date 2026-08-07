"use client";

import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Repeat,
} from "lucide-react";

type Props = {
  stats: {
    total: number;
    today: number;
    late: number;
    finished: number;
    recurring: number;
  };
};

function Card({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}

export default function PlanningStats({
  stats,
}: Props) {
  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">

      <Card
        title="Evènements"
        value={stats.total}
        color="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        icon={<CalendarDays className="h-7 w-7" />}
      />

      <Card
        title="Aujourd'hui"
        value={stats.today}
        color="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        icon={<Clock3 className="h-7 w-7" />}
      />

      <Card
        title="Terminés"
        value={stats.finished}
        color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        icon={<CheckCircle2 className="h-7 w-7" />}
      />

      <Card
        title="En retard"
        value={stats.late}
        color="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        icon={<AlertTriangle className="h-7 w-7" />}
      />

      <Card
        title="Récurrents"
        value={stats.recurring}
        color="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
        icon={<Repeat className="h-7 w-7" />}
      />

    </section>
  );
}