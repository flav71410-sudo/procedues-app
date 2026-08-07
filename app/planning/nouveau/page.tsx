"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  Repeat,
  Save,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  createPlanningEvent,
} from "@/services/planningService";
import { ajouterJournal } from "@/services/journal";
import type {
  PlanningCreateInput,
  PlanningPeriodicite,
  PlanningPriorite,
  PlanningStatut,
} from "@/types/planning";

type EquipementOption = {
  id: string;
  nom: string;
  numero: string | null;
};

type PrestataireOption = {
  id: string;
  nom: string;
};

type FormState = {
  titre: string;
  description: string;
  categorie: string;
  date_evenement: string;
  heure_debut: string;
  heure_fin: string;
  statut: PlanningStatut;
  priorite: PlanningPriorite;
  equipement_id: string;
  prestataire_id: string;
  recurrent: boolean;
  periodicite_valeur: number;
  periodicite_unite: PlanningPeriodicite;
};

const CATEGORIES = [
  "SSI",
  "BAES",
  "Extincteurs",
  "RIA",
  "Sprinkler",
  "Désenfumage",
  "Portes coupe-feu",
  "Portes automatiques",
  "Électricité",
  "Ascenseur",
  "CTS",
  "ICPE",
  "Formation",
  "Commission sécurité",
  "Maintenance",
  "Autre",
];

function dateAujourdhui(): string {
  const date = new Date();
  const locale = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return locale.toISOString().slice(0, 10);
}

const FORM_INITIAL: FormState = {
  titre: "",
  description: "",
  categorie: "Maintenance",
  date_evenement: dateAujourdhui(),
  heure_debut: "",
  heure_fin: "",
  statut: "planifie",
  priorite: "normale",
  equipement_id: "",
  prestataire_id: "",
  recurrent: false,
  periodicite_valeur: 1,
  periodicite_unite: "annee",
};

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

