"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Settings, User } from "lucide-react";
import { getCurrentUser, logout } from "@/services/auth";
import { getProfil } from "@/services/profils";

type Profil = {
  nom: string;
  prenom: string;
  role: string;
  secteur: string | null;
};

export default function Header() {
  const [profil, setProfil] = useState<Profil | null>(null);

  useEffect(() => {
    async function chargerProfil() {
      const user = await getCurrentUser();

      if (!user) return;

      const profilData = await getProfil(user.id);
      setProfil(profilData);
    }

    chargerProfil();
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = "/";
  }

  return (
    <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
      <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3 w-full max-w-xl">
        <Search size={20} className="text-gray-500" />
        <input
          className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-500"
          placeholder="Rechercher une consigne, un document, une intervention..."
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-3 rounded-xl hover:bg-gray-100">
          <Bell size={20} className="text-gray-700" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button className="p-3 rounded-xl hover:bg-gray-100">
          <Settings size={20} className="text-gray-700" />
        </button>

        <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2">
          <div className="h-9 w-9 rounded-full bg-[#0078b8] text-white flex items-center justify-center">
            <User size={18} />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {profil ? `${profil.prenom} ${profil.nom}` : "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500">
              {profil?.role || "Chargement..."}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-xl border px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}