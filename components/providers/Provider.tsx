"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  normalizeRole,
  permissionsForRole,
  roleCan,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

export type MagasinUtilisateur = {
  id: string;
  nom: string;
};

export type ProfilUtilisateur = {
  id: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  actif: boolean;
  role: AppRole;
  roleId: string | null;
  roleNom: string | null;
  magasinId: string | null;
  magasin: MagasinUtilisateur | null;
};

type AuthContextValue = {
  user: User | null;
  profil: ProfilUtilisateur | null;
  role: AppRole;
  permissions: readonly Permission[];
  magasin: MagasinUtilisateur | null;
  loading: boolean;
  compteBloque: boolean;
  can: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type ProfilRow = {
  id: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  actif: boolean | null;
  role: string | null;
  role_id: string | null;
  magasin_id: string | null;
};

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  const chargerUtilisateur = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Erreur session Supabase :", sessionError);
      }

      const utilisateur = session?.user ?? null;

      if (!utilisateur) {
        setUser(null);
        setProfil(null);
        return;
      }

      setUser(utilisateur);

      const email = utilisateur.email?.toLowerCase() ?? "";

      let requeteProfil = supabase
        .from("profils")
        .select(
          "id, email, nom, prenom, actif, role, role_id, magasin_id"
        );

      // Recherche d'abord par UUID Auth ; l'email sert de secours.
      requeteProfil = email
        ? requeteProfil.or(`id.eq.${utilisateur.id},email.ilike.${email}`)
        : requeteProfil.eq("id", utilisateur.id);

      const { data: profilsData, error: profilError } =
        await requeteProfil.limit(1);

      if (profilError) {
        console.error("Erreur lecture public.profils :", profilError);
      }

      const profilData = (profilsData?.[0] ?? null) as ProfilRow | null;

      if (!profilData) {
        // On conserve au moins l'utilisateur Auth au lieu d'afficher
        // "Utilisateur non connecté".
        setProfil({
          id: utilisateur.id,
          email: utilisateur.email ?? null,
          nom: null,
          prenom: null,
          actif: true,
          role: "PERMANENT",
          roleId: null,
          roleNom: null,
          magasinId: null,
          magasin: null,
        });
        return;
      }

      let roleNom: string | null = null;
      let magasin: MagasinUtilisateur | null = null;

      if (profilData.role_id) {
        const { data, error } = await supabase
          .from("roles")
          .select("nom")
          .eq("id", profilData.role_id)
          .maybeSingle();

        if (error) {
          console.error("Erreur lecture public.roles :", error);
        }

        roleNom = data?.nom ?? null;
      }

      if (profilData.magasin_id) {
        const { data, error } = await supabase
          .from("magasins")
          .select("id, nom")
          .eq("id", profilData.magasin_id)
          .maybeSingle();

        if (error) {
          console.error("Erreur lecture public.magasins :", error);
        }

        magasin = data
          ? {
              id: data.id,
              nom: data.nom,
            }
          : null;
      }

      const role = normalizeRole(
        roleNom ?? profilData.role ?? "PERMANENT"
      );

      setProfil({
        id: profilData.id,
        email: profilData.email ?? utilisateur.email ?? null,
        nom: profilData.nom,
        prenom: profilData.prenom,
        actif: profilData.actif ?? true,
        role,
        roleId: profilData.role_id,
        roleNom,
        magasinId: profilData.magasin_id,
        magasin,
      });
    } catch (error) {
      console.error("Erreur inattendue AuthProvider :", error);
      setUser(null);
      setProfil(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void chargerUtilisateur();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // Laisse Supabase terminer le traitement du changement d'état,
      // puis recharge le profil.
      window.setTimeout(() => {
        void chargerUtilisateur();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [chargerUtilisateur, supabase]);

  // Détecte aussi une désactivation faite pendant que l'utilisateur
  // est déjà connecté. On écoute les changements du profil et on garde
  // un contrôle périodique en secours.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profil-actif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profils",
          filter: `id=eq.${user.id}`,
        },
        () => {
          void chargerUtilisateur();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void chargerUtilisateur();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user, chargerUtilisateur, supabase]);

  const role = profil?.role ?? "PERMANENT";
  const compteBloque = Boolean(user && profil && profil.actif === false);

  const permissions = useMemo(
    () => permissionsForRole(role),
    [role]
  );

  const can = useCallback(
    (permission: Permission) => {
      if (!user || !profil || !profil.actif) {
        return false;
      }

      return roleCan(role, permission);
    },
    [profil, role, user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profil,
      role,
      permissions,
      magasin: profil?.magasin ?? null,
      loading,
      compteBloque,
      can,
      refreshProfile: chargerUtilisateur,
    }),
    [
      user,
      profil,
      role,
      permissions,
      loading,
      compteBloque,
      can,
      chargerUtilisateur,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {compteBloque ? (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-900/50 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
              !
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Compte bloqué
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              Votre compte a été bloqué. Merci de contacter votre responsable
              ou le Super administrateur.
            </p>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="mt-7 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Retour à la connexion
            </button>
          </div>
        </main>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé à l’intérieur de AuthProvider."
    );
  }

  return context;
}