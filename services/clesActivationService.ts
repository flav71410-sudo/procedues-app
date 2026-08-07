import { supabase } from "@/lib/supabase";

export type ActivationKeyStatus =
  | "active"
  | "used"
  | "expired"
  | "disabled";

export type ActivationKeyUser = {
  prenom: string | null;
  nom: string | null;
  email: string | null;
};

export type ActivationKey = {
  id: string;
  role_id: string;
  magasin_id: string;
  actif: boolean;
  utilisee: boolean;
  utilisee_par: string | null;
  utilisee_at: string | null;
  date_expiration: string | null;
  creee_par: string | null;
  created_at: string;

  role: {
    nom: string;
  } | null;

  magasin: {
    nom: string;
  } | null;

  utilisateur: ActivationKeyUser | null;
};

export type ActivationKeyRole = {
  id: string;
  nom: string;
};

export type ActivationKeyStore = {
  id: string;
  nom: string;
};

export type GenerateActivationKeyInput = {
  roleId: string;
  magasinId: string;
  expiration?: string | null;
};

type ActivationKeyDatabaseRow = {
  id: string;
  role_id: string;
  magasin_id: string;
  actif: boolean;
  utilisee: boolean;
  utilisee_par: string | null;
  utilisee_at: string | null;
  date_expiration: string | null;
  creee_par: string | null;
  created_at: string;

  role:
    | {
        nom: string;
      }
    | {
        nom: string;
      }[]
    | null;

  magasin:
    | {
        nom: string;
      }
    | {
        nom: string;
      }[]
    | null;
};

type ProfilActivationRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
};

function getErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as {
        message: unknown;
      }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function relationUnique<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function activationKeyStatus(
  key: ActivationKey
): ActivationKeyStatus {
  if (key.utilisee) {
    return "used";
  }

  if (!key.actif) {
    return "disabled";
  }

  if (key.date_expiration) {
    const expiration =
      new Date(
        key.date_expiration
      ).getTime();

    if (
      !Number.isNaN(expiration) &&
      expiration < Date.now()
    ) {
      return "expired";
    }
  }

  return "active";
}

export async function getActivationKeys(): Promise<
  ActivationKey[]
> {
  /*
   * On récupère volontairement les clés sans joindre directement
   * la table profils.
   *
   * utilisee_par et creee_par peuvent pointer vers auth.users,
   * ce qui empêche PostgREST de déduire automatiquement une
   * relation directe avec public.profils.
   */
  const {
    data: keysData,
    error: keysError,
  } = await supabase
    .from("cles_activation")
    .select(`
      id,
      role_id,
      magasin_id,
      actif,
      utilisee,
      utilisee_par,
      utilisee_at,
      date_expiration,
      creee_par,
      created_at,
      role:roles(nom),
      magasin:magasins(nom)
    `)
    .order("created_at", {
      ascending: false,
    });

  if (keysError) {
    throw new Error(
      getErrorMessage(keysError)
    );
  }

  const keys =
    (keysData ??
      []) as unknown as ActivationKeyDatabaseRow[];

  const utilisateurIds =
    Array.from(
      new Set(
        keys
          .map(
            (key) =>
              key.utilisee_par
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const profilsParId =
    new Map<
      string,
      ActivationKeyUser
    >();

  if (utilisateurIds.length > 0) {
    const {
      data: profilsData,
      error: profilsError,
    } = await supabase
      .from("profils")
      .select(
        "id, prenom, nom, email"
      )
      .in(
        "id",
        utilisateurIds
      );

    if (profilsError) {
      throw new Error(
        getErrorMessage(
          profilsError
        )
      );
    }

    (
      (profilsData ??
        []) as ProfilActivationRow[]
    ).forEach((profil) => {
      profilsParId.set(
        profil.id,
        {
          prenom:
            profil.prenom,
          nom: profil.nom,
          email:
            profil.email,
        }
      );
    });
  }

  return keys.map(
    (key): ActivationKey => ({
      id: key.id,
      role_id: key.role_id,
      magasin_id:
        key.magasin_id,
      actif: key.actif,
      utilisee:
        key.utilisee,
      utilisee_par:
        key.utilisee_par,
      utilisee_at:
        key.utilisee_at,
      date_expiration:
        key.date_expiration,
      creee_par:
        key.creee_par,
      created_at:
        key.created_at,

      role: relationUnique(
        key.role
      ),

      magasin:
        relationUnique(
          key.magasin
        ),

      utilisateur:
        key.utilisee_par
          ? profilsParId.get(
              key.utilisee_par
            ) ?? null
          : null,
    })
  );
}

export async function getActivationKeyRoles(): Promise<
  ActivationKeyRole[]
> {
  const { data, error } =
    await supabase
      .from("roles")
      .select("id, nom")
      .order("nom", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  return (
    data ?? []
  ) as ActivationKeyRole[];
}

export async function getActivationKeyStores(): Promise<
  ActivationKeyStore[]
> {
  const { data, error } =
    await supabase
      .from("magasins")
      .select("id, nom")
      .order("nom", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  return (
    data ?? []
  ) as ActivationKeyStore[];
}

export async function generateActivationKey(
  input: GenerateActivationKeyInput
): Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "generer_cle_activation",
    {
      p_role_id:
        input.roleId,
      p_magasin_id:
        input.magasinId,
      p_date_expiration:
        input.expiration ||
        null,
    }
  );

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  if (
    !data ||
    typeof data !== "string"
  ) {
    throw new Error(
      "La clé n’a pas été générée."
    );
  }

  return data;
}

export async function disableActivationKey(
  id: string
): Promise<void> {
  const {
    data,
    error,
  } = await supabase
    .from("cles_activation")
    .update({
      actif: false,
    })
    .eq("id", id)
    .eq("utilisee", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  if (!data) {
    throw new Error(
      "Cette clé n’a pas pu être désactivée. Elle est peut-être déjà utilisée ou inaccessible."
    );
  }
}

export async function enableActivationKey(
  id: string
): Promise<void> {
  const {
    data,
    error,
  } = await supabase
    .from("cles_activation")
    .update({
      actif: true,
    })
    .eq("id", id)
    .eq("utilisee", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  if (!data) {
    throw new Error(
      "Cette clé n’a pas pu être réactivée. Elle est peut-être déjà utilisée ou inaccessible."
    );
  }
}

export async function deleteActivationKey(
  id: string
): Promise<void> {
  const {
    data,
    error,
  } = await supabase
    .from("cles_activation")
    .delete()
    .eq("id", id)
    .eq("utilisee", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      getErrorMessage(error)
    );
  }

  if (!data) {
    throw new Error(
      "Cette clé n’a pas pu être supprimée. Une clé déjà utilisée est conservée dans l’historique."
    );
  }
}