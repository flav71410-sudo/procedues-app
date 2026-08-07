"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import AppShell from "@/components/AppShell";
import InteractivePlan, {
  EquipementMap,
  Plan as InteractivePlanType,
} from "@/components/plans/InteractivePlan";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppPage,
} from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  getPlan,
  getPlanEquipements,
  getTousEquipements,
} from "@/services/plansService";
import type {
  Plan,
  PlanEquipement,
} from "@/types/plans";

function formaterEquipements(
  items: PlanEquipement[]
): EquipementMap[] {
  return items.map((item) => ({
    id: item.id,
    numero: item.numero,
    nom: item.nom,
    etat: item.etat,
    position_x: item.position_x,
    position_y: item.position_y,
    types_equipements: Array.isArray(
      item.types_equipements
    )
      ? item.types_equipements[0] ?? null
      : item.types_equipements ?? null,
  }));
}

function convertirPlan(
  plan: Plan
): InteractivePlanType {
  return {
    id: plan.id,
    nom: plan.nom,
    image_url: plan.image_url,
  };
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const {
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const id = params?.id;

  const [plan, setPlan] =
    useState<InteractivePlanType | null>(null);

  const [planComplet, setPlanComplet] =
    useState<Plan | null>(null);

  const [equipements, setEquipements] =
    useState<EquipementMap[]>([]);

  const [allEquipements, setAllEquipements] =
    useState<EquipementMap[]>([]);

  const [loading, setLoading] =
    useState(true);

  const chargerDonnees =
    useCallback(async () => {
      if (!id || authLoading) {
        return;
      }

      try {
        setLoading(true);

        /*
         * Première lecture :
         * - en vue magasin, on protège l'accès avec le magasin actif ;
         * - en vue Tous les magasins, on autorise la lecture du plan
         *   afin de récupérer son magasin_id.
         */
        const planData = await getPlan(id, {
          magasinId:
            magasinActif?.id ?? null,
          tousMagasins:
            vueTousMagasins,
        });

        /*
         * La cartographie doit toujours charger les équipements
         * du magasin auquel appartient réellement le plan.
         *
         * C'est ce point qui permet de conserver l'ajout et le
         * positionnement des équipements sur le plan, y compris
         * après ouverture depuis la vue Tous les magasins.
         */
        const scopePlan = {
          magasinId:
            planData.magasin_id ?? null,
          tousMagasins: false,
        };

        if (!planData.magasin_id) {
          throw new Error(
            "Ce plan n’est rattaché à aucun magasin. Attribue-lui un magasin_id dans Supabase avant d’utiliser la cartographie."
          );
        }

        const [
          equipementsPositionnes,
          equipementsDuMagasin,
        ] = await Promise.all([
          getPlanEquipements(
            planData.id,
            scopePlan
          ),
          getTousEquipements(scopePlan),
        ]);
        console.log("Plan :", planData);
console.log("Positionnés :", equipementsPositionnes);
console.log("Tous magasin :", equipementsDuMagasin);

        setPlanComplet(planData);
        setPlan(convertirPlan(planData));
        setEquipements(
          formaterEquipements(
            equipementsPositionnes
          )
        );
        setAllEquipements(
          formaterEquipements(
            equipementsDuMagasin
          )
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.";

        toast.error(
          "Erreur de chargement du plan",
          message
        );

        setPlan(null);
        setPlanComplet(null);
        setEquipements([]);
        setAllEquipements([]);
      } finally {
        setLoading(false);
      }
    }, [
      authLoading,
      id,
      magasinActif?.id,
      toast,
      vueTousMagasins,
    ]);

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  if (loading || authLoading) {
    return (
      <AppShell>
        <AppPage
          title="Plan"
          subtitle="Chargement du plan..."
        >
          <AppCard>
            <p className="text-gray-500 dark:text-slate-400">
              Chargement de la cartographie...
            </p>
          </AppCard>
        </AppPage>
      </AppShell>
    );
  }

  if (!id || !plan || !planComplet) {
    return (
      <AppShell>
        <AppPage
          title="Plan introuvable"
          subtitle="Impossible d’afficher cette cartographie."
        >
          <AppEmptyState
            title="Aucun plan trouvé"
            description="Ce plan n’existe pas, n’est pas rattaché au magasin consulté ou a été supprimé."
            action={
              <AppButton
                onClick={() =>
                  router.push("/plans")
                }
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
            onClick={() =>
              router.push("/plans")
            }
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