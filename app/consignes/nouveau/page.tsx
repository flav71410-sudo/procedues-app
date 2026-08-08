"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
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
import { createConsigne } from "@/services/consignesService";
import type { ConsigneCreateInput } from "@/types/consignes";

type FormState = {
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur: string;
  auteur: string;
};

const FORM_INITIAL: FormState = {
  titre: "",
  contenu: "",
  categorie: "Sécurité",
  priorite: "Normale",
  secteur: "",
  auteur: "",
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

function extensionFichier(nom: string): string {
  const index = nom.lastIndexOf(".");
  return index >= 0
    ? nom.slice(index).toLowerCase()
    : "";
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

export default function NouvelleConsignePage() {
  const router = useRouter();
  const inputFichierRef =
    useRef<HTMLInputElement | null>(null);

  const {
    can,
    profil,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canCreate = can("consignes.create");

  const [form, setForm] =
    useState<FormState>(FORM_INITIAL);

  const [fichier, setFichier] =
    useState<File | null>(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [progress, setProgress] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

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

  function validerFichier(
    selectedFile: File
  ): string | null {
    const extension = extensionFichier(
      selectedFile.name
    );

    if (
      !EXTENSIONS_ACCEPTEES.includes(extension)
    ) {
      return "Format de fichier non autorisé.";
    }

    if (selectedFile.size > TAILLE_MAX) {
      return "Le fichier dépasse la taille maximale de 25 Mo.";
    }

    return null;
  }

  function ajouterFichier(
    selectedFile: File
  ) {
    const validationError =
      validerFichier(selectedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    setFichier(selectedFile);
    setError(null);
  }

  function selectionnerFichier(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      ajouterFichier(selectedFile);
    }

    event.target.value = "";
  }

  function deposerFichier(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);

    const selectedFile =
      event.dataTransfer.files?.[0];

    if (selectedFile) {
      ajouterFichier(selectedFile);
    }
  }

  async function uploadFichier(
    magasinId: string
  ): Promise<{
    url: string;
    nom: string;
  } | null> {
    if (!fichier) {
      return null;
    }

    const nomNettoye =
      nettoyerNomFichier(fichier.name);

    const path = [
      magasinId,
      new Date().getFullYear(),
      `${crypto.randomUUID()}-${nomNettoye}`,
    ].join("/");

    const { error: uploadError } =
      await supabase.storage
        .from("consignes-files")
        .upload(path, fichier, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("consignes-files")
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      nom: fichier.name,
    };
  }

  function valider(): boolean {
    if (!canCreate) {
      setError(
        "Tu n’as pas l’autorisation de créer une consigne."
      );
      return false;
    }

    if (authLoading) {
      setError(
        "Le profil est encore en cours de chargement."
      );
      return false;
    }

    if (
      vueTousMagasins ||
      !magasinActif
    ) {
      setError(
        "Sélectionne un magasin précis avant de créer une consigne."
      );
      return false;
    }

    if (!form.titre.trim()) {
      setError("Le titre est obligatoire.");
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

    if (!valider() || !magasinActif) {
      return;
    }

    let uploadedPathUrl: string | null = null;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let fichierData: {
        url: string;
        nom: string;
      } | null = null;

      if (fichier) {
        setProgress(
          "Envoi du fichier joint..."
        );

        fichierData = await uploadFichier(
          magasinActif.id
        );

        uploadedPathUrl =
          fichierData?.url ?? null;
      }

      setProgress(
        "Création de la consigne..."
      );

      const auteur =
  form.auteur.trim() ||
  profil?.nom ||
  profil?.email ||
  null;

      const payload: ConsigneCreateInput = {
        magasin_id: magasinActif.id,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie:
          form.categorie.trim(),
        priorite:
          form.priorite.trim(),
        secteur:
          form.secteur.trim() || null,
        auteur,
        actif: true,
        fichier_url:
          fichierData?.url ?? null,
        fichier_nom:
          fichierData?.nom ?? null,
        date_creation:
          new Date().toISOString(),
      };

      const created =
        await createConsigne(payload);

      setProgress("");
      setSuccess(
        "La consigne a été créée avec succès."
      );

      window.setTimeout(() => {
  router.push("/consignes");
  router.refresh();
}, 500);
    } catch (currentError) {
      console.error(
        "Erreur création consigne :",
        currentError
      );

      setError(
        messageErreur(currentError)
      );

      /*
       * On ne supprime pas automatiquement le fichier ici,
       * car fichier_url stocke une URL publique et non le chemin
       * interne du bucket. La suppression sera gérée dans la
       * fiche détail lorsque le chemin sera disponible.
       */
      void uploadedPathUrl;
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  const creationBloquee =
    saving ||
    authLoading ||
    !canCreate ||
    vueTousMagasins ||
    !magasinActif;

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

          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Nouvelle consigne
            </h1>

            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Crée une consigne pour le magasin sélectionné.
            </p>
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

        <Section title="Magasin">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <p className="text-sm font-semibold">
              Magasin de rattachement
            </p>

            <p className="mt-1 text-lg font-bold">
              {vueTousMagasins
                ? "Sélectionne un magasin précis"
                : magasinActif?.nom ??
                  "Aucun magasin sélectionné"}
            </p>

            <p className="mt-1 text-sm">
  La consigne sera visible uniquement par les utilisateurs de ce magasin.
</p>
          </div>
        </Section>

        <form
          onSubmit={enregistrer}
          className="space-y-6"
        >
          <Section title="Informations générales">
            <div className="grid gap-5 md:grid-cols-2">
              <ChampTexte
                label="Titre *"
                value={form.titre}
                onChange={(value) =>
                  setField("titre", value)
                }
                placeholder="Ex. Procédure d’évacuation"
                className="md:col-span-2"
              />

              <ChampSelect
                label="Catégorie *"
                value={form.categorie}
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
                value={form.priorite}
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
                value={form.secteur}
                onChange={(value) =>
                  setField("secteur", value)
                }
                placeholder="Ex. Logistique, Caisse, Sécurité"
              />

              <ChampTexte
                label="Auteur"
                value={form.auteur}
                onChange={(value) =>
                  setField("auteur", value)
                }
                placeholder="Laisser vide pour utiliser le profil connecté"
              />
            </div>
          </Section>

          <Section title="Contenu de la consigne">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Contenu
              </span>

              <textarea
                rows={12}
                value={form.contenu}
                onChange={(event) =>
                  setField(
                    "contenu",
                    event.target.value
                  )
                }
                placeholder="Rédige la consigne complète..."
                className={`${classeChamp()} resize-y`}
              />
            </label>
          </Section>

          <Section title="Fichier joint">
            <input
              ref={inputFichierRef}
              type="file"
              accept={EXTENSIONS_ACCEPTEES.join(
                ","
              )}
              onChange={selectionnerFichier}
              className="hidden"
            />

            {!fichier ? (
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDragLeave={() =>
                  setDragActive(false)
                }
                onDrop={deposerFichier}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                }`}
              >
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">
                  Dépose un fichier ici
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  PDF, Word, Excel, PowerPoint, image, texte ou ZIP — 25 Mo maximum.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    inputFichierRef.current?.click()
                  }
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Paperclip className="h-5 w-5" />
                  Choisir un fichier
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                  {iconeFichier(fichier)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {fichier.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {formatTaille(
                      fichier.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFichier(null)
                  }
                  disabled={saving}
                  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                  aria-label="Retirer le fichier"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </Section>

          {progress && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              {progress}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push("/consignes")
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
              Annuler
            </button>

            <button
              type="submit"
              disabled={creationBloquee}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}

              Créer la consigne
            </button>
          </div>
        </form>
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

function classeChamp(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
}

function ChampTexte({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
          onChange(event.target.value)
        }
        placeholder={placeholder}
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
          onChange(event.target.value)
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