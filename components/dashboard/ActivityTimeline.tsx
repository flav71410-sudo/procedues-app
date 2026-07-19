import {
  CheckCircle2,
  FileText,
  History,
  Wrench,
} from "lucide-react";
import Link from "next/link";

type Activity = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "controle" | "intervention" | "document";
};

const icons = {
  controle: <CheckCircle2 size={18} />,
  intervention: <Wrench size={18} />,
  document: <FileText size={18} />,
};

export default function ActivityTimeline() {
  const activites: Activity[] = [
    {
      id: "1",
      date: "15 juillet 2026",
      title: "Vérification des extincteurs",
      description: "Intervention réalisée par Eurofeu.",
      type: "controle",
    },
    {
      id: "2",
      date: "14 juillet 2026",
      title: "Maintenance du groupe électrogène",
      description: "Intervention technique terminée.",
      type: "intervention",
    },
    {
      id: "3",
      date: "12 juillet 2026",
      title: "Rapport SSI ajouté",
      description: "Le nouveau rapport est disponible.",
      type: "document",
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
            <History size={21} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Dernières interventions
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              Historique récent de l’application
            </p>
          </div>
        </div>

        <Link
          href="/maintenance"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Voir l’historique
        </Link>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-slate-800">
        {activites.map((activite) => (
          <article
            key={activite.id}
            className="flex gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-slate-900 dark:text-slate-300">
              {icons[activite.type]}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold text-gray-900 dark:text-white">
                  {activite.title}
                </p>

                <time className="text-xs font-semibold text-gray-500 dark:text-slate-500">
                  {activite.date}
                </time>
              </div>

              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {activite.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}