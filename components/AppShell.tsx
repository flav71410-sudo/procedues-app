"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0078b8] text-white p-6">
        <div className="mb-10">
          <img
            src="/logo.png"
            alt="Castorama"
            className="w-48 mb-4 rounded-lg"
          />

          <h1 className="text-xl font-bold leading-tight">
            Consignes Permanentes
          </h1>

          <p className="text-sm text-blue-100">
            Castorama Claye-Souilly
          </p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            🏠 Dashboard
          </Link>

          <Link
            href="/consignes"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            📋 Consignes
          </Link>


          <Link
            href="/securite"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            🔥 Sécurité
          </Link>

          <Link
            href="/maintenance"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            🛠 Maintenance
          </Link>

          <Link
            href="/documents"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            📁 Documents
          </Link>

          <Link
            href="/admin"
            className="block rounded-xl px-4 py-3 hover:bg-white/15"
          >
            ⚙ Administration
          </Link>
        </nav>
      </aside>

      {/* Contenu */}
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}