import { supabase } from "@/lib/supabase";
import type {
  Consigne,
  ConsigneCreateInput,
  ConsigneFilters,
  ConsigneScope,
  ConsigneStats,
  ConsigneUpdateInput,
} from "@/types/consignes";

export class ConsignesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsignesError";
  }
}

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "Une erreur inconnue est survenue.";
}

function throwConsignesError(error: unknown): never {
  throw new ConsignesError(getErrorMessage(error));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function applyScope<T>(
  query: T,
  scope: ConsigneScope
): T {
  if (!scope.tousMagasins && scope.magasinId) {
    return (query as any).eq(
      "magasin_id",
      scope.magasinId
    ) as T;
  }

  return query;
}

export async function getConsignes(
  filters: ConsigneFilters
): Promise<Consigne[]> {
  try {
    let query = supabase
      .from("consignes")
      .select("*");

    if (!filters.tousMagasins) {
      if (!filters.magasinId) {
        return [];
      }

      query = query.eq(
        "magasin_id",
        filters.magasinId
      );
    }

    if (filters.uniquementActives ?? true) {
      query = query.eq("actif", true);
    }

    if (filters.categorie?.trim()) {
      query = query.eq(
        "categorie",
        filters.categorie.trim()
      );
    }

    if (filters.priorite?.trim()) {
      query = query.eq(
        "priorite",
        filters.priorite.trim()
      );
    }

    if (filters.secteur?.trim()) {
      query = query.eq(
        "secteur",
        filters.secteur.trim()
      );
    }

    query = query.order("created_at", {
      ascending: false,
      nullsFirst: false,
    });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let consignes = (data ?? []) as Consigne[];

    if (filters.recherche?.trim()) {
      const search = filters.recherche
        .trim()
        .toLowerCase();

      consignes = consignes.filter((consigne) =>
        [
          consigne.titre,
          consigne.contenu,
          consigne.categorie,
          consigne.priorite,
          consigne.secteur ?? "",
          consigne.auteur ?? "",
          consigne.fichier_nom ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    return consignes;
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function getConsigne(
  id: string,
  scope: ConsigneScope
): Promise<Consigne> {
  try {
    let query = supabase
      .from("consignes")
      .select("*")
      .eq("id", id);

    query = applyScope(query, scope);

    const { data, error } =
      await query.single();

    if (error) {
      throw error;
    }

    return data as Consigne;
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function createConsigne(
  input: ConsigneCreateInput
): Promise<Consigne> {
  try {
    const titre = normalizeText(input.titre);
    const contenu = normalizeText(input.contenu);
    const categorie = normalizeText(
      input.categorie
    );
    const priorite = normalizeText(
      input.priorite
    );

    if (!input.magasin_id) {
      throw new Error(
        "Le magasin est obligatoire."
      );
    }

    if (!titre) {
      throw new Error(
        "Le titre est obligatoire."
      );
    }

    if (!categorie) {
      throw new Error(
        "La catégorie est obligatoire."
      );
    }

    if (!priorite) {
      throw new Error(
        "La priorité est obligatoire."
      );
    }

    const payload: ConsigneCreateInput = {
      ...input,
      titre,
      contenu: contenu || "",
      categorie,
      priorite,
      secteur:
        normalizeText(input.secteur) || null,
      auteur:
        normalizeText(input.auteur) || null,
      actif: input.actif ?? true,
      fichier_url:
        normalizeText(input.fichier_url) || null,
      fichier_nom:
        normalizeText(input.fichier_nom) || null,
      date_creation:
        input.date_creation ??
        new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("consignes")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Consigne;
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function updateConsigne(
  id: string,
  input: ConsigneUpdateInput,
  scope: ConsigneScope
): Promise<Consigne> {
  try {
    const current = await getConsigne(
      id,
      scope
    );

    const payload: ConsigneUpdateInput = {
      ...input,
    };

    if (input.titre !== undefined) {
      const titre = normalizeText(input.titre);

      if (!titre) {
        throw new Error(
          "Le titre est obligatoire."
        );
      }

      payload.titre = titre;
    }

    if (input.contenu !== undefined) {
      payload.contenu =
        normalizeText(input.contenu) || "";
    }

    if (input.categorie !== undefined) {
      const categorie = normalizeText(
        input.categorie
      );

      if (!categorie) {
        throw new Error(
          "La catégorie est obligatoire."
        );
      }

      payload.categorie = categorie;
    }

    if (input.priorite !== undefined) {
      const priorite = normalizeText(
        input.priorite
      );

      if (!priorite) {
        throw new Error(
          "La priorité est obligatoire."
        );
      }

      payload.priorite = priorite;
    }

    if (input.secteur !== undefined) {
      payload.secteur =
        normalizeText(input.secteur) || null;
    }

    if (input.auteur !== undefined) {
      payload.auteur =
        normalizeText(input.auteur) || null;
    }

    if (input.fichier_url !== undefined) {
      payload.fichier_url =
        normalizeText(input.fichier_url) || null;
    }

    if (input.fichier_nom !== undefined) {
      payload.fichier_nom =
        normalizeText(input.fichier_nom) || null;
    }

    if (
      input.magasin_id &&
      input.magasin_id !== current.magasin_id
    ) {
      throw new Error(
        "Le changement de magasin d’une consigne n’est pas autorisé."
      );
    }

    let query = supabase
      .from("consignes")
      .update(payload)
      .eq("id", id);

    query = applyScope(query, scope);

    const { data, error } =
      await query
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return data as Consigne;
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function deleteConsigne(
  id: string,
  scope: ConsigneScope
): Promise<void> {
  try {
    let query = supabase
      .from("consignes")
      .update({ actif: false })
      .eq("id", id);

    query = applyScope(query, scope);

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function restoreConsigne(
  id: string,
  scope: ConsigneScope
): Promise<void> {
  try {
    let query = supabase
      .from("consignes")
      .update({ actif: true })
      .eq("id", id);

    query = applyScope(query, scope);

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function getConsigneStats(
  scope: ConsigneScope
): Promise<ConsigneStats> {
  try {
    const consignes = await getConsignes({
      magasinId: scope.magasinId,
      tousMagasins: scope.tousMagasins,
      uniquementActives: false,
    });

    return {
      total: consignes.length,
      actives: consignes.filter(
        (consigne) => consigne.actif !== false
      ).length,
      urgentes: consignes.filter(
        (consigne) =>
          consigne.actif !== false &&
          consigne.priorite
            .toLowerCase()
            .includes("urgent")
      ).length,
      avecFichier: consignes.filter(
        (consigne) =>
          !!consigne.fichier_url ||
          !!consigne.fichier_nom
      ).length,
    };
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function getConsigneCategories(
  scope: ConsigneScope
): Promise<string[]> {
  try {
    const consignes = await getConsignes({
      magasinId: scope.magasinId,
      tousMagasins: scope.tousMagasins,
      uniquementActives: false,
    });

    return Array.from(
      new Set(
        consignes
          .map((consigne) =>
            consigne.categorie.trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, "fr")
    );
  } catch (error) {
    throwConsignesError(error);
  }
}

export async function getConsigneSecteurs(
  scope: ConsigneScope
): Promise<string[]> {
  try {
    const consignes = await getConsignes({
      magasinId: scope.magasinId,
      tousMagasins: scope.tousMagasins,
      uniquementActives: false,
    });

    return Array.from(
      new Set(
        consignes
          .map((consigne) =>
            normalizeText(consigne.secteur)
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, "fr")
    );
  } catch (error) {
    throwConsignesError(error);
  }
}