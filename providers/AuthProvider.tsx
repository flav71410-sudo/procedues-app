"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "ADMIN" | "DM" | "PERMANENT";

export type ProfilUtilisateur = {
  id: string;
  nom: string | null;
  prenom: string | null;
  role: AppRole;
};

type AuthContextValue = {
  user: User | null;
  profil: ProfilUtilisateur | null;
  role: AppRole;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normaliserRole(role: string | null | undefined): AppRole {
  const valeur = role?.trim().toUpperCase();

  if (valeur === "ADMIN") {
    return "ADMIN";
  }

  if (valeur === "DM") {
    return "DM";
  }

  return "PERMANENT";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actif = true;

    async function chargerUtilisateur() {
      setLoading(true);

      const {
        data: { user: utilisateur },
        error: userError,
      } = await supabase.auth.getUser();

      if (!actif) {
        return;
      }

      if (userError || !utilisateur) {
        setUser(null);
        setProfil(null);
        setLoading(false);
        return;
      }

      setUser(utilisateur);

      const { data: profilData, error: profilError } = await supabase
        .from("profils")
        .select("id, nom, prenom, role")
        .eq("id", utilisateur.id)
        .maybeSingle();

      if (!actif) {
        return;
      }

      if (profilError) {
        console.error(
          "Erreur lors du chargement du profil utilisateur :",
          profilError
        );

        setProfil({
          id: utilisateur.id,
          nom: null,
          prenom: null,
          role: "PERMANENT",
        });

        setLoading(false);
        return;
      }

      setProfil({
        id: utilisateur.id,
        nom: profilData?.nom ?? null,
        prenom: profilData?.prenom ?? null,
        role: normaliserRole(profilData?.role),
      });

      setLoading(false);
    }

    chargerUtilisateur();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      chargerUtilisateur();
    });

    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, []);

  const role = profil?.role ?? "PERMANENT";

  const value = useMemo(
    () => ({
      user,
      profil,
      role,
      loading,
    }),
    [user, profil, role, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
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