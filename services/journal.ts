import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "./auth";
import { getProfil } from "./profils";

export async function ajouterJournal(
  action: string,
  module: string,
  details?: string
) {
  const user = await getCurrentUser();
  if (!user) return;

  const profil = await getProfil(user.id);

  await supabase.from("journal_activite").insert({
    utilisateur_id: user.id,
    utilisateur_nom: profil ? `${profil.prenom} ${profil.nom}` : user.email,
    action,
    module,
    details,
  });
}