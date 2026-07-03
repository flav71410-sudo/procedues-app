"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-72 bg-[#0078b8] text-white p-6">
        <div className="mb-8">
          <img src="/logo.png" alt="Castorama" className="w-48 mb-4 rounded-lg" />

          <h1 className="text-xl font-bold leading-tight">
            CastoManager
          </h1>

          <p className="text-sm text-blue-100">
            Castorama Claye-Souilly
          </p>
        </div>

        <nav className="space-y-6">
          <div>
            <p className="text-xs uppercase text-blue-100 mb-2 px-4">
              Accueil
            </p>

            <Link href="/dashboard" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🏠 Tableau de bord
            </Link>
          </div>

          <div>
            <p className="text-xs uppercase text-blue-100 mb-2 px-4">
              Exploitation
            </p>

            <Link href="/consignes" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              📋 Consignes
            </Link>

            <Link href="/documents" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              📄 Documents
            </Link>

            <Link href="/securite" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🛡 Sécurité
            </Link>

            <Link href="/maintenance" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🛠 Maintenance
            </Link>

            <Link href="/planning" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              📅 Planning
            </Link>
          </div>

          <div>
            <p className="text-xs uppercase text-blue-100 mb-2 px-4">
              Administration
            </p>

            <Link href="/admin" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              ⚙ Centre admin
            </Link>

            <Link href="/admin/utilisateurs" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              👥 Utilisateurs
            </Link>

            <Link href="/admin/roles" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🛡 Rôles
            </Link>

            <Link href="/admin/secteurs" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🏬 Secteurs
            </Link>

            <Link href="/admin/prestataires" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              🏢 Prestataires
            </Link>

            <Link href="/admin/parametres" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              ⚙ Paramètres
            </Link>

            <Link href="/admin/journal" className="block rounded-xl px-4 py-3 hover:bg-white/15">
              📜 Journal système
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}