export type Plan = {
  id: string;
  nom: string;
  image_url: string;
  image_path: string | null;
  largeur: number | null;
  hauteur: number | null;
  created_at: string | null;
  magasin_id: string | null;
};

export type PlanCreateInput = {
  nom: string;
  image_url: string;
  image_path?: string | null;
  largeur?: number | null;
  hauteur?: number | null;
  magasin_id: string;
};

export type PlanUpdateInput =
  Partial<PlanCreateInput>;

export type PlanScope = {
  magasinId: string | null;
  tousMagasins?: boolean;
};

export type PlanEquipement = {
  id: string;
  numero: string;
  nom: string;
  etat: string;
  plan_id: string | null;
  position_x: number | null;
  position_y: number | null;
  magasin_id: string | null;
  types_equipements:
    | {
        nom: string;
      }
    | {
        nom: string;
      }[]
    | null;
};

export type PlanStats = {
  total: number;
  enService: number;
  enMaintenance: number;
  horsService: number;
};