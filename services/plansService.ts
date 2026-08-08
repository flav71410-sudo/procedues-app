import { supabase } from "@/lib/supabase";
import type {
  Plan,
  PlanCreateInput,
  PlanEquipement,
  PlanScope,
  PlanStats,
  PlanUpdateInput,
} from "@/types/plans";

function appliquerScope<T>(
  query: T,
  scope: PlanScope
): T {
  if (
    scope.tousMagasins ||
    !scope.magasinId
  ) {
    return query;
  }

  return (query as any).eq(
    "magasin_id",
    scope.magasinId
  );
}


async function signerImagePlan(
  plan: Plan
): Promise<Plan> {
  if (!plan.image_path) {
    return {
      ...plan,
      image_url: "",
    };
  }

  const { data, error } = await supabase.storage
    .from("plans")
    .createSignedUrl(plan.image_path, 3600);

  if (error || !data?.signedUrl) {
    console.error(
      `Impossible de générer l'URL signée du plan ${plan.id} :`,
      error
    );

    return {
      ...plan,
      image_url: "",
    };
  }

  return {
    ...plan,
    image_url: data.signedUrl,
  };
}

export async function getPlans(
  scope: PlanScope
): Promise<Plan[]> {
  let query = supabase
    .from("plans")
    .select("*")
    .order("nom");

  query = appliquerScope(query, scope);

  const { data, error } =
    await query;

  if (error) throw error;

  return Promise.all(
    ((data ?? []) as Plan[]).map(signerImagePlan)
  );
}

export async function getPlan(
  id: string,
  scope: PlanScope
): Promise<Plan> {
  let query = supabase
    .from("plans")
    .select("*")
    .eq("id", id);

  query = appliquerScope(query, scope);

  const { data, error } =
    await query.single();

  if (error) throw error;

  return signerImagePlan(data as Plan);
}

export async function createPlan(
  values: PlanCreateInput
): Promise<Plan> {
  const { data, error } =
    await supabase
      .from("plans")
      .insert(values)
      .select()
      .single();

  if (error) throw error;

  return signerImagePlan(data as Plan);
}

export async function updatePlan(
  id: string,
  values: PlanUpdateInput,
  scope: PlanScope
): Promise<Plan> {
  let query = supabase
    .from("plans")
    .update(values)
    .eq("id", id)
    .select();

  query = appliquerScope(query, scope);

  const { data, error } =
    await query.single();

  if (error) throw error;

  return signerImagePlan(data as Plan);
}

export async function deletePlan(
  id: string,
  scope: PlanScope
): Promise<void> {
  let query = supabase
    .from("plans")
    .delete()
    .eq("id", id);

  query = appliquerScope(query, scope);

  const { error } = await query;

  if (error) throw error;
}

export async function getPlanEquipements(
  planId: string,
  scope: PlanScope
): Promise<PlanEquipement[]> {
  if (!scope.magasinId) {
    return [];
  }

  const { data, error } = await supabase
    .from("equipements")
    .select(`
      id,
      numero,
      nom,
      etat,
      plan_id,
      position_x,
      position_y,
      magasin_id
    `)
    .eq("magasin_id", scope.magasinId)
    .eq("plan_id", planId)
    .not("position_x", "is", null)
    .not("position_y", "is", null)
    .order("numero", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    ...item,
    types_equipements: null,
  })) as PlanEquipement[];
}
export async function getTousEquipements(
  scope: PlanScope
): Promise<PlanEquipement[]> {
  if (!scope.magasinId) {
    return [];
  }

  const { data, error } = await supabase
    .from("equipements")
    .select(`
      id,
      numero,
      nom,
      etat,
      plan_id,
      position_x,
      position_y,
      magasin_id
    `)
    .eq("magasin_id", scope.magasinId)
    .order("numero", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    ...item,
    types_equipements: null,
  })) as PlanEquipement[];
}