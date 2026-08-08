"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import {
  AppBadge,
  AppButton,
  AppCard,
  AppEmptyState,
  AppInput,
  AppPage,
  AppSelect,
  AppTabs,
  AppTextarea,
} from "@/components/ui";
import EquipmentDocuments from "@/components/equipements/EquipmentDocuments";
import EquipmentHistory from "@/components/equipements/EquipmentHistory";
import EquipmentLocation from "@/components/equipements/EquipmentLocation";
import EquipmentPhotos from "@/components/equipements/EquipmentPhotos";
import EquipmentQRCode from "@/components/equipements/EquipmentQRCode";
import EquipmentVerifications from "@/components/equipements/EquipmentVerifications";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { ajouterJournal } from "@/services/journal";

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string | null;
  fabricant: string | null;
  modele: string | null;
  numero_serie: string | null;
  date_installation: string | null;
  date_mise_service: string | null;
  prochaine_verification: string | null;
  observations: string | null;
  type_id: string | null;
  secteur_id: string | null;
  prestataire_id: string | null;
  plan_id: string | null;
  position_x: number | null;
  position_y: number | null;
  magasin_id: string;
  created_at: string | null;
};

type RefItem = {
  id: string;
  nom: string;
};

type Photo = {
  id: string;
  url: string;
  path: string | null;
  commentaire: string | null;
  created_at: string;
};

type Intervention = {
  id: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  technicien: string | null;
};

type FormState = {
  numero: string;
  nom: string;
  emplacement: string;
  etat: string;
  fabricant: string;
  modele: string;
  numero_serie: string;
  date_installation: string;
  date_mise_service: string;
  prochaine_verification: string;
  observations: string;
  type_id: string;
  secteur_id: string;
  prestataire_id: string;
};

const EMPTY_FORM: FormState = {
  numero: "",
  nom: "",
  emplacement: "",
  etat: "En service",
  fabricant: "",
  modele: "",
  numero_serie: "",
  date_installation: "",
  date_mise_service: "",
  prochaine_verification: "",
  observations: "",
  type_id: "",
  secteur_id: "",
  prestataire_id: "",
};

function toForm(equipement: Equipement): FormState {
  return {
    numero: equipement.numero,
    nom: equipement.nom,
    emplacement: equipement.emplacement ?? "",
    etat: equipement.etat ?? "En service",
    fabricant: equipement.fabricant ?? "",
    modele: equipement.modele ?? "",
    numero_serie: equipement.numero_serie ?? "",
    date_installation: equipement.date_installation ?? "",
    date_mise_service: equipement.date_mise_service ?? "",
    prochaine_verification:
      equipement.prochaine_verification ?? "",
    observations: equipement.observations ?? "",
    type_id: equipement.type_id ?? "",
    secteur_id: equipement.secteur_id ?? "",
    prestataire_id: equipement.prestataire_id ?? "",
  };
}

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
    dateStyle: "medium",
  }).format(date);
}

function badgeEtat(
  etat: string | null
): "success" | "danger" | "warning" | "gray" {
  const valeur = (etat ?? "").toLowerCase();

  if (
    valeur === "en service" ||
    valeur === "fonctionnel" ||
    valeur === "conforme"
  ) {
    return "success";
  }

  if (
    valeur === "hors service" ||
    valeur === "hs" ||
    valeur.includes("défect") ||
    valeur.includes("defect")
  ) {
    return "danger";
  }

  if (
    valeur.includes("maintenance") ||
    valeur.includes("remplacer") ||
    valeur.includes("contrô") ||
    valeur.includes("control") ||
    valeur.includes("vérif") ||
    valeur.includes("verif")
  ) {
    return "warning";
  }

  return "gray";
}

