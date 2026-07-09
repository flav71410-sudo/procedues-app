"use client";

import { useDialog } from "@/providers/DialogProvider";
import { ajouterJournal } from "@/services/journal";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  AppBadge,
  AppButton,
  AppCard,
  AppEmptyState,
  AppInput,
  AppPage,
  AppSelect,
  AppTable,
} from "@/components/ui";

type TypeEquipement = {
  id: string;
  nom: string;
};

type Secteur = {
  id: string;
  nom: string;
};

type Prestataire = {
  id: string;
  nom: string;
};

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string;
  prochaine_verification: string | null;
  type_id: string | null;
  secteur_id: string | null;
  prestataire_id: string | null;
};

export default function EquipementsListePage() {
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreSecteur, setFiltreSecteur] = useState("Tous");
  const [filtreEtat, setFiltreEtat] = useState("Tous");
  const dialog = useDialog();

  async function chargerDonnees() {
    const { data: equipementsData } = await supabase
      .from("equipements")
      .select("*")
      .order("numero", { ascending: true });

    const { data: typesData } = await supabase
      .from("types_equipements")
      .select("id, nom")
      .order("nom");

    const { data: secteursData } = await supabase
      .from("secteurs")
      .select("id, nom")
      .order("nom");

    const { data: prestatairesData } = await supabase
      .from("prestataires")
      .select("id, nom")
      .order("nom");

    setEquipements(equipementsData || []);
    setTypes(typesData || []);
    setSecteurs(secteursData || []);
    setPrestataires(prestatairesData || []);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function nomType(id: string | null) {
    return types.find((t) => t.id === id)?.nom || "Non défini";
  }

  function nomSecteur(id: string | null) {
    return secteurs.find((s) => s.id === id)?.nom || "Non défini";
  }

  function nomPrestataire(id: string | null) {
    return prestataires.find((p) => p.id === id)?.nom || "—";
  }

  const equipementsFiltres = equipements.filter((e) => {
    const texte = `${e.numero} ${e.nom} ${e.emplacement || ""} ${e.etat} ${nomType(
      e.type_id
    )} ${nomSecteur(e.secteur_id)} ${nomPrestataire(e.prestataire_id)}`.toLowerCase();

    const okRecherche = texte.includes(recherche.toLowerCase());
    const okType = filtreType === "Tous" || e.type_id === filtreType;
    const okSecteur = filtreSecteur === "Tous" || e.secteur_id === filtreSecteur;
    const okEtat = filtreEtat === "Tous" || e.etat === filtreEtat;

    return okRecherche && okType && okSecteur && okEtat;
  });

  function badgeEtat(etat: string) {
    if (etat === "En service") return "success";
    if (etat === "Hors service") return "danger";
    if (etat === "En maintenance") return "warning";
    return "gray";
  }
async function supprimerEquipement(id: string, numero: string, nom: string) {
  const ok = await dialog.delete({
    title: "Supprimer l’équipement ?",
    itemName: `${numero} - ${nom}`,
    description:
      "Cette action est définitive. L’équipement sera supprimé de la base.",
  });

  if (!ok) return;

  const { error } = await supabase
    .from("equipements")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await ajouterJournal(
    "Suppression",
    "Équipements",
    `Équipement supprimé : ${numero} - ${nom}`
  );

  chargerDonnees();
}
  return (
    <AppShell>
      <AppPage
        title="Liste des équipements"
        subtitle="Recherche, filtres et suivi du patrimoine technique."
        actions={
          <AppButton onClick={() => (window.location.href = "/equipements/nouveau")}>
            Nouvel équipement
          </AppButton>
        }
      >
        <AppCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AppInput
              placeholder="Rechercher un équipement..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />

            <AppSelect
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              options={[
                { value: "Tous", label: "Tous les types" },
                ...types.map((t) => ({ value: t.id, label: t.nom })),
              ]}
            />

            <AppSelect
              value={filtreSecteur}
              onChange={(e) => setFiltreSecteur(e.target.value)}
              options={[
                { value: "Tous", label: "Tous les secteurs" },
                ...secteurs.map((s) => ({ value: s.id, label: s.nom })),
              ]}
            />

            <AppSelect
              value={filtreEtat}
              onChange={(e) => setFiltreEtat(e.target.value)}
              options={[
                { value: "Tous", label: "Tous les états" },
                { value: "En service", label: "En service" },
                { value: "Hors service", label: "Hors service" },
                { value: "En maintenance", label: "En maintenance" },
                { value: "À remplacer", label: "À remplacer" },
                { value: "Déposé", label: "Déposé" },
              ]}
            />
          </div>
        </AppCard>

        {equipementsFiltres.length === 0 ? (
          <AppEmptyState
            icon="🏗️"
            title="Aucun équipement trouvé"
            description="Aucun équipement ne correspond à votre recherche."
            action={
              <AppButton onClick={() => (window.location.href = "/equipements/nouveau")}>
                Ajouter un équipement
              </AppButton>
            }
          />
        ) : (
          <AppTable
            headers={[
              "N°",
              "Désignation",
              "Type",
              "Secteur",
              "Emplacement",
              "Prestataire",
              "État",
              "Vérification",
              "Actions",
            ]}
          >
            {equipementsFiltres.map((e) => (
              <tr key={e.id}>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                  {e.numero}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {e.nom}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomType(e.type_id)}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomSecteur(e.secteur_id)}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {e.emplacement || "—"}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomPrestataire(e.prestataire_id)}
                </td>

                <td className="px-6 py-4">
                  <AppBadge variant={badgeEtat(e.etat) as any}>
                    {e.etat}
                  </AppBadge>
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {e.prochaine_verification
                    ? new Date(e.prochaine_verification).toLocaleDateString("fr-FR")
                    : "—"}
                </td>

                <td className="px-6 py-4">
                 <div className="flex gap-2">
  <AppButton
    variant="secondary"
    className="px-3 py-2 text-xs"
    onClick={() => (window.location.href = `/equipements/${e.id}`)}
  >
    Voir
  </AppButton>

  <AppButton
    variant="danger"
    className="px-3 py-2 text-xs"
    onClick={() => supprimerEquipement(e.id, e.numero, e.nom)}
  >
    Supprimer
  </AppButton>
</div>
                </td>
              </tr>
            ))}
          </AppTable>
        )}
      </AppPage>
    </AppShell>
  );
}