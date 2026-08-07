import { supabase } from "@/lib/supabase";
import type {
  CreateDocumentInput,
  DocumentFilters,
  DocumentItem,
  StatutDevis,
  UpdateDocumentInput,
} from "@/types/documents";

export class DocumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentsError";
  }
}

export type DocumentScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

export type DocumentStats = {
  total: number;
  favoris: number;
  archives: number;
  avecSousDossier: number;
};

export type DocumentFolderNode = {
  dossier: string;
  sousDossiers: string[];
  total: number;
};

export type DevisStats = {
  total: number;
  enAttente: number;
  valides: number;
  rejetes: number;
  investissementNPlus1: number;
  signes: number;
  nonSignes: number;
  montantEnAttenteHt: number;
  montantValideHt: number;
  montantRejeteHt: number;
  montantNPlus1Ht: number;
};

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message: unknown }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function throwDocumentsError(error: unknown): never {
  throw new DocumentsError(
    getErrorMessage(error)
  );
}

function normalizeText(
  value: string | null | undefined
): string {
  return (value ?? "").trim();
}

function normalizeTags(
  tags: string[] | undefined
): string[] {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function normalizeNumber(
  value: number | null | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return null;
  }

  return value;
}

function applyScope<T>(
  query: T,
  scope: DocumentScope
): T {
  if (
    !scope.tousMagasins &&
    scope.magasinId
  ) {
    return (
      query as any
    ).eq(
      "magasin_id",
      scope.magasinId
    ) as T;
  }

  return query;
}

