"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
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
  Folder,
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
import { createDocument } from "@/services/documentsService";
import type { CreateDocumentInput } from "@/types/documents";

type FormState = {
  titre: string;
  description: string;
  categorie: string;
  dossier: string;
  sous_dossier: string;
  auteur: string;
  secteur: string;
  prestataire: string;
  date_document: string;
  tags: string;
};
type OptionSimple = {
  id: string;
  nom: string;
};

type DocumentClassement = {
  dossier: string | null;
  sous_dossier: string | null;
};

const FORM_INITIAL: FormState = {
  titre: "",
  description: "",
  categorie: "Rapports",
  dossier: "Rapports",
  sous_dossier: "",
  auteur: "",
  secteur: "",
  prestataire: "",
  date_document: "",
  tags: "",
};

const DOSSIERS: Record<string, string[]> = {
  Registres: ["ERP", "ICPE", "Accessibilité"],
  "Sécurité incendie": [
    "SSI",
    "BAES",
    "RIA",
    "Extincteurs",
    "Désenfumage",
    "Sprinkler",
    "Portes coupe-feu",
  ],
  "Vérifications réglementaires": [],
  Contrats: [],
  Rapports: [],
  Plans: [],
  Notices: [],
  Formations: [],
  Procédures: [],
  Consignes: [],
  Prestataires: [],
  Divers: [],
};

const CATEGORIES = [
  "Registre",
  "Rapport",
  "Contrat",
  "Plan",
  "Notice",
  "Procédure",
  "Consigne",
  "Formation",
  "Vérification",
  "Attestation",
  "Autre",
];

const TAILLE_MAX = 50 * 1024 * 1024;

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

