"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AppButton, AppCard, AppEmptyState, AppSelect } from "@/components/ui";
import { useToast } from "@/providers/ToastProvider";

type Plan = {
  id: string;
  nom: string;
  image_url: string;
};

type Props = {
  equipementId: string;
  planId: string | null;
  positionX: number | null;
  positionY: number | null;
  onRefresh: () => void;
};

export default function EquipmentLocation({
  equipementId,
  planId,
  positionX,
  positionY,
  onRefresh,
}: Props) {
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(planId || "");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function chargerPlans() {
    const { data, error } = await supabase
      .from("plans")
      .select("id, nom, image_url")
      .order("nom");

    if (error) {
      toast.error("Erreur chargement plans", error.message);
      return;
    }

    setPlans(data || []);
  }

  useEffect(() => {
    chargerPlans();
  }, []);

  useEffect(() => {
    setSelectedPlanId(planId || "");
  }, [planId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  async function enregistrerPlan() {
    if (!selectedPlanId) {
      toast.warning("Aucun plan sélectionné");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("equipements")
      .update({
        plan_id: selectedPlanId,
        position_x: null,
        position_y: null,
      })
      .eq("id", equipementId);

    setLoading(false);

    if (error) {
      toast.error("Erreur enregistrement", error.message);
      return;
    }

    toast.success("Plan associé");
    onRefresh();
  }

  async function placerMarqueur(e: React.MouseEvent<HTMLDivElement>) {
    if (!editing || !selectedPlan) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const x = Math.round(((e.clientX - rect.left) / rect.width) * 10000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 10000);

    const { error } = await supabase
      .from("equipements")
      .update({
        plan_id: selectedPlan.id,
        position_x: x,
        position_y: y,
      })
      .eq("id", equipementId);

    if (error) {
      toast.error("Erreur position", error.message);
      return;
    }

    setEditing(false);
    toast.success("Position enregistrée");
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <AppCard title="Plan associé">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <AppSelect
            label="Choisir un plan"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            options={[
              { value: "", label: "Sélectionner un plan..." },
              ...plans.map((plan) => ({
                value: plan.id,
                label: plan.nom,
              })),
            ]}
          />

          <AppButton loading={loading} onClick={enregistrerPlan}>
            Associer
          </AppButton>

          <AppButton
            variant={editing ? "danger" : "secondary"}
            onClick={() => setEditing(!editing)}
            disabled={!selectedPlan}
          >
            {editing ? "Annuler" : "Déplacer"}
          </AppButton>
        </div>
      </AppCard>

      <AppCard title="Localisation sur plan">
        {!selectedPlan ? (
          <AppEmptyState
            icon={<MapPin size={42} />}
            title="Aucun plan sélectionné"
            description="Associe d’abord un plan à cet équipement."
          />
        ) : (
          <>
            {editing && (
              <div className="mb-4 rounded-xl border border-orange-500/40 bg-orange-950/30 p-4 text-sm text-orange-300">
                Clique sur le plan pour placer le marqueur de l’équipement.
              </div>
            )}

            <div
              onClick={placerMarqueur}
              className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 ${
                editing ? "cursor-crosshair" : ""
              }`}
            >
              <img
                src={selectedPlan.image_url}
                alt={selectedPlan.nom}
                className="w-full select-none"
                draggable={false}
              />

              {positionX !== null && positionY !== null && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${positionX / 100}%`,
                    top: `${positionY / 100}%`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-red-600 px-3 py-2 text-white shadow-lg">
                      <MapPin size={24} />
                    </div>
                    <div className="h-3 w-3 rotate-45 bg-red-600" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </AppCard>
    </div>
  );
}