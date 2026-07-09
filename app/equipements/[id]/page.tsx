"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  AppBadge,
  AppButton,
  AppCard,
  AppEmptyState,
  AppPage,
  AppTabs,
} from "@/components/ui";
import EquipmentPhotos from "@/components/equipements/EquipmentPhotos";
import EquipmentDocuments from "@/components/equipements/EquipmentDocuments";
import EquipmentHistory from "@/components/equipements/EquipmentHistory";
import EquipmentVerifications from "@/components/equipements/EquipmentVerifications";
import EquipmentLocation from "@/components/equipements/EquipmentLocation";

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string;
  fabricant: string | null;
  modele: string | null;
  numero_serie: string | null;
  date_installation: string | null;
  date_mise_service: string | null;
  prochaine_verification: string | null;
  observations: string | null;
  type_id: string | null;
  secteur_id: string | null;
  prestataire_id: string | null;
  plan_id: string | null;
  position_x: number | null;
  position_y: number | null;
};

type RefItem = {
  id: string;
  nom: string;
};

type Photo = {
  id: string;
  url: string;
  path: string | null;
  commentaire: string | null;
  created_at: string;
};

export default function EquipementDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState("infos");
  const [equipement, setEquipement] = useState<Equipement | null>(null);
  const [types, setTypes] = useState<RefItem[]>([]);
  const [secteurs, setSecteurs] = useState<RefItem[]>([]);
  const [prestataires, setPrestataires] = useState<RefItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  async function chargerDonnees() {
    setLoading(true);

    const { data: equipementData } = await supabase
      .from("equipements")
      .select("*")
      .eq("id", id)
      .single();

    const { data: typesData } = await supabase
      .from("types_equipements")
      .select("id, nom");

    const { data: secteursData } = await supabase
      .from("secteurs")
      .select("id, nom");

    const { data: prestatairesData } = await supabase
      .from("prestataires")
      .select("id, nom");

    const { data: photosData } = await supabase
  .from("equipements_photos")
  .select("id, url, path, commentaire, created_at")
  .eq("equipement_id", id)
  .order("created_at", { ascending: false });

    setEquipement(equipementData || null);
    setTypes(typesData || []);
    setSecteurs(secteursData || []);
    setPrestataires(prestatairesData || []);
    setPhotos(photosData || []);
    setLoading(false);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function nomDepuisListe(liste: RefItem[], itemId: string | null) {
    return liste.find((item) => item.id === itemId)?.nom || "Non défini";
  }

  function formatDate(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  if (loading) {
    return (
      <AppShell>
        <AppPage title="Équipement" subtitle="Chargement de la fiche...">
          <AppCard>Chargement...</AppCard>
        </AppPage>
      </AppShell>
    );
  }

  if (!equipement) {
    return (
      <AppShell>
        <AppPage title="Équipement introuvable">
          <AppEmptyState
            title="Aucun équipement trouvé"
            description="L’équipement demandé n’existe pas ou a été supprimé."
            action={
              <AppButton
                onClick={() => (window.location.href = "/equipements/liste")}
              >
                Retour à la liste
              </AppButton>
            }
          />
        </AppPage>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPage
        title={`${equipement.numero} — ${equipement.nom}`}
        subtitle="Fiche détaillée de l’équipement."
        actions={
          <>
            <AppButton
              variant="secondary"
              onClick={() => (window.location.href = "/equipements/liste")}
            >
              Retour
            </AppButton>

            <AppButton
              onClick={() =>
                (window.location.href = `/equipements/${equipement.id}/modifier`)
              }
            >
              Modifier
            </AppButton>
          </>
        }
      >
        <AppCard>
          <div className="flex flex-wrap items-center gap-4">
            <AppBadge
              variant={
                equipement.etat === "En service"
                  ? "success"
                  : equipement.etat === "Hors service"
                  ? "danger"
                  : "warning"
              }
            >
              {equipement.etat}
            </AppBadge>

            <span className="text-sm text-gray-500 dark:text-slate-400">
              Type : {nomDepuisListe(types, equipement.type_id)}
            </span>

            <span className="text-sm text-gray-500 dark:text-slate-400">
              Secteur : {nomDepuisListe(secteurs, equipement.secteur_id)}
            </span>

            <span className="text-sm text-gray-500 dark:text-slate-400">
              Emplacement : {equipement.emplacement || "—"}
            </span>
          </div>
        </AppCard>

        <AppTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "infos", label: "Informations" },
            { id: "photos", label: "Photos" },
            { id: "documents", label: "Documents" },
            { id: "verifications", label: "Vérifications" },
            { id: "interventions", label: "Interventions" },
            { id: "historique", label: "Historique" },
            { id: "localisation", label: "Localisation" },
          ]}
        />

        {activeTab === "infos" && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <AppCard title="Informations générales">
                <div className="space-y-4">
                  <Info label="Numéro" value={equipement.numero} />
                  <Info label="Désignation" value={equipement.nom} />
                  <Info
                    label="Type"
                    value={nomDepuisListe(types, equipement.type_id)}
                  />
                  <Info
                    label="Secteur"
                    value={nomDepuisListe(secteurs, equipement.secteur_id)}
                  />
                  <Info
                    label="Emplacement"
                    value={equipement.emplacement || "—"}
                  />
                </div>
              </AppCard>

              <AppCard title="Informations techniques">
                <div className="space-y-4">
                  <Info label="Fabricant" value={equipement.fabricant || "—"} />
                  <Info label="Modèle" value={equipement.modele || "—"} />
                  <Info
                    label="N° série"
                    value={equipement.numero_serie || "—"}
                  />
                  <Info
                    label="Prestataire"
                    value={nomDepuisListe(
                      prestataires,
                      equipement.prestataire_id
                    )}
                  />
                </div>
              </AppCard>

              <AppCard title="Dates et suivi">
                <div className="space-y-4">
                  <Info
                    label="Date installation"
                    value={formatDate(equipement.date_installation)}
                  />
                  <Info
                    label="Mise en service"
                    value={formatDate(equipement.date_mise_service)}
                  />
                  <Info
                    label="Prochaine vérification"
                    value={formatDate(equipement.prochaine_verification)}
                  />
                </div>
              </AppCard>
            </div>

            <AppCard title="Observations">
              <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                {equipement.observations || "Aucune observation."}
              </p>
            </AppCard>
          </>
        )}

        {activeTab === "photos" && (
          <EquipmentPhotos
            equipementId={equipement.id}
            photos={photos}
            onRefresh={chargerDonnees}
          />
        )}

       {activeTab === "documents" && (
  <EquipmentDocuments equipementId={equipement.id} />
)}

        {activeTab === "verifications" && (
  <EquipmentVerifications
    equipementId={equipement.id}
    equipementNom={`${equipement.numero} - ${equipement.nom}`}
  />
)}

        {activeTab === "interventions" && (
          <AppCard title="Interventions">
            <AppEmptyState
              icon="🛠️"
              title="Aucune intervention"
              description="Les opérations de maintenance seront listées ici."
            />
          </AppCard>
        )}

        {activeTab === "historique" && (
  <EquipmentHistory equipementId={equipement.id} />
)}          
{activeTab === "localisation" && (
  <EquipmentLocation
    equipementId={equipement.id}
    planId={equipement.plan_id}
    positionX={equipement.position_x}
    positionY={equipement.position_y}
    onRefresh={chargerDonnees}
  />
)}
      </AppPage>
    </AppShell>
    
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}