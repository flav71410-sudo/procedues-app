"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
  XCircle,
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
  AppTable,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { ajouterJournal } from "@/services/journal";

type TypeEquipement = {
  id: string;
  nom: string;
};

type Secteur = {
  id: string;
  nom: string;
};

type Prestataire = {
  id: string;
  nom: string;
};

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string | null;
  prochaine_verification: string | null;
  type_id: string | null;
  secteur_id: string | null;
  prestataire_id: string | null;
  magasin_id: string;
  created_at: string | null;
};

function normaliser(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function badgeEtat(
  etat: string | null
): "success" | "danger" | "warning" | "gray" {
  const valeur = normaliser(etat);

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
    valeur === "defectueux" ||
    valeur === "défectueux"
  ) {
    return "danger";
  }

  if (
    valeur.includes("maintenance") ||
    valeur.includes("control") ||
    valeur.includes("contrôl") ||
    valeur.includes("verif") ||
    valeur.includes("vérif") ||
    valeur.includes("remplacer")
  ) {
    return "warning";
  }

  return "gray";
}

function erreurLisible(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "Une erreur inconnue est survenue.";
}

export default function EquipementsPage() {
  const router = useRouter();
  const dialog = useDialog();

  const {
    can,
    magasinActif,
    vueTousMagasins,
    magasinsDisponibles,
    peutChangerMagasin,
    changerMagasinActif,
    profil,
    loading: chargementAuth,
  } = useAuth();

  const canCreate = can("equipements.edit");
  const canDelete = can("equipements.delete");

  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreSecteur, setFiltreSecteur] = useState("Tous");
  const [filtreEtat, setFiltreEtat] = useState("Tous");

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [suppressionId, setSuppressionId] =
    useState<string | null>(null);

  const [maintenanceBloquante, setMaintenanceBloquante] =
    useState<{
      numero: string;
      nom: string;
      nombre: number;
    } | null>(null);

  const [erreur, setErreur] =
    useState<string | null>(null);
  const [succes, setSucces] =
    useState<string | null>(null);

  const chargerDonnees = useCallback(
    async (silencieux = false) => {
      if (chargementAuth) {
        return;
      }

      if (!vueTousMagasins && !magasinActif) {
        setEquipements([]);
        setTypes([]);
        setSecteurs([]);
        setPrestataires([]);
        setChargement(false);
        setErreur(
          "Aucun magasin actif. Sélectionne un magasin."
        );
        return;
      }

      try {
        silencieux
          ? setActualisation(true)
          : setChargement(true);

        setErreur(null);

        let equipementsQuery = supabase
          .from("equipements")
          .select(
            `
              id,
              numero,
              nom,
              emplacement,
              etat,
              prochaine_verification,
              type_id,
              secteur_id,
              prestataire_id,
              magasin_id,
              created_at
            `
          )
          .order("numero", { ascending: true });

        if (!vueTousMagasins && magasinActif) {
          equipementsQuery = equipementsQuery.eq(
            "magasin_id",
            magasinActif.id
          );
        }

        const [
          equipementsResult,
          typesResult,
          secteursResult,
          prestatairesResult,
        ] = await Promise.all([
          equipementsQuery,
          supabase
            .from("types_equipements")
            .select("id, nom")
            .order("nom", { ascending: true }),
          supabase
            .from("secteurs")
            .select("id, nom")
            .order("nom", { ascending: true }),
          supabase
            .from("prestataires")
            .select("id, nom")
            .order("nom", { ascending: true }),
        ]);

        if (equipementsResult.error) {
          throw equipementsResult.error;
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

        setEquipements(
          (equipementsResult.data ?? []) as Equipement[]
        );
        setTypes(
          (typesResult.data ?? []) as TypeEquipement[]
        );
        setSecteurs(
          (secteursResult.data ?? []) as Secteur[]
        );
        setPrestataires(
          (prestatairesResult.data ?? []) as Prestataire[]
        );
      } catch (error) {
        console.error(
          "Erreur chargement équipements :",
          error
        );

        setErreur(
          `Impossible de charger les équipements : ${erreurLisible(
            error
          )}`
        );
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    [
      chargementAuth,
      magasinActif,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  useEffect(() => {
    if (!succes) return;

    const timer = window.setTimeout(() => {
      setSucces(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [succes]);

  const typeMap = useMemo(
    () => new Map(types.map((item) => [item.id, item.nom])),
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
        prestataires.map((item) => [item.id, item.nom])
      ),
    [prestataires]
  );

  const equipementsFiltres = useMemo(() => {
    const terme = normaliser(recherche);

    return equipements.filter((equipement) => {
      const typeNom = equipement.type_id
        ? typeMap.get(equipement.type_id) ?? ""
        : "";

      const secteurNom = equipement.secteur_id
        ? secteurMap.get(equipement.secteur_id) ?? ""
        : "";

      const prestataireNom = equipement.prestataire_id
        ? prestataireMap.get(equipement.prestataire_id) ?? ""
        : "";

      const texte = normaliser(
        [
          equipement.numero,
          equipement.nom,
          equipement.emplacement,
          equipement.etat,
          typeNom,
          secteurNom,
          prestataireNom,
        ].join(" ")
      );

      const rechercheOk =
        !terme || texte.includes(terme);

      const typeOk =
        filtreType === "Tous" ||
        equipement.type_id === filtreType;

      const secteurOk =
        filtreSecteur === "Tous" ||
        equipement.secteur_id === filtreSecteur;

      const etatOk =
        filtreEtat === "Tous" ||
        equipement.etat === filtreEtat;

      return rechercheOk && typeOk && secteurOk && etatOk;
    });
  }, [
    equipements,
    filtreEtat,
    filtreSecteur,
    filtreType,
    prestataireMap,
    recherche,
    secteurMap,
    typeMap,
  ]);

  const statistiques = useMemo(() => {
    const enService = equipements.filter(
      (equipement) =>
        badgeEtat(equipement.etat) === "success"
    ).length;

    const horsService = equipements.filter(
      (equipement) =>
        badgeEtat(equipement.etat) === "danger"
    ).length;

    const aControler = equipements.filter(
      (equipement) =>
        badgeEtat(equipement.etat) === "warning"
    ).length;

    return {
      total: equipements.length,
      enService,
      horsService,
      aControler,
    };
  }, [equipements]);

  function ouvrirCreation() {
    if (vueTousMagasins || !magasinActif) {
      setErreur(
        "Sélectionne un magasin précis avant de créer un équipement."
      );
      return;
    }

    router.push("/equipements/nouveau");
  }

  async function supprimerEquipement(
    equipement: Equipement
  ) {
    if (!canDelete) {
      setErreur(
        "Tu n’as pas l’autorisation de supprimer un équipement."
      );
      return;
    }

    try {
      setErreur(null);

      const {
        count: nombreMaintenances,
        error: maintenanceError,
      } = await supabase
        .from("maintenances")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("equipement_id", equipement.id);

      if (maintenanceError) {
        throw maintenanceError;
      }

      if ((nombreMaintenances ?? 0) > 0) {
        setMaintenanceBloquante({
          numero: equipement.numero,
          nom: equipement.nom,
          nombre: nombreMaintenances ?? 0,
        });
        return;
      }
    } catch (error) {
      console.error(
        "Erreur vérification maintenances équipement :",
        error
      );

      setErreur(
        `Impossible de vérifier les maintenances associées : ${erreurLisible(
          error
        )}`
      );
      return;
    }

    const confirmation = await dialog.delete({
      title: "Supprimer cet équipement ?",
      itemName: `${equipement.numero} - ${equipement.nom}`,
      description:
        "L’équipement et ses informations seront définitivement supprimés.",
    });

    if (!confirmation) return;

    try {
      setSuppressionId(equipement.id);
      setErreur(null);
      setSucces(null);

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

      const { data, error } = await requete.select("id");

if (error) {
  throw error;
}

if (!data || data.length === 0) {
  throw new Error(
    "La suppression n’a pas été effectuée dans la base de données."
  );
}

      setEquipements((liste) =>
        liste.filter(
          (item) => item.id !== equipement.id
        )
      );

      await ajouterJournal(
        "Suppression",
        "Équipements",
        `Équipement supprimé : ${equipement.numero} - ${equipement.nom}`
      );

      setSucces("L’équipement a été supprimé.");
    } catch (error) {
      console.error(
        "Erreur suppression équipement :",
        error
      );

      setErreur(
        `Impossible de supprimer l’équipement : ${erreurLisible(
          error
        )}`
      );
    } finally {
      setSuppressionId(null);
    }
  }

  const nomMagasin = vueTousMagasins
    ? "Tous les magasins"
    : magasinActif?.nom ?? "Aucun magasin";

  const nomUtilisateurImpression = [
    profil?.prenom,
    profil?.nom,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Utilisateur connecté";

  function imprimerListe() {
    window.print();
  }

  return (
    <AppShell>
      <AppPage
        title="Équipements"
        subtitle="Suivi du patrimoine technique, des états et des prochaines vérifications."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppButton
              variant="secondary"
              loading={actualisation}
              disabled={
                chargement ||
                actualisation ||
                chargementAuth
              }
              onClick={() =>
                void chargerDonnees(true)
              }
            >
              <RefreshCw size={17} />
              Actualiser
            </AppButton>

            <AppButton
              variant="secondary"
              disabled={
                chargement ||
                chargementAuth ||
                equipementsFiltres.length === 0
              }
              onClick={imprimerListe}
            >
              <Printer size={17} />
              Imprimer
            </AppButton>

            {canCreate && (
              <AppButton onClick={ouvrirCreation}>
                <Plus size={18} />
                Nouvel équipement
              </AppButton>
            )}
          </div>
        }
      >
        <style jsx global>{`
          .equipements-print-only {
            display: none;
          }

          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            html,
            body {
              background: #ffffff !important;
            }

            nav,
            aside,
            header,
            button,
            .equipements-no-print {
              display: none !important;
            }

            .equipements-print-only {
              display: block !important;
            }

            .equipements-print-table {
              display: block !important;
            }

            .equipements-mobile-list {
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

            table {
              width: 100% !important;
              font-size: 10px !important;
            }

            th,
            td {
              padding: 6px !important;
            }
          }
        `}</style>

        <div className="equipements-print-only mb-6 border-b-2 border-slate-900 pb-4 text-slate-900">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xl font-black">CASTORAMA</p>
              <p className="text-sm font-bold">CastoManager</p>
            </div>

            <div className="text-right">
              <p className="text-xl font-black">
                LISTE DES ÉQUIPEMENTS
              </p>
              <p className="text-sm">
                {equipementsFiltres.length} équipement
                {equipementsFiltres.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <p>
              <strong>Magasin :</strong> {nomMagasin}
            </p>

            <p className="text-center">
              <strong>Imprimé par :</strong>{" "}
              {nomUtilisateurImpression}
            </p>

            <p className="text-right">
              <strong>Imprimé le :</strong>{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date())}
            </p>
          </div>
        </div>

        <div className="equipements-no-print">
        {erreur && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        {succes && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{succes}</span>
          </div>
        )}
        </div>

        <div className="equipements-no-print">
        <AppCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Magasin consulté
                </p>

                <p className="truncate font-bold text-gray-900 dark:text-white">
                  {nomMagasin}
                </p>
              </div>
            </div>

            {peutChangerMagasin && (
              <select
                value={
                  vueTousMagasins
                    ? "__TOUS__"
                    : magasinActif?.id ?? ""
                }
                onChange={(event) => {
                  const value = event.target.value;

                  changerMagasinActif(
                    value === "__TOUS__"
                      ? null
                      : value
                  );
                }}
                className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="__TOUS__">
                  Tous les magasins
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
            )}
          </div>
        </AppCard>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Package className="h-6 w-6" />}
            label="Équipements"
            value={statistiques.total}
          />

          <StatCard
            icon={<CheckCircle2 className="h-6 w-6" />}
            label="En service"
            value={statistiques.enService}
            valueClassName="text-emerald-600"
          />

          <StatCard
            icon={<XCircle className="h-6 w-6" />}
            label="Hors service"
            value={statistiques.horsService}
            valueClassName="text-red-600"
          />

          <StatCard
            icon={<Wrench className="h-6 w-6" />}
            label="À contrôler"
            value={statistiques.aControler}
            valueClassName="text-amber-600"
          />
        </section>

        <AppCard>
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_240px_240px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <AppInput
                value={recherche}
                onChange={(event) =>
                  setRecherche(event.target.value)
                }
                placeholder="Rechercher un équipement..."
                className="pl-12"
              />
            </div>

            <AppSelect
              value={filtreType}
              onChange={(event) =>
                setFiltreType(event.target.value)
              }
              options={[
                {
                  value: "Tous",
                  label: "Tous les types",
                },
                ...types.map((type) => ({
                  value: type.id,
                  label: type.nom,
                })),
              ]}
            />

            <AppSelect
              value={filtreSecteur}
              onChange={(event) =>
                setFiltreSecteur(
                  event.target.value
                )
              }
              options={[
                {
                  value: "Tous",
                  label: "Tous les secteurs",
                },
                ...secteurs.map((secteur) => ({
                  value: secteur.id,
                  label: secteur.nom,
                })),
              ]}
            />

            <AppSelect
              value={filtreEtat}
              onChange={(event) =>
                setFiltreEtat(event.target.value)
              }
              options={[
                {
                  value: "Tous",
                  label: "Tous les états",
                },
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
        </div>


        {chargement || chargementAuth ? (
          <AppCard>
            <div className="flex min-h-[320px] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              Chargement des équipements...
            </div>
          </AppCard>
        ) : equipementsFiltres.length === 0 ? (
          <AppEmptyState
            icon={<Package size={44} />}
            title="Aucun équipement trouvé"
            description={
              vueTousMagasins
                ? "Aucun équipement n’est disponible pour la vue sélectionnée."
                : "Modifie les filtres ou crée un nouvel équipement."
            }
            action={
              canCreate && !vueTousMagasins ? (
                <AppButton onClick={ouvrirCreation}>
                  <Plus size={18} />
                  Nouvel équipement
                </AppButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="equipements-print-table hidden xl:block">
              <AppTable
                headers={[
                  "N°",
                  "Désignation",
                  "Type",
                  "Secteur",
                  "Emplacement",
                  "Prestataire",
                  "État",
                  "Vérification",
                  "Actions",
                ]}
              >
                {equipementsFiltres.map(
                  (equipement) => (
                    <tr
                      key={equipement.id}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {equipement.numero}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {equipement.nom}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {equipement.type_id
                          ? typeMap.get(
                              equipement.type_id
                            ) ?? "Non défini"
                          : "Non défini"}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {equipement.secteur_id
                          ? secteurMap.get(
                              equipement.secteur_id
                            ) ?? "Non défini"
                          : "Non défini"}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {equipement.emplacement ?? "—"}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {equipement.prestataire_id
                          ? prestataireMap.get(
                              equipement.prestataire_id
                            ) ?? "—"
                          : "—"}
                      </td>

                      <td className="px-6 py-4">
                        <AppBadge
                          variant={badgeEtat(
                            equipement.etat
                          )}
                        >
                          {equipement.etat ??
                            "Non défini"}
                        </AppBadge>
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {formatDate(
                          equipement.prochaine_verification
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <AppButton
                            variant="secondary"
                            className="px-3 py-2 text-xs"
                            onClick={() =>
                              router.push(
                                `/equipements/${equipement.id}`
                              )
                            }
                          >
                            <Eye size={15} />
                            Consulter
                          </AppButton>

                          {canDelete && (
                            <AppButton
                              variant="danger"
                              className="px-3 py-2 text-xs"
                              loading={
                                suppressionId ===
                                equipement.id
                              }
                              disabled={
                                suppressionId ===
                                equipement.id
                              }
                              onClick={() =>
                                void supprimerEquipement(
                                  equipement
                                )
                              }
                            >
                              <Trash2 size={15} />
                              Supprimer
                            </AppButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </AppTable>
            </div>

            <div className="equipements-mobile-list grid gap-4 xl:hidden">
              {equipementsFiltres.map(
                (equipement) => (
                  <AppCard key={equipement.id}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            {equipement.numero}
                          </p>

                          <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">
                            {equipement.nom}
                          </h2>
                        </div>

                        <AppBadge
                          variant={badgeEtat(
                            equipement.etat
                          )}
                        >
                          {equipement.etat ??
                            "Non défini"}
                        </AppBadge>
                      </div>

                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">
                            Type
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                            {equipement.type_id
                              ? typeMap.get(
                                  equipement.type_id
                                ) ?? "Non défini"
                              : "Non défini"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">
                            Secteur
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                            {equipement.secteur_id
                              ? secteurMap.get(
                                  equipement.secteur_id
                                ) ?? "Non défini"
                              : "Non défini"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">
                            Emplacement
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                            {equipement.emplacement ??
                              "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">
                            Prochaine vérification
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                            {formatDate(
                              equipement.prochaine_verification
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <AppButton
                          variant="secondary"
                          className="flex-1"
                          onClick={() =>
                            router.push(
                              `/equipements/${equipement.id}`
                            )
                          }
                        >
                          <Eye size={16} />
                          Consulter
                        </AppButton>

                        {canDelete && (
                          <AppButton
                            variant="danger"
                            className="flex-1"
                            loading={
                              suppressionId ===
                              equipement.id
                            }
                            disabled={
                              suppressionId ===
                              equipement.id
                            }
                            onClick={() =>
                              void supprimerEquipement(
                                equipement
                              )
                            }
                          >
                            <Trash2 size={16} />
                            Supprimer
                          </AppButton>
                        )}
                      </div>
                    </div>
                  </AppCard>
                )
              )}
            </div>
          </>
        )}

        {maintenanceBloquante && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-bloquante-title"
          >
            <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
              <h2
                id="maintenance-bloquante-title"
                className="text-xl font-bold text-white"
              >
                Suppression impossible
              </h2>

              <p className="mt-4 text-slate-300">
                {maintenanceBloquante.nombre > 1
                  ? `${maintenanceBloquante.nombre} maintenances sont associées à cet équipement.`
                  : "Une maintenance est associée à cet équipement."}
              </p>

              <p className="mt-2 font-semibold text-red-400">
                {maintenanceBloquante.numero} - {maintenanceBloquante.nom}
              </p>

              <p className="mt-4 text-sm text-slate-400">
                Supprime ou détache d’abord
                {maintenanceBloquante.nombre > 1
                  ? " les maintenances associées"
                  : " la maintenance associée"}
                , puis réessayez.
              </p>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMaintenanceBloquante(null)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        )}
      </AppPage>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClassName = "text-slate-900 dark:text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p
            className={`mt-1 text-3xl font-bold ${valueClassName}`}
          >
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}