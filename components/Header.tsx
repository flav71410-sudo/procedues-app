"use client";

import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import NotificationCenter from "@/components/layout/NotificationCenter";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { getCurrentUser, logout } from "@/services/auth";
import { getProfil } from "@/services/profils";
import { rechercheGlobale } from "@/services/recherche";

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

type HeaderProps = {
  onOpenMobileMenu?: () => void;
};

type SearchContentProps = {
  recherche: string;
  resultats: ResultatRecherche[];
  openSearch: boolean;
  onRechercheChange: (value: string) => void;
  onFocus: () => void;
  onOpenResult: (lien: string) => void;
  onClose?: () => void;
  mobile?: boolean;
};

function SearchContent({
  recherche,
  resultats,
  openSearch,
  onRechercheChange,
  onFocus,
  onOpenResult,
  onClose,
  mobile = false,
}: SearchContentProps) {
  return (
    <div className="relative w-full">
      <div
        className={[
          "flex items-center gap-3 rounded-xl",
          "bg-gray-100 px-4 py-3",
          "dark:bg-slate-800",
        ].join(" ")}
      >
        <Search
          size={20}
          className="shrink-0 text-gray-500 dark:text-slate-400"
        />

        <input
          autoFocus={mobile}
          className={[
            "min-w-0 flex-1 bg-transparent outline-none",
            "text-gray-900 placeholder:text-gray-500",
            "dark:text-white dark:placeholder:text-slate-400",
          ].join(" ")}
          placeholder={
            mobile
              ? "Rechercher dans CastoManager..."
              : "Rechercher une consigne, un document, une intervention..."
          }
          value={recherche}
          onChange={(event) =>
            onRechercheChange(event.target.value)
          }
          onFocus={onFocus}
        />

        {recherche.length > 0 && (
          <button
            type="button"
            onClick={() => onRechercheChange("")}
            aria-label="Effacer la recherche"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X size={17} />
          </button>
        )}

        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-semibold text-[#0078B8] dark:text-sky-400"
          >
            Fermer
          </button>
        )}
      </div>

      {openSearch && recherche.trim().length >= 2 && (
        <div
          className={[
            "z-50 overflow-hidden rounded-2xl",
            "border border-gray-200 bg-white shadow-xl",
            "dark:border-slate-700 dark:bg-slate-900",
            mobile
              ? "mt-3"
              : "absolute left-0 right-0 top-14",
          ].join(" ")}
        >
          {resultats.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {resultats.map((resultat, index) => (
                <button
                  type="button"
                  key={`${resultat.type}-${resultat.titre}-${index}`}
                  onClick={() =>
                    onOpenResult(resultat.lien)
                  }
                  className={[
                    "w-full border-b px-5 py-4 text-left",
                    "last:border-b-0",
                    "border-gray-100 hover:bg-gray-50",
                    "dark:border-slate-800 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {resultat.titre}
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {resultat.type}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-gray-500 dark:text-slate-400">
              Aucun résultat trouvé.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header({
  onOpenMobileMenu,
}: HeaderProps) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<
    ResultatRecherche[]
  >([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [openMobileSearch, setOpenMobileSearch] =
    useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function chargerProfil() {
      try {
        const user = await getCurrentUser();

        if (!user) {
          return;
        }

        const profilData = await getProfil(user.id);
        setProfil(profilData);
      } catch (error) {
        console.error(
          "Impossible de charger le profil :",
          error,
        );
      }
    }

    chargerProfil();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (recherche.trim().length < 2) {
        setResultats([]);
        setOpenSearch(false);
        return;
      }

      try {
        const data = await rechercheGlobale(recherche);
        setResultats(data);
        setOpenSearch(true);
      } catch (error) {
        console.error(
          "Erreur pendant la recherche globale :",
          error,
        );

        setResultats([]);
        setOpenSearch(true);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [recherche]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpenUserMenu(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
    };
  }, []);

  useEffect(() => {
    if (!openMobileSearch) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [openMobileSearch]);

  async function handleLogout() {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error(
        "Erreur pendant la déconnexion :",
        error,
      );
    }
  }

  function ouvrirResultat(lien: string) {
    setRecherche("");
    setResultats([]);
    setOpenSearch(false);
    setOpenMobileSearch(false);
    window.location.href = lien;
  }

  function ouvrirProfil() {
    setOpenUserMenu(false);
    window.location.href = "/profil";
  }

  const nomComplet = profil
    ? `${profil.prenom} ${profil.nom}`
    : "Utilisateur";

  return (
    <>
      <header
        className={[
          "sticky top-0 z-30",
          "border-b border-gray-200 bg-white/95",
          "backdrop-blur dark:border-slate-800 dark:bg-slate-900/95",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 md:h-20 md:px-6 lg:px-8">
          {/* Partie gauche mobile */}
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Ouvrir le menu"
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center",
                "rounded-xl bg-gray-100 text-gray-700",
                "transition hover:bg-gray-200 active:scale-95",
                "dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
              ].join(" ")}
            >
              <Menu size={23} />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                CastoManager
              </p>

              <p className="hidden truncate text-xs text-gray-500 dark:text-slate-400 sm:block">
                Claye-Souilly
              </p>
            </div>
          </div>

          {/* Recherche ordinateur */}
          <div className="relative hidden w-full max-w-xl lg:block">
            <SearchContent
              recherche={recherche}
              resultats={resultats}
              openSearch={openSearch}
              onRechercheChange={setRecherche}
              onFocus={() => setOpenSearch(true)}
              onOpenResult={ouvrirResultat}
            />
          </div>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setOpenMobileSearch(true)}
              aria-label="Rechercher"
              className={[
                "flex h-11 w-11 items-center justify-center",
                "rounded-xl bg-gray-100 text-gray-700",
                "transition hover:bg-gray-200 active:scale-95",
                "dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
                "lg:hidden",
              ].join(" ")}
            >
              <Search size={20} />
            </button>

            <div className="flex h-11 w-11 items-center justify-center">
              <NotificationCenter />
            </div>

            <div className="hidden sm:flex">
              <ThemeToggle />
            </div>

            <div
              ref={userMenuRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenUserMenu((current) => !current)
                }
                aria-expanded={openUserMenu}
                className={[
                  "flex min-h-11 items-center gap-2 rounded-xl",
                  "bg-gray-100 p-1.5 transition",
                  "hover:bg-gray-200 active:scale-[0.98]",
                  "dark:bg-slate-800 dark:hover:bg-slate-700",
                  "md:px-3",
                ].join(" ")}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0078B8] text-white">
                  <User size={18} />
                </div>

                <div className="hidden min-w-0 text-left md:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {nomComplet}
                  </p>

                  <p className="max-w-40 truncate text-xs text-gray-500 dark:text-slate-400">
                    {profil?.role || "Chargement..."}
                  </p>
                </div>

                <ChevronDown className="hidden text-gray-500 dark:text-slate-400 md:block" size={16} />
              </button>

              {openUserMenu && (
                <div
                  className={[
                    "absolute right-0 z-50 mt-3",
                    "w-[calc(100vw-24px)] max-w-72",
                    "overflow-hidden rounded-2xl border",
                    "border-gray-200 bg-white shadow-xl",
                    "dark:border-slate-700 dark:bg-slate-900",
                  ].join(" ")}
                >
                  <div className="border-b border-gray-200 p-5 dark:border-slate-800">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0078B8] text-white">
                      <User size={22} />
                    </div>

                    <p className="truncate font-bold text-gray-900 dark:text-white">
                      {nomComplet}
                    </p>

                    <p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-400">
                      {profil?.role || "Rôle non défini"}
                    </p>

                    {profil?.secteur && (
                      <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">
                        Secteur : {profil.secteur}
                      </p>
                    )}
                  </div>

                  <div className="border-b border-gray-200 p-2 dark:border-slate-800 sm:hidden">
                    <div className="flex items-center justify-between rounded-xl px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-slate-200">
                        Apparence
                      </span>

                      <ThemeToggle />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={ouvrirProfil}
                    className={[
                      "flex min-h-12 w-full items-center gap-3",
                      "px-5 py-4 text-left text-sm",
                      "text-gray-700 hover:bg-gray-50",
                      "dark:text-slate-200 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <Settings size={18} />
                    Paramètres
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={[
                      "flex min-h-12 w-full items-center gap-3",
                      "px-5 py-4 text-left text-sm",
                      "text-red-600 hover:bg-red-50",
                      "dark:text-red-400 dark:hover:bg-red-950/30",
                    ].join(" ")}
                  >
                    <LogOut size={18} />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Recherche plein écran mobile */}
      {openMobileSearch && (
        <div className="fixed inset-0 z-[70] bg-white p-3 dark:bg-slate-950 sm:p-4 lg:hidden">
          <div className="mx-auto max-w-2xl">
            <SearchContent
              mobile
              recherche={recherche}
              resultats={resultats}
              openSearch={openSearch}
              onRechercheChange={setRecherche}
              onFocus={() => setOpenSearch(true)}
              onOpenResult={ouvrirResultat}
              onClose={() => {
                setOpenMobileSearch(false);
                setOpenSearch(false);
              }}
            />

            {recherche.trim().length < 2 && (
              <div className="mt-8 text-center">
                <Search
                  size={42}
                  className="mx-auto text-gray-300 dark:text-slate-700"
                />

                <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
                  Saisis au moins deux caractères pour commencer la recherche.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}