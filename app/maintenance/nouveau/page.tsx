"use client";

import {
  ChangeEvent,
  DragEvent,
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
  CalendarDays,
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
  Wrench,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  createMaintenance,
  formatMaintenanceError,
  getMaintenanceFormOptions,
  uploadMaintenanceDocument,
  type MaintenanceCreateInput,
  type MaintenanceFormOptions,
} from "@/services/maintenanceService";
import { createNotification } from "@/services/notificationService";

type FormState = {
  titre: string;
  equipement_id: string;
  prestataire_id: string;
  type_id: string;
  priorite_id: string;
  criticite_id: string;
  statut_id: string;
  resultat_id: string;
  description: string;
  anomalies: string;
  travaux_realises: string;
  observations: string;
  date_debut: string;
  date_fin: string;
  equipement_immobilise: boolean;
  date_remise_service: string;
  technicien: string;
  planifier: boolean;
  recurrent: boolean;
  periodicite_valeur: number;
  periodicite_unite: "jour" | "semaine" | "mois" | "annee";
};

const OPTIONS_VIDES: MaintenanceFormOptions = {
  equipements: [],
  prestataires: [],
  types: [],
  priorites: [],
  criticites: [],
  statuts: [],
  resultats: [],
};

function maintenantPourInput(): string {
  const date = new Date();
  const locale = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return locale.toISOString().slice(0, 16);
}

const FORMULAIRE_INITIAL: FormState = {
  titre: "",
  equipement_id: "",
  prestataire_id: "",
  type_id: "",
  priorite_id: "",
  criticite_id: "",
  statut_id: "",
  resultat_id: "",
  description: "",
  anomalies: "",
  travaux_realises: "",
  observations: "",
  date_debut: maintenantPourInput(),
  date_fin: "",
  equipement_immobilise: false,
  date_remise_service: "",
  technicien: "",
  planifier: true,
  recurrent: false,
  periodicite_valeur: 1,
  periodicite_unite: "annee",
};

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

function convertirDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function extensionFichier(nom: string): string {
  const index = nom.lastIndexOf(".");
  return index >= 0 ? nom.slice(index).toLowerCase() : "";
}

function iconeFichier(fichier: File) {
  const extension = extensionFichier(fichier.name);

  if (fichier.type.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-violet-600" />;
  }

  if ([".xls", ".xlsx", ".csv"].includes(extension)) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  }

  if ([".pdf", ".doc", ".docx", ".txt"].includes(extension)) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }

  return <File className="h-5 w-5 text-slate-600" />;
}

