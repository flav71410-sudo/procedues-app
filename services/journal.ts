import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "./auth";
import { getProfil } from "./profils";

export async function ajouterJournal(
  action: string,
  module: string,
  details?: string,
  magasinId?: string | null
): Promise<void> {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const profil = await getProfil(user.id);

  const utilisateurNom = profil
    ? [profil.prenom, profil.nom]
        .filter(Boolean)
        .join(" ")
        .trim() || user.email
    : user.email;

  const magasinJournal =
    magasinId ??
    profil?.magasin_id ??
    null;

  const { error } = await supabase
    .from("journal_activite")
    .insert({
      utilisateur_id: user.id,
      utilisateur_nom:
        utilisateurNom || "Utilisateur inconnu",
      action,
      module,
      details: details || null,
      magasin_id: magasinJournal,
    });

  if (error) {
    console.error(
      "Erreur ajout journal :",
      error.message
    );
  }
}