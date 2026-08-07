"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  deleteConsigne,
  getConsigne,
  restoreConsigne,
  updateConsigne,
} from "@/services/consignesService";
import type {
  Consigne,
  ConsigneUpdateInput,
} from "@/types/consignes";

type FormState = {
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur: string;
  auteur: string;
};

const CATEGORIES = [
  "Sécurité",
  "Sûreté",
  "Incendie",
  "Maintenance",
  "Exploitation",
  "Logistique",
  "Accueil",
  "Caisse",
  "RH",
  "Direction",
  "Autre",
];

const PRIORITES = [
  "Basse",
  "Normale",
  "Haute",
  "Urgente",
];

const TAILLE_MAX = 25 * 1024 * 1024;

const EXTENSIONS_ACCEPTEES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
];

function messageErreur(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "Une erreur inconnue est survenue.";
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function extensionFichier(nom: string): string {
  const index = nom.lastIndexOf(".");

  return index >= 0
    ? nom.slice(index).toLowerCase()
    : "";
}

function typeApercuFichier(
  nom: string | null
): "pdf" | "image" | "autre" {
  if (!nom) {
    return "autre";
  }

  const extension = extensionFichier(nom);

  if (extension === ".pdf") {
    return "pdf";
  }

  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".svg",
    ].includes(extension)
  ) {
    return "image";
  }

  return "autre";
}

