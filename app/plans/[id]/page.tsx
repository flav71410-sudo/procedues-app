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
} from "@/components/ui";
import {
  MapPin,
  Flame,
  Lightbulb,
  DoorOpen,
  Camera,
  Zap,
  Droplets,
  Wind,
  Shield,
  Package,
} from "lucide-react";

type Plan = {
  id: string;
  nom: string;
  image_url: string;
};

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  etat: string;
  position_x: number | null;
  position_y: number | null;
  types_equipements: {
    nom: string;
  } | null;
};

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selected, setSelected] = useState<Equipement | null>(null);
  const [loading, setLoading] = useState(true);

  async function chargerDonnees() {
    const { data: planData } = await supabase
      .from("plans")
      .select("id, nom, image_url")
      .eq("id", id)
      .single();

    const { data: equipementsData } = await supabase
      .from("equipements")
      .select(`
        id,
        numero,
        nom,
        etat,
        position_x,
        position_y,
        types_equipements(nom)
      `)
      .eq("plan_id", id)
      .not("position_x", "is", null)
      .not("position_y", "is", null);

    setPlan(planData || null);
    const formattedEquipements: Equipement[] = (equipementsData || []).map(
  (item: any) => ({
    ...item,
    types_equipements: Array.isArray(item.types_equipements)
      ? item.types_equipements[0] || null
      : item.types_equipements || null,
  })
);

setEquipements(formattedEquipements);
    setLoading(false);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function getIcon(typeName?: string) {
    const type = (typeName || "").toLowerCase();

    if (type.includes("extincteur")) return <Flame size={18} />;
    if (type.includes("baes")) return <Lightbulb size={18} />;
    if (type.includes("porte")) return <DoorOpen size={18} />;
    if (type.includes("caméra") || type.includes("camera")) return <Camera size={18} />;
    if (type.includes("tgbt")) return <Zap size={18} />;
    if (type.includes("ria") || type.includes("sprinkler")) return <Droplets size={18} />;
    if (type.includes("désenfumage") || type.includes("desenfumage")) return <Wind size={18} />;
    if (type.includes("ssi")) return <Shield size={18} />;

    return <Package size={18} />;
  }

  function markerClass(etat: string) {
    if (etat === "Hors service") return "bg-red-600 text-white";
    if (etat === "En maintenance") return "bg-orange-500 text-white";
    if (etat === "À remplacer") return "bg-red-500 text-white";
    return "bg-emerald-600 text-white";
  }

  if (loading) {
    return (
      <AppShell>
        <AppPage title="Plan" subtitle="Chargement du plan...">
          <AppCard>Chargement...</AppCard>
        </AppPage>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell>
        <AppPage title="Plan introuvable">
          <AppEmptyState
            title="Aucun plan trouvé"
            description="Ce plan n’existe pas ou a été supprimé."
            action={
              <AppButton onClick={() => (window.location.href = "/plans")}>
                Retour aux plans
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
        title={plan.nom}
        subtitle="Cartographie interactive des équipements positionnés sur ce plan."
        actions={
          <AppButton
            variant="secondary"
            onClick={() => (window.location.href = "/plans")}
          >
            Retour
          </AppButton>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <AppCard title="Plan interactif">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800">
              <img
                src={plan.image_url}
                alt={plan.nom}
                className="w-full select-none"
                draggable={false}
              />

              {equipements.map((equipement) => (
                <button
                  key={equipement.id}
                  onClick={() => setSelected(equipement)}
                  className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg ring-4 ring-white/40 transition hover:scale-125 ${markerClass(
                    equipement.etat
                  )}`}
                  style={{
                    left: `${(equipement.position_x || 0) / 100}%`,
                    top: `${(equipement.position_y || 0) / 100}%`,
                  }}
                  title={`${equipement.numero} - ${equipement.nom}`}
                >
                  {getIcon(equipement.types_equipements?.nom)}
                </button>
              ))}
            </div>
          </AppCard>

          <AppCard title="Équipement sélectionné">
            {!selected ? (
              <AppEmptyState
                icon={<MapPin size={42} />}
                title="Aucun équipement sélectionné"
                description="Clique sur une icône du plan pour afficher sa fiche rapide."
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Équipement
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selected.numero}
                  </h2>
                  <p className="text-gray-600 dark:text-slate-300">
                    {selected.nom}
                  </p>
                </div>

                <AppBadge
                  variant={
                    selected.etat === "En service"
                      ? "success"
                      : selected.etat === "Hors service"
                      ? "danger"
                      : "warning"
                  }
                >
                  {selected.etat}
                </AppBadge>

                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Type
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selected.types_equipements?.nom || "Non défini"}
                  </p>
                </div>

                <AppButton
                  onClick={() =>
                    (window.location.href = `/equipements/${selected.id}`)
                  }
                >
                  Voir la fiche
                </AppButton>
              </div>
            )}
          </AppCard>
        </div>

        <AppCard title="Équipements sur ce plan">
          {equipements.length === 0 ? (
            <AppEmptyState
              icon={<MapPin size={42} />}
              title="Aucun équipement positionné"
              description="Positionne les équipements depuis leur fiche, onglet Localisation."
            />
          ) : (
            <div className="space-y-3">
              {equipements.map((equipement) => (
                <button
                  key={equipement.id}
                  onClick={() => setSelected(equipement)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {equipement.numero} — {equipement.nom}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {equipement.types_equipements?.nom || "Type non défini"}
                    </p>
                  </div>

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
                </button>
              ))}
            </div>
          )}
        </AppCard>
      </AppPage>
    </AppShell>
  );
}