export default function EquipementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id ?? "");

  const {
    can,
    magasinActif,
    vueTousMagasins,
    loading: chargementAuth,
  } = useAuth();

  const canEdit = can("equipements.edit");
  const canDelete = can("equipements.delete");

  const [activeTab, setActiveTab] = useState("infos");
  const [equipement, setEquipement] =
    useState<Equipement | null>(null);
  const [form, setForm] =
    useState<FormState>(EMPTY_FORM);

  const [types, setTypes] = useState<RefItem[]>([]);
  const [secteurs, setSecteurs] = useState<RefItem[]>([]);
  const [prestataires, setPrestataires] =
    useState<RefItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [interventions, setInterventions] =
    useState<Intervention[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const [printInfo, setPrintInfo] = useState({
    utilisateur: "Utilisateur connecté",
    magasin: magasinActif?.nom ?? "Magasin non défini",
    date: "",
  });

  const chargerDonnees = useCallback(
    async (silencieux = false) => {
      if (!id || chargementAuth) return;

      try {
        silencieux
          ? setRefreshing(true)
          : setLoading(true);

        setError(null);

        let equipementQuery = supabase
          .from("equipements")
          .select("*")
          .eq("id", id);

        if (!vueTousMagasins && magasinActif) {
          equipementQuery = equipementQuery.eq(
            "magasin_id",
            magasinActif.id
          );
        }

        const [
          equipementResult,
          typesResult,
          secteursResult,
          prestatairesResult,
          photosResult,
          interventionsResult,
        ] = await Promise.all([
          equipementQuery.maybeSingle(),

          supabase
            .from("types_equipements")
            .select("id, nom")
            .order("nom"),

          supabase
            .from("secteurs")
            .select("id, nom")
            .order("nom"),

          supabase
            .from("prestataires")
            .select("id, nom")
            .order("nom"),

          supabase
            .from("equipements_photos")
            .select(
              "id, url, path, commentaire, created_at"
            )
            .eq("equipement_id", id)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("maintenances")
            .select(
              "id, titre, date_debut, date_fin, technicien"
            )
            .eq("equipement_id", id)
            .order("date_debut", {
              ascending: false,
            }),
        ]);

        if (equipementResult.error) {
          throw equipementResult.error;
        }

        if (typesResult.error) {
          throw typesResult.error;
        }

        if (secteursResult.error) {
          throw secteursResult.error;
        }

        if (prestatairesResult.error) {
          throw prestatairesResult.error;
        }

        if (photosResult.error) {
          throw photosResult.error;
        }

        /*
         * L'onglet Interventions reste utilisable même si
         * la table maintenances n'est pas encore complètement prête.
         */
        if (interventionsResult.error) {
          console.error(
            "Erreur chargement maintenances liées :",
            interventionsResult.error
          );
        }

        const equipementCharge =
          (equipementResult.data ??
            null) as Equipement | null;

        setEquipement(equipementCharge);
        setForm(
          equipementCharge
            ? toForm(equipementCharge)
            : EMPTY_FORM
        );
        setTypes(
          (typesResult.data ?? []) as RefItem[]
        );
        setSecteurs(
          (secteursResult.data ?? []) as RefItem[]
        );
        setPrestataires(
          (prestatairesResult.data ?? []) as RefItem[]
        );
        setPhotos(
          (photosResult.data ?? []) as Photo[]
        );
        setInterventions(
          interventionsResult.error
            ? []
            : ((interventionsResult.data ??
                []) as Intervention[])
        );
      } catch (e) {
        console.error(
          "Erreur chargement fiche équipement :",
          e
        );
        setError(messageErreur(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      chargementAuth,
      id,
      magasinActif,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      setSuccess(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [success]);

  const typeMap = useMemo(
    () =>
      new Map(
        types.map((item) => [item.id, item.nom])
      ),
    [types]
  );

  const secteurMap = useMemo(
    () =>
      new Map(
        secteurs.map((item) => [item.id, item.nom])
      ),
    [secteurs]
  );

  const prestataireMap = useMemo(
    () =>
      new Map(
        prestataires.map((item) => [
          item.id,
          item.nom,
        ])
      ),
    [prestataires]
  );

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function annulerModification() {
    if (equipement) {
      setForm(toForm(equipement));
    }

    setEditing(false);
    setError(null);
  }

  async function enregistrer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!equipement || !canEdit) {
      return;
    }

    if (
      !form.numero.trim() ||
      !form.nom.trim() ||
      !form.type_id
    ) {
      setError(
        "Le numéro, la désignation et le type sont obligatoires."
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let requete = supabase
        .from("equipements")
        .update({
          numero: form.numero.trim(),
          nom: form.nom.trim(),
          emplacement:
            form.emplacement.trim() || null,
          etat: form.etat,
          fabricant:
            form.fabricant.trim() || null,
          modele: form.modele.trim() || null,
          numero_serie:
            form.numero_serie.trim() || null,
          date_installation:
            form.date_installation || null,
          date_mise_service:
            form.date_mise_service || null,
          prochaine_verification:
            form.prochaine_verification || null,
          observations:
            form.observations.trim() || null,
          type_id: form.type_id,
          secteur_id: form.secteur_id || null,
          prestataire_id:
            form.prestataire_id || null,
        })
        .eq("id", equipement.id);

      if (!vueTousMagasins && magasinActif) {
        requete = requete.eq(
          "magasin_id",
          magasinActif.id
        );
      }

      const { data, error: updateError } =
        await requete
          .select("*")
          .single();

      if (updateError) {
        throw updateError;
      }

      const equipementActualise =
        data as Equipement;

      setEquipement(equipementActualise);
      setForm(toForm(equipementActualise));
      setEditing(false);

      await ajouterJournal(
        "Modification",
        "Équipements",
        `Équipement modifié : ${equipementActualise.numero} - ${equipementActualise.nom}`
      );

      setSuccess(
        "Les modifications ont été enregistrées."
      );
    } catch (e) {
      console.error(
        "Erreur modification équipement :",
        e
      );
      setError(messageErreur(e));
    } finally {
      setSaving(false);
    }
  }

  async function supprimerEquipement() {
    if (!equipement || !canDelete) return;

    const confirmation = window.confirm(
      `Supprimer définitivement l’équipement « ${equipement.numero} - ${equipement.nom} » ?`
    );

    if (!confirmation) return;

    try {
      setDeleting(true);
      setError(null);

      let requete = supabase
        .from("equipements")
        .delete()
        .eq("id", equipement.id);

      if (!vueTousMagasins && magasinActif) {
        requete = requete.eq(
          "magasin_id",
          magasinActif.id
        );
      }

      const { error: deleteError } =
        await requete;

      if (deleteError) {
        throw deleteError;
      }

      await ajouterJournal(
        "Suppression",
        "Équipements",
        `Équipement supprimé : ${equipement.numero} - ${equipement.nom}`
      );

      window.location.href = "/equipements";
    } catch (e) {
      console.error(
        "Erreur suppression équipement :",
        e
      );
      setError(messageErreur(e));
      setDeleting(false);
    }
  }

  async function imprimerFiche() {
    if (!equipement) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let utilisateur = user?.email ?? "Utilisateur connecté";

      if (user?.id) {
        const { data: profilData } = await supabase
          .from("profils")
          .select("nom, prenom")
          .eq("id", user.id)
          .maybeSingle();

        const nomComplet = [
          profilData?.prenom,
          profilData?.nom,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (nomComplet) {
          utilisateur = nomComplet;
        }
      }

      let magasin =
        magasinActif?.nom ?? "Magasin non défini";

      if (equipement.magasin_id) {
        const { data: magasinData } = await supabase
          .from("magasins")
          .select("nom")
          .eq("id", equipement.magasin_id)
          .maybeSingle();

        if (magasinData?.nom) {
          magasin = magasinData.nom;
        }
      }

      setPrintInfo({
        utilisateur,
        magasin,
        date: new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date()),
      });

      // On imprime toujours la fiche "Informations" :
      // jamais l'onglet Photos.
      setEditing(false);
      setActiveTab("infos");

      window.setTimeout(() => {
        window.print();
      }, 150);
    } catch (e) {
      console.error(
        "Erreur préparation impression équipement :",
        e
      );

      setEditing(false);
      setActiveTab("infos");

      window.setTimeout(() => {
        window.print();
      }, 150);
    }
  }

  if (loading || chargementAuth) {
    return (
      <AppShell>
        <AppPage
          title="Équipement"
          subtitle="Chargement de la fiche..."
        >
          <AppCard>
            <div className="flex min-h-[280px] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              Chargement...
            </div>
          </AppCard>
        </AppPage>
      </AppShell>
    );
  }

  if (!equipement) {
    return (
      <AppShell>
        <AppPage title="Équipement introuvable">
          <AppEmptyState
            icon={<AlertTriangle size={44} />}
            title="Aucun équipement trouvé"
            description="Cet équipement n’existe pas ou n’appartient pas au magasin actuellement consulté."
            action={
              <AppButton
                onClick={() =>
                  router.push("/equipements")
                }
              >
                <ArrowLeft size={17} />
                Retour aux équipements
              </AppButton>
            }
          />
        </AppPage>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPage
        title={`${equipement.numero} — ${equipement.nom}`}
        subtitle="Fiche détaillée de l’équipement."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppButton
              variant="secondary"
              onClick={() =>
                router.push("/equipements")
              }
            >
              <ArrowLeft size={17} />
              Retour
            </AppButton>

            <AppButton
              variant="secondary"
              loading={refreshing}
              disabled={refreshing}
              onClick={() =>
                void chargerDonnees(true)
              }
            >
              <RefreshCw size={17} />
              Actualiser
            </AppButton>

            <AppButton
              variant="secondary"
              onClick={() =>
                void imprimerFiche()
              }
            >
              <Printer size={17} />
              Imprimer
            </AppButton>

            {canEdit && !editing && (
              <AppButton
                onClick={() => {
                  setEditing(true);
                  setActiveTab("infos");
                }}
              >
                <Pencil size={17} />
                Modifier
              </AppButton>
            )}

            {canDelete && (
              <AppButton
                variant="danger"
                loading={deleting}
                disabled={deleting}
                onClick={() =>
                  void supprimerEquipement()
                }
              >
                <Trash2 size={17} />
                Supprimer
              </AppButton>
            )}
          </div>
        }
      >
        <style jsx global>{`
          .equipment-print-only {
            display: none;
          }

          @media print {
            @page {
              size: A4;
              margin: 12mm;
            }

            html,
            body {
              background: #ffffff !important;
            }

            nav,
            aside,
            header,
            button {
              display: none !important;
            }

            .equipment-print-only {
              display: block !important;
            }

            .equipment-no-print {
              display: none !important;
            }

            main {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            * {
              box-shadow: none !important;
            }
          }
        `}</style>

        <div className="equipment-print-only mb-6 border-b-2 border-slate-900 pb-4 text-slate-900">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xl font-black">
                CASTORAMA
              </p>
              <p className="text-sm font-bold">
                CastoManager
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-black">
                FICHE ÉQUIPEMENT
              </p>
              <p className="font-mono text-sm font-bold">
                {equipement.numero}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <p>
              <strong>Magasin :</strong>{" "}
              {printInfo.magasin}
            </p>
            <p className="text-right">
              <strong>Imprimé le :</strong>{" "}
              {printInfo.date}
            </p>
            <p>
              <strong>Imprimé par :</strong>{" "}
              {printInfo.utilisateur}
            </p>
          </div>
        </div>

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
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <AppCard>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <AppBadge
                variant={badgeEtat(equipement.etat)}
              >
                {equipement.etat ?? "Non défini"}
              </AppBadge>

              <SummaryItem
                icon={<ShieldCheck size={16} />}
                label="Type"
                value={
                  equipement.type_id
                    ? typeMap.get(
                        equipement.type_id
                      ) ?? "Non défini"
                    : "Non défini"
                }
              />

              <SummaryItem
                icon={<Building2 size={16} />}
                label="Secteur"
                value={
                  equipement.secteur_id
                    ? secteurMap.get(
                        equipement.secteur_id
                      ) ?? "Non défini"
                    : "Non défini"
                }
              />

              <SummaryItem
                icon={<MapPin size={16} />}
                label="Emplacement"
                value={
                  equipement.emplacement ?? "—"
                }
              />
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Créé le {formatDate(equipement.created_at)}
            </p>
          </div>
        </AppCard>

        <div className="equipment-no-print">
          <AppTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            {
              id: "infos",
              label: "Informations",
            },
            {
              id: "photos",
              label: "Photos",
            },
            {
              id: "documents",
              label: "Documents",
            },
            {
              id: "verifications",
              label: "Vérifications",
            },
            {
              id: "interventions",
              label: "Interventions",
            },
            {
              id: "historique",
              label: "Historique",
            },
            {
              id: "localisation",
              label: "Localisation",
            },
          ]}
          />
        </div>

        {activeTab === "infos" &&
          (editing ? (
            <form
              onSubmit={enregistrer}
              className="space-y-6"
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <AppCard title="Informations générales">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AppInput
                      label="Numéro *"
                      value={form.numero}
                      onChange={(event) =>
                        setField(
                          "numero",
                          event.target.value
                        )
                      }
                    />

                    <AppInput
                      label="Désignation *"
                      value={form.nom}
                      onChange={(event) =>
                        setField(
                          "nom",
                          event.target.value
                        )
                      }
                    />

                    <AppSelect
                      label="Type *"
                      value={form.type_id}
                      onChange={(event) =>
                        setField(
                          "type_id",
                          event.target.value
                        )
                      }
                      options={[
                        {
                          value: "",
                          label: "Sélectionner...",
                        },
                        ...types.map((item) => ({
                          value: item.id,
                          label: item.nom,
                        })),
                      ]}
                    />

                    <AppSelect
                      label="Secteur"
                      value={form.secteur_id}
                      onChange={(event) =>
                        setField(
                          "secteur_id",
                          event.target.value
                        )
                      }
                      options={[
                        {
                          value: "",
                          label: "Aucun secteur",
                        },
                        ...secteurs.map((item) => ({
                          value: item.id,
                          label: item.nom,
                        })),
                      ]}
                    />

                    <AppInput
                      label="Emplacement"
                      value={form.emplacement}
                      onChange={(event) =>
                        setField(
                          "emplacement",
                          event.target.value
                        )
                      }
                    />

                    <AppSelect
                      label="État"
                      value={form.etat}
                      onChange={(event) =>
                        setField(
                          "etat",
                          event.target.value
                        )
                      }
                      options={[
                        {
                          value: "En service",
                          label: "En service",
                        },
                        {
                          value: "Hors service",
                          label: "Hors service",
                        },
                        {
                          value: "En maintenance",
                          label: "En maintenance",
                        },
                        {
                          value: "À remplacer",
                          label: "À remplacer",
                        },
                        {
                          value: "Déposé",
                          label: "Déposé",
                        },
                      ]}
                    />
                  </div>
                </AppCard>

                <AppCard title="Informations techniques">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AppInput
                      label="Fabricant"
                      value={form.fabricant}
                      onChange={(event) =>
                        setField(
                          "fabricant",
                          event.target.value
                        )
                      }
                    />

                    <AppInput
                      label="Modèle"
                      value={form.modele}
                      onChange={(event) =>
                        setField(
                          "modele",
                          event.target.value
                        )
                      }
                    />

                    <AppInput
                      label="N° de série"
                      value={form.numero_serie}
                      onChange={(event) =>
                        setField(
                          "numero_serie",
                          event.target.value
                        )
                      }
                    />

                    <AppSelect
                      label="Prestataire"
                      value={form.prestataire_id}
                      onChange={(event) =>
                        setField(
                          "prestataire_id",
                          event.target.value
                        )
                      }
                      options={[
                        {
                          value: "",
                          label:
                            "Aucun prestataire",
                        },
                        ...prestataires.map(
                          (item) => ({
                            value: item.id,
                            label: item.nom,
                          })
                        ),
                      ]}
                    />
                  </div>
                </AppCard>

                <AppCard title="Dates et suivi">
                  <div className="grid gap-4 md:grid-cols-3">
                    <AppInput
                      label="Date installation"
                      type="date"
                      value={
                        form.date_installation
                      }
                      onChange={(event) =>
                        setField(
                          "date_installation",
                          event.target.value
                        )
                      }
                    />

                    <AppInput
                      label="Mise en service"
                      type="date"
                      value={
                        form.date_mise_service
                      }
                      onChange={(event) =>
                        setField(
                          "date_mise_service",
                          event.target.value
                        )
                      }
                    />

                    <AppInput
                      label="Prochaine vérification"
                      type="date"
                      value={
                        form.prochaine_verification
                      }
                      onChange={(event) =>
                        setField(
                          "prochaine_verification",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </AppCard>

                <AppCard title="Observations">
                  <AppTextarea
                    value={form.observations}
                    onChange={(event) =>
                      setField(
                        "observations",
                        event.target.value
                      )
                    }
                    placeholder="Observations, remarques et informations techniques..."
                  />
                </AppCard>
              </div>

              <div className="flex flex-col justify-end gap-3 sm:flex-row">
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={annulerModification}
                >
                  <X size={17} />
                  Annuler
                </AppButton>

                <AppButton
                  type="submit"
                  loading={saving}
                  disabled={saving}
                >
                  <Save size={17} />
                  Enregistrer
                </AppButton>
              </div>
            </form>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <AppCard title="Informations générales">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Info
                      label="Numéro"
                      value={equipement.numero}
                    />
                    <Info
                      label="Désignation"
                      value={equipement.nom}
                    />
                    <Info
                      label="Type"
                      value={
                        equipement.type_id
                          ? typeMap.get(
                              equipement.type_id
                            ) ?? "Non défini"
                          : "Non défini"
                      }
                    />
                    <Info
                      label="Secteur"
                      value={
                        equipement.secteur_id
                          ? secteurMap.get(
                              equipement.secteur_id
                            ) ?? "Non défini"
                          : "Non défini"
                      }
                    />
                    <Info
                      label="Emplacement"
                      value={
                        equipement.emplacement ??
                        "—"
                      }
                    />
                    <Info
                      label="État"
                      value={
                        equipement.etat ??
                        "Non défini"
                      }
                    />
                  </div>
                </AppCard>

                <AppCard title="Informations techniques">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Info
                      label="Fabricant"
                      value={
                        equipement.fabricant ??
                        "—"
                      }
                    />
                    <Info
                      label="Modèle"
                      value={
                        equipement.modele ?? "—"
                      }
                    />
                    <Info
                      label="N° de série"
                      value={
                        equipement.numero_serie ??
                        "—"
                      }
                    />
                    <Info
                      label="Prestataire"
                      value={
                        equipement.prestataire_id
                          ? prestataireMap.get(
                              equipement.prestataire_id
                            ) ?? "—"
                          : "—"
                      }
                    />
                  </div>
                </AppCard>

                <AppCard title="Dates et suivi">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Info
                      label="Date installation"
                      value={formatDate(
                        equipement.date_installation
                      )}
                    />
                    <Info
                      label="Mise en service"
                      value={formatDate(
                        equipement.date_mise_service
                      )}
                    />
                    <Info
                      label="Prochaine vérification"
                      value={formatDate(
                        equipement.prochaine_verification
                      )}
                    />
                  </div>
                </AppCard>

                <div className="equipment-no-print">
                  <AppCard title="QR Code de l’équipement">
                    <EquipmentQRCode
                      id={equipement.id}
                      numero={equipement.numero}
                      nom={equipement.nom}
                      emplacement={
                        equipement.emplacement
                      }
                    />
                  </AppCard>
                </div>
              </div>

              <AppCard title="Observations">
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {equipement.observations ||
                    "Aucune observation."}
                </p>
              </AppCard>
            </>
          ))}

        {activeTab === "photos" && (
          <EquipmentPhotos
            equipementId={equipement.id}
            photos={photos}
            onRefresh={chargerDonnees}
          />
        )}

        {activeTab === "documents" && (
          <EquipmentDocuments
            equipementId={equipement.id}
          />
        )}

        {activeTab === "verifications" && (
          <EquipmentVerifications
            equipementId={equipement.id}
            equipementNom={`${equipement.numero} - ${equipement.nom}`}
          />
        )}

        {activeTab === "interventions" && (
          <AppCard title="Interventions de maintenance">
            {interventions.length === 0 ? (
              <AppEmptyState
                icon={<Wrench size={42} />}
                title="Aucune intervention liée"
                description="Les maintenances créées pour cet équipement apparaîtront ici."
                action={
                  canEdit ? (
                    <AppButton
                      onClick={() =>
                        router.push(
                          `/maintenance/nouveau?equipement_id=${equipement.id}`
                        )
                      }
                    >
                      <Wrench size={17} />
                      Nouvelle maintenance
                    </AppButton>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {interventions.map(
                  (intervention) => (
                    <button
                      key={intervention.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/maintenance/${intervention.id}`
                        )
                      }
                      className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {intervention.titre}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Technicien :{" "}
                          {intervention.technicien ??
                            "Non renseigné"}
                        </p>
                      </div>

                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(
                          intervention.date_debut
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </AppCard>
        )}

        {activeTab === "historique" && (
          <EquipmentHistory
            equipementId={equipement.id}
          />
        )}

        {activeTab === "localisation" && (
          <EquipmentLocation
            equipementId={equipement.id}
            planId={equipement.plan_id}
            positionX={equipement.position_x}
            positionY={equipement.position_y}
            onRefresh={chargerDonnees}
          />
        )}
      </AppPage>
    </AppShell>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {icon}
      <span className="font-medium">
        {label} :
      </span>
      <span>{value}</span>
    </div>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}