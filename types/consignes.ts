export type Consigne = {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur: string | null;
  auteur: string | null;
  actif: boolean | null;
  created_at: string | null;
  fichier_url: string | null;
  fichier_nom: string | null;
  date_creation: string | null;
  magasin_id: string | null;
};

export type ConsigneCreateInput = {
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur?: string | null;
  auteur?: string | null;
  actif?: boolean;
  fichier_url?: string | null;
  fichier_nom?: string | null;
  date_creation?: string | null;
  magasin_id: string;
};

export type ConsigneUpdateInput =
  Partial<ConsigneCreateInput>;

export type ConsigneFilters = {
  magasinId: string | null;
  tousMagasins?: boolean;
  recherche?: string;
  categorie?: string;
  priorite?: string;
  secteur?: string;
  uniquementActives?: boolean;
};

export type ConsigneScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

export type ConsigneStats = {
  total: number;
  actives: number;
  urgentes: number;
  avecFichier: number;
};