"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppInput,
  AppPage,
} from "@/components/ui";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";
import { Map, Trash2, ExternalLink, ImageIcon } from "lucide-react";

type Plan = {
  id: string;
  nom: string;
  image_url: string;
  image_path: string | null;
  largeur: number | null;
  hauteur: number | null;
  created_at: string;
};

type EquipementPlan = {
  id: string;
  plan_id: string | null;
  etat: string;
};

export default function PlansPage() {
  const dialog = useDialog();
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [equipements, setEquipements] = useState<EquipementPlan[]>([]);
  const [nom, setNom] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function chargerPlans() {
    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: equipementsData } = await supabase
      .from("equipements")
      .select("id, plan_id, etat");

    if (plansError) {
      toast.error("Erreur chargement plans", plansError.message);
      return;
    }

    setPlans(plansData || []);
    setEquipements(equipementsData || []);
  }

  useEffect(() => {
    chargerPlans();
  }, []);

  function equipementsDuPlan(planId: string) {
    return equipements.filter((e) => e.plan_id === planId);
  }

  function compterEtat(planId: string, etat: string) {
    return equipementsDuPlan(planId).filter((e) => e.etat === etat).length;
  }

  async function ajouterPlan() {
    if (!nom.trim() || !fichier) {
      toast.warning("Champs manquants", "Renseigne le nom et choisis une image.");
      return;
    }

    setLoading(true);

    const extension = fichier.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeName = fichier.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .toLowerCase();

    const filePath = `${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("plans")
      .upload(filePath, fichier);

    if (uploadError) {
      setLoading(false);
      toast.error("Erreur upload", uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("plans")
      .getPublicUrl(filePath);

    const { error } = await supabase.from("plans").insert({
      nom: nom.trim(),
      image_url: publicUrl.publicUrl,
      image_path: filePath,
    });

    setLoading(false);

    if (error) {
      toast.error("Erreur création plan", error.message);
      return;
    }

    setNom("");
    setFichier(null);
    toast.success("Plan ajouté");
    chargerPlans();
  }

  async function supprimerPlan(plan: Plan) {
    const ok = await dialog.delete({
      title: "Supprimer ce plan ?",
      itemName: plan.nom,
      description:
        "Cette action supprimera le plan. Les équipements liés ne seront pas supprimés.",
    });

    if (!ok) return;

    if (plan.image_path) {
      await supabase.storage.from("plans").remove([plan.image_path]);
    }

    const { error } = await supabase.from("plans").delete().eq("id", plan.id);

    if (error) {
      toast.error("Erreur suppression", error.message);
      return;
    }

    toast.success("Plan supprimé");
    chargerPlans();
  }

  return (
    <AppShell>
      <AppPage
        title="Plans"
        subtitle="Gestion des plans du magasin et cartographie interactive."
      >
        <AppCard title="Ajouter un plan">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <AppInput
              label="Nom du plan"
              placeholder="RDC, Réserve, Cour matériaux..."
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                Image du plan
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFichier(e.target.files?.[0] || null)}
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>

            <AppButton loading={loading} onClick={ajouterPlan}>
              Ajouter
            </AppButton>
          </div>
        </AppCard>

        <AppCard title="Plans enregistrés">
          {plans.length === 0 ? (
            <AppEmptyState
              icon={<Map size={42} />}
              title="Aucun plan"
              description="Ajoute un premier plan pour préparer la localisation des équipements."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                >
                  <Link href={`/plans/${plan.id}`}>
                    <img
                      src={plan.image_url}
                      alt={plan.nom}
                      className="h-52 w-full object-cover transition hover:scale-105"
                    />
                  </Link>

                  <div className="space-y-4 p-4">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {plan.nom}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Ajouté le{" "}
                        {new Date(plan.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Équipements
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {equipementsDuPlan(plan.id).length}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-950/40">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          En service
                        </p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                          {compterEtat(plan.id, "En service")}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-950/40">
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          Maintenance
                        </p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                          {compterEtat(plan.id, "En maintenance")}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-100 p-3 dark:bg-red-950/40">
                        <p className="text-xs text-red-700 dark:text-red-300">
                          Hors service
                        </p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                          {compterEtat(plan.id, "Hors service")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/plans/${plan.id}`}>
                        <AppButton
                          variant="secondary"
                          className="px-3 py-2 text-xs"
                        >
                          <ExternalLink size={14} />
                          Cartographie
                        </AppButton>
                      </Link>

                      <a href={plan.image_url} target="_blank" rel="noreferrer">
                        <AppButton
                          variant="secondary"
                          className="px-3 py-2 text-xs"
                        >
                          <ImageIcon size={14} />
                          Voir l'image
                        </AppButton>
                      </a>

                      <AppButton
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        onClick={() => supprimerPlan(plan)}
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </AppButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppCard>
      </AppPage>
    </AppShell>
  );
}