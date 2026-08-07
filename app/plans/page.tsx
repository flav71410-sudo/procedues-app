"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  createPlan,
  getPlans,
  getTousEquipements,
} from "@/services/plansService";
import type {
  Plan,
  PlanEquipement,
  PlanScope,
} from "@/types/plans";

type MagasinOption = {
  readonly id: string;
  readonly nom: string;
};

export default function PlansPage() {
  const dialog = useDialog();
  const toast = useToast();

  const {
    role,
    magasinActif,
    vueTousMagasins,
    magasinsDisponibles,
    peutChangerMagasin,
    changerMagasinActif,
    loading: authLoading,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roleNormalise = String(role ?? "").toUpperCase();

const peutAjouterPlan = [
  "ADMIN",
  "SUPER_ADMIN",
  "DM",
].includes(roleNormalise);

const peutSupprimerPlan = [
  "ADMIN",
  "SUPER_ADMIN",
].includes(roleNormalise);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [equipements, setEquipements] =
    useState<PlanEquipement[]>([]);

  const [nom, setNom] = useState("");
  const [fichier, setFichier] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] =
    useState(true);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [erreur, setErreur] =
    useState<string | null>(null);

  const scope = useMemo<PlanScope>(
    () => ({
      magasinId: magasinActif?.id ?? null,
      tousMagasins: vueTousMagasins,
    }),
    [magasinActif?.id, vueTousMagasins]
  );

  const chargerPlans = useCallback(async () => {
    if (authLoading) return;

    if (!vueTousMagasins && !magasinActif) {
      setPlans([]);
      setEquipements([]);
      setLoadingPlans(false);
      setErreur(
        "Aucun magasin actif. Sélectionne un magasin."
      );
      return;
    }

    try {
      setLoadingPlans(true);
      setErreur(null);

      const [plansData, equipementsData] =
        await Promise.all([
          getPlans(scope),
          getTousEquipements(scope),
        ]);

      setPlans(plansData);
      setEquipements(equipementsData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";

      setErreur(message);
      toast.error(
        "Erreur de chargement",
        message
      );
      setPlans([]);
      setEquipements([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [
    authLoading,
    magasinActif,
    scope,
    toast,
    vueTousMagasins,
  ]);

  useEffect(() => {
    void chargerPlans();
  }, [chargerPlans]);

  function equipementsDuPlan(planId: string) {
    return equipements.filter(
      (equipement) =>
        equipement.plan_id === planId
    );
  }

  function compterEtat(
    planId: string,
    etat: string
  ) {
    return equipementsDuPlan(planId).filter(
      (equipement) =>
        equipement.etat === etat
    ).length;
  }

  function nettoyerNomFichier(
    nomFichier: string
  ) {
    const nomSansExtension =
      nomFichier.lastIndexOf(".") > 0
        ? nomFichier.substring(
            0,
            nomFichier.lastIndexOf(".")
          )
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

    if (
      vueTousMagasins ||
      !magasinActif
    ) {
      toast.warning(
        "Magasin requis",
        "Sélectionne un magasin précis avant d’ajouter un plan."
      );
      return;
    }

    if (!nom.trim()) {
      toast.warning(
        "Nom manquant",
        "Renseigne le nom du plan."
      );
      return;
    }

    if (!fichier) {
      toast.warning(
        "Image manquante",
        "Sélectionne une image du plan."
      );
      return;
    }

    if (!fichier.type.startsWith("image/")) {
      toast.warning(
        "Fichier non valide",
        "Le fichier sélectionné doit être une image."
      );
      return;
    }

    try {
      setLoading(true);
      setErreur(null);

      const extension =
        fichier.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") ||
        "jpg";

      const safeName =
        nettoyerNomFichier(fichier.name) ||
        "plan";

      const filePath = [
        magasinActif.id,
        String(new Date().getFullYear()),
        `${Date.now()}-${safeName}.${extension}`,
      ].join("/");

      const { error: uploadError } =
        await supabase.storage
          .from("plans")
          .upload(filePath, fichier, {
            cacheControl: "3600",
            upsert: false,
            contentType: fichier.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("plans")
          .getPublicUrl(filePath);

      const dimensions =
        await lireDimensionsImage(fichier);

      try {
        await createPlan({
          nom: nom.trim(),
          image_url:
            publicUrlData.publicUrl,
          image_path: filePath,
          largeur:
            dimensions?.largeur ?? null,
          hauteur:
            dimensions?.hauteur ?? null,
          magasin_id: magasinActif.id,
        });
      } catch (insertError) {
        await supabase.storage
          .from("plans")
          .remove([filePath]);

        throw insertError;
      }

      const nomPlan = nom.trim();

      setNom("");
      setFichier(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success(
        "Plan ajouté",
        `${nomPlan} est maintenant disponible.`
      );

      await chargerPlans();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";

      setErreur(message);
      toast.error(
        "Erreur de création",
        message
      );
    } finally {
      setLoading(false);
    }
  }

  async function supprimerPlan(plan: Plan) {
    if (!peutSupprimerPlan) {
      toast.error(
        "Accès refusé",
        "Seul un administrateur peut supprimer un plan."
      );
      return;
    }

    const nombreEquipements =
      equipementsDuPlan(plan.id).length;

    const confirmation =
      await dialog.delete({
        title: "Supprimer ce plan ?",
        itemName: plan.nom,
        description:
          nombreEquipements > 0
            ? `${nombreEquipements} équipement(s) sont associés à ce plan. Ils ne seront pas supprimés, mais leur localisation devra être réattribuée.`
            : "L’image du plan et son enregistrement seront définitivement supprimés.",
      });

    if (!confirmation) return;

    try {
      setDeletingId(plan.id);
      setErreur(null);

      let equipementsQuery = supabase
        .from("equipements")
        .update({
          plan_id: null,
          position_x: null,
          position_y: null,
        })
        .eq("plan_id", plan.id);

      if (
        !vueTousMagasins &&
        magasinActif?.id
      ) {
        equipementsQuery =
          equipementsQuery.eq(
            "magasin_id",
            magasinActif.id
          );
      }

      const { error: updateError } =
        await equipementsQuery;

      if (updateError) {
        throw new Error(
          `Impossible de détacher les équipements : ${updateError.message}`
        );
      }

      let deleteQuery = supabase
        .from("plans")
        .delete()
        .eq("id", plan.id);

      if (
        !vueTousMagasins &&
        magasinActif?.id
      ) {
        deleteQuery = deleteQuery.eq(
          "magasin_id",
          magasinActif.id
        );
      }

      const { error: deleteError } =
        await deleteQuery;

      if (deleteError) {
        throw deleteError;
      }

      if (plan.image_path) {
        const { error: storageError } =
          await supabase.storage
            .from("plans")
            .remove([plan.image_path]);

        if (storageError) {
          toast.warning(
            "Plan supprimé de la base",
            "L’image n’a toutefois pas pu être supprimée du stockage."
          );
        }
      }

      toast.success(
        "Plan supprimé",
        plan.nom
      );

      await chargerPlans();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";

      setErreur(message);
      toast.error(
        "Erreur de suppression",
        message
      );
    } finally {
      setDeletingId(null);
    }
  }

  function changerMagasin(value: string) {
    changerMagasinActif(
      value === "__TOUS__"
        ? null
        : value
    );
  }

  return (
    <AppShell>
      <AppPage
        title="Plans"
        subtitle="Gestion des plans du magasin et cartographie interactive des équipements."
        actions={
          peutChangerMagasin ? (
            <select
              value={
                vueTousMagasins
                  ? "__TOUS__"
                  : magasinActif?.id ?? ""
              }
              onChange={(event) =>
                changerMagasin(
                  event.target.value
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="__TOUS__">
                Tous les magasins
              </option>

              {(
                magasinsDisponibles as readonly MagasinOption[]
              ).map((magasin) => (
                <option
                  key={magasin.id}
                  value={magasin.id}
                >
                  {magasin.nom}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        {erreur && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

       {peutAjouterPlan && (
  <AppCard title="Ajouter un plan">
    {vueTousMagasins || !magasinActif ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Sélectionne un magasin précis pour ajouter un plan.
      </div>
    ) : (
      <>
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          Le plan sera rattaché au magasin{" "}
          <strong>{magasinActif.nom}</strong>.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <AppInput
            label="Nom du plan"
            placeholder="RDC, Réserve, Cour matériaux..."
            value={nom}
            onChange={(event) =>
              setNom(event.target.value)
            }
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
                setFichier(
                  event.target.files?.[0] ?? null
                )
              }
              className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
            />
          </div>

          <AppButton
            loading={loading}
            onClick={ajouterPlan}
          >
            <Upload size={16} />
            Ajouter
          </AppButton>
        </div>

        {fichier && (
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
            Fichier sélectionné : {fichier.name}
          </p>
        )}
      </>
    )}
  </AppCard>
)}

        <AppCard title="Plans enregistrés">
          {loadingPlans || authLoading ? (
            <div className="py-10 text-center text-gray-500 dark:text-slate-400">
              Chargement des plans...
            </div>
          ) : plans.length === 0 ? (
            <AppEmptyState
              icon={<Map size={42} />}
              title="Aucun plan"
              description={
                vueTousMagasins
                  ? "Aucun plan n’est disponible dans les magasins consultés."
                  : "Ajoute un premier plan pour commencer à positionner les équipements."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {plans.map((plan) => {
                const total =
                  equipementsDuPlan(
                    plan.id
                  ).length;

                const enService =
                  compterEtat(
                    plan.id,
                    "En service"
                  );

                const maintenance =
                  compterEtat(
                    plan.id,
                    "En maintenance"
                  ) +
                  compterEtat(
                    plan.id,
                    "Maintenance"
                  );

                const horsService =
                  compterEtat(
                    plan.id,
                    "Hors service"
                  );

                return (
                  <article
                    key={plan.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
                  >
                    <Link
                      href={`/plans/${encodeURIComponent(
                        plan.id
                      )}`}
                      className="group block overflow-hidden"
                    >
                      <div className="relative">
                        <img
                          src={plan.image_url}
                          alt={`Plan ${plan.nom}`}
                          className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                          {total} équipement
                          {total > 1 ? "s" : ""}
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
                          {plan.created_at
                            ? new Date(
                                plan.created_at
                              ).toLocaleDateString(
                                "fr-FR"
                              )
                            : "—"}
                          {plan.largeur &&
                          plan.hauteur
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
                        <Link
                          href={`/plans/${encodeURIComponent(
                            plan.id
                          )}`}
                        >
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

                        <AccessControl
                          role={role}
                          roles={["ADMIN"]}
                        >
                          <AppButton
                            variant="danger"
                            className="px-3 py-2 text-xs"
                            loading={
                              deletingId ===
                              plan.id
                            }
                            onClick={() =>
                              void supprimerPlan(
                                plan
                              )
                            }
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
    <div
      className={`rounded-xl p-3 ${className}`}
    >
      <p className="text-xs opacity-80">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {valeur}
      </p>
    </div>
  );
}

function lireDimensionsImage(
  fichier: File
): Promise<{
  largeur: number;
  hauteur: number;
} | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl =
      URL.createObjectURL(fichier);

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