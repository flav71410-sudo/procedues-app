import { supabase } from "@/lib/supabase/client";


/* ============================================================
   TYPES
============================================================ */

export type Maintenance = {
  id: string;
  numero: string;
  magasin_id: string;

  equipement_id: string;
  prestataire_id: string | null;

  type_id: string;
  priorite_id: string;
  criticite_id: string;
  statut_id: string;
  resultat_id: string | null;

  titre: string;
  description: string | null;
  anomalies: string | null;
  travaux_realises: string | null;
  observations: string | null;

  date_debut: string;
  date_fin: string | null;

  duree_minutes: number | null;
  equipement_immobilise: boolean;
  date_remise_service: string | null;

  cout: number | null;
  technicien: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceDocument = {
  id: string;
  maintenance_id: string;

  nom_original: string;
  nom_stockage: string;
  fichier_path: string;

  type_mime: string | null;
  taille: number | null;

  created_by: string | null;
  created_at: string;
};

export type MaintenanceHistorique = {
  id: string;
  maintenance_id: string;

  action: string;
  description: string | null;

  ancienne_valeur: Record<string, unknown> | null;
  nouvelle_valeur: Record<string, unknown> | null;

  utilisateur_id: string | null;
  created_at: string;
};

export type EquipementOption = {
  id: string;
  label: string;
  numero: string | null;
  secteur: string | null;
};

export type PrestataireOption = {
  id: string;
  label: string;
};

export type ReferentielOption = {
  id: string;
  label: string;
  code: string | null;
  categorie: string | null;
};

export type MaintenanceScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

export type MaintenanceFormOptions = {
  equipements: EquipementOption[];
  prestataires: PrestataireOption[];
  types: ReferentielOption[];
  priorites: ReferentielOption[];
  criticites: ReferentielOption[];
  statuts: ReferentielOption[];
  resultats: ReferentielOption[];
};

export type MaintenanceCreateInput = {
  titre: string;
  magasin_id?: string;

  equipement_id: string;
  prestataire_id?: string | null;

  type_id: string;
  priorite_id: string;
  criticite_id: string;
  statut_id: string;
  resultat_id?: string | null;

  description?: string | null;
  anomalies?: string | null;
  travaux_realises?: string | null;
  observations?: string | null;

  date_debut?: string;
  date_fin?: string | null;

  duree_minutes?: number | null;
  equipement_immobilise?: boolean;
  date_remise_service?: string | null;

  cout?: number | null;
  technicien?: string | null;
};

export type MaintenanceUpdateInput = Partial<MaintenanceCreateInput>;

export type MaintenanceListItem = Maintenance & {
  equipement_label: string;
  equipement_numero: string | null;
  prestataire_label: string | null;

  type_label: string;
  priorite_label: string;
  criticite_label: string;
  statut_label: string;
  resultat_label: string | null;
};

export type MaintenanceDetail = MaintenanceListItem & {
  documents: MaintenanceDocument[];
  historique: MaintenanceHistorique[];
};

/* ============================================================
   CONSTANTES
============================================================ */

const DOCUMENTS_BUCKET = "documents";

/* ============================================================
   OUTILS INTERNES
============================================================ */

function normaliserTexte(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const texte = value.trim();

  return texte.length > 0 ? texte : null;
}

function obtenirLabel(
  ligne: Record<string, unknown>,
  valeurParDefaut = "Sans libellé"
): string {
  const candidats = [
    ligne.nom,
    ligne.libelle,
    ligne.label,
    ligne.titre,
    ligne.raison_sociale,
    ligne.designation,
    ligne.numero,
  ];

  for (const candidat of candidats) {
    const valeur = normaliserTexte(candidat);

    if (valeur) {
      return valeur;
    }
  }

  return valeurParDefaut;
}

function obtenirCategorieReferentiel(
  ligne: Record<string, unknown>
): string | null {
  return (
    normaliserTexte(ligne.categorie) ??
    normaliserTexte(ligne.type) ??
    normaliserTexte(ligne.groupe) ??
    normaliserTexte(ligne.famille)
  );
}

function nettoyerCategorie(value: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function appartientCategorie(
  referentiel: ReferentielOption,
  categories: string[]
): boolean {
  const categorie = nettoyerCategorie(referentiel.categorie);

  return categories.some((valeur) => {
    const categorieRecherchee = nettoyerCategorie(valeur);

    return (
      categorie === categorieRecherchee ||
      categorie.includes(categorieRecherchee)
    );
  });
}

function nettoyerNomFichier(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function obtenirMessageErreur(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Une erreur inconnue est survenue.";
}

async function obtenirUtilisateurConnecte(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Erreur récupération utilisateur :", error);
    return null;
  }

  return user?.id ?? null;
}

function preparerDonneesMaintenance(
  donnees: MaintenanceCreateInput | MaintenanceUpdateInput
): Record<string, unknown> {
  const resultat: Record<string, unknown> = {};

  if ("magasin_id" in donnees) {
    resultat.magasin_id = donnees.magasin_id;
  }

  if ("titre" in donnees) {
    resultat.titre = normaliserTexte(donnees.titre);
  }

  if ("equipement_id" in donnees) {
    resultat.equipement_id = donnees.equipement_id;
  }

  if ("prestataire_id" in donnees) {
    resultat.prestataire_id = donnees.prestataire_id || null;
  }

  if ("type_id" in donnees) {
    resultat.type_id = donnees.type_id;
  }

  if ("priorite_id" in donnees) {
    resultat.priorite_id = donnees.priorite_id;
  }

  if ("criticite_id" in donnees) {
    resultat.criticite_id = donnees.criticite_id;
  }

  if ("statut_id" in donnees) {
    resultat.statut_id = donnees.statut_id;
  }

  if ("resultat_id" in donnees) {
    resultat.resultat_id = donnees.resultat_id || null;
  }

  if ("description" in donnees) {
    resultat.description = normaliserTexte(donnees.description);
  }

  if ("anomalies" in donnees) {
    resultat.anomalies = normaliserTexte(donnees.anomalies);
  }

  if ("travaux_realises" in donnees) {
    resultat.travaux_realises = normaliserTexte(
      donnees.travaux_realises
    );
  }

  if ("observations" in donnees) {
    resultat.observations = normaliserTexte(donnees.observations);
  }

  if ("date_debut" in donnees) {
    resultat.date_debut = donnees.date_debut;
  }

  if ("date_fin" in donnees) {
    resultat.date_fin = donnees.date_fin || null;
  }

  if ("duree_minutes" in donnees) {
    resultat.duree_minutes = donnees.duree_minutes ?? null;
  }

  if ("equipement_immobilise" in donnees) {
    resultat.equipement_immobilise =
      donnees.equipement_immobilise ?? false;
  }

  if ("date_remise_service" in donnees) {
    resultat.date_remise_service =
      donnees.date_remise_service || null;
  }

  if ("cout" in donnees) {
    resultat.cout = donnees.cout ?? null;
  }

  if ("technicien" in donnees) {
    resultat.technicien = normaliserTexte(donnees.technicien);
  }

  return resultat;
}

/* ============================================================
   CHARGEMENT DES LISTES
============================================================ */

export async function getEquipementsOptions(
  scope?: MaintenanceScope
): Promise<EquipementOption[]> {
  let query = supabase
    .from("equipements")
    .select("*")
    .order("nom", { ascending: true });

  if (scope && !scope.tousMagasins) {
    if (!scope.magasinId) {
      return [];
    }

    query = query.eq("magasin_id", scope.magasinId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Impossible de charger les équipements : ${error.message}`
    );
  }

  return ((data ?? []) as Record<string, unknown>[]).map((ligne) => ({
    id: String(ligne.id),
    label: obtenirLabel(ligne, "Équipement sans nom"),
    numero:
      normaliserTexte(ligne.numero) ??
      normaliserTexte(ligne.reference) ??
      normaliserTexte(ligne.code),
    secteur:
      normaliserTexte(ligne.secteur) ??
      normaliserTexte(ligne.localisation),
  }));
}

export async function getPrestatairesOptions(
  scope?: MaintenanceScope
): Promise<PrestataireOption[]> {
  let query = supabase
    .from("prestataires")
    .select("*");

  if (scope && !scope.tousMagasins) {
    if (!scope.magasinId) {
      return [];
    }

    query = query.eq("magasin_id", scope.magasinId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Impossible de charger les prestataires : ${error.message}`
    );
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map((ligne) => ({
      id: String(ligne.id),
      label: obtenirLabel(ligne, "Prestataire sans nom"),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function getReferentielsOptions(): Promise<
  ReferentielOption[]
> {
  const { data, error } = await supabase
    .from("referentiels")
    .select("*");

  if (error) {
    throw new Error(
      `Impossible de charger les référentiels : ${error.message}`
    );
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map((ligne) => ({
      id: String(ligne.id),
      label: obtenirLabel(ligne, "Référentiel sans libellé"),
      code: normaliserTexte(ligne.code),
      categorie: obtenirCategorieReferentiel(ligne),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function getMaintenanceFormOptions(
  scope?: MaintenanceScope
): Promise<MaintenanceFormOptions> {
  const [equipements, prestataires, referentiels] = await Promise.all([
    getEquipementsOptions(scope),
    getPrestatairesOptions(scope),
    getReferentielsOptions(),
  ]);

  return {
    equipements,
    prestataires,

    types: referentiels.filter((item) =>
      appartientCategorie(item, [
        "type maintenance",
        "type de maintenance",
        "maintenance type",
      ])
    ),

    priorites: referentiels.filter((item) =>
      appartientCategorie(item, ["priorite", "priorité"])
    ),

    criticites: referentiels.filter((item) =>
      appartientCategorie(item, ["criticite", "criticité"])
    ),

    statuts: referentiels.filter((item) =>
      appartientCategorie(item, [
        "statut maintenance",
        "statut de maintenance",
        "statut",
      ])
    ),

    resultats: referentiels.filter((item) =>
      appartientCategorie(item, [
        "resultat maintenance",
        "résultat maintenance",
        "resultat",
        "résultat",
      ])
    ),
  };
}

/* ============================================================
   MAINTENANCES
============================================================ */

export async function getMaintenances(
  scope: MaintenanceScope
): Promise<MaintenanceListItem[]> {
  let maintenanceQuery = supabase
    .from("maintenances")
    .select("*")
    .order("created_at", { ascending: false });

  if (!scope.tousMagasins) {
    if (!scope.magasinId) {
      return [];
    }

    maintenanceQuery = maintenanceQuery.eq(
      "magasin_id",
      scope.magasinId
    );
  }

  const [
    maintenanceResponse,
    equipements,
    prestataires,
    referentiels,
  ] = await Promise.all([
    maintenanceQuery,
    getEquipementsOptions(scope),
    getPrestatairesOptions(scope),
    getReferentielsOptions(),
  ]);

  if (maintenanceResponse.error) {
    throw new Error(
      `Impossible de charger les maintenances : ${maintenanceResponse.error.message}`
    );
  }

  const equipementsMap = new Map(
    equipements.map((item) => [item.id, item])
  );

  const prestatairesMap = new Map(
    prestataires.map((item) => [item.id, item])
  );

  const referentielsMap = new Map(
    referentiels.map((item) => [item.id, item])
  );

  return ((maintenanceResponse.data ?? []) as Maintenance[]).map(
    (maintenance) => {
      const equipement = equipementsMap.get(
        maintenance.equipement_id
      );

      const prestataire = maintenance.prestataire_id
        ? prestatairesMap.get(maintenance.prestataire_id)
        : null;

      return {
        ...maintenance,
        equipement_label:
          equipement?.label ?? "Équipement inconnu",
        equipement_numero:
          equipement?.numero ?? null,
        prestataire_label:
          prestataire?.label ?? null,
        type_label:
          referentielsMap.get(maintenance.type_id)?.label ??
          "Type inconnu",
        priorite_label:
          referentielsMap.get(maintenance.priorite_id)?.label ??
          "Priorité inconnue",
        criticite_label:
          referentielsMap.get(maintenance.criticite_id)?.label ??
          "Criticité inconnue",
        statut_label:
          referentielsMap.get(maintenance.statut_id)?.label ??
          "Statut inconnu",
        resultat_label: maintenance.resultat_id
          ? referentielsMap.get(maintenance.resultat_id)?.label ??
            "Résultat inconnu"
          : null,
      };
    }
  );
}

export async function getMaintenance(
  id: string,
  scope?: MaintenanceScope
): Promise<MaintenanceDetail> {
  if (!id) {
    throw new Error("Identifiant de maintenance manquant.");
  }

  const [
    maintenanceResponse,
    documents,
    historique,
    equipements,
    prestataires,
    referentiels,
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from("maintenances")
        .select("*")
        .eq("id", id);

      if (scope && !scope.tousMagasins && scope.magasinId) {
        query = query.eq("magasin_id", scope.magasinId);
      }

      return query.single();
    })(),

    getMaintenanceDocuments(id),
    getMaintenanceHistorique(id),
    getEquipementsOptions(scope),
    getPrestatairesOptions(scope),
    getReferentielsOptions(),
  ]);

  if (maintenanceResponse.error) {
    throw new Error(
      `Impossible de charger la maintenance : ${maintenanceResponse.error.message}`
    );
  }

  const maintenance = maintenanceResponse.data as Maintenance;

  const equipement = equipements.find(
    (item) => item.id === maintenance.equipement_id
  );

  const prestataire = maintenance.prestataire_id
    ? prestataires.find(
        (item) => item.id === maintenance.prestataire_id
      )
    : null;

  const referentielMap = new Map(
    referentiels.map((item) => [item.id, item])
  );

  return {
    ...maintenance,

    equipement_label:
      equipement?.label ?? "Équipement inconnu",

    equipement_numero:
      equipement?.numero ?? null,

    prestataire_label:
      prestataire?.label ?? null,

    type_label:
      referentielMap.get(maintenance.type_id)?.label ??
      "Type inconnu",

    priorite_label:
      referentielMap.get(maintenance.priorite_id)?.label ??
      "Priorité inconnue",

    criticite_label:
      referentielMap.get(maintenance.criticite_id)?.label ??
      "Criticité inconnue",

    statut_label:
      referentielMap.get(maintenance.statut_id)?.label ??
      "Statut inconnu",

    resultat_label: maintenance.resultat_id
      ? referentielMap.get(maintenance.resultat_id)?.label ??
        "Résultat inconnu"
      : null,

    documents,
    historique,
  };
}

export async function createMaintenance(
  donnees: MaintenanceCreateInput
): Promise<Maintenance> {
  if (!donnees.titre?.trim()) {
    throw new Error("Le titre de la maintenance est obligatoire.");
  }

  if (!donnees.equipement_id) {
    throw new Error("L'équipement est obligatoire.");
  }

  if (!donnees.type_id) {
    throw new Error("Le type de maintenance est obligatoire.");
  }

  if (!donnees.priorite_id) {
    throw new Error("La priorité est obligatoire.");
  }

  if (!donnees.criticite_id) {
    throw new Error("La criticité est obligatoire.");
  }

  if (!donnees.statut_id) {
    throw new Error("Le statut est obligatoire.");
  }

  if (!donnees.magasin_id) {
    throw new Error("Le magasin de la maintenance est obligatoire.");
  }

  const utilisateurId = await obtenirUtilisateurConnecte();

  const payload = {
    ...preparerDonneesMaintenance(donnees),
    created_by: utilisateurId,
  };

 const { data, error } = await supabase
  .from("maintenances")
  .insert(payload)
  .select("*")
  .single();

if (error) {
  throw new Error(
    `Impossible de créer la maintenance : ${error.message}`
  );
}

return data as Maintenance;
}

export async function updateMaintenance(
  id: string,
  donnees: MaintenanceUpdateInput
): Promise<Maintenance> {
  if (!id) {
    throw new Error("Identifiant de maintenance manquant.");
  }

  if ("titre" in donnees && !donnees.titre?.trim()) {
    throw new Error("Le titre ne peut pas être vide.");
  }

  const payload = preparerDonneesMaintenance(donnees);

  const { data, error } = await supabase
    .from("maintenances")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Impossible de modifier la maintenance : ${error.message}`
    );
  }

  return data as Maintenance;
}

export async function deleteMaintenance(id: string): Promise<void> {
  if (!id) {
    throw new Error("Identifiant de maintenance manquant.");
  }

  const documents = await getMaintenanceDocuments(id);

  for (const document of documents) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([document.fichier_path]);

    if (storageError) {
      console.error(
        `Impossible de supprimer le fichier ${document.fichier_path} :`,
        storageError
      );
    }
  }

  const { error } = await supabase
    .from("maintenances")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Impossible de supprimer la maintenance : ${error.message}`
    );
  }
}

/* ============================================================
   DOCUMENTS
============================================================ */

export async function getMaintenanceDocuments(
  maintenanceId: string
): Promise<MaintenanceDocument[]> {
  const { data, error } = await supabase
    .from("maintenance_documents")
    .select("*")
    .eq("maintenance_id", maintenanceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Impossible de charger les documents : ${error.message}`
    );
  }

  return (data ?? []) as MaintenanceDocument[];
}

export async function uploadMaintenanceDocument(
  maintenanceId: string,
  fichier: File
): Promise<MaintenanceDocument> {
  if (!maintenanceId) {
    throw new Error("Identifiant de maintenance manquant.");
  }

  if (!fichier) {
    throw new Error("Aucun fichier sélectionné.");
  }

  const utilisateurId = await obtenirUtilisateurConnecte();

  const nomOriginal = fichier.name;
  const nomNettoye =
    nettoyerNomFichier(fichier.name) || "document";

  const extension = nomNettoye.includes(".")
    ? `.${nomNettoye.split(".").pop()}`
    : "";

  const nomSansExtension = extension
    ? nomNettoye.slice(0, -extension.length)
    : nomNettoye;

  const nomStockage = `${crypto.randomUUID()}-${nomSansExtension}${extension}`;

  const fichierPath = `maintenance/${maintenanceId}/${nomStockage}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(fichierPath, fichier, {
      cacheControl: "3600",
      upsert: false,
      contentType:
        fichier.type || "application/octet-stream",
    });

  if (uploadError) {
    throw new Error(
      `Impossible d'envoyer le fichier : ${uploadError.message}`
    );
  }

  const { data, error: databaseError } = await supabase
    .from("maintenance_documents")
    .insert({
      maintenance_id: maintenanceId,
      nom_original: nomOriginal,
      nom_stockage: nomStockage,
      fichier_path: fichierPath,
      type_mime:
        fichier.type || "application/octet-stream",
      taille: fichier.size,
      created_by: utilisateurId,
    })
    .select("*")
    .single();

  if (databaseError) {
    await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([fichierPath]);

    throw new Error(
      `Le fichier a été envoyé, mais son enregistrement a échoué : ${databaseError.message}`
    );
  }

  return data as MaintenanceDocument;
}

export async function deleteMaintenanceDocument(
  document: MaintenanceDocument
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.fichier_path]);

  if (storageError) {
    throw new Error(
      `Impossible de supprimer le fichier : ${storageError.message}`
    );
  }

  const { error: databaseError } = await supabase
    .from("maintenance_documents")
    .delete()
    .eq("id", document.id);

  if (databaseError) {
    throw new Error(
      `Le fichier a été supprimé du stockage, mais pas de la base : ${databaseError.message}`
    );
  }
}

export async function getMaintenanceDocumentUrl(
  fichierPath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(fichierPath, 60 * 10);

  if (error) {
    throw new Error(
      `Impossible d'ouvrir le document : ${error.message}`
    );
  }

  return data.signedUrl;
}

export async function openMaintenanceDocument(
  fichierPath: string
): Promise<void> {
  const url = await getMaintenanceDocumentUrl(fichierPath);

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadMaintenanceDocument(
  document: MaintenanceDocument
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(document.fichier_path);

  if (error) {
    throw new Error(
      `Impossible de télécharger le document : ${error.message}`
    );
  }

  const url = URL.createObjectURL(data);
  const lien = window.document.createElement("a");

  lien.href = url;
  lien.download = document.nom_original;

  window.document.body.appendChild(lien);
  lien.click();
  lien.remove();

  URL.revokeObjectURL(url);
}

/* ============================================================
   HISTORIQUE
============================================================ */

export async function getMaintenanceHistorique(
  maintenanceId: string
): Promise<MaintenanceHistorique[]> {
  const { data, error } = await supabase
    .from("maintenance_historique")
    .select("*")
    .eq("maintenance_id", maintenanceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Impossible de charger l'historique : ${error.message}`
    );
  }

  return (data ?? []) as MaintenanceHistorique[];
}

export async function ajouterHistoriqueMaintenance(
  maintenanceId: string,
  action: string,
  description?: string | null,
  ancienneValeur?: Record<string, unknown> | null,
  nouvelleValeur?: Record<string, unknown> | null
): Promise<MaintenanceHistorique> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  const { data, error } = await supabase
    .from("maintenance_historique")
    .insert({
      maintenance_id: maintenanceId,
      action,
      description: normaliserTexte(description),
      ancienne_valeur: ancienneValeur ?? null,
      nouvelle_valeur: nouvelleValeur ?? null,
      utilisateur_id: utilisateurId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Impossible d'ajouter l'historique : ${error.message}`
    );
  }

  return data as MaintenanceHistorique;
}

/* ============================================================
   OUTIL D'AFFICHAGE DES ERREURS
============================================================ */

export function formatMaintenanceError(error: unknown): string {
  return obtenirMessageErreur(error);
}