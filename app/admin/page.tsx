"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";

const modules = [
  {
    titre: "👥 Utilisateurs",
    description: "Gestion des comptes utilisateurs",
    lien: "/admin/utilisateurs",
  },
  {
    titre: "🛡️ Rôles",
    description: "Gestion des rôles et permissions",
    lien: "/admin/roles",
  },
  {
    titre: "🏬 Secteurs",
    description: "Gestion des secteurs du magasin",
    lien: "/admin/secteurs",
  },
  {
    titre: "🏢 Prestataires",
    description: "Gestion des entreprises extérieures",
    lien: "/admin/prestataires",
  },
  {
    titre: "⚙️ Paramètres",
    description: "Configuration générale",
    lien: "/admin/parametres",
  },
  {
    titre: "📜 Journal système",
    description: "Historique des actions",
    lien: "/admin/journal",
  },
];

export default function AdminPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">
        Administration
      </h1>

      <p className="mt-2 text-gray-600">
        Centre d'administration du logiciel.
      </p>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {modules.map((module) => (
          <Link
            key={module.titre}
            href={module.lien}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-bold text-[#0078B8]">
              {module.titre}
            </h2>

            <p className="mt-3 text-gray-600">
              {module.description}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}