import { supabase } from "@/lib/supabase";
import type {
  Verification,
  VerificationCreateInput,
  VerificationFilters,
  VerificationHistorique,
  VerificationListItem,
  VerificationStats,
  VerificationUpdateInput,
} from "@/types/verifications";

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

type VerificationScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

type EquipementOption = {
  id: string;
  nom: string;
  numero: string | null;
};

type PrestataireOption = {
  id: string;
  nom: string;
};

export type VerificationFormOptions = {
  equipements: EquipementOption[];
  prestataires: PrestataireOption[];
};

function getMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "Une erreur inconnue est survenue.";
}

function throwVerificationError(error: unknown): never {
  throw new VerificationError(getMessage(error));
}

function todayISO(): string {
  const date = new Date();
  const locale = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return locale.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);

  return value.toISOString().slice(0, 10);
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user?.id ?? null;
}

function applyScope<T>(
  query: T,
  scope: VerificationScope
): T {
  if (!scope.tousMagasins && scope.magasinId) {
    return (query as any).eq(
      "magasin_id",
      scope.magasinId
    ) as T;
  }

  return query;
}

export async function getVerificationFormOptions(
  scope: VerificationScope
): Promise<VerificationFormOptions> {
  try {
    if (!scope.tousMagasins && !scope.magasinId) {
      return {
        equipements: [],
        prestataires: [],
      };
    }

    let equipementsQuery = supabase
      .from("equipements")
      .select("id, nom, numero")
      .order("nom", { ascending: true });

    let prestatairesQuery = supabase
      .from("prestataires")
      .select("id, nom")
      .order("nom", { ascending: true });

    if (!scope.tousMagasins && scope.magasinId) {
      equipementsQuery = equipementsQuery.eq(
        "magasin_id",
        scope.magasinId
      );

      prestatairesQuery = prestatairesQuery.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const [
      equipementsResult,
      prestatairesResult,
    ] = await Promise.all([
      equipementsQuery,
      prestatairesQuery,
    ]);

    if (equipementsResult.error) {
      throw equipementsResult.error;
    }

    if (prestatairesResult.error) {
      throw prestatairesResult.error;
    }

    return {
      equipements:
        (equipementsResult.data ??
          []) as EquipementOption[],
      prestataires:
        (prestatairesResult.data ??
          []) as PrestataireOption[],
    };
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function getVerifications(
  filters: VerificationFilters = {}
): Promise<VerificationListItem[]> {
  try {
    let query = supabase
      .from("verifications")
      .select(`
        *,
        equipement:equipements (
          id,
          nom,
          numero
        ),
        prestataire:prestataires (
          id,
          nom
        ),
        magasin:magasins (
          id,
          nom
        )
      `)
      .eq("actif", true);

    if (!filters.tousMagasins) {
      if (!filters.magasinId) {
        return [];
      }

      query = query.eq(
        "magasin_id",
        filters.magasinId
      );
    }

    if (
      filters.categorie &&
      filters.categorie !== "toutes"
    ) {
      query = query.eq(
        "categorie",
        filters.categorie
      );
    }

    if (
      filters.statut &&
      filters.statut !== "tous"
    ) {
      query = query.eq(
        "statut",
        filters.statut
      );
    }

    if (
      filters.resultat &&
      filters.resultat !== "tous"
    ) {
      query = query.eq(
        "resultat",
        filters.resultat
      );
    }

    if (
      filters.criticite &&
      filters.criticite !== "toutes"
    ) {
      query = query.eq(
        "criticite",
        filters.criticite
      );
    }

    if (filters.dateDebut) {
      query = query.gte(
        "date_prochaine_verification",
        filters.dateDebut
      );
    }

    if (filters.dateFin) {
      query = query.lte(
        "date_prochaine_verification",
        filters.dateFin
      );
    }

    if (filters.uniquementEnRetard) {
      query = query
        .lt(
          "date_prochaine_verification",
          todayISO()
        )
        .not(
          "statut",
          "in",
          '("conforme","levee","annulee")'
        );
    }

    query = query.order(
      "date_prochaine_verification",
      {
        ascending: true,
        nullsFirst: false,
      }
    );

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let rows = (data ?? []) as Array<
      Verification & {
        equipement:
          | {
              id: string;
              nom: string;
              numero: string | null;
            }
          | null;
        prestataire:
          | {
              id: string;
              nom: string;
            }
          | null;
        magasin:
          | {
              id: string;
              nom: string;
            }
          | null;
      }
    >;

    if (filters.recherche?.trim()) {
      const search =
        filters.recherche
          .trim()
          .toLowerCase();

      rows = rows.filter((row) =>
        [
          row.reference,
          row.titre,
          row.description ?? "",
          row.categorie,
          row.equipement?.nom ?? "",
          row.equipement?.numero ?? "",
          row.prestataire?.nom ?? "",
          row.magasin?.nom ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    return rows.map((row) => ({
      ...row,
      equipement_nom:
        row.equipement?.nom ?? null,
      equipement_numero:
        row.equipement?.numero ?? null,
      prestataire_nom:
        row.prestataire?.nom ?? null,
      magasin_nom:
        row.magasin?.nom ?? null,
    }));
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function getVerification(
  id: string,
  scope: VerificationScope
): Promise<Verification> {
  try {
    let query = supabase
      .from("verifications")
      .select("*")
      .eq("id", id)
      .eq("actif", true);

    if (!scope.tousMagasins && scope.magasinId) {
      query = query.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const { data, error } =
      await query.single();

    if (error) {
      throw error;
    }

    return data as Verification;
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function createVerification(
  input: VerificationCreateInput
): Promise<Verification> {
  try {
    if (!input.magasin_id) {
      throw new Error(
        "Le magasin est obligatoire."
      );
    }

    if (!input.reference.trim()) {
      throw new Error(
        "La référence est obligatoire."
      );
    }

    if (!input.titre.trim()) {
      throw new Error(
        "Le titre est obligatoire."
      );
    }

    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("verifications")
      .insert({
        ...input,
        reference: input.reference.trim(),
        titre: input.titre.trim(),
        actif: input.actif ?? true,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const created = data as Verification;

    await addVerificationHistory({
      verificationId: created.id,
      magasinId: created.magasin_id,
      action: "Création",
      details: `Vérification créée : ${created.reference} - ${created.titre}`,
      ancienStatut: null,
      nouveauStatut: created.statut,
    });

    return created;
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function updateVerification(
  id: string,
  input: VerificationUpdateInput,
  scope: VerificationScope
): Promise<Verification> {
  try {
    const current =
      await getVerification(id, scope);

    let query = supabase
      .from("verifications")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!scope.tousMagasins && scope.magasinId) {
      query = query.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const { data, error } =
      await query
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    const updated = data as Verification;

    await addVerificationHistory({
      verificationId: updated.id,
      magasinId: updated.magasin_id,
      action: "Modification",
      details: `Vérification modifiée : ${updated.reference} - ${updated.titre}`,
      ancienStatut: current.statut,
      nouveauStatut: updated.statut,
    });

    return updated;
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function deleteVerification(
  id: string,
  scope: VerificationScope
): Promise<void> {
  try {
    const current =
      await getVerification(id, scope);

    let query = supabase
      .from("verifications")
      .update({
        actif: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!scope.tousMagasins && scope.magasinId) {
      query = query.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    await addVerificationHistory({
      verificationId: current.id,
      magasinId: current.magasin_id,
      action: "Suppression",
      details: `Vérification supprimée : ${current.reference} - ${current.titre}`,
      ancienStatut: current.statut,
      nouveauStatut: null,
    });
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function changeVerificationStatus(
  id: string,
  statut: Verification["statut"],
  scope: VerificationScope
): Promise<void> {
  try {
    const current =
      await getVerification(id, scope);

    let query = supabase
      .from("verifications")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!scope.tousMagasins && scope.magasinId) {
      query = query.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    await addVerificationHistory({
      verificationId: current.id,
      magasinId: current.magasin_id,
      action: "Changement de statut",
      details: `${current.reference} : ${current.statut} → ${statut}`,
      ancienStatut: current.statut,
      nouveauStatut: statut,
    });
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function markVerificationAsCompleted(
  id: string,
  options: {
    resultat: Verification["resultat"];
    dateRealisation?: string;
    anomalies?: string | null;
    actionsCorrectives?: string | null;
    observations?: string | null;
  },
  scope: VerificationScope
): Promise<Verification> {
  try {
    const current =
      await getVerification(id, scope);

    const dateRealisation =
      options.dateRealisation ?? todayISO();

    let prochaineDate =
      current.date_prochaine_verification;

    if (
      current.recurrente &&
      current.periodicite_valeur &&
      current.periodicite_unite
    ) {
      const date =
        new Date(`${dateRealisation}T12:00:00`);

      if (
        current.periodicite_unite === "jour"
      ) {
        date.setDate(
          date.getDate() +
            current.periodicite_valeur
        );
      }

      if (
        current.periodicite_unite ===
        "semaine"
      ) {
        date.setDate(
          date.getDate() +
            current.periodicite_valeur * 7
        );
      }

      if (
        current.periodicite_unite === "mois"
      ) {
        date.setMonth(
          date.getMonth() +
            current.periodicite_valeur
        );
      }

      if (
        current.periodicite_unite === "annee"
      ) {
        date.setFullYear(
          date.getFullYear() +
            current.periodicite_valeur
        );
      }

      prochaineDate =
        date.toISOString().slice(0, 10);
    }

    const statut =
      options.resultat === "non_conforme"
        ? "non_conforme"
        : "conforme";

    return await updateVerification(
      id,
      {
        resultat: options.resultat,
        statut,
        date_realisation: dateRealisation,
        date_derniere_verification:
          dateRealisation,
        date_prochaine_verification:
          prochaineDate,
        anomalies:
          options.anomalies ?? null,
        actions_correctives:
          options.actionsCorrectives ?? null,
        observations:
          options.observations ?? null,
      },
      scope
    );
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function getVerificationStats(
  filters: Pick<
    VerificationFilters,
    "magasinId" | "tousMagasins"
  >
): Promise<VerificationStats> {
  try {
    const items = await getVerifications({
      magasinId: filters.magasinId,
      tousMagasins: filters.tousMagasins,
    });

    const today = todayISO();
    const in30Days = addDays(today, 30);

    return {
      total: items.length,

      aPlanifier: items.filter(
        (item) =>
          item.statut === "a_planifier"
      ).length,

      planifiees: items.filter(
        (item) =>
          item.statut === "planifiee"
      ).length,

      conformes: items.filter(
        (item) =>
          item.statut === "conforme" ||
          item.statut === "levee"
      ).length,

      nonConformes: items.filter(
        (item) =>
          item.statut === "non_conforme"
      ).length,

      enRetard: items.filter(
        (item) =>
          !!item.date_prochaine_verification &&
          item.date_prochaine_verification <
            today &&
          ![
            "conforme",
            "levee",
            "annulee",
          ].includes(item.statut)
      ).length,

      aVenir30Jours: items.filter(
        (item) =>
          !!item.date_prochaine_verification &&
          item.date_prochaine_verification >=
            today &&
          item.date_prochaine_verification <=
            in30Days
      ).length,
    };
  } catch (error) {
    throwVerificationError(error);
  }
}

export async function addVerificationHistory({
  verificationId,
  magasinId,
  action,
  details,
  ancienStatut,
  nouveauStatut,
}: {
  verificationId: string;
  magasinId: string;
  action: string;
  details?: string | null;
  ancienStatut:
    | Verification["statut"]
    | null;
  nouveauStatut:
    | Verification["statut"]
    | null;
}): Promise<void> {
  try {
    const userId =
      await getCurrentUserId();

    const { error } = await supabase
      .from("verifications_historique")
      .insert({
        verification_id: verificationId,
        magasin_id: magasinId,
        action,
        details: details ?? null,
        ancien_statut: ancienStatut,
        nouveau_statut: nouveauStatut,
        utilisateur_id: userId,
      });

    if (error) {
      console.error(
        "Erreur historique vérification :",
        error
      );
    }
  } catch (error) {
    console.error(
      "Erreur historique vérification :",
      error
    );
  }
}

export async function getVerificationHistory(
  verificationId: string,
  scope: VerificationScope
): Promise<VerificationHistorique[]> {
  try {
    let query = supabase
      .from("verifications_historique")
      .select("*")
      .eq(
        "verification_id",
        verificationId
      )
      .order("created_at", {
        ascending: false,
      });

    if (!scope.tousMagasins && scope.magasinId) {
      query = query.eq(
        "magasin_id",
        scope.magasinId
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (
      data ?? []
    ) as VerificationHistorique[];
  } catch (error) {
    throwVerificationError(error);
  }
}