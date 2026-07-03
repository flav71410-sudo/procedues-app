import { supabase } from "@/lib/supabase";

export async function getProfil(id: string) {
  const { data, error } = await supabase
    .from("profils")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erreur profil :", error.message);
    return null;
  }

  return data;
}