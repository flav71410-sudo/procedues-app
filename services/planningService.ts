import { supabase } from "@/lib/supabase";
import type {
  PlanningCreateInput,
  PlanningEvent,
  PlanningFilters,
} from "@/types/planning";

export class PlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningError";
  }
}

function handleError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    throw new PlanningError(String(error.message));
  }

  throw new PlanningError("Erreur planning.");
}

export async function getPlanning(
  filters: PlanningFilters = {}
): Promise<PlanningEvent[]> {
  try {
    let query = supabase
      .from("planning_evenements")
      .select("*")
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

    if (filters.categorie) {
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

    query = query
      .order("date_evenement", {
        ascending: true,
      })
      .order("heure_debut", {
        ascending: true,
        nullsFirst: true,
      });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let events =
      (data ?? []) as PlanningEvent[];

    if (filters.recherche?.trim()) {
      const recherche =
        filters.recherche
          .trim()
          .toLowerCase();

      events = events.filter((event) =>
        [
          event.titre,
          event.description ?? "",
          event.categorie,
          event.statut,
          event.priorite,
        ]
          .join(" ")
          .toLowerCase()
          .includes(recherche)
      );
    }

    return events;
  } catch (error) {
    handleError(error);
  }
}

export async function getPlanningEvent(
  id: string,
  magasinId?: string | null,
  tousMagasins = false
): Promise<PlanningEvent> {
  try {
    let query = supabase
      .from("planning_evenements")
      .select("*")
      .eq("id", id);

    if (!tousMagasins && magasinId) {
      query = query.eq(
        "magasin_id",
        magasinId
      );
    }

    const { data, error } =
      await query.single();

    if (error) {
      throw error;
    }

    return data as PlanningEvent;
  } catch (error) {
    handleError(error);
  }
}

export async function createPlanningEvent(
  input: PlanningCreateInput
): Promise<PlanningEvent> {
  try {
    if (!input.magasin_id) {
      throw new Error(
        "Le magasin est obligatoire."
      );
    }

    const { data, error } = await supabase
      .from("planning_evenements")
      .insert({
        ...input,
        actif: true,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as PlanningEvent;
  } catch (error) {
    handleError(error);
  }
}

export async function updatePlanningEvent(
  id: string,
  input: Partial<PlanningCreateInput>,
  magasinId?: string | null,
  tousMagasins = false
): Promise<PlanningEvent> {
  try {
    let query = supabase
      .from("planning_evenements")
      .update(input)
      .eq("id", id);

    if (!tousMagasins && magasinId) {
      query = query.eq(
        "magasin_id",
        magasinId
      );
    }

    const { data, error } =
      await query
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return data as PlanningEvent;
  } catch (error) {
    handleError(error);
  }
}

export async function deletePlanningEvent(
  id: string,
  magasinId?: string | null,
  tousMagasins = false
): Promise<void> {
  try {
    let query = supabase
      .from("planning_evenements")
      .update({ actif: false })
      .eq("id", id);

    if (!tousMagasins && magasinId) {
      query = query.eq(
        "magasin_id",
        magasinId
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    handleError(error);
  }
}

export async function movePlanningEvent(
  id: string,
  date_evenement: string,
  magasinId?: string | null,
  tousMagasins = false
): Promise<void> {
  try {
    let query = supabase
      .from("planning_evenements")
      .update({ date_evenement })
      .eq("id", id);

    if (!tousMagasins && magasinId) {
      query = query.eq(
        "magasin_id",
        magasinId
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    handleError(error);
  }
}

export async function changePlanningStatus(
  id: string,
  statut: PlanningEvent["statut"],
  magasinId?: string | null,
  tousMagasins = false
): Promise<void> {
  try {
    let query = supabase
      .from("planning_evenements")
      .update({ statut })
      .eq("id", id);

    if (!tousMagasins && magasinId) {
      query = query.eq(
        "magasin_id",
        magasinId
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    handleError(error);
  }
}