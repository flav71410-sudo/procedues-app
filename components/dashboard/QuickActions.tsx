import Link from "next/link";
import {
  CalendarPlus,
  FilePlus2,
  MapPinned,
  PackagePlus,
  ScanLine,
} from "lucide-react";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

export default function QuickActions() {
  const actions: QuickAction[] = [
    {
      title: "Ajouter un équipement",
      description: "Créer une nouvelle fiche équipement.",
      href: "/equipements/ajouter",
      icon: <PackagePlus size={22} />,
    },
    {
      title: "Ouvrir les plans",
      description: "Accéder à la cartographie interactive.",
      href: "/plans",
      icon: <MapPinned size={22} />,
    },
    {
      title: "Planifier un contrôle",
      description: "Ajouter une nouvelle échéance.",
      href: "/planning",
      icon: <CalendarPlus size={22} />,
    },
    {
      title: "Ajouter un document",
      description: "Déposer un rapport ou une attestation.",
      href: "/document",
      icon: <FilePlus2 size={22} />,
    },
    {
      title: "Scanner un QR Code",
      description: "Accéder rapidement à un équipement.",
      href: "/equipements",
      icon: <ScanLine size={22} />,
    },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          Actions rapides
        </h2>

        <p className="text-sm text-gray-500 dark:text-slate-400">
          Accès direct aux fonctions les plus utilisées
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400">
              {action.icon}
            </div>

            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              {action.title}
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}