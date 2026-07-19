"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ImageIcon,
  Map,
  MapPinned,
  Trash2,
  Upload,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import AccessControl from "@/components/auth/AccessControl";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppInput,
  AppPage,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/providers/AuthProvider";

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
  const { role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const peutAjouterPlan = role === "ADMIN" || role === "DM";
  const peutSupprimerPlan = role === "ADMIN";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [equipements, setEquipements] = useState<EquipementPlan[]>([]);
  const [nom, setNom] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function chargerPlans() {
    setLoadingPlans(true);

    const [
      { data: plansData, error: plansError },
      { data: equipementsData, error: equipementsError },
    ] = await Promise.all([
      supabase
        .from("plans")
        .select(
          "id, nom, image_url, image_path, largeur, hauteur, created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("equipements")
        .select("id, plan_id, etat"),
    ]);

    if (plansError) {
      toast.error("Erreur de chargement", plansError.message);
      setLoadingPlans(false);
      return;
    }

    if (equipementsError) {
      toast.error(
        "Erreur de chargement des équipements",
        equipementsError.message
      );
    }

    setPlans(plansData || []);
    setEquipements(equipementsData || []);
    setLoadingPlans(false);
  }

  useEffect(() => {
    chargerPlans();
  }, []);

  function equipementsDuPlan(planId: string) {
    return equipements.filter((equipement) => equipement.plan_id === planId);
  }

  function compterEtat(planId: string, etat: string) {
    return equipementsDuPlan(planId).filter(
      (equipement) => equipement.etat === etat
    ).length;
  }

  function nettoyerNomFichier(nomFichier: string) {
    const nomSansExtension =
      nomFichier.lastIndexOf(".") > 0
        ? nomFichier.substring(0, nomFichier.lastIndexOf("."))
        : nomFichier;

    return nomSansExtension
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  async function ajouterPlan() {
    if (!peutAjouterPlan) {
      toast.error(
        "Accès refusé",
        "Votre rôle ne permet pas d’ajouter un plan."
      );
      return;
    }

    if (!nom.trim()) {
      toast.warning("Nom manquant", "Renseigne le nom du plan.");
      return;
    }

    if (!fichier) {
      toast.warning("Image manquante", "Sélectionne une image du plan.");
      return;
    }

    if (!fichier.type.startsWith("image/")) {
      toast.warning(
        "Fichier non valide",
        "Le fichier sélectionné doit être une image."
      );
      return;
    }

    setLoading(true);

    const extension =
      fichier.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";

    const safeName = nettoyerNomFichier(fichier.name) || "plan";
    const filePath = `${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("plans")
      .upload(filePath, fichier, {
        cacheControl: "3600",
        upsert: false,
        contentType: fichier.type,
      });

    if (uploadError) {
      setLoading(false);
      toast.error("Erreur d’envoi", uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("plans")
      .getPublicUrl(filePath);

    const dimensions = await lireDimensionsImage(fichier);

    const { error: insertError } = await supabase.from("plans").insert({
      nom: nom.trim(),
      image_url: publicUrlData.publicUrl,
      image_path: filePath,
      largeur: dimensions?.largeur ?? null,
      hauteur: dimensions?.hauteur ?? null,
    });

    if (insertError) {
      await supabase.storage.from("plans").remove([filePath]);

      setLoading(false);
      toast.error("Erreur de création", insertError.message);
      return;
    }

    setNom("");
    setFichier(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setLoading(false);
    toast.success("Plan ajouté", `${nom.trim()} est maintenant disponible.`);

    await chargerPlans();
  }

  async function supprimerPlan(plan: Plan) {
    if (!peutSupprimerPlan) {
      toast.error(
        "Accès refusé",
        "Seul un administrateur peut supprimer un plan."
      );
      return;
    }

    const nombreEquipements = equipementsDuPlan(plan.id).length;

    const confirmation = await dialog.delete({
      title: "Supprimer ce plan ?",
      itemName: plan.nom,
      description:
        nombreEquipements > 0
          ? `${nombreEquipements} équipement(s) sont associés à ce plan. Ils ne seront pas supprimés, mais leur localisation devra être réattribuée.`
          : "L’image du plan et son enregistrement seront définitivement supprimés.",
    });

    if (!confirmation) return;

    setDeletingId(plan.id);

    const { error: updateError } = await supabase
      .from("equipements")
      .update({
        plan_id: null,
        position_x: null,
        position_y: null,
      })
      .eq("plan_id", plan.id);

    if (updateError) {
      setDeletingId(null);
      toast.error(
        "Impossible de détacher les équipements",
        updateError.message
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from("plans")
      .delete()
      .eq("id", plan.id);

    if (deleteError) {
      setDeletingId(null);
      toast.error("Erreur de suppression", deleteError.message);
      return;
    }

    if (plan.image_path) {
      const { error: storageError } = await supabase.storage
        .from("plans")
        .remove([plan.image_path]);

      if (storageError) {
        toast.warning(
          "Plan supprimé de la base",
          "L’image n’a toutefois pas pu être supprimée du stockage."
        );
      }
    }

    setDeletingId(null);
    toast.success("Plan supprimé", plan.nom);

    await chargerPlans();
  }

  return (
    <AppShell>
      <AppPage
        title="Plans"
        subtitle="Gestion des plans du magasin et cartographie interactive des équipements."
      >
        <AccessControl role={role} roles={["ADMIN", "DM"]}>
          <AppCard title="Ajouter un plan">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <AppInput
                label="Nom du plan"
                placeholder="RDC, Réserve, Cour matériaux..."
                value={nom}
                onChange={(event) => setNom(event.target.value)}
              />

              <div className="space-y-2">
                <label
                  htmlFor="plan-file"
                  className="block text-sm font-semibold text-gray-700 dark:text-slate-300"
                >
                  Image du plan
                </label>

                <input
                  ref={fileInputRef}
                  id="plan-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    setFichier(event.target.files?.[0] || null)
                  }
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                />
              </div>

              <AppButton loading={loading} onClick={ajouterPlan}>
                <Upload size={16} />
                Ajouter
              </AppButton>
            </div>

            {fichier && (
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                Fichier sélectionné : {fichier.name}
              </p>
            )}
          </AppCard>
        </AccessControl>

        <AppCard title="Plans enregistrés">
          {loadingPlans ? (
            <div className="py-10 text-center text-gray-500 dark:text-slate-400">
              Chargement des plans...
            </div>
          ) : plans.length === 0 ? (
            <AppEmptyState
              icon={<Map size={42} />}
              title="Aucun plan"
              description="Ajoute un premier plan pour commencer à positionner les équipements."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {plans.map((plan) => {
                const total = equipementsDuPlan(plan.id).length;
                const enService = compterEtat(plan.id, "En service");
                const maintenance = compterEtat(plan.id, "En maintenance");
                const horsService = compterEtat(plan.id, "Hors service");

                return (
                  <article
                    key={plan.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
                  >
                    <Link
                      href={`/plans/${encodeURIComponent(plan.id)}`}
                      className="group block overflow-hidden"
                    >
                      <div className="relative">
                        <img
                          src={plan.image_url}
                          alt={`Plan ${plan.nom}`}
                          className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                          {total} équipement{total > 1 ? "s" : ""}
                        </div>
                      </div>
                    </Link>

                    <div className="space-y-4 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPinned
                            size={18}
                            className="text-sky-600 dark:text-sky-400"
                          />

                          <h2 className="font-bold text-gray-900 dark:text-white">
                            {plan.nom}
                          </h2>
                        </div>

                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                          Ajouté le{" "}
                          {new Date(plan.created_at).toLocaleDateString("fr-FR")}
                          {plan.largeur && plan.hauteur
                            ? ` • ${plan.largeur} × ${plan.hauteur}px`
                            : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Statistique
                          label="Équipements"
                          valeur={total}
                          className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        />

                        <Statistique
                          label="En service"
                          valeur={enService}
                          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        />

                        <Statistique
                          label="Maintenance"
                          valeur={maintenance}
                          className="bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                        />

                        <Statistique
                          label="Hors service"
                          valeur={horsService}
                          className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/plans/${encodeURIComponent(plan.id)}`}>
                          <AppButton
                            variant="secondary"
                            className="px-3 py-2 text-xs"
                          >
                            <MapPinned size={14} />
                            Cartographie
                          </AppButton>
                        </Link>

                        <a
                          href={plan.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <AppButton
                            variant="secondary"
                            className="px-3 py-2 text-xs"
                          >
                            <ImageIcon size={14} />
                            Voir l’image
                          </AppButton>
                        </a>

                        <AccessControl role={role} roles={["ADMIN"]}>
                          <AppButton
                            variant="danger"
                            className="px-3 py-2 text-xs"
                            loading={deletingId === plan.id}
                            onClick={() => supprimerPlan(plan)}
                          >
                            <Trash2 size={14} />
                            Supprimer
                          </AppButton>
                        </AccessControl>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AppCard>
      </AppPage>
    </AppShell>
  );
}

function Statistique({
  label,
  valeur,
  className,
}: {
  label: string;
  valeur: number;
  className: string;
}) {
  return (
    <div className={`rounded-xl p-3 ${className}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{valeur}</p>
    </div>
  );
}

function lireDimensionsImage(
  fichier: File
): Promise<{ largeur: number; hauteur: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(fichier);

    image.onload = () => {
      const dimensions = {
        largeur: image.naturalWidth,
        hauteur: image.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}