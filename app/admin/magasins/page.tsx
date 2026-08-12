"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";

type Magasin = {
  id: string;
  nom: string;
  modules_autorises: string[];
};

const MODULES_DISPONIBLES = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "analytics", label: "Analytics" },
  { id: "consignes", label: "Consignes" },
  { id: "documents", label: "Documents" },
  { id: "maintenance", label: "Maintenance" },
  { id: "investissements", label: "Investissements" },
  { id: "planning", label: "Planning" },
  { id: "equipements", label: "Équipements" },
  { id: "plans", label: "Plans" },
  { id: "securite", label: "Sécurité" },
];

const MODULES_PAR_DEFAUT = MODULES_DISPONIBLES.map(
  (module) => module.id
);

function normaliser(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function messageErreur(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      error.message
    );
  }

  return "Une erreur inconnue est survenue.";
}

export default function MagasinsPage() {
  const dialog =
    useDialog();

  const {
    can,
    magasin:
      magasinUtilisateur,
    role,
  } = useAuth();

  const canView =
    can("stores.view");

  const canManage =
    can("stores.manage");

  const [
    magasins,
    setMagasins,
  ] =
    useState<Magasin[]>(
      []
    );

  const [
    recherche,
    setRecherche,
  ] =
    useState("");

  const [
    nom,
    setNom,
  ] =
    useState("");

  const [
    modulesAutorises,
    setModulesAutorises,
  ] = useState<string[]>(
    MODULES_PAR_DEFAUT
  );

  const [
    magasinModifie,
    setMagasinModifie,
  ] =
    useState<Magasin | null>(
      null
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(true);

  const [
    enregistrement,
    setEnregistrement,
  ] =
    useState(false);

  const [
    suppressionId,
    setSuppressionId,
  ] =
    useState<string | null>(
      null
    );

  const [
    actualisation,
    setActualisation,
  ] =
    useState(false);

  const [
    erreur,
    setErreur,
  ] =
    useState<string | null>(
      null
    );

  const [
    succes,
    setSucces,
  ] =
    useState<string | null>(
      null
    );

  /* =========================================================
     CHARGEMENT MAGASINS
  ========================================================= */

  const chargerMagasins =
    useCallback(
      async (
        silencieux =
          false
      ) => {
        if (!canView) {
          setChargement(
            false
          );

          return;
        }

        try {
          if (
            silencieux
          ) {
            setActualisation(
              true
            );
          } else {
            setChargement(
              true
            );
          }

          setErreur(
            null
          );

          let requete =
            supabase
              .from(
                "magasins"
              )
              .select(
                "id, nom, modules_autorises"
              )
              .order(
                "nom",
                {
                  ascending:
                    true,
                }
              );

          /*
           * Le Super Admin voit tous
           * les magasins.
           *
           * Les autres utilisateurs
           * restent limités à leur
           * magasin.
           */
          if (
            role !==
              "SUPER_ADMIN" &&
            magasinUtilisateur?.id
          ) {
            requete =
              requete.eq(
                "id",
                magasinUtilisateur.id
              );
          }

          const {
            data,
            error,
          } =
            await requete;

          if (error) {
            throw error;
          }

          setMagasins(
            (data ?? []).map((magasin) => ({
              id: magasin.id,
              nom: magasin.nom,
              modules_autorises:
                Array.isArray(magasin.modules_autorises)
                  ? magasin.modules_autorises
                  : MODULES_PAR_DEFAUT,
            }))
          );
        } catch (
          error
        ) {
          console.error(
            "Erreur chargement magasins :",
            error
          );

          setErreur(
            messageErreur(
              error
            )
          );
        } finally {
          setChargement(
            false
          );

          setActualisation(
            false
          );
        }
      },
      [
        canView,
        magasinUtilisateur?.id,
        role,
      ]
    );

  useEffect(
    () => {
      void chargerMagasins();
    },
    [
      chargerMagasins,
    ]
  );

  useEffect(
    () => {
      if (!succes) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            setSucces(
              null
            );
          },
          3500
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      succes,
    ]
  );

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const magasinsFiltres =
    useMemo(
      () => {
        const terme =
          normaliser(
            recherche
          );

        if (!terme) {
          return magasins;
        }

        return magasins.filter(
          (
            magasin
          ) =>
            normaliser(
              magasin.nom
            ).includes(
              terme
            )
        );
      },
      [
        magasins,
        recherche,
      ]
    );

  /* =========================================================
     FORMULAIRE
  ========================================================= */

  function ouvrirCreation() {
    setMagasinModifie(
      null
    );

    setNom("");
    setModulesAutorises(
      MODULES_PAR_DEFAUT
    );

    setErreur(
      null
    );

    setSucces(
      null
    );
  }

  function ouvrirModification(
    magasin: Magasin
  ) {
    setMagasinModifie(
      magasin
    );

    setNom(
      magasin.nom
    );

    setModulesAutorises(
      magasin.modules_autorises?.length
        ? magasin.modules_autorises
        : MODULES_PAR_DEFAUT
    );

    setErreur(
      null
    );

    setSucces(
      null
    );
  }

  function annulerFormulaire() {
    setMagasinModifie(
      null
    );

    setNom("");
    setModulesAutorises(
      MODULES_PAR_DEFAUT
    );

    setErreur(
      null
    );
  }

  /* =========================================================
     CREATION / MODIFICATION
  ========================================================= */

  function basculerModule(
    moduleId: string
  ) {
    setModulesAutorises((actuels) =>
      actuels.includes(moduleId)
        ? actuels.filter(
            (item) => item !== moduleId
          )
        : [...actuels, moduleId]
    );
  }

  async function enregistrer(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManage) {
      setErreur(
        "Tu n’as pas l’autorisation de gérer les magasins."
      );

      return;
    }

    const nomNettoye =
      nom.trim();

    if (!nomNettoye) {
      setErreur(
        "Le nom du magasin est obligatoire."
      );

      return;
    }

    const doublon =
      magasins.some(
        (
          magasin
        ) =>
          normaliser(
            magasin.nom
          ) ===
            normaliser(
              nomNettoye
            ) &&
          magasin.id !==
            magasinModifie?.id
      );

    if (doublon) {
      setErreur(
        "Un magasin portant ce nom existe déjà."
      );

      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        null
      );

      setSucces(
        null
      );

      if (
        magasinModifie
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "magasins"
            )
            .update({
              nom: nomNettoye,
              modules_autorises:
                modulesAutorises,
            })
            .eq(
              "id",
              magasinModifie.id
            )
            .select(
              "id, nom, modules_autorises"
            )
            .single();

        if (error) {
          throw error;
        }

        setMagasins(
          (
            liste
          ) =>
            liste
              .map(
                (
                  magasin
                ) =>
                  magasin.id ===
                  magasinModifie.id
                    ? (
                        data as Magasin
                      )
                    : magasin
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  a.nom.localeCompare(
                    b.nom,
                    "fr"
                  )
              )
        );

        setSucces(
          "Le magasin a été modifié."
        );
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "magasins"
            )
            .insert({
              nom: nomNettoye,
              modules_autorises:
                modulesAutorises,
            })
            .select(
              "id, nom, modules_autorises"
            )
            .single();

        if (error) {
          throw error;
        }

        setMagasins(
          (
            liste
          ) =>
            [
              ...liste,
              data as Magasin,
            ].sort(
              (
                a,
                b
              ) =>
                a.nom.localeCompare(
                  b.nom,
                  "fr"
                )
            )
        );

        setSucces(
          "Le magasin a été créé."
        );
      }

      annulerFormulaire();
    } catch (
      error
    ) {
      console.error(
        "Erreur enregistrement magasin :",
        error
      );

      setErreur(
        messageErreur(
          error
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  /* =========================================================
     SUPPRESSION COMPLETE
  ========================================================= */

  async function supprimer(
    magasin: Magasin
  ) {
    if (!canManage) {
      setErreur(
        "Tu n’as pas l’autorisation de supprimer un magasin."
      );

      return;
    }

    /*
     * Sécurité :
     * on interdit la suppression du
     * magasin principal du compte
     * actuellement connecté.
     */
    if (
      magasinUtilisateur?.id ===
      magasin.id
    ) {
      setErreur(
        "Impossible de supprimer ton magasin principal. Affecte d’abord ton compte à un autre magasin."
      );

      return;
    }

    const confirmation =
      await dialog.delete({
        title:
          "Supprimer définitivement ce magasin ?",

        itemName:
          magasin.nom,

        description:
          "Le magasin ainsi que ses équipements, documents, plans, maintenances, planning et autres données associées seront définitivement supprimés. Cette action est irréversible.",
      });

    if (!confirmation) {
      return;
    }

    try {
      setSuppressionId(
        magasin.id
      );

      setErreur(
        null
      );

      setSucces(
        null
      );

      /*
       * La suppression complète
       * est effectuée côté PostgreSQL.
       *
       * La fonction doit exister
       * dans Supabase :
       * supprimer_magasin_complet(uuid)
       */
      const {
        error,
      } =
        await supabase.rpc(
          "supprimer_magasin_complet",
          {
            p_magasin_id:
              magasin.id,
          }
        );

      if (error) {
        throw error;
      }

      /*
       * Mise à jour immédiate
       * de l'interface.
       */
      setMagasins(
        (
          liste
        ) =>
          liste.filter(
            (
              item
            ) =>
              item.id !==
              magasin.id
          )
      );

      if (
        magasinModifie?.id ===
        magasin.id
      ) {
        annulerFormulaire();
      }

      setSucces(
        `Le magasin "${magasin.nom}" et ses données associées ont été supprimés.`
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur suppression complète magasin :",
        error
      );

      const message =
        messageErreur(
          error
        );

      if (
        message.includes(
          "Could not find the function"
        ) ||
        message.includes(
          "supprimer_magasin_complet"
        )
      ) {
        setErreur(
          "La fonction Supabase supprimer_magasin_complet n’est pas disponible. Exécute d’abord le script SQL de suppression complète dans Supabase."
        );
      } else {
        setErreur(
          `Impossible de supprimer le magasin : ${message}`
        );
      }
    } finally {
      setSuppressionId(
        null
      );
    }
  }

  /* =========================================================
     ACCES REFUSE
  ========================================================= */

  if (!canView) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/40">

          <AlertTriangle className="mx-auto h-11 w-11 text-red-600" />

          <h1 className="mt-4 text-2xl font-bold text-red-900 dark:text-red-100">
            Accès refusé
          </h1>

          <p className="mt-2 text-red-700 dark:text-red-300">
            Tu n’as pas l’autorisation d’accéder à la gestion des magasins.
          </p>

        </div>
      </AppShell>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <AppShell>

      <div className="mx-auto w-full max-w-[1500px]">

        {/* HEADER */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Building2 className="h-7 w-7" />
            </div>

            <div>

              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Administration
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                Magasins
              </h1>

              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Gestion des établissements disponibles dans SécuManager.
              </p>

            </div>

          </div>


          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() =>
                void chargerMagasins(
                  true
                )
              }
              disabled={
                actualisation
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >

              <RefreshCw
                className={`h-5 w-5 ${
                  actualisation
                    ? "animate-spin"
                    : ""
                }`}
              />

              Actualiser

            </button>


            {canManage && (
              <button
                type="button"
                onClick={
                  ouvrirCreation
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >

                <Plus className="h-5 w-5" />

                Nouveau magasin

              </button>
            )}

          </div>

        </header>


        {/* ERREUR */}

        {erreur && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {erreur}
            </span>

          </div>
        )}


        {/* SUCCES */}

        {succes && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">

            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {succes}
            </span>

          </div>
        )}


        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">

          {/* COLONNE GAUCHE */}

          <div className="space-y-5">

            {/* STATS */}

            <div className="grid gap-5 sm:grid-cols-2">

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nombre de magasins
                </p>

                <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
                  {magasins.length}
                </p>

              </article>


              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Magasin principal
                </p>

                <p className="mt-3 truncate text-xl font-bold text-blue-700 dark:text-blue-300">
                  {magasinUtilisateur?.nom ??
                    "Non attribué"}
                </p>

              </article>

            </div>


            {/* RECHERCHE */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="relative">

                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={
                    recherche
                  }
                  onChange={(
                    event
                  ) =>
                    setRecherche(
                      event.target.value
                    )
                  }
                  placeholder="Rechercher un magasin..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

              </div>

            </section>


            {/* LISTE */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              {chargement ? (

                <div className="flex min-h-[300px] items-center justify-center gap-3 text-slate-600 dark:text-slate-300">

                  <Loader2 className="h-6 w-6 animate-spin" />

                  Chargement des magasins...

                </div>

              ) : magasinsFiltres.length ===
                0 ? (

                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

                  <Store className="h-11 w-11 text-slate-400" />

                  <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Aucun magasin trouvé
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Modifie la recherche ou crée un nouveau magasin.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-slate-200 dark:divide-slate-800">

                  {magasinsFiltres.map(
                    (
                      magasin
                    ) => {
                      const principal =
                        magasinUtilisateur?.id ===
                        magasin.id;

                      return (
                        <article
                          key={
                            magasin.id
                          }
                          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex min-w-0 items-center gap-4">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">

                              <Store className="h-6 w-6" />

                            </div>


                            <div className="min-w-0">

                              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                                {magasin.nom}
                              </h2>


                              <div className="mt-1 flex flex-wrap items-center gap-2">

                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                  {magasin.id}
                                </span>


                                {principal && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Ton magasin
                                  </span>
                                )}

                              </div>

                            </div>

                          </div>


                          {canManage && (
                            <div className="flex gap-2 sm:shrink-0">

                              <button
                                type="button"
                                onClick={() =>
                                  ouvrirModification(
                                    magasin
                                  )
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:flex-none"
                              >

                                <Pencil className="h-4 w-4" />

                                Modifier

                              </button>


                              <button
                                type="button"
                                onClick={() =>
                                  void supprimer(
                                    magasin
                                  )
                                }
                                disabled={
                                  suppressionId ===
                                    magasin.id ||
                                  principal
                                }
                                title={
                                  principal
                                    ? "Ton magasin principal ne peut pas être supprimé."
                                    : "Supprimer définitivement ce magasin."
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                              >

                                {suppressionId ===
                                magasin.id ? (

                                  <Loader2 className="h-4 w-4 animate-spin" />

                                ) : (

                                  <Trash2 className="h-4 w-4" />

                                )}

                                Supprimer

                              </button>

                            </div>
                          )}

                        </article>
                      );
                    }
                  )}

                </div>

              )}

            </section>

          </div>


          {/* FORMULAIRE */}

          {canManage && (
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    {magasinModifie
                      ? "Modification"
                      : "Création"}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {magasinModifie
                      ? "Modifier le magasin"
                      : "Nouveau magasin"}
                  </h2>

                </div>


                {magasinModifie && (
                  <button
                    type="button"
                    onClick={
                      annulerFormulaire
                    }
                    aria-label="Annuler la modification"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >

                    <X className="h-5 w-5" />

                  </button>
                )}

              </div>


              <form
                onSubmit={
                  enregistrer
                }
                className="mt-6 space-y-5"
              >

                <label className="block">

                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nom du magasin *
                  </span>

                  <input
                    type="text"
                    value={
                      nom
                    }
                    onChange={(
                      event
                    ) =>
                      setNom(
                        event.target.value
                      )
                    }
                    placeholder="Ex. SécuManager"
                    autoComplete="organization"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                </label>

                <div>
                  <span className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Modules autorisés
                  </span>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {MODULES_DISPONIBLES.map(
                      (module) => {
                        const actif =
                          modulesAutorises.includes(
                            module.id
                          );

                        return (
                          <label
                            key={module.id}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-950"
                          >
                            <input
                              type="checkbox"
                              checked={actif}
                              onChange={() =>
                                basculerModule(
                                  module.id
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />

                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {module.label}
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Ces choix seront utilisés ensuite pour masquer les modules non autorisés dans le menu du magasin.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">

                  Les utilisateurs pourront ensuite être rattachés à ce magasin depuis la page de gestion des utilisateurs.

                </div>


                <div className="flex flex-col gap-3 sm:flex-row">

                  {magasinModifie && (
                    <button
                      type="button"
                      onClick={
                        annulerFormulaire
                      }
                      disabled={
                        enregistrement
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >

                      <X className="h-5 w-5" />

                      Annuler

                    </button>
                  )}


                  <button
                    type="submit"
                    disabled={
                      enregistrement
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {enregistrement ? (

                      <Loader2 className="h-5 w-5 animate-spin" />

                    ) : magasinModifie ? (

                      <Check className="h-5 w-5" />

                    ) : (

                      <Plus className="h-5 w-5" />

                    )}

                    {magasinModifie
                      ? "Enregistrer"
                      : "Créer le magasin"}

                  </button>

                </div>

              </form>

            </aside>
          )}

        </section>

      </div>

    </AppShell>
  );
}