import { supabase } from "@/lib/supabase";

type HistoriqueParams = {
  module: string;
  objet: string;
  objetId?: string;
  action: string;
  description?: string;
  utilisateur?: string;
};

export async function ajouterHistorique({
  module,
  objet,
  objetId,
  action,
  description,
  utilisateur = "Utilisateur",
}: HistoriqueParams) {
  const { error } = await supabase.from("historique").insert({
    module,
    objet,
    objet_id: objetId,
    action,
    description,
    utilisateur,
  });

  if (error) {
    console.error("Erreur historique :", error);
  }
}