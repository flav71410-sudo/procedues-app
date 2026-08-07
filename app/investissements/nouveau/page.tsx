"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Euro,
  FileText,
  Loader2,
  Paperclip,
  Save,
  Store,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";



import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { createDocument } from "@/services/documentsService";

type FormulaireInvestissement = {
  titre: string;
  description: string;
  prestataire: string;
  secteur: string;
  montantHt: string;
  tauxTva: string;
  dateDocument: string;
  anneeBudget: string;
  priorite: "NORMALE" | "HAUTE" | "URGENTE";
  commentaire: string;
};

const FORMULAIRE_INITIAL: FormulaireInvestissement = {
  titre: "",
  description: "",
  prestataire: "",
  secteur: "",
  montantHt: "",
  tauxTva: "20",
  dateDocument: new Date().toISOString().slice(0, 10),
  anneeBudget: String(new Date().getFullYear()),
  priorite: "NORMALE",
  commentaire: "",
};

const STORAGE_BUCKET = "documents";

function convertirMontant(value: string): number {
  const montant = Number(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(montant)
    ? montant
    : 0;
}

function formatMontant(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function messageErreur(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message: unknown }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function nettoyerNomFichier(
  filename: string
): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtension(
  filename: string
): string | null {
  const parts = filename.split(".");

  if (parts.length < 2) {
    return null;
  }

  return parts.pop()?.toLowerCase() ?? null;
}

export default function NouveauInvestissementPage() {
  const router = useRouter();

  const {
  user,
  role,
  magasinActif,
  vueTousMagasins,
  magasinsDisponibles,
  peutChangerMagasin,
  changerMagasinActif,
  loading: authLoading,
} = useAuth();

  const [formulaire, setFormulaire] =
    useState<FormulaireInvestissement>(
      FORMULAIRE_INITIAL
    );

  const [fichier, setFichier] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const canManage = [
    "SUPER_ADMIN",
    "ADMIN",
    "DM",
  ].includes(role);

  const montantHt = useMemo(
    () =>
      convertirMontant(
        formulaire.montantHt
      ),
    [formulaire.montantHt]
  );

  const tauxTva = useMemo(
    () =>
      convertirMontant(
        formulaire.tauxTva
      ),
    [formulaire.tauxTva]
  );

  const montantTva = useMemo(
    () =>
      montantHt *
      (tauxTva / 100),
    [montantHt, tauxTva]
  );

  const montantTtc = useMemo(
    () =>
      montantHt + montantTva,
    [montantHt, montantTva]
  );

  function modifierChamp<
    K extends keyof FormulaireInvestissement
  >(
    champ: K,
    valeur: FormulaireInvestissement[K]
  ) {
    setFormulaire((current) => ({
      ...current,
      [champ]: valeur,
    }));

    setError(null);
    setSuccess(null);
  }

  function selectionnerFichier(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFichier(null);
      return;
    }

    const tailleMax =
      15 * 1024 * 1024;

    if (selectedFile.size > tailleMax) {
      setError(
        "Le fichier ne doit pas dépasser 15 Mo."
      );

      event.target.value = "";
      setFichier(null);
      return;
    }

    const extensionsAutorisees = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "png",
      "jpg",
      "jpeg",
      "webp",
    ];

    const extension =
      getExtension(selectedFile.name);

    if (
      !extension ||
      !extensionsAutorisees.includes(
        extension
      )
    ) {
      setError(
        "Type de fichier non autorisé."
      );

      event.target.value = "";
      setFichier(null);
      return;
    }

    setFichier(selectedFile);
    setError(null);
  }

  function changerMagasin(value: string) {
  changerMagasinActif(value || null);
}

  function validerFormulaire(): string | null {
    if (!magasinActif) {
      return "Sélectionne un magasin avant de créer un investissement.";
    }

    if (!formulaire.titre.trim()) {
      return "Le titre de l’investissement est obligatoire.";
    }

    if (!formulaire.description.trim()) {
      return "La description est obligatoire.";
    }

    if (!formulaire.secteur.trim()) {
      return "Le secteur est obligatoire.";
    }

    if (!formulaire.prestataire.trim()) {
      return "Le prestataire est obligatoire.";
    }

    if (montantHt <= 0) {
      return "Le montant HT doit être supérieur à zéro.";
    }

    if (
      tauxTva < 0 ||
      tauxTva > 100
    ) {
      return "Le taux de TVA doit être compris entre 0 et 100.";
    }

    if (!formulaire.dateDocument) {
      return "La date du devis est obligatoire.";
    }

    if (
      !formulaire.anneeBudget ||
      Number(formulaire.anneeBudget) < 2020
    ) {
      return "L’année budgétaire est invalide.";
    }

    if (!fichier) {
      return "Le devis ou document justificatif est obligatoire.";
    }

    return null;
  }

  async function uploaderFichier(
    file: File
  ): Promise<{
    url: string;
    path: string;
  }> {
    if (!magasinActif?.id) {
      throw new Error(
        "Aucun magasin actif."
      );
    }

    const fichierNettoye =
      nettoyerNomFichier(
        file.name
      );

    const uniqueId =
      crypto.randomUUID();

    const storagePath = [
      magasinActif.id,
      "investissements",
      String(
        formulaire.anneeBudget
      ),
      `${uniqueId}-${fichierNettoye}`,
    ].join("/");

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(
          storagePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type ||
              undefined,
          }
        );

    if (uploadError) {
      throw new Error(
        `Erreur lors de l’upload : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } =
      supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(
          storagePath
        );

    const url =
      publicUrlData.publicUrl;

    if (!url) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([
          storagePath,
        ]);

      throw new Error(
        "Impossible de récupérer l’URL du fichier."
      );
    }

    return {
      url,
      path: storagePath,
    };
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const validationError =
      validerFormulaire();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!fichier) {
      return;
    }

    if (!magasinActif) {
      return;
    }

    let uploadedPath:
      | string
      | null = null;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const upload =
        await uploaderFichier(
          fichier
        );

      uploadedPath =
        upload.path;

      const document =
        await createDocument({
          titre:
            formulaire.titre.trim(),

          description:
            formulaire.description.trim(),

          categorie:
            "Investissements",

          dossier:
            "Investissements",

          sous_dossier:
            String(
              formulaire.anneeBudget
            ),

          auteur:
            user?.email ?? null,

          secteur:
            formulaire.secteur.trim(),

          prestataire:
            formulaire.prestataire.trim(),

          fichier_nom:
            fichier.name,

          fichier_url:
            upload.url,

          extension:
            getExtension(
              fichier.name
            ),

          taille:
            fichier.size,

          date_document:
            formulaire.dateDocument,

          version:
            1,

          tags: [
            "investissement",
            formulaire.priorite.toLowerCase(),
            String(
              formulaire.anneeBudget
            ),
          ],

          magasin_id:
            magasinActif.id,

          est_devis:
            true,

          statut_devis:
            "EN_ATTENTE",

          montant_ht:
            montantHt,

          taux_tva:
            tauxTva,

          annee_budget:
            Number(
              formulaire.anneeBudget
            ),

          devis_signe:
            false,

          date_signature:
            null,

          signe_par:
            null,

          commentaire_devis:
            formulaire.commentaire.trim() ||
            null,
        });

      setSuccess(
        "L’investissement a été créé avec succès."
      );

      window.setTimeout(() => {
        router.push(
          `/documents/${document.id}`
        );
      }, 700);
    } catch (
      currentError
    ) {
      console.error(
        "Erreur création investissement :",
        currentError
      );

      if (uploadedPath) {
        try {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([
              uploadedPath,
            ]);
        } catch (
          cleanupError
        ) {
          console.error(
            "Erreur suppression fichier après échec :",
            cleanupError
          );
        }
      }

      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[520px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
        </div>
      </AppShell>
    );
  }

  if (!canManage) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />

            <div>
              <h1 className="text-xl font-bold">
                Accès refusé
              </h1>

              <p className="mt-2">
                Cette page est réservée aux profils
                autorisés à gérer les investissements.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/investissements"
                  )
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <TrendingUp className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Investissements
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                Nouvel investissement
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Enregistrer une nouvelle demande
                d’investissement et son devis.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/investissements"
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour aux investissements
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{success}</span>
          </div>
        )}

        <form
          onSubmit={enregistrer}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Informations générales
                  </h2>

                  <p className="text-sm text-slate-500">
                    Description de la demande
                    d’investissement.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
    Magasin
  </span>

  {peutChangerMagasin ? (
    <div className="relative">
      <Store className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

      <select
        value={
          vueTousMagasins
            ? "__TOUS__"
            : magasinActif?.id ?? ""
        }
        onChange={(e) =>
          changerMagasin(e.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <option value="">
          Sélectionner un magasin
        </option>

        {magasinsDisponibles.map((magasin) => (
          <option
            key={magasin.id}
            value={magasin.id}
          >
            {magasin.nom}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <div className="flex min-h-[50px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <Store className="h-5 w-5 text-slate-400" />

      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {magasinActif?.nom ?? "Aucun magasin actif"}
      </span>
    </div>
  )}
</label>
<label className="md:col-span-2">
  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
    Titre de l’investissement
    <span className="text-red-600">
      {" "}*
    </span>
  </span>

  <input
    type="text"
    value={formulaire.titre}
    onChange={(event) =>
      modifierChamp(
        "titre",
        event.target.value
      )
    }
    placeholder="Exemple : Remplacement du rideau logistique"
    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
  />
</label>
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Description / justification
                    <span className="text-red-600">
                      {" "}*
                    </span>
                  </span>

                  <textarea
                    value={
                      formulaire.description
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "description",
                        event.target.value
                      )
                    }
                    rows={6}
                    placeholder="Décris le besoin, l’anomalie, le risque et la solution proposée..."
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Secteur
                    <span className="text-red-600">
                      {" "}*
                    </span>
                  </span>

                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

                    <input
                      type="text"
                      value={
                        formulaire.secteur
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "secteur",
                          event.target.value
                        )
                      }
                      placeholder="Sécurité, logistique..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Prestataire
                    <span className="text-red-600">
                      {" "}*
                    </span>
                  </span>

                  <input
                    type="text"
                    value={
                      formulaire.prestataire
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "prestataire",
                        event.target.value
                      )
                    }
                    placeholder="Nom du prestataire"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Priorité
                  </span>

                  <select
                    value={
                      formulaire.priorite
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "priorite",
                        event.target
                          .value as FormulaireInvestissement["priorite"]
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="NORMALE">
                      Normale
                    </option>

                    <option value="HAUTE">
                      Haute
                    </option>

                    <option value="URGENTE">
                      Urgente
                    </option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Magasin
                  </span>

                  <div className="flex min-h-[50px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <Store className="h-5 w-5 text-slate-400" />

                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {magasinActif?.nom ??
                        "Aucun magasin actif"}
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Euro className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Informations financières
                  </h2>

                  <p className="text-sm text-slate-500">
                    Montant, TVA et exercice
                    budgétaire.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Montant HT
                    <span className="text-red-600">
                      {" "}*
                    </span>
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      formulaire.montantHt
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "montantHt",
                        event.target.value
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    TVA
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      formulaire.tauxTva
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "tauxTva",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Date du devis
                  </span>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

                    <input
                      type="date"
                      value={
                        formulaire.dateDocument
                      }
                      onChange={(
                        event
                      ) =>
                        modifierChamp(
                          "dateDocument",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Année budgétaire
                  </span>

                  <input
                    type="number"
                    value={
                      formulaire.anneeBudget
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "anneeBudget",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-6 flex items-center gap-3">
                <Paperclip className="h-5 w-5 text-violet-600" />

                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Devis / pièce jointe
                  </h2>

                  <p className="text-sm text-slate-500">
                    Le fichier est obligatoire.
                  </p>
                </div>
              </div>

              {!fichier ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center transition hover:border-blue-500 dark:border-slate-700">
                  <Upload className="h-10 w-10 text-slate-400" />

                  <span className="mt-4 font-bold text-slate-900 dark:text-white">
                    Sélectionner le devis
                  </span>

                  <span className="mt-1 text-sm text-slate-500">
                    PDF, Word, Excel ou image —
                    15 Mo maximum
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                    onChange={
                      selectionnerFichier
                    }
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-white">
                      {fichier.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {(
                        fichier.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      Mo
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFichier(null)
                    }
                    className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Commentaire
                </span>

                <textarea
                  value={
                    formulaire.commentaire
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "commentaire",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Récapitulatif
              </h2>

              <div className="mt-5 space-y-4">
                <RecapitulatifLigne
                  label="HT"
                  value={
                    formatMontant(
                      montantHt
                    )
                  }
                />

                <RecapitulatifLigne
                  label={`TVA ${tauxTva}%`}
                  value={
                    formatMontant(
                      montantTva
                    )
                  }
                />

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <RecapitulatifLigne
                    label="TTC"
                    value={
                      formatMontant(
                        montantTtc
                      )
                    }
                    important
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              Le nouvel investissement sera
              automatiquement enregistré avec le
              statut <strong>En attente</strong>.
            </section>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}

              {saving
                ? "Enregistrement..."
                : "Créer l’investissement"}
            </button>
          </aside>
        </form>
      </main>
    </AppShell>
  );
}

function RecapitulatifLigne({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          important
            ? "font-bold text-slate-900 dark:text-white"
            : "text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          important
            ? "text-xl font-black text-blue-700 dark:text-blue-300"
            : "font-bold text-slate-900 dark:text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}