function extensionSansPoint(nom: string): string {
  return extensionFichier(nom).replace(".", "");
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

function nettoyerChemin(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function iconeFichier(fichier: File) {
  const extension = extensionFichier(fichier.name);

  if (fichier.type.startsWith("image/")) {
    return (
      <ImageIcon className="h-6 w-6 text-violet-600" />
    );
  }

  if (
    [".xls", ".xlsx", ".csv"].includes(extension)
  ) {
    return (
      <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
    );
  }

  if (
    [".pdf", ".doc", ".docx", ".txt"].includes(
      extension
    )
  ) {
    return (
      <FileText className="h-6 w-6 text-blue-600" />
    );
  }

  return (
    <File className="h-6 w-6 text-slate-600" />
  );
}

export default function NouveauDocumentPage() {
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const {
    user,
    can,
    profil,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canCreate = can("documents.create");

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

  const [popupFichierObligatoire, setPopupFichierObligatoire] =
    useState(false);
const [secteurs, setSecteurs] =
  useState<OptionSimple[]>([]);

const [prestataires, setPrestataires] =
  useState<OptionSimple[]>([]);

const [classementsExistants, setClassementsExistants] =
  useState<DocumentClassement[]>([]);

const [loadingReferentiels, setLoadingReferentiels] =
  useState(false);
  
  const dossiersDisponibles = useMemo(() => {
  const valeurs = new Set<string>(
    Object.keys(DOSSIERS)
  );

  for (const document of classementsExistants) {
    const dossier = document.dossier?.trim();

    if (dossier) {
      valeurs.add(dossier);
    }
  }

  const dossierSaisi = form.dossier.trim();

  if (dossierSaisi) {
    valeurs.add(dossierSaisi);
  }

  return Array.from(valeurs).sort((a, b) =>
    a.localeCompare(
      b,
      "fr",
      { sensitivity: "base" }
    )
  );
}, [
  classementsExistants,
  form.dossier,
]);

const sousDossiers = useMemo(() => {
  const valeurs = new Set<string>(
    DOSSIERS[form.dossier] ?? []
  );

  for (const document of classementsExistants) {
    if (
      document.dossier?.trim() ===
      form.dossier.trim()
    ) {
      const sousDossier =
        document.sous_dossier?.trim();

      if (sousDossier) {
        valeurs.add(sousDossier);
      }
    }
  }

  return Array.from(valeurs).sort((a, b) =>
    a.localeCompare(
      b,
      "fr",
      { sensitivity: "base" }
    )
  );
}, [
  classementsExistants,
  form.dossier,
]);

useEffect(() => {
  async function chargerReferentiels() {
    if (
      authLoading ||
      vueTousMagasins ||
      !magasinActif?.id
    ) {
      setSecteurs([]);
      setPrestataires([]);
      setClassementsExistants([]);
      return;
    }

    try {
      setLoadingReferentiels(true);

      const [
        secteursResult,
        prestatairesResult,
        documentsResult,
      ] = await Promise.all([
        supabase
          .from("secteurs")
          .select("id, nom")
          .eq(
            "magasin_id",
            magasinActif.id
          )
          .eq("actif", true)
          .order("nom"),

        supabase
          .from("prestataires")
          .select("id, nom")
          .eq(
            "magasin_id",
            magasinActif.id
          )
          .eq("actif", true)
          .order("nom"),

        supabase
          .from("documents")
          .select(
            "dossier, sous_dossier"
          )
          .eq(
            "magasin_id",
            magasinActif.id
          ),
      ]);

      if (secteursResult.error) {
        throw secteursResult.error;
      }

      if (prestatairesResult.error) {
        throw prestatairesResult.error;
      }

      if (documentsResult.error) {
        throw documentsResult.error;
      }

      setSecteurs(
        (secteursResult.data ?? []) as OptionSimple[]
      );

      setPrestataires(
        (prestatairesResult.data ?? []) as OptionSimple[]
      );

      setClassementsExistants(
        (documentsResult.data ?? []) as DocumentClassement[]
      );
    } catch (currentError) {
      console.error(
        "Erreur chargement référentiels document :",
        currentError
      );

      setError(
        messageErreur(currentError)
      );
    } finally {
      setLoadingReferentiels(false);
    }
  }

  void chargerReferentiels();
}, [
  authLoading,
  magasinActif?.id,
  vueTousMagasins,
]);

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

  function selectionnerDossier(value: string) {
    setForm((current) => ({
      ...current,
      dossier: value,
      sous_dossier: "",
    }));
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
      return "Le fichier dépasse la taille maximale de 50 Mo.";
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

    if (!form.titre.trim()) {
      const titreAuto = selectedFile.name.replace(
        /\.[^/.]+$/,
        ""
      );

      setForm((current) => ({
        ...current,
        titre: titreAuto,
      }));
    }
  }

  function selectionnerFichier(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0];

    if (selected) {
      ajouterFichier(selected);
    }

    event.target.value = "";
  }

  function deposerFichier(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);

    const selected =
      event.dataTransfer.files?.[0];

    if (selected) {
      ajouterFichier(selected);
    }
  }

  function valider(): boolean {
    if (!canCreate) {
      setError(
        "Tu n’as pas l’autorisation d’ajouter un document."
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
        "Sélectionne un magasin précis avant d’ajouter un document."
      );
      return false;
    }

    if (!fichier) {
      setError(null);
      setPopupFichierObligatoire(true);
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

    if (!form.dossier.trim()) {
      setError(
        "Le dossier est obligatoire."
      );
      return false;
    }

    return true;
  }

  async function uploadFichier(
    magasinId: string
  ): Promise<{
    path: string;
  }> {
    if (!fichier) {
      throw new Error(
        "Aucun fichier sélectionné."
      );
    }

    const nomNettoye =
      nettoyerNomFichier(fichier.name);

    const dossierNettoye =
      nettoyerChemin(
        form.dossier || "sans-dossier"
      ) || "sans-dossier";

    const sousDossierNettoye =
      nettoyerChemin(
        form.sous_dossier || "racine"
      ) || "racine";

    const path = [
      magasinId,
      dossierNettoye,
      sousDossierNettoye,
      String(new Date().getFullYear()),
      `${crypto.randomUUID()}-${nomNettoye}`,
    ].join("/");

    const { error: uploadError } =
      await supabase.storage
        .from("documents")
        .upload(path, fichier, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Erreur d’envoi du fichier : ${uploadError.message}`
      );
    }

    return {
      path,
    };
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!valider() || !magasinActif || !fichier) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      setProgress("Envoi du fichier...");

      const upload = await uploadFichier(
        magasinActif.id
      );

      setProgress(
        "Création de la fiche document..."
      );

      const auteur =
        [
          profil?.prenom,
          profil?.nom,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        profil?.email ||
        user?.email ||
        "Utilisateur";

      const tags = form.tags
        .split(/[;,]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload: CreateDocumentInput & {
        fichier_path: string;
      } = {
        magasin_id: magasinActif.id,
        titre: form.titre.trim(),
        description:
          form.description.trim() || null,
        categorie:
          form.categorie.trim(),
        dossier:
          form.dossier.trim() || null,
        sous_dossier:
          form.sous_dossier.trim() || null,
        // Compatibilité avec la colonne historique :
        // on y stocke désormais le chemin privé, jamais une URL publique.
        fichier_url: upload.path,
        fichier_path: upload.path,
        fichier_nom: fichier.name,
        auteur,
        secteur:
          form.secteur.trim() || null,
        prestataire:
          form.prestataire.trim() || null,
        date_document:
          form.date_document || null,
        extension:
          extensionSansPoint(
            fichier.name
          ) || null,
        taille: fichier.size,
        version: 1,
        tags,
      };

      const created =
        await createDocument(payload);

      setProgress("");
      setSuccess(
        "Le document a été ajouté avec succès."
      );

      window.setTimeout(() => {
        router.push(
          `/documents/${created.id}`
        );
        router.refresh();
      }, 500);
    } catch (currentError) {
      console.error(
        "Erreur création document :",
        currentError
      );

      setError(
        messageErreur(currentError)
      );
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
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <button
            type="button"
            onClick={() =>
              router.push("/documents")
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux documents
          </button>

          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Folder className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Nouveau document
              </h1>

              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Ajoute et classe un document dans l’arborescence du magasin.
              </p>
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
          </div>
        </Section>

        <form
          onSubmit={enregistrer}
          className="space-y-6"
        >
          <Section title="Fichier">
            <input
              ref={inputRef}
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
                className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                }`}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />

                <p className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Dépose le fichier ici
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  PDF, Word, Excel, PowerPoint, image, texte ou ZIP — 50 Mo maximum.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Paperclip className="h-5 w-5" />
                  Choisir un fichier
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  {iconeFichier(fichier)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {fichier.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
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
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </Section>

          <Section title="Classement">
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Dossier *
                </span>

                <select
                  value={
                    dossiersDisponibles.includes(form.dossier)
                      ? form.dossier
                      : ""
                  }
                  onChange={(event) =>
                    selectionnerDossier(
                      event.target.value
                    )
                  }
                  className={classeChamp()}
                >
                  <option value="">
                    Choisir un dossier existant
                  </option>

                  {dossiersDisponibles.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={form.dossier}
                  onChange={(event) =>
                    selectionnerDossier(
                      event.target.value
                    )
                  }
                  placeholder="Ou saisir un nouveau dossier"
                  className={`${classeChamp()} mt-3`}
                />

                <p className="mt-2 text-xs text-slate-500">
                  Le nouveau dossier apparaît immédiatement dans la liste et sera enregistré avec le document.
                </p>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sous-dossier
                </span>

                <select
                  value={
                    sousDossiers.includes(form.sous_dossier)
                      ? form.sous_dossier
                      : ""
                  }
                  onChange={(event) =>
                    setField(
                      "sous_dossier",
                      event.target.value
                    )
                  }
                  className={classeChamp()}
                >
                  <option value="">
                    Choisir un sous-dossier existant
                  </option>

                  {sousDossiers.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={form.sous_dossier}
                  onChange={(event) =>
                    setField(
                      "sous_dossier",
                      event.target.value
                    )
                  }
                  placeholder="Ou saisir un nouveau sous-dossier"
                  className={`${classeChamp()} mt-3`}
                />

                <p className="mt-2 text-xs text-slate-500">
                  Sélectionne un sous-dossier existant dans la liste ou saisis-en un nouveau.
                </p>
              </label>

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

              <ChampTexte
                label="Tags"
                value={form.tags}
                onChange={(value) =>
                  setField("tags", value)
                }
                placeholder="SSI, V1, 2026"
              />
            </div>
          </Section>

          <Section title="Informations">
            <div className="grid gap-5 md:grid-cols-2">
              <ChampTexte
                label="Titre *"
                value={form.titre}
                onChange={(value) =>
                  setField("titre", value)
                }
                placeholder="Titre du document"
                className="md:col-span-2"
              />

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Auteur
                </span>

                <input
                  type="text"
                  value={
                    [
                      profil?.prenom,
                      profil?.nom,
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .trim() ||
                    profil?.email ||
                    user?.email ||
                    "Utilisateur connecté"
                  }
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  L’auteur est automatiquement défini avec le compte qui ajoute le document.
                </p>
              </label>

              <ChampDate
                label="Date du document"
                value={form.date_document}
                onChange={(value) =>
                  setField(
                    "date_document",
                    value
                  )
                }
              />

              <ChampTexte
                label="Secteur"
                value={form.secteur}
                onChange={(value) =>
                  setField("secteur", value)
                }
                placeholder="Ex. Sécurité"
              />

              <ChampTexte
                label="Prestataire"
                value={form.prestataire}
                onChange={(value) =>
                  setField(
                    "prestataire",
                    value
                  )
                }
                placeholder="Ex. WeMaintain"
              />

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description
                </span>

                <textarea
                  rows={6}
                  value={form.description}
                  onChange={(event) =>
                    setField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Description du document..."
                  className={`${classeChamp()} resize-y`}
                />
              </label>
            </div>
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
              onClick={() =>
                router.push("/documents")
              }
              disabled={saving}
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

              Ajouter le document
            </button>
          </div>
        </form>

        {popupFichierObligatoire && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fichier-obligatoire-title"
          >
            <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
              <h2
                id="fichier-obligatoire-title"
                className="text-xl font-bold text-white"
              >
                Fichier obligatoire
              </h2>

              <p className="mt-4 text-slate-300">
                Merci d’ajouter un fichier pour pouvoir ajouter le document.
              </p>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPopupFichierObligatoire(false)}
                  className="rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPopupFichierObligatoire(false);
                    window.setTimeout(() => {
                      inputRef.current?.click();
                    }, 0);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                >
                  Ajouter un fichier
                </button>
              </div>
            </div>
          </div>
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

function ChampDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={classeChamp()}
      />
    </label>
  );
}