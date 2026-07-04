"use client";

import { useEffect, useState } from "react";
import { Search, Settings, User, ChevronDown, LogOut } from "lucide-react";
import { getCurrentUser, logout } from "@/services/auth";
import { getProfil } from "@/services/profils";
import { rechercheGlobale } from "@/services/recherche";
import NotificationCenter from "@/components/layout/NotificationCenter";
import ThemeToggle from "@/components/layout/ThemeToggle";

type Profil = {
  nom: string;
  prenom: string;
  role: string;
  secteur: string | null;
};

type ResultatRecherche = {
  type: string;
  titre: string;
  lien: string;
};

export default function Header() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);

  useEffect(() => {
    async function chargerProfil() {
      const user = await getCurrentUser();
      if (!user) return;

      const profilData = await getProfil(user.id);
      setProfil(profilData);
    }

    chargerProfil();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (recherche.trim().length < 2) {
        setResultats([]);
        return;
      }

      const data = await rechercheGlobale(recherche);
      setResultats(data);
      setOpenSearch(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [recherche]);

  async function handleLogout() {
    await logout();
    window.location.href = "/";
  }

  function ouvrirResultat(lien: string) {
    setRecherche("");
    setResultats([]);
    setOpenSearch(false);
    window.location.href = lien;
  }

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 flex items-center justify-between">
      <div className="relative w-full max-w-xl">
        <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3">
          <Search size={20} className="text-gray-500" />
          <input
            className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-500"
            placeholder="Rechercher une consigne, un document, une intervention..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onFocus={() => setOpenSearch(true)}
          />
        </div>

        {openSearch && recherche.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-14 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {resultats.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {resultats.map((resultat, index) => (
                  <button
                    key={`${resultat.type}-${resultat.titre}-${index}`}
                    onClick={() => ouvrirResultat(resultat.lien)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <p className="text-sm font-bold text-gray-900">
                      {resultat.titre}
                    </p>
                    <p className="text-xs text-gray-500">{resultat.type}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5 text-sm text-gray-500">
                Aucun résultat trouvé.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setOpenUserMenu(!openUserMenu)}
            className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2 transition"
          >
            <div className="h-9 w-9 rounded-full bg-[#0078b8] text-white flex items-center justify-center">
              <User size={18} />
            </div>

            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                {profil ? `${profil.prenom} ${profil.nom}` : "Utilisateur"}
              </p>
              <p className="text-xs text-gray-500">
                {profil?.role || "Chargement..."}
              </p>
            </div>

            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {openUserMenu && (
            <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="p-5 border-b">
                <div className="h-12 w-12 rounded-full bg-[#0078b8] text-white flex items-center justify-center mb-3">
                  <User size={22} />
                </div>

                <p className="font-bold text-gray-900">
                  {profil ? `${profil.prenom} ${profil.nom}` : "Utilisateur"}
                </p>

                <p className="text-sm text-gray-500">
                  {profil?.role || "Rôle non défini"}
                </p>

                {profil?.secteur && (
                  <p className="text-xs text-gray-400 mt-1">
                    Secteur : {profil.secteur}
                  </p>
                )}
              </div>

              <button
                onClick={() => (window.location.href = "/profil")}
                className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings size={18} />
                Paramètres
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
              
            </div>
          )}
        </div>
      </div>
    </header>
  );
}