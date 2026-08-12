export type PlanningStatut =
  | "planifie"
  | "en_cours"
  | "termine"
  | "annule";

export type PlanningPriorite =
  | "basse"
  | "normale"
  | "haute"
  | "critique";

export type PlanningPeriodicite =
  | "jour"
  | "semaine"
  | "mois"
  | "annee";

export type PlanningRappelUnite =
  | "minute"
  | "heure"
  | "jour"
  | "semaine";

export interface PlanningEvent {
  id: string;
  magasin_id: string;
  maintenance_id: string | null;
  equipement_id: string | null;
  prestataire_id: string | null;
  titre: string;
  description: string | null;
  categorie: string;
  date_evenement: string;
  heure_debut: string | null;
  heure_fin: string | null;
  statut: PlanningStatut;
  priorite: PlanningPriorite;
  recurrent: boolean;
  periodicite_valeur: number | null;
  periodicite_unite: PlanningPeriodicite | null;
  rappel_email_active: boolean;
  rappel_email_delai: number | null;
  rappel_email_unite: PlanningRappelUnite | null;
  rappel_email_destinataires: string[] | null;
  rappel_email_dernier_envoi: string | null;
  alerte_active: boolean;
  alerte_delai_jours: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanningFilters {
  magasinId?: string | null;
  tousMagasins?: boolean;
  categorie?: string;
  statut?: PlanningStatut | "tous";
  recherche?: string;
}

export interface PlanningCreateInput {
  magasin_id: string;
  maintenance_id?: string | null;
  equipement_id?: string | null;
  prestataire_id?: string | null;
  titre: string;
  description?: string | null;
  categorie: string;
  date_evenement: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  statut: PlanningStatut;
  priorite: PlanningPriorite;
  recurrent: boolean;
  periodicite_valeur?: number | null;
  periodicite_unite?: PlanningPeriodicite | null;
  rappel_email_active?: boolean;
  rappel_email_delai?: number | null;
  rappel_email_unite?: PlanningRappelUnite | null;
  rappel_email_destinataires?: string[] | null;
  alerte_active?: boolean;
  alerte_delai_jours?: number;
}