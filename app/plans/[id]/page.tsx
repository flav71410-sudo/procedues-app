"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/AppShell";
import InteractivePlan, {
  EquipementMap,
  Plan,
} from "@/components/plans/InteractivePlan";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppPage,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/providers/ToastProvider";

type SupabaseEquipement = {
  id: string;
  numero: string;
  nom: string;
  etat: string;
  position_x: number | null;
  position_y: number | null;
  types_equipements:
    | {
        nom: string;
      }
    | {
        nom: string;
      }[]
    | null;
};

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const toast = useToast();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [equipements, setEquipements] = useState<EquipementMap[]>([]);
  const [allEquipements, setAllEquipements] = useState<EquipementMap[]>([]);
  const [loading, setLoading] = useState(true);

  function formaterEquipements(
    items: SupabaseEquipement[] | null
  ): EquipementMap[] {
    return (items || []).map((item) => ({
      id: item.id,
      numero: item.numero,
      nom: item.nom,
      etat: item.etat,
      position_x: item.position_x,
      position_y: item.position_y,
      types_equipements: Array.isArray(item.types_equipements)
        ? item.types_equipements[0] || null
        : item.types_equipements || null,
    }));
  }

  async function chargerDonnees() {
    if (!id) {
      setLoading(false);
      setPlan(null);
      return;
    }

    setLoading(true);

    const [
      { data: planData, error: planError },
      { data: equipementsData, error: equipementsError },
      { data: allEquipementsData, error: allEquipementsError },
    ] = await Promise.all([
      supabase
        .from("plans")
        .select("id, nom, image_url")
        .eq("id", id)
        .maybeSingle(),

      supabase
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
        .not("position_y", "is", null)
        .order("numero"),

      supabase
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
        .order("numero"),
    ]);

    if (planError) {
      toast.error("Erreur de chargement du plan", planError.message);
      setPlan(null);
      setLoading(false);
      return;
    }

    if (equipementsError) {
      toast.error(
        "Erreur de chargement des équipements positionnés",
        equipementsError.message
      );
    }

    if (allEquipementsError) {
      toast.error(
        "Erreur de chargement des équipements",
        allEquipementsError.message
      );
    }

    setPlan(planData || null);

    setEquipements(
      formaterEquipements(
        (equipementsData as SupabaseEquipement[] | null) || []
      )
    );

    setAllEquipements(
      formaterEquipements(
        (allEquipementsData as SupabaseEquipement[] | null) || []
      )
    );

    setLoading(false);
  }

  useEffect(() => {
    chargerDonnees();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <AppPage title="Plan" subtitle="Chargement du plan...">
          <AppCard>
            <p className="text-gray-500 dark:text-slate-400">
              Chargement de la cartographie...
            </p>
          </AppCard>
        </AppPage>
      </AppShell>
    );
  }

  if (!id || !plan) {
    return (
      <AppShell>
        <AppPage
          title="Plan introuvable"
          subtitle="Impossible d’afficher cette cartographie."
        >
          <AppEmptyState
            title="Aucun plan trouvé"
            description="Ce plan n’existe pas, a été supprimé ou son adresse est incorrecte."
            action={
              <AppButton
                onClick={() => {
                  window.location.href = "/plans";
                }}
              >
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
            onClick={() => {
              window.location.href = "/plans";
            }}
          >
            Retour
          </AppButton>
        }
      >
        <InteractivePlan
          plan={plan}
          equipements={equipements}
          allEquipements={allEquipements}
          onRefresh={chargerDonnees}
        />
      </AppPage>
    </AppShell>
  );
}