export default function NouveauPlanningPage() {
  const router = useRouter();

  const {
    can,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canCreate =
    can("planning.create") ||
    can("planning.edit");

  const [form, setForm] =
    useState<FormState>(FORM_INITIAL);

  const [equipements, setEquipements] =
    useState<EquipementOption[]>([]);

  const [prestataires, setPrestataires] =
    useState<PrestataireOption[]>([]);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const chargerOptions = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (vueTousMagasins || !magasinActif) {
      setEquipements([]);
      setPrestataires([]);
      setLoadingOptions(false);
      return;
    }

    try {
      setLoadingOptions(true);
      setError(null);

      const [
        equipementsResult,
        prestatairesResult,
      ] = await Promise.all([
        supabase
          .from("equipements")
          .select("id, nom, numero")
          .eq("magasin_id", magasinActif.id)
          .order("nom", { ascending: true }),

        supabase
          .from("prestataires")
          .select("id, nom")
          .eq("magasin_id", magasinActif.id)
          .order("nom", { ascending: true }),
      ]);

      if (equipementsResult.error) {
        throw equipementsResult.error;
      }

      if (prestatairesResult.error) {
        throw prestatairesResult.error;
      }

      setEquipements(
        (equipementsResult.data ?? []) as EquipementOption[]
      );

      setPrestataires(
        (prestatairesResult.data ?? []) as PrestataireOption[]
      );
    } catch (currentError) {
      console.error(
        "Erreur chargement options planning :",
        currentError
      );

      setError(messageErreur(currentError));
    } finally {
      setLoadingOptions(false);
    }
  }, [
    authLoading,
    magasinActif,
    vueTousMagasins,
  ]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      equipement_id: "",
      prestataire_id: "",
    }));

    void chargerOptions();
  }, [chargerOptions]);

  const equipementSelectionne = useMemo(
    () =>
      equipements.find(
        (item) =>
          item.id === form.equipement_id
      ) ?? null,
    [equipements, form.equipement_id]
  );

  function setField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
  }

  function validerFormulaire(): boolean {
    if (!canCreate) {
      setError(
        "Tu n’as pas l’autorisation de créer un événement."
      );
      return false;
    }

    if (authLoading) {
      setError(
        "Le profil utilisateur est encore en cours de chargement."
      );
      return false;
    }

    if (vueTousMagasins || !magasinActif) {
      setError(
        "Sélectionne un magasin précis avant de créer un événement."
      );
      return false;
    }

    if (!form.titre.trim()) {
      setError("Le titre est obligatoire.");
      return false;
    }

    if (!form.date_evenement) {
      setError("La date est obligatoire.");
      return false;
    }

    if (
      form.heure_debut &&
      form.heure_fin &&
      form.heure_fin <= form.heure_debut
    ) {
      setError(
        "L’heure de fin doit être postérieure à l’heure de début."
      );
      return false;
    }

    if (
      form.recurrent &&
      form.periodicite_valeur < 1
    ) {
      setError(
        "La périodicité doit être supérieure ou égale à 1."
      );
      return false;
    }

    return true;
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validerFormulaire()) {
      return;
    }

    if (!magasinActif) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: PlanningCreateInput = {
        magasin_id: magasinActif.id,
        maintenance_id: null,
        equipement_id:
          form.equipement_id || null,
        prestataire_id:
          form.prestataire_id || null,
        titre: form.titre.trim(),
        description:
          form.description.trim() || null,
        categorie: form.categorie,
        date_evenement:
          form.date_evenement,
        heure_debut:
          form.heure_debut || null,
        heure_fin:
          form.heure_fin || null,
        statut: form.statut,
        priorite: form.priorite,
        recurrent: form.recurrent,
        periodicite_valeur:
          form.recurrent
            ? form.periodicite_valeur
            : null,
        periodicite_unite:
          form.recurrent
            ? form.periodicite_unite
            : null,
        rappel_email_active: false,
        rappel_email_delai: null,
        rappel_email_unite: null,
        rappel_email_destinataires: null,
      };

      const created =
        await createPlanningEvent(payload);

      await ajouterJournal(
        "Création",
        "Planning",
        `Événement créé : ${created.titre} (${magasinActif.nom})`
      );

      setSuccess(
        "L’événement a été créé avec succès."
      );

      window.setTimeout(() => {
        window.location.href = "/planning";
      }, 600);
    } catch (currentError) {
      console.error(
        "Erreur création événement planning :",
        currentError
      );

      setError(messageErreur(currentError));
    } finally {
      setSaving(false);
    }
  }

  const creationBloquee =
    saving ||
    authLoading ||
    loadingOptions ||
    vueTousMagasins ||
    !magasinActif ||
    !canCreate;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <button
            type="button"
            onClick={() =>
              router.push("/planning")
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au planning
          </button>

          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <CalendarDays className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Nouvel événement
              </h1>

              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Ajoute une intervention, une vérification ou une échéance au planning.
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

            <p className="mt-1 text-sm">
              L’événement sera visible uniquement dans ce magasin.
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
                placeholder="Ex. Vérification annuelle du SSI"
                className="md:col-span-2"
              />

              <ChampSelect
                label="Catégorie"
                value={form.categorie}
                onChange={(value) =>
                  setField("categorie", value)
                }
                options={CATEGORIES.map(
                  (categorie) => ({
                    value: categorie,
                    label: categorie,
                  })
                )}
              />

              <ChampSelect
                label="Priorité"
                value={form.priorite}
                onChange={(value) =>
                  setField(
                    "priorite",
                    value as PlanningPriorite
                  )
                }
                options={[
                  {
                    value: "basse",
                    label: "Basse",
                  },
                  {
                    value: "normale",
                    label: "Normale",
                  },
                  {
                    value: "haute",
                    label: "Haute",
                  },
                  {
                    value: "critique",
                    label: "Critique",
                  },
                ]}
              />

              <ChampSelect
                label="Statut"
                value={form.statut}
                onChange={(value) =>
                  setField(
                    "statut",
                    value as PlanningStatut
                  )
                }
                options={[
                  {
                    value: "planifie",
                    label: "Planifié",
                  },
                  {
                    value: "en_cours",
                    label: "En cours",
                  },
                  {
                    value: "termine",
                    label: "Terminé",
                  },
                  {
                    value: "annule",
                    label: "Annulé",
                  },
                ]}
              />

              <ChampSelect
                label="Équipement"
                value={form.equipement_id}
                onChange={(value) =>
                  setField(
                    "equipement_id",
                    value
                  )
                }
                placeholder={
                  loadingOptions
                    ? "Chargement..."
                    : "Aucun équipement"
                }
                options={equipements.map(
                  (equipement) => ({
                    value: equipement.id,
                    label: equipement.numero
                      ? `${equipement.numero} — ${equipement.nom}`
                      : equipement.nom,
                  })
                )}
              />

              <ChampSelect
                label="Prestataire"
                value={form.prestataire_id}
                onChange={(value) =>
                  setField(
                    "prestataire_id",
                    value
                  )
                }
                placeholder={
                  loadingOptions
                    ? "Chargement..."
                    : "Aucun prestataire"
                }
                options={prestataires.map(
                  (prestataire) => ({
                    value: prestataire.id,
                    label: prestataire.nom,
                  })
                )}
              />

              {equipementSelectionne && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 md:col-span-2">
                  Équipement sélectionné :{" "}
                  <strong>
                    {equipementSelectionne.numero
                      ? `${equipementSelectionne.numero} — `
                      : ""}
                    {equipementSelectionne.nom}
                  </strong>
                </div>
              )}
            </div>
          </Section>

          <Section title="Date et horaires">
            <div className="grid gap-5 md:grid-cols-3">
              <ChampDate
                label="Date *"
                type="date"
                value={form.date_evenement}
                onChange={(value) =>
                  setField(
                    "date_evenement",
                    value
                  )
                }
              />

              <ChampDate
                label="Heure de début"
                type="time"
                value={form.heure_debut}
                onChange={(value) =>
                  setField(
                    "heure_debut",
                    value
                  )
                }
              />

              <ChampDate
                label="Heure de fin"
                type="time"
                value={form.heure_fin}
                onChange={(value) =>
                  setField("heure_fin", value)
                }
              />
            </div>
          </Section>

          <Section title="Récurrence">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <input
                type="checkbox"
                checked={form.recurrent}
                onChange={(event) =>
                  setField(
                    "recurrent",
                    event.target.checked
                  )
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <Repeat className="h-4 w-4" />
                  Événement récurrent
                </span>

                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Utilise cette option pour les contrôles et vérifications périodiques.
                </span>
              </span>
            </label>

            {form.recurrent && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tous les
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={
                      form.periodicite_valeur
                    }
                    onChange={(event) =>
                      setField(
                        "periodicite_valeur",
                        Math.max(
                          1,
                          Number(
                            event.target.value
                          ) || 1
                        )
                      )
                    }
                    className={classeChamp()}
                  />
                </label>

                <ChampSelect
                  label="Unité"
                  value={
                    form.periodicite_unite
                  }
                  onChange={(value) =>
                    setField(
                      "periodicite_unite",
                      value as PlanningPeriodicite
                    )
                  }
                  options={[
                    {
                      value: "jour",
                      label: "Jour(s)",
                    },
                    {
                      value: "semaine",
                      label: "Semaine(s)",
                    },
                    {
                      value: "mois",
                      label: "Mois",
                    },
                    {
                      value: "annee",
                      label: "Année(s)",
                    },
                  ]}
                />
              </div>
            )}
          </Section>

          <Section title="Description">
            <ChampTexteLong
              label="Description"
              value={form.description}
              onChange={(value) =>
                setField("description", value)
              }
              placeholder="Décris l’intervention, le contrôle ou l’échéance."
            />
          </Section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push("/planning")
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

              Créer l’événement
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
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
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
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChampDate({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "date" | "time";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
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
        rows={6}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={`${classeChamp()} resize-y`}
      />
    </label>
  );
}