function formatTaille(octets: number): string {
  if (octets < 1024) {
    return `${octets} o`;
  }

  if (octets < 1024 * 1024) {
    return `${(octets / 1024).toFixed(1)} Ko`;
  }

  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function nettoyerNomFichier(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function iconeFichier(fichier: File) {
  const extension = extensionFichier(fichier.name);

  if (fichier.type.startsWith("image/")) {
    return (
      <ImageIcon className="h-5 w-5 text-violet-600" />
    );
  }

  if (
    [".xls", ".xlsx", ".csv"].includes(extension)
  ) {
    return (
      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
    );
  }

  if (
    [".pdf", ".doc", ".docx", ".txt"].includes(
      extension
    )
  ) {
    return (
      <FileText className="h-5 w-5 text-blue-600" />
    );
  }

  return (
    <File className="h-5 w-5 text-slate-600" />
  );
}

function versFormulaire(
  consigne: Consigne
): FormState {
  return {
    titre: consigne.titre,
    contenu: consigne.contenu,
    categorie: consigne.categorie,
    priorite: consigne.priorite,
    secteur: consigne.secteur ?? "",
    auteur: consigne.auteur ?? "",
  };
}

export default function ConsigneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inputFichierRef =
    useRef<HTMLInputElement | null>(null);

  const id = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id ?? "");

  const {
    can,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canEdit = can("consignes.edit");
  const canDelete = can("consignes.delete");

  const [consigne, setConsigne] =
    useState<Consigne | null>(null);

  const [form, setForm] =
    useState<FormState>({
      titre: "",
      contenu: "",
      categorie: "Sécurité",
      priorite: "Normale",
      secteur: "",
      auteur: "",
    });

  const [nouveauFichier, setNouveauFichier] =
    useState<File | null>(null);

  const [modeEdition, setModeEdition] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [restoring, setRestoring] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!id || authLoading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getConsigne(id, {
        magasinId: magasinActif?.id ?? null,
        tousMagasins: vueTousMagasins,
      });

      setConsigne(data);
      setForm(versFormulaire(data));
    } catch (currentError) {
      console.error(
        "Erreur chargement consigne :",
        currentError
      );

      setError(
        messageErreur(currentError)
      );
      setConsigne(null);
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    id,
    magasinActif?.id,
    vueTousMagasins,
  ]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function setField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
    setSuccess(null);
  }

  function selectionnerFichier(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const fichier =
      event.target.files?.[0];

    if (!fichier) {
      return;
    }

    const extension = extensionFichier(
      fichier.name
    );

    if (
      !EXTENSIONS_ACCEPTEES.includes(extension)
    ) {
      setError(
        "Format de fichier non autorisé."
      );
      event.target.value = "";
      return;
    }

    if (fichier.size > TAILLE_MAX) {
      setError(
        "Le fichier dépasse la taille maximale de 25 Mo."
      );
      event.target.value = "";
      return;
    }

    setNouveauFichier(fichier);
    setError(null);
    event.target.value = "";
  }

  async function uploadFichier(
    magasinId: string
  ): Promise<{
    url: string;
    nom: string;
  }> {
    if (!nouveauFichier) {
      throw new Error(
        "Aucun fichier sélectionné."
      );
    }

    const nomNettoye =
      nettoyerNomFichier(
        nouveauFichier.name
      );

    const path = [
      magasinId,
      new Date().getFullYear(),
      `${crypto.randomUUID()}-${nomNettoye}`,
    ].join("/");

    const { error: uploadError } =
      await supabase.storage
        .from("consignes-files")
        .upload(
          path,
          nouveauFichier,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("consignes-files")
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      nom: nouveauFichier.name,
    };
  }

  function valider(): boolean {
    if (!canEdit) {
      setError(
        "Tu n’as pas l’autorisation de modifier cette consigne."
      );
      return false;
    }

    if (!consigne) {
      setError("Consigne introuvable.");
      return false;
    }

    if (!form.titre.trim()) {
      setError("Le titre est obligatoire.");
      return false;
    }

    if (!form.contenu.trim()) {
      setError(
        "Le contenu est obligatoire."
      );
      return false;
    }

    if (!form.categorie.trim()) {
      setError(
        "La catégorie est obligatoire."
      );
      return false;
    }

    if (!form.priorite.trim()) {
      setError(
        "La priorité est obligatoire."
      );
      return false;
    }

    return true;
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!valider() || !consigne) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let fichierData: {
        url: string;
        nom: string;
      } | null = null;

      if (nouveauFichier) {
        fichierData = await uploadFichier(
          consigne.magasin_id ?? ""
        );
      }

      const payload: ConsigneUpdateInput = {
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie:
          form.categorie.trim(),
        priorite:
          form.priorite.trim(),
        secteur:
          form.secteur.trim() || null,
        auteur:
          form.auteur.trim() || null,
      };

      if (fichierData) {
        payload.fichier_url =
          fichierData.url;
        payload.fichier_nom =
          fichierData.nom;
      }

      const updated =
        await updateConsigne(
          consigne.id,
          payload,
          {
            magasinId:
              magasinActif?.id ?? null,
            tousMagasins:
              vueTousMagasins,
          }
        );

      setConsigne(updated);
      setForm(versFormulaire(updated));
      setNouveauFichier(null);
      setModeEdition(false);
      setSuccess(
        "La consigne a été modifiée avec succès."
      );
    } catch (currentError) {
      console.error(
        "Erreur modification consigne :",
        currentError
      );

      setError(
        messageErreur(currentError)
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiver() {
    if (!consigne || !canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `Archiver la consigne « ${consigne.titre} » ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      await deleteConsigne(
        consigne.id,
        {
          magasinId:
            magasinActif?.id ?? null,
          tousMagasins:
            vueTousMagasins,
        }
      );

      setConsigne((current) =>
        current
          ? {
              ...current,
              actif: false,
            }
          : current
      );

      setSuccess(
        "La consigne a été archivée."
      );
    } catch (currentError) {
      setError(
        messageErreur(currentError)
      );
    } finally {
      setDeleting(false);
    }
  }

  async function restaurer() {
    if (!consigne || !canEdit) {
      return;
    }

    try {
      setRestoring(true);
      setError(null);

      await restoreConsigne(
        consigne.id,
        {
          magasinId:
            magasinActif?.id ?? null,
          tousMagasins:
            vueTousMagasins,
        }
      );

      setConsigne((current) =>
        current
          ? {
              ...current,
              actif: true,
            }
          : current
      );

      setSuccess(
        "La consigne a été restaurée."
      );
    } catch (currentError) {
      setError(
        messageErreur(currentError)
      );
    } finally {
      setRestoring(false);
    }
  }

  if (loading || authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Chargement de la consigne...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!consigne) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />

              <div>
                <h1 className="text-xl font-bold">
                  Consigne introuvable
                </h1>

                <p className="mt-2">
                  Cette consigne n’existe pas ou n’appartient pas au magasin consulté.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/consignes"
                    )
                  }
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
                >
                  Retour aux consignes
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const typeApercu = typeApercuFichier(
    consigne.fichier_nom
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <button
            type="button"
            onClick={() =>
              router.push("/consignes")
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux consignes
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {consigne.categorie}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {consigne.priorite}
                </span>

                {consigne.actif === false && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                    Archivée
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                {consigne.titre}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Créée le{" "}
                {formatDate(
                  consigne.created_at ??
                    consigne.date_creation
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!modeEdition &&
                canEdit &&
                consigne.actif !== false && (
                  <button
                    type="button"
                    onClick={() =>
                      setModeEdition(true)
                    }
                    className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Modifier
                  </button>
                )}

              {consigne.actif !== false &&
                canDelete && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      void archiver()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                    Archiver
                  </button>
                )}

              {consigne.actif === false &&
                canEdit && (
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={() =>
                      void restaurer()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {restoring && (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    Restaurer
                  </button>
                )}
            </div>
          </div>
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

        {!modeEdition ? (
          <>
            <Section title="Contenu">
              <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                {consigne.contenu}
              </div>
            </Section>

            <Section title="Informations">
              <div className="grid gap-5 md:grid-cols-2">
                <Info
                  label="Catégorie"
                  value={
                    consigne.categorie
                  }
                />

                <Info
                  label="Priorité"
                  value={
                    consigne.priorite
                  }
                />

                <Info
                  label="Secteur"
                  value={
                    consigne.secteur ??
                    "Non renseigné"
                  }
                />

                <Info
                  label="Auteur"
                  value={
                    consigne.auteur ??
                    "Non renseigné"
                  }
                />
              </div>
            </Section>

            {consigne.fichier_url && (
              <Section title="Fichier joint">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <Paperclip className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {consigne.fichier_nom ??
                            "Fichier joint"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {typeApercu === "pdf"
                            ? "Document PDF — aperçu intégré"
                            : typeApercu === "image"
                              ? "Image — aperçu intégré"
                              : "Document joint"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={consigne.fichier_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir
                      </a>

                      <a
                        href={consigne.fichier_url}
                        download
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </a>
                    </div>
                  </div>

                  {typeApercu === "pdf" && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                      <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Aperçu du document
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Le PDF peut être consulté directement sans quitter la consigne.
                        </p>
                      </div>

                      <iframe
                        src={`${consigne.fichier_url}#toolbar=1&navpanes=0&scrollbar=1`}
                        title={`Aperçu de ${
                          consigne.fichier_nom ??
                          consigne.titre
                        }`}
                        className="h-[70vh] min-h-[600px] w-full border-0 bg-white"
                      />
                    </div>
                  )}

                  {typeApercu === "image" && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-950">
                      <div className="mb-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Aperçu de l’image
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          L’image est affichée directement dans la consigne.
                        </p>
                      </div>

                      <div className="flex justify-center">
                        <img
                          src={consigne.fichier_url}
                          alt={
                            consigne.fichier_nom ??
                            consigne.titre
                          }
                          className="max-h-[750px] max-w-full rounded-xl object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {typeApercu === "autre" && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
                      <FileText className="mx-auto h-10 w-10 text-slate-400" />

                      <p className="mt-3 font-semibold text-slate-900 dark:text-white">
                        Aperçu non disponible pour ce format
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Utilise « Ouvrir » ou « Télécharger » pour consulter le fichier.
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </>
        ) : (
          <form
            onSubmit={enregistrer}
            className="space-y-6"
          >
            <Section title="Modifier la consigne">
              <div className="grid gap-5 md:grid-cols-2">
                <ChampTexte
                  label="Titre *"
                  value={form.titre}
                  onChange={(value) =>
                    setField(
                      "titre",
                      value
                    )
                  }
                  className="md:col-span-2"
                />

                <ChampSelect
                  label="Catégorie *"
                  value={
                    form.categorie
                  }
                  onChange={(value) =>
                    setField(
                      "categorie",
                      value
                    )
                  }
                  options={CATEGORIES}
                />

                <ChampSelect
                  label="Priorité *"
                  value={
                    form.priorite
                  }
                  onChange={(value) =>
                    setField(
                      "priorite",
                      value
                    )
                  }
                  options={PRIORITES}
                />

                <ChampTexte
                  label="Secteur"
                  value={
                    form.secteur
                  }
                  onChange={(value) =>
                    setField(
                      "secteur",
                      value
                    )
                  }
                />

                <ChampTexte
                  label="Auteur"
                  value={
                    form.auteur
                  }
                  onChange={(value) =>
                    setField(
                      "auteur",
                      value
                    )
                  }
                />

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Contenu *
                  </span>

                  <textarea
                    rows={12}
                    value={
                      form.contenu
                    }
                    onChange={(event) =>
                      setField(
                        "contenu",
                        event.target.value
                      )
                    }
                    className={`${classeChamp()} resize-y`}
                  />
                </label>
              </div>
            </Section>

            <Section title="Remplacer le fichier joint">
              <input
                ref={inputFichierRef}
                type="file"
                accept={EXTENSIONS_ACCEPTEES.join(
                  ","
                )}
                onChange={
                  selectionnerFichier
                }
                className="hidden"
              />

              {!nouveauFichier ? (
                <button
                  type="button"
                  onClick={() =>
                    inputFichierRef.current?.click()
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-5 py-4 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <UploadCloud className="h-5 w-5" />
                  Choisir un nouveau fichier
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    {iconeFichier(
                      nouveauFichier
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {
                        nouveauFichier.name
                      }
                    </p>

                    <p className="text-xs text-slate-500">
                      {formatTaille(
                        nouveauFichier.size
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNouveauFichier(
                        null
                      )
                    }
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </Section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setForm(
                    versFormulaire(
                      consigne
                    )
                  );
                  setNouveauFichier(
                    null
                  );
                  setModeEdition(false);
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function classeChamp(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
}

function ChampTexte({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={classeChamp()}
      />
    </label>
  );
}

function ChampSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={classeChamp()}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}