export async function getDocuments(
  filters: DocumentFilters & {
    tousMagasins?: boolean;
  }
): Promise<DocumentItem[]> {
  try {
    let query = supabase
      .from("documents")
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

    if (filters.dossier?.trim()) {
      query = query.eq(
        "dossier",
        filters.dossier.trim()
      );
    }

    if (
      filters.sousDossier?.trim()
    ) {
      query = query.eq(
        "sous_dossier",
        filters.sousDossier.trim()
      );
    }

    if (
      filters.categorie?.trim()
    ) {
      query = query.eq(
        "categorie",
        filters.categorie.trim()
      );
    }

    if (filters.favoris) {
      query = query.eq(
        "favori",
        true
      );
    }

    if (
      filters.estDevis !==
      undefined
    ) {
      query = query.eq(
        "est_devis",
        filters.estDevis
      );
    }

    if (filters.statutDevis) {
      query = query.eq(
        "statut_devis",
        filters.statutDevis
      );
    }

    if (filters.anneeBudget) {
      query = query.eq(
        "annee_budget",
        filters.anneeBudget
      );
    }

    query = query.eq(
      "archive",
      filters.archives ?? false
    );

    query = query
      .order(
        "date_modification",
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .order("created_at", {
        ascending: false,
        nullsFirst: false,
      });

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    let documents =
      (data ?? []) as DocumentItem[];

    if (
      filters.recherche?.trim()
    ) {
      const recherche =
        filters.recherche
          .trim()
          .toLowerCase();

      documents =
        documents.filter(
          (document) =>
            [
              document.titre,
              document.description ??
                "",
              document.categorie,
              document.dossier ?? "",
              document.sous_dossier ??
                "",
              document.fichier_nom,
              document.auteur ?? "",
              document.secteur ?? "",
              document.prestataire ??
                "",
              document.statut_devis ??
                "",
              String(
                document.annee_budget ??
                  ""
              ),
              ...(
                document.tags ?? []
              ),
            ]
              .join(" ")
              .toLowerCase()
              .includes(recherche)
        );
    }

    return documents;
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function getDocument(
  id: string,
  scope: DocumentScope
): Promise<DocumentItem> {
  try {
    let query = supabase
      .from("documents")
      .select("*")
      .eq("id", id);

    query = applyScope(
      query,
      scope
    );

    const { data, error } =
      await query.single();

    if (error) {
      throw error;
    }

    return data as DocumentItem;
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function createDocument(
  input: CreateDocumentInput
): Promise<DocumentItem> {
  try {
    const titre =
      normalizeText(input.titre);

    const categorie =
      normalizeText(
        input.categorie
      );

    const fichierNom =
      normalizeText(
        input.fichier_nom
      );

    const fichierUrl =
      normalizeText(
        input.fichier_url
      );

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

    if (!fichierNom) {
      throw new Error(
        "Le nom du fichier est obligatoire."
      );
    }

    if (!fichierUrl) {
      throw new Error(
        "L’URL du fichier est obligatoire."
      );
    }

    if (!input.magasin_id) {
      throw new Error(
        "Le magasin est obligatoire."
      );
    }

    const estDevis =
      input.est_devis ?? false;

    const payload: CreateDocumentInput =
      {
        ...input,

        titre,
        categorie,
        fichier_nom:
          fichierNom,
        fichier_url:
          fichierUrl,

        description:
          normalizeText(
            input.description
          ) || null,

        dossier:
          normalizeText(
            input.dossier
          ) || null,

        sous_dossier:
          normalizeText(
            input.sous_dossier
          ) || null,

        auteur:
          normalizeText(
            input.auteur
          ) || null,

        secteur:
          normalizeText(
            input.secteur
          ) || null,

        prestataire:
          normalizeText(
            input.prestataire
          ) || null,

        extension:
          normalizeText(
            input.extension
          ) || null,

        date_document:
          input.date_document ||
          null,

        taille:
          normalizeNumber(
            input.taille
          ),

        version:
          input.version ?? 1,

        tags:
          normalizeTags(
            input.tags
          ),

        est_devis:
          estDevis,

        statut_devis:
          estDevis
            ? input.statut_devis ??
              "EN_ATTENTE"
            : null,

        montant_ht:
          estDevis
            ? normalizeNumber(
                input.montant_ht
              )
            : null,

        taux_tva:
          estDevis
            ? normalizeNumber(
                input.taux_tva
              ) ?? 20
            : null,

        annee_budget:
          estDevis
            ? normalizeNumber(
                input.annee_budget
              )
            : null,

        devis_signe:
          estDevis
            ? input.devis_signe ??
              false
            : false,

        date_signature:
          estDevis
            ? input.date_signature ??
              null
            : null,

        signe_par:
          estDevis
            ? input.signe_par ??
              null
            : null,

        commentaire_devis:
          estDevis
            ? normalizeText(
                input.commentaire_devis
              ) || null
            : null,
      };

    const { data, error } =
      await supabase
        .from("documents")
        .insert({
          ...payload,
          favori: false,
          archive: false,
        })
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return data as DocumentItem;
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
  scope: DocumentScope
): Promise<DocumentItem> {
  try {
    const current =
      await getDocument(
        id,
        scope
      );

    if (
      input.magasin_id &&
      input.magasin_id !==
        current.magasin_id
    ) {
      throw new Error(
        "Le changement de magasin d’un document n’est pas autorisé."
      );
    }

    const payload: UpdateDocumentInput =
      {
        ...input,
      };

    if (
      input.titre !== undefined
    ) {
      const titre =
        normalizeText(
          input.titre
        );

      if (!titre) {
        throw new Error(
          "Le titre est obligatoire."
        );
      }

      payload.titre =
        titre;
    }

    if (
      input.categorie !==
      undefined
    ) {
      const categorie =
        normalizeText(
          input.categorie
        );

      if (!categorie) {
        throw new Error(
          "La catégorie est obligatoire."
        );
      }

      payload.categorie =
        categorie;
    }

    if (
      input.description !==
      undefined
    ) {
      payload.description =
        normalizeText(
          input.description
        ) || null;
    }

    if (
      input.dossier !== undefined
    ) {
      payload.dossier =
        normalizeText(
          input.dossier
        ) || null;
    }

    if (
      input.sous_dossier !==
      undefined
    ) {
      payload.sous_dossier =
        normalizeText(
          input.sous_dossier
        ) || null;
    }

    if (
      input.auteur !== undefined
    ) {
      payload.auteur =
        normalizeText(
          input.auteur
        ) || null;
    }

    if (
      input.secteur !== undefined
    ) {
      payload.secteur =
        normalizeText(
          input.secteur
        ) || null;
    }

    if (
      input.prestataire !==
      undefined
    ) {
      payload.prestataire =
        normalizeText(
          input.prestataire
        ) || null;
    }

    if (
      input.extension !==
      undefined
    ) {
      payload.extension =
        normalizeText(
          input.extension
        ) || null;
    }

    if (
      input.tags !== undefined
    ) {
      payload.tags =
        normalizeTags(
          input.tags
        );
    }

    if (
      input.montant_ht !==
      undefined
    ) {
      payload.montant_ht =
        normalizeNumber(
          input.montant_ht
        );
    }

    if (
      input.taux_tva !==
      undefined
    ) {
      payload.taux_tva =
        normalizeNumber(
          input.taux_tva
        );
    }

    if (
      input.annee_budget !==
      undefined
    ) {
      payload.annee_budget =
        normalizeNumber(
          input.annee_budget
        );
    }

    if (
      input.commentaire_devis !==
      undefined
    ) {
      payload.commentaire_devis =
        normalizeText(
          input.commentaire_devis
        ) || null;
    }

    let query = supabase
      .from("documents")
      .update(payload)
      .eq("id", id);

    query = applyScope(
      query,
      scope
    );

    const { data, error } =
      await query
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return data as DocumentItem;
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function updateDevisStatus(
  id: string,
  statut: StatutDevis,
  commentaire: string | null,
  scope: DocumentScope
): Promise<DocumentItem> {
  return updateDocument(
    id,
    {
      est_devis: true,
      statut_devis: statut,
      commentaire_devis:
        commentaire,
    },
    scope
  );
}

export async function updateDevisSignature(
  id: string,
  signe: boolean,
  userId: string | null,
  scope: DocumentScope
): Promise<DocumentItem> {
  return updateDocument(
    id,
    {
      est_devis: true,
      devis_signe: signe,
      date_signature:
        signe
          ? new Date().toISOString()
          : null,
      signe_par:
        signe
          ? userId
          : null,
    },
    scope
  );
}

export async function getDevis(
  scope: DocumentScope,
  anneeBudget?: number | null
): Promise<DocumentItem[]> {
  return getDocuments({
    magasinId:
      scope.magasinId,
    tousMagasins:
      scope.tousMagasins,
    archives: false,
    estDevis: true,
    anneeBudget:
      anneeBudget ?? null,
  });
}

export async function getDevisStats(
  scope: DocumentScope,
  anneeBudget?: number | null
): Promise<DevisStats> {
  const devis =
    await getDevis(
      scope,
      anneeBudget
    );

  const montant = (
    statut: StatutDevis
  ) =>
    devis
      .filter(
        (item) =>
          item.statut_devis ===
          statut
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.montant_ht ??
              0
          ),
        0
      );

  const valides =
    devis.filter(
      (item) =>
        item.statut_devis ===
        "VALIDE"
    );

  return {
    total: devis.length,

    enAttente:
      devis.filter(
        (item) =>
          item.statut_devis ===
          "EN_ATTENTE"
      ).length,

    valides:
      valides.length,

    rejetes:
      devis.filter(
        (item) =>
          item.statut_devis ===
          "REJETE"
      ).length,

    investissementNPlus1:
      devis.filter(
        (item) =>
          item.statut_devis ===
          "INVESTISSEMENT_N_PLUS_1"
      ).length,

    signes:
      valides.filter(
        (item) =>
          item.devis_signe
      ).length,

    nonSignes:
      valides.filter(
        (item) =>
          !item.devis_signe
      ).length,

    montantEnAttenteHt:
      montant(
        "EN_ATTENTE"
      ),

    montantValideHt:
      montant("VALIDE"),

    montantRejeteHt:
      montant("REJETE"),

    montantNPlus1Ht:
      montant(
        "INVESTISSEMENT_N_PLUS_1"
      ),
  };
}

export async function deleteDocument(
  id: string,
  scope: DocumentScope
): Promise<void> {
  try {
    let query = supabase
      .from("documents")
      .update({
        archive: true,
      })
      .eq("id", id);

    query = applyScope(
      query,
      scope
    );

    const { error } =
      await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function restoreDocument(
  id: string,
  scope: DocumentScope
): Promise<void> {
  try {
    let query = supabase
      .from("documents")
      .update({
        archive: false,
      })
      .eq("id", id);

    query = applyScope(
      query,
      scope
    );

    const { error } =
      await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function toggleDocumentFavorite(
  id: string,
  favori: boolean,
  scope: DocumentScope
): Promise<void> {
  try {
    let query = supabase
      .from("documents")
      .update({
        favori,
      })
      .eq("id", id);

    query = applyScope(
      query,
      scope
    );

    const { error } =
      await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function getDocumentStats(
  scope: DocumentScope
): Promise<DocumentStats> {
  try {
    const documents =
      await getDocuments({
        magasinId:
          scope.magasinId,
        tousMagasins:
          scope.tousMagasins,
        archives: false,
      });

    const archives =
      await getDocuments({
        magasinId:
          scope.magasinId,
        tousMagasins:
          scope.tousMagasins,
        archives: true,
      });

    return {
      total:
        documents.length,

      favoris:
        documents.filter(
          (document) =>
            document.favori
        ).length,

      archives:
        archives.length,

      avecSousDossier:
        documents.filter(
          (document) =>
            Boolean(
              document.sous_dossier
            )
        ).length,
    };
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function getDocumentFolders(
  scope: DocumentScope
): Promise<DocumentFolderNode[]> {
  try {
    const documents =
      await getDocuments({
        magasinId:
          scope.magasinId,
        tousMagasins:
          scope.tousMagasins,
        archives: false,
      });

    const map =
      new Map<
        string,
        {
          sousDossiers: Set<string>;
          total: number;
        }
      >();

    for (const document of documents) {
      const dossier =
        normalizeText(
          document.dossier
        ) || "Sans dossier";

      const current =
        map.get(dossier) ?? {
          sousDossiers:
            new Set<string>(),
          total: 0,
        };

      current.total += 1;

      if (
        document.sous_dossier?.trim()
      ) {
        current.sousDossiers.add(
          document.sous_dossier.trim()
        );
      }

      map.set(
        dossier,
        current
      );
    }

    return Array.from(
      map.entries()
    )
      .map(
        ([
          dossier,
          value,
        ]) => ({
          dossier,
          sousDossiers:
            Array.from(
              value.sousDossiers
            ).sort((a, b) =>
              a.localeCompare(
                b,
                "fr"
              )
            ),
          total:
            value.total,
        })
      )
      .sort((a, b) =>
        a.dossier.localeCompare(
          b.dossier,
          "fr"
        )
      );
  } catch (error) {
    throwDocumentsError(error);
  }
}

export async function getDocumentCategories(
  scope: DocumentScope
): Promise<string[]> {
  try {
    const documents =
      await getDocuments({
        magasinId:
          scope.magasinId,
        tousMagasins:
          scope.tousMagasins,
        archives: false,
      });

    return Array.from(
      new Set(
        documents
          .map((document) =>
            document.categorie.trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(
        b,
        "fr"
      )
    );
  } catch (error) {
    throwDocumentsError(error);
  }
}