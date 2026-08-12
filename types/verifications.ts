export type VerificationStatut =
  | "a_planifier"
  | "planifiee"
  | "en_cours"
  | "conforme"
  | "non_conforme"
  | "levee"
  | "annulee";

export type VerificationResultat =
  | "conforme"
  | "conforme_avec_observations"
  | "non_conforme"
  | "non_realisee"
  | "sans_objet";

export type VerificationPeriodicite =
  | "jour"
  | "semaine"
  | "mois"
  | "annee";

export type VerificationCriticite =
  | "faible"
  | "normale"
  | "haute"
  | "critique";

export type VerificationCategorie =
  | "SSI"
  | "BAES"
  | "Extincteurs"
  | "RIA"
  | "Sprinkler"
  | "Désenfumage"
  | "Portes coupe-feu"
  | "Portes automatiques"
  | "Rideau souple"
  | "Électricité"
  | "Ascenseur"
  | "CTS"
  | "Commission sécurité"
  | "Formation"
  | "Autre";

export interface Verification {
  id: string;
  magasin_id: string;

  equipement_id: string | null;
  prestataire_id: string | null;
  planning_evenement_id: string | null;

  reference: string;
  titre: string;
  description: string | null;
  categorie: VerificationCategorie;

  statut: VerificationStatut;
  resultat: VerificationResultat | null;
  criticite: VerificationCriticite;

  date_derniere_verification: string | null;
  date_prochaine_verification: string | null;
  date_realisation: string | null;

  recurrente: boolean;
  periodicite_valeur: number | null;
  periodicite_unite: VerificationPeriodicite | null;

  organisme_controle: string | null;
  technicien: string | null;
  rapport_url: string | null;
  rapport_path: string | null;

  anomalies: string | null;
  actions_correctives: string | null;
  observations: string | null;

  actif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationListItem extends Verification {
  equipement_nom?: string | null;
  equipement_numero?: string | null;
  prestataire_nom?: string | null;
  magasin_nom?: string | null;
}

export interface VerificationFilters {
  magasinId?: string | null;
  tousMagasins?: boolean;

  recherche?: string;
  categorie?: VerificationCategorie | "toutes";
  statut?: VerificationStatut | "tous";
  resultat?: VerificationResultat | "tous";
  criticite?: VerificationCriticite | "toutes";

  dateDebut?: string | null;
  dateFin?: string | null;
  uniquementEnRetard?: boolean;
}

export interface VerificationCreateInput {
  magasin_id: string;

  equipement_id?: string | null;
  prestataire_id?: string | null;
  planning_evenement_id?: string | null;

  reference: string;
  titre: string;
  description?: string | null;
  categorie: VerificationCategorie;

  statut: VerificationStatut;
  resultat?: VerificationResultat | null;
  criticite: VerificationCriticite;

  date_derniere_verification?: string | null;
  date_prochaine_verification?: string | null;
  date_realisation?: string | null;

  recurrente: boolean;
  periodicite_valeur?: number | null;
  periodicite_unite?: VerificationPeriodicite | null;

  organisme_controle?: string | null;
  technicien?: string | null;

  anomalies?: string | null;
  actions_correctives?: string | null;
  observations?: string | null;

  actif?: boolean;
}

export interface VerificationUpdateInput
  extends Partial<VerificationCreateInput> {}

export interface VerificationStats {
  total: number;
  aPlanifier: number;
  planifiees: number;
  conformes: number;
  nonConformes: number;
  enRetard: number;
  aVenir30Jours: number;
}

export interface VerificationDocument {
  id: string;
  verification_id: string;
  magasin_id: string;

  nom: string;
  type_mime: string | null;
  taille: number | null;
  url: string;
  path: string;

  created_by: string | null;
  created_at: string;
}

export interface VerificationHistorique {
  id: string;
  verification_id: string;
  magasin_id: string;

  action: string;
  details: string | null;
  ancien_statut: VerificationStatut | null;
  nouveau_statut: VerificationStatut | null;

  utilisateur_id: string | null;
  created_at: string;
}