export default function NouvelleMaintenancePage() {
  const router = useRouter();
  const inputFichierRef = useRef<HTMLInputElement | null>(null);

  const {
    can,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canCreate = can("maintenance.create");

  const [options, setOptions] = useState<MaintenanceFormOptions>(OPTIONS_VIDES);
  const [formulaire, setFormulaire] = useState<FormState>(FORMULAIRE_INITIAL);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [glisserActif, setGlisserActif] = useState(false);
  const [progression, setProgression] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerOptions() {
      if (authLoading) return;

      if (vueTousMagasins || !magasinActif) {
        setOptions(OPTIONS_VIDES);
        setChargement(false);
        setErreur(
          vueTousMagasins
            ? "Sélectionne un magasin précis avant de créer une maintenance."
            : "Aucun magasin actif. Sélectionne un magasin."
        );
        return;
      }

      try {
        setChargement(true);
        setErreur(null);

        const donnees = await getMaintenanceFormOptions({
          magasinId: magasinActif.id,
          tousMagasins: false,
        });

        setOptions(donnees);
      } catch (error) {
        setErreur(formatMaintenanceError(error));
      } finally {
        setChargement(false);
      }
    }

    void chargerOptions();
  }, [authLoading, magasinActif?.id, vueTousMagasins]);

  const equipementSelectionne = useMemo(
    () =>
      options.equipements.find(
        (item) => item.id === formulaire.equipement_id
      ) ?? null,
    [formulaire.equipement_id, options.equipements]
  );

  const referentielsManquants = useMemo(() => {
    const manquants: string[] = [];

    if (options.types.length === 0) manquants.push("types");
    if (options.priorites.length === 0) manquants.push("priorités");
    if (options.criticites.length === 0) manquants.push("criticités");
    if (options.statuts.length === 0) manquants.push("statuts");
    if (options.resultats.length === 0) manquants.push("résultats");

    return manquants;
  }, [options]);

  function modifierChamp<K extends keyof FormState>(
    champ: K,
    valeur: FormState[K]
  ) {
    setFormulaire((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreur(null);
  }

  function ajouterFichiers(nouveauxFichiers: File[]) {
    const erreurs: string[] = [];
    const valides: File[] = [];

    for (const fichier of nouveauxFichiers) {
      const extension = extensionFichier(fichier.name);

      if (!EXTENSIONS_ACCEPTEES.includes(extension)) {
        erreurs.push(`${fichier.name} : format non autorisé`);
        continue;
      }

      if (fichier.size > TAILLE_MAX) {
        erreurs.push(`${fichier.name} : taille supérieure à 25 Mo`);
        continue;
      }

      const existe = fichiers.some(
        (item) =>
          item.name === fichier.name &&
          item.size === fichier.size &&
          item.lastModified === fichier.lastModified
      );

      if (!existe) valides.push(fichier);
    }

    setFichiers((actuels) => [...actuels, ...valides]);

    if (erreurs.length > 0) {
      setErreur(erreurs.join(" • "));
    } else {
      setErreur(null);
    }
  }

  function selectionnerFichiers(event: ChangeEvent<HTMLInputElement>) {
    ajouterFichiers(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function deposerFichiers(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setGlisserActif(false);
    ajouterFichiers(Array.from(event.dataTransfer.files));
  }

  function retirerFichier(index: number) {
    setFichiers((actuels) => actuels.filter((_, i) => i !== index));
  }

  async function creer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authLoading) {
      setErreur("Le profil utilisateur est encore en cours de chargement.");
      return;
    }

    if (!canCreate) {
      setErreur("Tu n’as pas l’autorisation de créer une maintenance.");
      return;
    }

    if (vueTousMagasins || !magasinActif) {
      setErreur("Sélectionne un magasin précis avant de créer une maintenance.");
      return;
    }

    if (!formulaire.titre.trim()) {
      setErreur("Le titre est obligatoire.");
      return;
    }

    if (!formulaire.equipement_id) {
      setErreur("Sélectionne un équipement.");
      return;
    }

    if (!formulaire.type_id) {
      setErreur("Sélectionne un type de maintenance.");
      return;
    }

    if (!formulaire.priorite_id) {
      setErreur("Sélectionne une priorité.");
      return;
    }

    if (!formulaire.criticite_id) {
      setErreur("Sélectionne une criticité.");
      return;
    }

    if (!formulaire.statut_id) {
      setErreur("Sélectionne un statut.");
      return;
    }

    const dateDebut = convertirDate(formulaire.date_debut);

    if (!dateDebut) {
      setErreur("La date de début est obligatoire.");
      return;
    }

    if (
      formulaire.date_fin &&
      new Date(formulaire.date_fin).getTime() <
        new Date(formulaire.date_debut).getTime()
    ) {
      setErreur("La date de fin ne peut pas être antérieure à la date de début.");
      return;
    }

    try {
      setEnregistrement(true);
      setErreur(null);
      setProgression("Création de la maintenance...");

      const payload: MaintenanceCreateInput = {
        magasin_id: magasinActif.id,
        titre: formulaire.titre.trim(),
        equipement_id: formulaire.equipement_id,
        prestataire_id: formulaire.prestataire_id || null,
        type_id: formulaire.type_id,
        priorite_id: formulaire.priorite_id,
        criticite_id: formulaire.criticite_id,
        statut_id: formulaire.statut_id,
        resultat_id: formulaire.resultat_id || null,
        description: formulaire.description.trim() || null,
        anomalies: formulaire.anomalies.trim() || null,
        travaux_realises: formulaire.travaux_realises.trim() || null,
        observations: formulaire.observations.trim() || null,
        date_debut: dateDebut,
        date_fin: convertirDate(formulaire.date_fin),
        equipement_immobilise: formulaire.equipement_immobilise,
        date_remise_service: convertirDate(formulaire.date_remise_service),
        technicien: formulaire.technicien.trim() || null,
      };

      const maintenance = await createMaintenance(payload);

      if (formulaire.planifier) {
        const datePlanning = new Date(formulaire.date_debut);
        const dateEvenement = formulaire.date_debut.slice(0, 10);
        const heureDebut = formulaire.date_debut.slice(11, 16) || null;
        const heureFin = formulaire.date_fin
          ? formulaire.date_fin.slice(11, 16) || null
          : null;

        const prioriteSelectionnee = options.priorites
          .find((item) => item.id === formulaire.priorite_id)
          ?.label.toLowerCase();

        const prioritePlanning = prioriteSelectionnee?.includes("criti")
          ? "critique"
          : prioriteSelectionnee?.includes("haut")
            ? "haute"
            : prioriteSelectionnee?.includes("bass")
              ? "basse"
              : "normale";

        if (Number.isNaN(datePlanning.getTime())) {
          throw new Error("La date de planification est invalide.");
        }

        const { error: erreurPlanning } = await supabase
          .from("planning_evenements")
          .insert({
            maintenance_id: maintenance.id,
            magasin_id: magasinActif.id,
            titre: formulaire.titre.trim(),
            description: formulaire.description.trim() || null,
            categorie: "Maintenance",
            date_evenement: dateEvenement,
            heure_debut: heureDebut,
            heure_fin: heureFin,
            statut: "planifie",
            priorite: prioritePlanning,
            equipement_id: formulaire.equipement_id,
            prestataire_id: formulaire.prestataire_id || null,
            recurrent: formulaire.recurrent,
            periodicite_valeur: formulaire.recurrent
              ? formulaire.periodicite_valeur
              : null,
            periodicite_unite: formulaire.recurrent
              ? formulaire.periodicite_unite
              : null,
            actif: true,
          });

        if (erreurPlanning) {
          throw new Error(
            `Maintenance créée, mais impossible de l’ajouter au planning : ${erreurPlanning.message}`
          );
        }
      }

      for (let index = 0; index < fichiers.length; index += 1) {
        setProgression(
          `Envoi du fichier ${index + 1} sur ${fichiers.length}...`
        );
        await uploadMaintenanceDocument(maintenance.id, fichiers[index]);
      }

      try {
        const prioriteLabel =
          options.priorites.find(
            (item) => item.id === formulaire.priorite_id
          )?.label ?? "";

        await createNotification({
          titre: "Nouvelle maintenance",
          message: `${maintenance.numero} — ${maintenance.titre}`,
          type: "maintenance",
          priorite:
            formulaire.equipement_immobilise ||
            prioriteLabel.toLowerCase().includes("criti") ||
            prioriteLabel.toLowerCase().includes("urgent")
              ? "haute"
              : "normale",
          magasinId: magasinActif.id,
          lien: `/maintenance/${maintenance.id}`,
        });
      } catch (notificationError) {
        console.error(
          "Maintenance créée mais notification impossible :",
          notificationError
        );
      }

      setProgression("Maintenance créée.");
      router.push(`/maintenance/${maintenance.id}`);
      router.refresh();
    } catch (error) {
      setErreur(formatMaintenanceError(error));
    } finally {
      setEnregistrement(false);
      setProgression("");
    }
  }

  if (chargement || authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            Chargement du formulaire...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <button
            type="button"
            onClick={() => router.push("/maintenance")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la maintenance
          </button>

          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Wrench className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Nouvelle maintenance
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Enregistre une demande ou une intervention avec ses documents.
              </p>
            </div>
          </div>
        </header>

        {(vueTousMagasins || !magasinActif) && !authLoading && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {vueTousMagasins
                ? "La création est désactivée dans la vue « Tous les magasins ». Sélectionne un magasin précis."
                : "Aucun magasin actif. Sélectionne un magasin avant de créer une maintenance."}
            </span>
          </div>
        )}

        {erreur && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        {referentielsManquants.length > 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              Référentiels introuvables :{" "}
              <strong>{referentielsManquants.join(", ")}</strong>. Remplace aussi
              le fichier <code>services/maintenanceService.ts</code> par la
              version corrigée fournie.
            </span>
          </div>
        )}

        <form onSubmit={creer} className="mt-8 space-y-6">
          <Section titre="Informations générales">
            <div className="grid gap-5 md:grid-cols-2">
              <ChampTexte
                label="Titre *"
                value={formulaire.titre}
                onChange={(value) => modifierChamp("titre", value)}
                placeholder="Ex. Réparation du rideau logistique"
                className="md:col-span-2"
              />

              <ChampSelect
                label="Équipement *"
                value={formulaire.equipement_id}
                onChange={(value) => modifierChamp("equipement_id", value)}
                options={options.equipements.map((item) => ({
                  id: item.id,
                  label: item.numero
                    ? `${item.numero} — ${item.label}`
                    : item.label,
                }))}
                placeholder="Sélectionner un équipement"
              />

              <ChampSelect
                label="Prestataire"
                value={formulaire.prestataire_id}
                onChange={(value) => modifierChamp("prestataire_id", value)}
                options={options.prestataires}
                placeholder="Aucun prestataire"
              />

              {equipementSelectionne?.secteur && (
                <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  Secteur : <strong>{equipementSelectionne.secteur}</strong>
                </div>
              )}

              <ChampSelect
                label="Type de maintenance *"
                value={formulaire.type_id}
                onChange={(value) => modifierChamp("type_id", value)}
                options={options.types}
              />

              <ChampSelect
                label="Priorité *"
                value={formulaire.priorite_id}
                onChange={(value) => modifierChamp("priorite_id", value)}
                options={options.priorites}
              />

              <ChampSelect
                label="Criticité *"
                value={formulaire.criticite_id}
                onChange={(value) => modifierChamp("criticite_id", value)}
                options={options.criticites}
              />

              <ChampSelect
                label="Statut *"
                value={formulaire.statut_id}
                onChange={(value) => modifierChamp("statut_id", value)}
                options={options.statuts}
              />

              <ChampSelect
                label="Résultat"
                value={formulaire.resultat_id}
                onChange={(value) => modifierChamp("resultat_id", value)}
                options={options.resultats}
                placeholder="Aucun résultat"
              />

              <ChampTexte
                label="Technicien ou intervenant"
                value={formulaire.technicien}
                onChange={(value) => modifierChamp("technicien", value)}
                placeholder="Nom de l’intervenant"
              />
            </div>
          </Section>

          <Section titre="Dates et disponibilité">
            <div className="grid gap-5 md:grid-cols-2">
              <ChampDate
                label="Date de début *"
                value={formulaire.date_debut}
                onChange={(value) => modifierChamp("date_debut", value)}
              />

              <ChampDate
                label="Date de fin"
                value={formulaire.date_fin}
                onChange={(value) => modifierChamp("date_fin", value)}
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <input
                type="checkbox"
                checked={formulaire.equipement_immobilise}
                onChange={(event) =>
                  modifierChamp("equipement_immobilise", event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Équipement immobilisé
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Active cette option lorsque l’équipement ne peut plus être
                  utilisé.
                </span>
              </span>
            </label>

            {formulaire.equipement_immobilise && (
              <div className="mt-5 max-w-md">
                <ChampDate
                  label="Date de remise en service"
                  value={formulaire.date_remise_service}
                  onChange={(value) =>
                    modifierChamp("date_remise_service", value)
                  }
                />
              </div>
            )}
          </Section>

          <Section titre="Planification">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <input
                type="checkbox"
                checked={formulaire.planifier}
                onChange={(event) =>
                  modifierChamp("planifier", event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Ajouter cette maintenance au planning
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  L’événement sera lié à la fiche maintenance et s’ouvrira directement depuis le calendrier.
                </span>
              </span>
            </label>

            {formulaire.planifier && (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  La date et les heures du planning reprendront les champs « Date de début » et « Date de fin » ci-dessus.
                </p>

                <label className="mt-4 flex cursor-pointer items-center gap-3 font-medium text-slate-800 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={formulaire.recurrent}
                    onChange={(event) =>
                      modifierChamp("recurrent", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Maintenance récurrente
                </label>

                {formulaire.recurrent && (
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Tous les
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={formulaire.periodicite_valeur}
                        onChange={(event) =>
                          modifierChamp(
                            "periodicite_valeur",
                            Math.max(1, Number(event.target.value) || 1)
                          )
                        }
                        className={classeChamp()}
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Unité
                      </span>
                      <select
                        value={formulaire.periodicite_unite}
                        onChange={(event) =>
                          modifierChamp(
                            "periodicite_unite",
                            event.target.value as FormState["periodicite_unite"]
                          )
                        }
                        className={classeChamp()}
                      >
                        <option value="jour">Jour(s)</option>
                        <option value="semaine">Semaine(s)</option>
                        <option value="mois">Mois</option>
                        <option value="annee">Année(s)</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section titre="Compte rendu">
            <div className="space-y-5">
              <ChampTexteLong
                label="Description"
                value={formulaire.description}
                onChange={(value) => modifierChamp("description", value)}
                placeholder="Décris la demande ou l’intervention."
              />

              <ChampTexteLong
                label="Anomalies constatées"
                value={formulaire.anomalies}
                onChange={(value) => modifierChamp("anomalies", value)}
                placeholder="Décris les anomalies observées."
              />

              <ChampTexteLong
                label="Travaux réalisés"
                value={formulaire.travaux_realises}
                onChange={(value) => modifierChamp("travaux_realises", value)}
                placeholder="Indique les actions réalisées."
              />

              <ChampTexteLong
                label="Observations"
                value={formulaire.observations}
                onChange={(value) => modifierChamp("observations", value)}
                placeholder="Ajoute les informations complémentaires."
              />
            </div>
          </Section>

          <Section titre="Documents">
            <input
              ref={inputFichierRef}
              type="file"
              multiple
              accept={EXTENSIONS_ACCEPTEES.join(",")}
              onChange={selectionnerFichiers}
              className="hidden"
            />

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setGlisserActif(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setGlisserActif(false)}
              onDrop={deposerFichiers}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
                glisserActif
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              }`}
            >
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">
                Dépose les fichiers ici
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                PDF, Word, Excel, PowerPoint, images, texte ou ZIP — 25 Mo
                maximum par fichier.
              </p>
              <button
                type="button"
                onClick={() => inputFichierRef.current?.click()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Paperclip className="h-5 w-5" />
                Choisir des fichiers
              </button>
            </div>

            {fichiers.length > 0 && (
              <div className="mt-5 space-y-3">
                {fichiers.map((fichier, index) => (
                  <div
                    key={`${fichier.name}-${fichier.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                      {iconeFichier(fichier)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {fichier.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTaille(fichier.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => retirerFichier(index)}
                      disabled={enregistrement}
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                      aria-label={`Retirer ${fichier.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {progression && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {enregistrement ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {progression}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/maintenance")}
              disabled={enregistrement}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                enregistrement ||
                authLoading ||
                !canCreate ||
                vueTousMagasins ||
                !magasinActif ||
                referentielsManquants.length > 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Créer la maintenance
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">
        {titre}
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
        onChange={(event) => onChange(event.target.value)}
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
  placeholder = "Sélectionner",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={classeChamp()}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <CalendarDays className="h-4 w-4" />
        {label}
      </span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={classeChamp()}
      />
    </label>
  );
}

function ChampTexteLong({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        value={value}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${classeChamp()} resize-y`}
      />
    </label>
  );
}