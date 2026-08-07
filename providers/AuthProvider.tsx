"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
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

  /*
   * Compatibilité avec les pages existantes.
   * "magasin" correspond au magasin actuellement consulté.
   * Si le Super Admin est en vue globale, il revient au magasin principal.
   */
  magasin: MagasinUtilisateur | null;

  magasinPrincipal: MagasinUtilisateur | null;
  magasinActif: MagasinUtilisateur | null;
  magasinsDisponibles: readonly MagasinUtilisateur[];
  vueTousMagasins: boolean;
  peutChangerMagasin: boolean;

  loading: boolean;
  can: (permission: Permission) => boolean;

  changerMagasinActif: (
    magasinId: string | null
  ) => void;

  refreshProfile: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(undefined);

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

const STORAGE_PREFIX =
  "castomanager-magasin-actif";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function trierMagasins(
  magasins: MagasinUtilisateur[]
): MagasinUtilisateur[] {
  return [...magasins].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", {
      sensitivity: "base",
    })
  );
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] =
    useState<ProfilUtilisateur | null>(null);

  const [magasinsDisponibles, setMagasinsDisponibles] =
    useState<MagasinUtilisateur[]>([]);

  const [magasinActif, setMagasinActif] =
    useState<MagasinUtilisateur | null>(null);

  const [vueTousMagasins, setVueTousMagasins] =
    useState(false);

  const [loading, setLoading] = useState(true);

  /*
   * Évite qu'une ancienne requête asynchrone écrase
   * le résultat d'une requête plus récente.
   */
  const chargementNumero = useRef(0);

  const reinitialiser = useCallback(() => {
    setUser(null);
    setProfil(null);
    setMagasinsDisponibles([]);
    setMagasinActif(null);
    setVueTousMagasins(false);
  }, []);

  const chargerUtilisateur = useCallback(async () => {
    const numero = ++chargementNumero.current;
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const utilisateur = session?.user ?? null;

      if (!utilisateur) {
        if (numero === chargementNumero.current) {
          reinitialiser();
        }
        return;
      }

      const { data: profilData, error: profilError } =
        await supabase
          .from("profils")
          .select(
            "id, email, nom, prenom, actif, role, role_id, magasin_id"
          )
          .eq("id", utilisateur.id)
          .maybeSingle<ProfilRow>();

      if (profilError) {
        throw profilError;
      }

      if (!profilData) {
        throw new Error(
          `Aucun profil public trouvé pour ${utilisateur.email ?? utilisateur.id}.`
        );
      }

      const [roleResult, magasinPrincipalResult] =
        await Promise.all([
          profilData.role_id
            ? supabase
                .from("roles")
                .select("nom")
                .eq("id", profilData.role_id)
                .maybeSingle()
            : Promise.resolve({
                data: null,
                error: null,
              }),

          profilData.magasin_id
            ? supabase
                .from("magasins")
                .select("id, nom")
                .eq("id", profilData.magasin_id)
                .maybeSingle()
            : Promise.resolve({
                data: null,
                error: null,
              }),
        ]);

      if (roleResult.error) {
        throw roleResult.error;
      }

      if (magasinPrincipalResult.error) {
        throw magasinPrincipalResult.error;
      }

      const roleNom =
        roleResult.data?.nom ??
        profilData.role ??
        "PERMANENT";

      const roleNormalise = normalizeRole(roleNom);

      const magasinPrincipal:
        | MagasinUtilisateur
        | null = magasinPrincipalResult.data
        ? {
            id: magasinPrincipalResult.data.id,
            nom: magasinPrincipalResult.data.nom,
          }
        : null;

      let magasinsAutorises:
        MagasinUtilisateur[] = [];

      if (roleNormalise === "SUPER_ADMIN") {
        const { data, error } = await supabase
          .from("magasins")
          .select("id, nom")
          .order("nom", { ascending: true });

        if (error) {
          throw error;
        }

        magasinsAutorises = trierMagasins(
          (data ?? []) as MagasinUtilisateur[]
        );
      } else if (magasinPrincipal) {
        magasinsAutorises = [magasinPrincipal];
      }

      if (numero !== chargementNumero.current) {
        return;
      }

      const profilComplet: ProfilUtilisateur = {
        id: profilData.id,
        email:
          profilData.email ??
          utilisateur.email ??
          null,
        nom: profilData.nom,
        prenom: profilData.prenom,
        actif: profilData.actif ?? true,
        role: roleNormalise,
        roleId: profilData.role_id,
        roleNom,
        magasinId: profilData.magasin_id,
        magasin: magasinPrincipal,
      };

      setUser(utilisateur);
      setProfil(profilComplet);
      setMagasinsDisponibles(magasinsAutorises);

      /*
       * Utilisateur normal :
       * le magasin actif est toujours son magasin.
       */
      if (roleNormalise !== "SUPER_ADMIN") {
        setMagasinActif(magasinPrincipal);
        setVueTousMagasins(false);
        return;
      }

      /*
       * Super Admin :
       * restaure le dernier magasin consulté.
       * La valeur "__TOUS__" représente la vue globale.
       */
      let selectionSauvegardee: string | null = null;

      try {
        selectionSauvegardee =
          window.localStorage.getItem(
            storageKey(utilisateur.id)
          );
      } catch {
        selectionSauvegardee = null;
      }

      if (selectionSauvegardee === "__TOUS__") {
        setMagasinActif(null);
        setVueTousMagasins(true);
        return;
      }

      const magasinSauvegarde =
        magasinsAutorises.find(
          (magasin) =>
            magasin.id === selectionSauvegardee
        ) ?? null;

      const magasinParDefaut =
        magasinSauvegarde ??
        magasinPrincipal ??
        magasinsAutorises[0] ??
        null;

      setMagasinActif(magasinParDefaut);
      setVueTousMagasins(false);
    } catch (error) {
      console.error(
        "Erreur de chargement AuthProvider :",
        error
      );

      if (numero === chargementNumero.current) {
        reinitialiser();
      }
    } finally {
      if (numero === chargementNumero.current) {
        setLoading(false);
      }
    }
  }, [reinitialiser]);

  useEffect(() => {
    void chargerUtilisateur();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          reinitialiser();
          setLoading(false);
          return;
        }

        /*
         * Le délai évite d'exécuter une requête Supabase
         * directement à l'intérieur du callback Auth.
         */
        window.setTimeout(() => {
          void chargerUtilisateur();
        }, 0);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [chargerUtilisateur, reinitialiser]);

  const role = profil?.role ?? "PERMANENT";

  const permissions = useMemo(
    () => permissionsForRole(role),
    [role]
  );

  const can = useCallback(
    (permission: Permission) => {
      if (
        !user ||
        !profil ||
        !profil.actif
      ) {
        return false;
      }

      return roleCan(role, permission);
    },
    [profil, role, user]
  );

  const peutChangerMagasin =
    role === "SUPER_ADMIN";

  const changerMagasinActif = useCallback(
    (magasinId: string | null) => {
      if (!user || !profil) {
        return;
      }

      /*
       * Tous les rôles autres que Super Admin
       * restent verrouillés sur leur magasin principal.
       */
      if (profil.role !== "SUPER_ADMIN") {
        setMagasinActif(profil.magasin);
        setVueTousMagasins(false);
        return;
      }

      /*
       * null = vue globale "Tous les magasins".
       */
      if (magasinId === null) {
        setMagasinActif(null);
        setVueTousMagasins(true);

        try {
          window.localStorage.setItem(
            storageKey(user.id),
            "__TOUS__"
          );
        } catch {
          // Le stockage local n'est pas indispensable.
        }

        return;
      }

      const magasinSelectionne =
        magasinsDisponibles.find(
          (magasin) => magasin.id === magasinId
        );

      if (!magasinSelectionne) {
        console.warn(
          "Tentative de sélection d'un magasin non autorisé :",
          magasinId
        );
        return;
      }

      setMagasinActif(magasinSelectionne);
      setVueTousMagasins(false);

      try {
        window.localStorage.setItem(
          storageKey(user.id),
          magasinSelectionne.id
        );
      } catch {
        // Le stockage local n'est pas indispensable.
      }
    },
    [
      magasinsDisponibles,
      profil,
      user,
    ]
  );

  /*
   * Alias de compatibilité.
   * En vue globale, les anciennes pages reçoivent le magasin
   * principal afin d'éviter une valeur null inattendue.
   * Les nouvelles pages doivent utiliser magasinActif.
   */
  const magasin =
    magasinActif ??
    profil?.magasin ??
    null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profil,
      role,
      permissions,

      magasin,
      magasinPrincipal:
        profil?.magasin ?? null,
      magasinActif,
      magasinsDisponibles,
      vueTousMagasins,
      peutChangerMagasin,

      loading,
      can,
      changerMagasinActif,
      refreshProfile: chargerUtilisateur,
    }),
    [
      user,
      profil,
      role,
      permissions,
      magasin,
      magasinActif,
      magasinsDisponibles,
      vueTousMagasins,
      peutChangerMagasin,
      loading,
      can,
      changerMagasinActif,
      chargerUtilisateur,
    ]
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