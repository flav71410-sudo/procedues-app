"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/AppShell";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { ajouterJournal } from "@/services/journal";

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
  const { role } = useAuth();
  const dialog = useDialog();

  const canEdit = role === "ADMIN" || role === "DM";

  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreSecteur, setFiltreSecteur] = useState("Tous");
  const [filtreEtat, setFiltreEtat] = useState("Tous");

  async function chargerDonnees() {
    const [
      { data: equipementsData, error: equipementsError },
      { data: typesData, error: typesError },
      { data: secteursData, error: secteursError },
      { data: prestatairesData, error: prestatairesError },
    ] = await Promise.all([
      supabase
        .from("equipements")
        .select("*")
        .order("numero", { ascending: true }),

      supabase
        .from("types_equipements")
        .select("id, nom")
        .order("nom"),

      supabase
        .from("secteurs")
        .select("id, nom")
        .order("nom"),

      supabase
        .from("prestataires")
        .select("id, nom")
        .order("nom"),
    ]);

    if (equipementsError) {
      console.error(
        "Erreur lors du chargement des équipements :",
        equipementsError
      );
    }

    if (typesError) {
      console.error(
        "Erreur lors du chargement des types d’équipements :",
        typesError
      );
    }

    if (secteursError) {
      console.error(
        "Erreur lors du chargement des secteurs :",
        secteursError
      );
    }

    if (prestatairesError) {
      console.error(
        "Erreur lors du chargement des prestataires :",
        prestatairesError
      );
    }

    setEquipements(equipementsData || []);
    setTypes(typesData || []);
    setSecteurs(secteursData || []);
    setPrestataires(prestatairesData || []);
  }

  useEffect(() => {
    void chargerDonnees();
  }, []);

  function nomType(id: string | null) {
    return types.find((type) => type.id === id)?.nom || "Non défini";
  }

  function nomSecteur(id: string | null) {
    return secteurs.find((secteur) => secteur.id === id)?.nom || "Non défini";
  }

  function nomPrestataire(id: string | null) {
    return (
      prestataires.find((prestataire) => prestataire.id === id)?.nom || "—"
    );
  }

  const equipementsFiltres = equipements.filter((equipement) => {
    const texte = [
      equipement.numero,
      equipement.nom,
      equipement.emplacement || "",
      equipement.etat,
      nomType(equipement.type_id),
      nomSecteur(equipement.secteur_id),
      nomPrestataire(equipement.prestataire_id),
    ]
      .join(" ")
      .toLowerCase();

    const okRecherche = texte.includes(recherche.toLowerCase());
    const okType =
      filtreType === "Tous" || equipement.type_id === filtreType;
    const okSecteur =
      filtreSecteur === "Tous" ||
      equipement.secteur_id === filtreSecteur;
    const okEtat =
      filtreEtat === "Tous" || equipement.etat === filtreEtat;

    return okRecherche && okType && okSecteur && okEtat;
  });

  function badgeEtat(etat: string) {
    if (etat === "En service") return "success";
    if (etat === "Hors service") return "danger";
    if (etat === "En maintenance") return "warning";

    return "gray";
  }

  async function supprimerEquipement(
    id: string,
    numero: string,
    nom: string
  ) {
    if (!canEdit) {
      return;
    }

    const ok = await dialog.delete({
      title: "Supprimer l’équipement ?",
      itemName: `${numero} - ${nom}`,
      description:
        "Cette action est définitive. L’équipement sera supprimé de la base.",
    });

    if (!ok) {
      return;
    }

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

    await chargerDonnees();
  }

  return (
    <AppShell>
      <AppPage
        title="Liste des équipements"
        subtitle="Recherche, filtres et suivi du patrimoine technique."
        actions={
          canEdit ? (
            <AppButton
              onClick={() => {
                window.location.href = "/equipements/nouveau";
              }}
            >
              Nouvel équipement
            </AppButton>
          ) : undefined
        }
      >
        <AppCard>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <AppInput
              placeholder="Rechercher un équipement..."
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
            />

            <AppSelect
              value={filtreType}
              onChange={(event) => setFiltreType(event.target.value)}
              options={[
                { value: "Tous", label: "Tous les types" },
                ...types.map((type) => ({
                  value: type.id,
                  label: type.nom,
                })),
              ]}
            />

            <AppSelect
              value={filtreSecteur}
              onChange={(event) => setFiltreSecteur(event.target.value)}
              options={[
                { value: "Tous", label: "Tous les secteurs" },
                ...secteurs.map((secteur) => ({
                  value: secteur.id,
                  label: secteur.nom,
                })),
              ]}
            />

            <AppSelect
              value={filtreEtat}
              onChange={(event) => setFiltreEtat(event.target.value)}
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
              canEdit ? (
                <AppButton
                  onClick={() => {
                    window.location.href = "/equipements/nouveau";
                  }}
                >
                  Ajouter un équipement
                </AppButton>
              ) : undefined
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
            {equipementsFiltres.map((equipement) => (
              <tr key={equipement.id}>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                  {equipement.numero}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {equipement.nom}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomType(equipement.type_id)}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomSecteur(equipement.secteur_id)}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {equipement.emplacement || "—"}
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {nomPrestataire(equipement.prestataire_id)}
                </td>

                <td className="px-6 py-4">
                  <AppBadge variant={badgeEtat(equipement.etat) as any}>
                    {equipement.etat}
                  </AppBadge>
                </td>

                <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                  {equipement.prochaine_verification
                    ? new Date(
                        equipement.prochaine_verification
                      ).toLocaleDateString("fr-FR")
                    : "—"}
                </td>

                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <AppButton
                      variant="secondary"
                      className="px-3 py-2 text-xs"
                      onClick={() => {
                        window.location.href = `/equipements/${equipement.id}`;
                      }}
                    >
                      Voir
                    </AppButton>

                    {canEdit && (
                      <AppButton
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        onClick={() =>
                          supprimerEquipement(
                            equipement.id,
                            equipement.numero,
                            equipement.nom
                          )
                        }
                      >
                        Supprimer
                      </AppButton>
                    )}
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