export type StatutDevis =
  | "EN_ATTENTE"
  | "VALIDE"
  | "REJETE"
  | "INVESTISSEMENT_N_PLUS_1";

export interface DocumentItem {
  id: string;

  titre: string;
  description: string | null;

  categorie: string;

  dossier: string | null;
  sous_dossier: string | null;

  fichier_url: string;
  fichier_nom: string;

  auteur: string | null;

  favori: boolean;

  extension: string | null;
  taille: number | null;

  version: number | null;

  secteur: string | null;
  prestataire: string | null;

  date_document: string | null;

  magasin_id: string | null;

  archive: boolean;

  tags: string[];

  // ----- Devis / Investissements -----

  est_devis: boolean;

  statut_devis: StatutDevis | null;

  montant_ht: number | null;

  taux_tva: number | null;

  montant_ttc: number | null;

  annee_budget: number | null;

  devis_signe: boolean;

  date_signature: string | null;

  signe_par: string | null;

  commentaire_devis: string | null;

  created_at: string | null;
  date_modification: string | null;
}

export interface DocumentFilters {
  magasinId?: string | null;

  dossier?: string;

  sousDossier?: string;

  categorie?: string;

  recherche?: string;

  favoris?: boolean;

  archives?: boolean;

  estDevis?: boolean;

  statutDevis?: StatutDevis | null;

  anneeBudget?: number | null;
}

export interface CreateDocumentInput {
  titre: string;

  description?: string | null;

  categorie: string;

  dossier?: string | null;

  sous_dossier?: string | null;

  fichier_url: string;

  fichier_nom: string;

  auteur?: string | null;

  secteur?: string | null;

  prestataire?: string | null;

  date_document?: string | null;

  magasin_id?: string | null;

  extension?: string | null;

  taille?: number | null;

  version?: number;

  tags?: string[];

  // ----- Devis / Investissements -----

  est_devis?: boolean;

  statut_devis?: StatutDevis | null;

  montant_ht?: number | null;

  taux_tva?: number | null;

  annee_budget?: number | null;

  devis_signe?: boolean;

  date_signature?: string | null;

  signe_par?: string | null;

  commentaire_devis?: string | null;
}

export interface UpdateDocumentInput
  extends Partial<CreateDocumentInput> {
  favori?: boolean;

  archive?: boolean;
}