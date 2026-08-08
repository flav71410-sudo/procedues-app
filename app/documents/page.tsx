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
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  List,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import AppShell from "@/components/AppShell";

import { useAuth } from "@/providers/AuthProvider";

import { useDialog } from "@/providers/DialogProvider";

import {
  deleteDocument,
  deleteDocumentPermanently,
  getDocumentCategories,
  getDocumentFolders,
  getDocuments,
  getDocumentStats,
  restoreDocument,
  toggleDocumentFavorite,
  type DocumentFolderNode,
  type DocumentStats,
} from "@/services/documentsService";

import type {
  DocumentFilters,
  DocumentItem,
} from "@/types/documents";


type VueAffichage =
  | "liste"
  | "grille";


type MagasinOption = {
  readonly id: string;
  readonly nom: string;
};


const STATS_VIDES: DocumentStats = {
  total: 0,
  favoris: 0,
  archives: 0,
  avecSousDossier: 0,
};


/* =========================================================
   OUTILS
========================================================= */


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


function formatTaille(
  taille: number | null
): string {
  if (
    !taille ||
    taille <= 0
  ) {
    return "—";
  }

  if (
    taille < 1024
  ) {
    return `${taille} o`;
  }

  if (
    taille <
    1024 * 1024
  ) {
    return `${(
      taille / 1024
    ).toFixed(
      1
    )} Ko`;
  }

  return `${(
    taille /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} Mo`;
}


function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "medium",
    }
  ).format(
    date
  );
}


function extensionNormalisee(
  document: DocumentItem
): string {
  const extension =
    document.extension ||
    document.fichier_nom
      .split(".")
      .pop() ||
    "";

  return extension
    .replace(
      ".",
      ""
    )
    .toLowerCase();
}


function iconeDocument(
  document: DocumentItem,
  className =
    "h-5 w-5"
) {
  const extension =
    extensionNormalisee(
      document
    );

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
    ].includes(
      extension
    )
  ) {
    return (
      <ImageIcon
        className={`${className} text-violet-600`}
      />
    );
  }

  if (
    [
      "xls",
      "xlsx",
      "csv",
    ].includes(
      extension
    )
  ) {
    return (
      <FileSpreadsheet
        className={`${className} text-emerald-600`}
      />
    );
  }

  if (
    [
      "pdf",
      "doc",
      "docx",
      "txt",
    ].includes(
      extension
    )
  ) {
    return (
      <FileText
        className={`${className} text-blue-600`}
      />
    );
  }

  return (
    <File
      className={`${className} text-slate-500`}
    />
  );
}


/* =========================================================
   PAGE DOCUMENTS
========================================================= */


export default function DocumentsPage() {
  const router =
    useRouter();

  const dialog =
    useDialog();


  const {
    can,
    magasinActif,
    vueTousMagasins,
    magasinsDisponibles,
    peutChangerMagasin,
    changerMagasinActif,
    loading:
      authLoading,
  } = useAuth();


  const canCreate =
    can(
      "documents.create"
    );

  const canEdit =
    can(
      "documents.edit"
    );

  const canDelete =
    can(
      "documents.delete"
    );


  const [
    documents,
    setDocuments,
  ] =
    useState<
      DocumentItem[]
    >([]);


  const [
    folders,
    setFolders,
  ] =
    useState<
      DocumentFolderNode[]
    >([]);


  const [
    categories,
    setCategories,
  ] =
    useState<
      string[]
    >([]);


  const [
    stats,
    setStats,
  ] =
    useState<DocumentStats>(
      STATS_VIDES
    );


  const [
    filters,
    setFilters,
  ] =
    useState<DocumentFilters>({
      magasinId: null,

      dossier:
        "",

      sousDossier:
        "",

      categorie:
        "",

      recherche:
        "",

      favoris:
        false,

      archives:
        false,
    });


  const [
    vue,
    setVue,
  ] =
    useState<VueAffichage>(
      "liste"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    busyId,
    setBusyId,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    dossiersOuverts,
    setDossiersOuverts,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  const scope =
    useMemo(
      () => ({
        magasinId:
          magasinActif?.id ??
          null,

        tousMagasins:
          vueTousMagasins,
      }),
      [
        magasinActif?.id,
        vueTousMagasins,
      ]
    );


  /* =======================================================
     CHARGEMENT
  ======================================================= */


  const charger =
    useCallback(
      async (
        silent =
          false
      ) => {
        if (
          authLoading
        ) {
          return;
        }


        if (
          !vueTousMagasins &&
          !magasinActif
        ) {
          setDocuments(
            []
          );

          setFolders(
            []
          );

          setCategories(
            []
          );

          setStats(
            STATS_VIDES
          );

          setLoading(
            false
          );

          setError(
            "Aucun magasin actif. Sélectionne un magasin."
          );

          return;
        }


        try {
          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }


          setError(
            null
          );


          const [
            documentsData,
            foldersData,
            categoriesData,
            statsData,
          ] =
            await Promise.all(
              [
                getDocuments({
                  ...filters,

                  magasinId:
                    magasinActif?.id ??
                    null,

                  tousMagasins:
                    vueTousMagasins,
                }),

                getDocumentFolders(
                  scope
                ),

                getDocumentCategories(
                  scope
                ),

                getDocumentStats(
                  scope
                ),
              ]
            );


          setDocuments(
            documentsData
          );

          setFolders(
            foldersData
          );

          setCategories(
            categoriesData
          );

          setStats(
            statsData
          );
        } catch (
          currentError
        ) {
          console.error(
            "Erreur chargement documents :",
            currentError
          );


          setError(
            messageErreur(
              currentError
            )
          );


          setDocuments(
            []
          );

          setFolders(
            []
          );

          setCategories(
            []
          );

          setStats(
            STATS_VIDES
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        authLoading,
        filters,
        magasinActif,
        scope,
        vueTousMagasins,
      ]
    );


  useEffect(
    () => {
      setFilters(
        (
          current
        ) => ({
          ...current,

          magasinId:
            magasinActif?.id ??
            null,
        })
      );
    },
    [
      magasinActif?.id,
    ]
  );


  useEffect(
    () => {
      void charger();
    },
    [
      charger,
    ]
  );


  /* =======================================================
     NAVIGATION DOSSIERS
  ======================================================= */


  function choisirDossier(
    dossier: string,
    sousDossier =
      ""
  ) {
    setFilters(
      (
        current
      ) => ({
        ...current,

        dossier:
          dossier ===
          "Sans dossier"
            ? ""
            : dossier,

        sousDossier,

        archives:
          false,
      })
    );
  }


  function afficherTous() {
    setFilters(
      (
        current
      ) => ({
        ...current,

        dossier:
          "",

        sousDossier:
          "",

        favoris:
          false,

        archives:
          false,
      })
    );
  }


  function afficherFavoris() {
    setFilters(
      (
        current
      ) => ({
        ...current,

        dossier:
          "",

        sousDossier:
          "",

        favoris:
          true,

        archives:
          false,
      })
    );
  }


  function afficherArchives() {
    setFilters(
      (
        current
      ) => ({
        ...current,

        dossier:
          "",

        sousDossier:
          "",

        favoris:
          false,

        archives:
          true,
      })
    );
  }


  /* =======================================================
     FAVORIS
  ======================================================= */


  async function changerFavori(
    document:
      DocumentItem
  ) {
    if (
      !canEdit
    ) {
      setError(
        "Tu n’as pas l’autorisation de modifier les favoris."
      );

      return;
    }


    try {
      setBusyId(
        document.id
      );

      setError(
        null
      );


      await toggleDocumentFavorite(
        document.id,
        !document.favori,
        scope
      );


      await charger(
        true
      );
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(
        null
      );
    }
  }


  /* =======================================================
     ARCHIVAGE
  ======================================================= */


  async function archiver(
    document:
      DocumentItem
  ) {
    if (
      !canDelete
    ) {
      setError(
        "Tu n’as pas l’autorisation d’archiver ce document."
      );

      return;
    }


    const confirmed =
      await dialog.delete({
        title:
          "Archiver ce document ?",

        itemName:
          document.titre,

        description:
          "Le document sera déplacé dans les archives. Il pourra ensuite être restauré ou supprimé définitivement.",
      });


    if (
      !confirmed
    ) {
      return;
    }


    try {
      setBusyId(
        document.id
      );

      setError(
        null
      );


      await deleteDocument(
        document.id,
        scope
      );


      await charger(
        true
      );
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(
        null
      );
    }
  }


  /* =======================================================
     SUPPRESSION DEFINITIVE
  ======================================================= */


  async function supprimerDefinitivement(
    document:
      DocumentItem
  ) {
    if (
      !canDelete
    ) {
      setError(
        "Tu n’as pas l’autorisation de supprimer définitivement ce document."
      );

      return;
    }


    const confirmed =
      await dialog.delete({
        title:
          "Supprimer définitivement ?",

        itemName:
          document.titre,

        description:
          "Cette action est irréversible. Le document et son fichier seront définitivement supprimés.",
      });


    if (
      !confirmed
    ) {
      return;
    }


    try {
      setBusyId(
        document.id
      );

      setError(
        null
      );


      await deleteDocumentPermanently(
        document.id,
        scope
      );


      await charger(
        true
      );
    } catch (
      currentError
    ) {
      console.error(
        "Erreur suppression définitive document :",
        currentError
      );


      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(
        null
      );
    }
  }


  /* =======================================================
     RESTAURATION
  ======================================================= */


  async function restaurer(
    document:
      DocumentItem
  ) {
    if (
      !canEdit
    ) {
      setError(
        "Tu n’as pas l’autorisation de restaurer ce document."
      );

      return;
    }


    try {
      setBusyId(
        document.id
      );

      setError(
        null
      );


      await restoreDocument(
        document.id,
        scope
      );


      await charger(
        true
      );
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(
        null
      );
    }
  }


  /* =======================================================
     CHANGEMENT MAGASIN
  ======================================================= */


  function changerMagasin(
    value: string
  ) {
    changerMagasinActif(
      value ===
        "__TOUS__"
        ? null
        : value
    );
  }


  /* =======================================================
     TITRE
  ======================================================= */


  const titreSelection =
    useMemo(
      () => {
        if (
          filters.archives
        ) {
          return "Archives";
        }


        if (
          filters.favoris
        ) {
          return "Favoris";
        }


        if (
          filters.dossier &&
          filters.sousDossier
        ) {
          return `${filters.dossier} / ${filters.sousDossier}`;
        }


        if (
          filters.dossier
        ) {
          return filters.dossier;
        }


        return "Tous les documents";
      },
      [
        filters.archives,
        filters.dossier,
        filters.favoris,
        filters.sousDossier,
      ]
    );


  /* =======================================================
     AFFICHAGE
  ======================================================= */


  return (
    <AppShell>
      <div className="space-y-6">

        {/* HEADER */}

        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Documents
            </h1>

            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Classement, recherche et archivage des documents.
            </p>
          </div>


          {canCreate && (
            <button
              type="button"

              onClick={() => {
                if (
                  vueTousMagasins ||
                  !magasinActif
                ) {
                  setError(
                    "Sélectionne un magasin précis avant d’ajouter un document."
                  );

                  return;
                }


                router.push(
                  "/documents/nouveau"
                );
              }}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />

              Nouveau document
            </button>
          )}

        </header>


        {/* ERREUR */}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}


        {/* STATISTIQUES */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Documents"
            value={
              stats.total
            }
            icon={
              <FileText className="h-6 w-6" />
            }
          />


          <StatCard
            label="Favoris"
            value={
              stats.favoris
            }
            icon={
              <Star className="h-6 w-6" />
            }
          />


          <StatCard
            label="Archives"
            value={
              stats.archives
            }
            icon={
              <Archive className="h-6 w-6" />
            }
          />


          <StatCard
            label="Classés"
            value={
              stats.avecSousDossier
            }
            icon={
              <FolderOpen className="h-6 w-6" />
            }
          />

        </section>


        {/* FILTRES */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_220px_auto_auto]">

            <label className="relative">

              <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />


              <input
                value={
                  filters.recherche ??
                  ""
                }

                onChange={(
                  event
                ) =>
                  setFilters(
                    (
                      current
                    ) => ({
                      ...current,

                      recherche:
                        event.target.value,
                    })
                  )
                }

                placeholder="Rechercher un document..."

                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

            </label>


            {peutChangerMagasin && (
              <select
                value={
                  vueTousMagasins
                    ? "__TOUS__"
                    : magasinActif?.id ??
                      ""
                }

                onChange={(
                  event
                ) =>
                  changerMagasin(
                    event.target.value
                  )
                }

                className={
                  classeChamp()
                }
              >

                <option value="__TOUS__">
                  Tous les magasins
                </option>


                {(
                  magasinsDisponibles as readonly MagasinOption[]
                ).map(
                  (
                    magasin
                  ) => (
                    <option
                      key={
                        magasin.id
                      }
                      value={
                        magasin.id
                      }
                    >
                      {magasin.nom}
                    </option>
                  )
                )}

              </select>
            )}


            <select
              value={
                filters.categorie ??
                ""
              }

              onChange={(
                event
              ) =>
                setFilters(
                  (
                    current
                  ) => ({
                    ...current,

                    categorie:
                      event.target.value,
                  })
                )
              }

              className={
                classeChamp()
              }
            >

              <option value="">
                Toutes catégories
              </option>


              {categories.map(
                (
                  categorie
                ) => (
                  <option
                    key={
                      categorie
                    }
                    value={
                      categorie
                    }
                  >
                    {categorie}
                  </option>
                )
              )}

            </select>


            <button
              type="button"

              onClick={() =>
                void charger(
                  true
                )
              }

              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >

              <RefreshCw
                className={`h-5 w-5 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Actualiser

            </button>


            <div className="flex rounded-xl border border-slate-300 p-1 dark:border-slate-700">

              <button
                type="button"

                onClick={() =>
                  setVue(
                    "liste"
                  )
                }

                className={`rounded-lg p-2 ${
                  vue ===
                  "liste"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}

                aria-label="Vue liste"
              >
                <List className="h-5 w-5" />
              </button>


              <button
                type="button"

                onClick={() =>
                  setVue(
                    "grille"
                  )
                }

                className={`rounded-lg p-2 ${
                  vue ===
                  "grille"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}

                aria-label="Vue grille"
              >
                <Grid2X2 className="h-5 w-5" />
              </button>

            </div>

          </div>

        </section>


        {/* CONTENU */}

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">


          {/* SIDEBAR */}

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <nav className="space-y-1">

              <SidebarButton
                active={
                  !filters.dossier &&
                  !filters.favoris &&
                  !filters.archives
                }

                icon={
                  <FolderOpen className="h-5 w-5" />
                }

                label="Tous les documents"

                count={
                  stats.total
                }

                onClick={
                  afficherTous
                }
              />


              <SidebarButton
                active={
                  filters.favoris ===
                  true
                }

                icon={
                  <Star className="h-5 w-5" />
                }

                label="Favoris"

                count={
                  stats.favoris
                }

                onClick={
                  afficherFavoris
                }
              />


              <SidebarButton
                active={
                  filters.archives ===
                  true
                }

                icon={
                  <Archive className="h-5 w-5" />
                }

                label="Archives"

                count={
                  stats.archives
                }

                onClick={
                  afficherArchives
                }
              />


              <div className="my-3 border-t border-slate-200 dark:border-slate-800" />


              {folders.map(
                (
                  folder
                ) => {
                  const opened =
                    dossiersOuverts[
                      folder.dossier
                    ] ??
                    false;


                  const active =
                    filters.dossier ===
                      folder.dossier &&
                    !filters.sousDossier;


                  return (
                    <div
                      key={
                        folder.dossier
                      }
                    >

                      <button
                        type="button"

                        onClick={() => {
                          choisirDossier(
                            folder.dossier
                          );


                          setDossiersOuverts(
                            (
                              current
                            ) => ({
                              ...current,

                              [folder.dossier]:
                                !opened,
                            })
                          );
                        }}

                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                          active
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >

                        {folder.sousDossiers.length >
                        0 ? (
                          opened ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}


                        {opened ? (
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-500" />
                        ) : (
                          <Folder className="h-5 w-5 shrink-0 text-amber-500" />
                        )}


                        <span className="min-w-0 flex-1 truncate">
                          {folder.dossier}
                        </span>


                        <span className="text-xs text-slate-400">
                          {folder.total}
                        </span>

                      </button>


                      {opened &&
                        folder.sousDossiers.length >
                          0 && (
                          <div className="ml-8 mt-1 space-y-1">

                            {folder.sousDossiers.map(
                              (
                                sousDossier
                              ) => (
                                <button
                                  key={
                                    sousDossier
                                  }

                                  type="button"

                                  onClick={() =>
                                    choisirDossier(
                                      folder.dossier,
                                      sousDossier
                                    )
                                  }

                                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                                    filters.dossier ===
                                      folder.dossier &&
                                    filters.sousDossier ===
                                      sousDossier
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                  }`}
                                >

                                  <Folder className="h-4 w-4 text-amber-500" />

                                  <span className="truncate">
                                    {sousDossier}
                                  </span>

                                </button>
                              )
                            )}

                          </div>
                        )}

                    </div>
                  );
                }
              )}

            </nav>

          </aside>


          {/* LISTE / GRILLE */}

          <div className="min-w-0">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {titreSelection}
                </h2>


                <p className="text-sm text-slate-500">
                  {documents.length} document(s)
                </p>

              </div>

            </div>


            {loading ||
            authLoading ? (

              <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

                <div className="flex items-center gap-3 text-slate-500">

                  <Loader2 className="h-6 w-6 animate-spin" />

                  Chargement des documents...

                </div>

              </div>

            ) : documents.length ===
              0 ? (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">

                <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />


                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                  Aucun document
                </h3>


                <p className="mt-2 text-slate-500">
                  Aucun document ne correspond au dossier ou aux filtres sélectionnés.
                </p>

              </div>

            ) : vue ===
              "liste" ? (

              <DocumentList
                documents={
                  documents
                }

                busyId={
                  busyId
                }

                canEdit={
                  canEdit
                }

                canDelete={
                  canDelete
                }

                onOpen={(
                  document
                ) =>
                  router.push(
                    `/documents/${document.id}`
                  )
                }

                onFavorite={
                  changerFavori
                }

                onArchive={
                  archiver
                }

                onPermanentDelete={
                  supprimerDefinitivement
                }

                onRestore={
                  restaurer
                }
              />

            ) : (

              <DocumentGrid
                documents={
                  documents
                }

                busyId={
                  busyId
                }

                canEdit={
                  canEdit
                }

                canDelete={
                  canDelete
                }

                onOpen={(
                  document
                ) =>
                  router.push(
                    `/documents/${document.id}`
                  )
                }

                onFavorite={
                  changerFavori
                }

                onArchive={
                  archiver
                }

                onPermanentDelete={
                  supprimerDefinitivement
                }

                onRestore={
                  restaurer
                }
              />

            )}

          </div>

        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
   VUE LISTE
========================================================= */


function DocumentList({
  documents,
  busyId,
  canEdit,
  canDelete,
  onOpen,
  onFavorite,
  onArchive,
  onPermanentDelete,
  onRestore,
}: {
  documents:
    DocumentItem[];

  busyId:
    string | null;

  canEdit:
    boolean;

  canDelete:
    boolean;

  onOpen: (
    document:
      DocumentItem
  ) => void;

  onFavorite: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onArchive: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onPermanentDelete: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onRestore: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <table className="w-full min-w-[1000px] text-sm">

        <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-400">

          <tr>
            <th className="px-4 py-3">
              Nom
            </th>

            <th className="px-4 py-3">
              Dossier
            </th>

            <th className="px-4 py-3">
              Catégorie
            </th>

            <th className="px-4 py-3">
              Auteur
            </th>

            <th className="px-4 py-3">
              Dernière modification
            </th>

            <th className="px-4 py-3">
              Date
            </th>

            <th className="px-4 py-3">
              Taille
            </th>

            <th className="px-4 py-3">
              Version
            </th>

            <th className="px-4 py-3 text-right">
              Actions
            </th>
          </tr>

        </thead>


        <tbody>

          {documents.map(
            (
              document
            ) => (
              <tr
                key={
                  document.id
                }

                className="border-t border-slate-200 dark:border-slate-800"
              >

                {/* NOM */}

                <td className="px-4 py-3">

                  <button
                    type="button"

                    onClick={() =>
                      onOpen(
                        document
                      )
                    }

                    className="flex min-w-0 items-center gap-3 text-left"
                  >

                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">

                      {iconeDocument(
                        document
                      )}

                    </div>


                    <div className="min-w-0">

                      <p className="truncate font-semibold text-slate-900 hover:underline dark:text-white">
                        {document.titre}
                      </p>


                      <p className="max-w-72 truncate text-xs text-slate-500">
                        {document.fichier_nom}
                      </p>

                    </div>

                  </button>

                </td>


                {/* DOSSIER */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">

                  <p>
                    {document.dossier ||
                      "Sans dossier"}
                  </p>


                  {document.sous_dossier && (
                    <p className="text-xs text-slate-500">
                      {document.sous_dossier}
                    </p>
                  )}

                </td>


                {/* CATEGORIE */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {document.categorie}
                </td>


                {/* AUTEUR */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {document.auteur ||
                    "—"}
                </td>


                {/* MODIFICATION */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">

                  <p className="font-medium">
                    {(
                      document as DocumentItem & {
                        modifie_par?:
                          | string
                          | null;
                      }
                    ).modifie_par ||
                      "—"}
                  </p>


                  {document.date_modification && (
                    <p className="mt-1 text-xs text-slate-500">

                      {formatDate(
                        document.date_modification
                      )}

                    </p>
                  )}

                </td>


                {/* DATE */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">

                  {formatDate(
                    document.date_document ??
                      document.created_at
                  )}

                </td>


                {/* TAILLE */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">

                  {formatTaille(
                    document.taille
                  )}

                </td>


                {/* VERSION */}

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  v{document.version ??
                    1}
                </td>


                {/* ACTIONS */}

                <td className="px-4 py-3">

                  <div className="flex justify-end gap-2">


                    {/* FAVORI */}

                    {canEdit &&
                      !document.archive && (
                        <button
                          type="button"

                          disabled={
                            busyId ===
                            document.id
                          }

                          onClick={() =>
                            void onFavorite(
                              document
                            )
                          }

                          className="rounded-lg p-2 text-amber-500 transition hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950/30"

                          aria-label={
                            document.favori
                              ? "Retirer des favoris"
                              : "Ajouter aux favoris"
                          }
                        >

                          <Star
                            className={`h-5 w-5 ${
                              document.favori
                                ? "fill-current"
                                : ""
                            }`}
                          />

                        </button>
                      )}


                    {/* OUVRIR */}

                    <button
                      type="button"

                      onClick={() =>
                        onOpen(
                          document
                        )
                      }

                      className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      Ouvrir
                    </button>


                    {/* ARCHIVES */}

                    {document.archive ? (
                      <>

                        {/* RESTAURER */}

                        {canEdit && (
                          <button
                            type="button"

                            disabled={
                              busyId ===
                              document.id
                            }

                            onClick={() =>
                              void onRestore(
                                document
                              )
                            }

                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >

                            <ArchiveRestore className="h-4 w-4" />

                            Restaurer

                          </button>
                        )}


                        {/* SUPPRESSION DEFINITIVE */}

                        {canDelete && (
                          <button
                            type="button"

                            disabled={
                              busyId ===
                              document.id
                            }

                            onClick={() =>
                              void onPermanentDelete(
                                document
                              )
                            }

                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >

                            <Trash2 className="h-4 w-4" />

                            Supprimer définitivement

                          </button>
                        )}

                      </>
                    ) : (

                      /* ARCHIVER */

                      canDelete && (
                        <button
                          type="button"

                          disabled={
                            busyId ===
                            document.id
                          }

                          onClick={() =>
                            void onArchive(
                              document
                            )
                          }

                          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                        >

                          <Archive className="h-4 w-4" />

                          Archiver

                        </button>
                      )

                    )}

                  </div>

                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  );
}


/* =========================================================
   VUE GRILLE
========================================================= */


function DocumentGrid({
  documents,
  busyId,
  canEdit,
  canDelete,
  onOpen,
  onFavorite,
  onArchive,
  onPermanentDelete,
  onRestore,
}: {
  documents:
    DocumentItem[];

  busyId:
    string | null;

  canEdit:
    boolean;

  canDelete:
    boolean;

  onOpen: (
    document:
      DocumentItem
  ) => void;

  onFavorite: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onArchive: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onPermanentDelete: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;

  onRestore: (
    document:
      DocumentItem
  ) =>
    | void
    | Promise<void>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

      {documents.map(
        (
          document
        ) => (
          <article
            key={
              document.id
            }

            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-3">

              <button
                type="button"

                onClick={() =>
                  onOpen(
                    document
                  )
                }

                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >

                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">

                  {iconeDocument(
                    document,
                    "h-7 w-7"
                  )}

                </div>


                <div className="min-w-0">

                  <h3 className="truncate font-bold text-slate-900 dark:text-white">
                    {document.titre}
                  </h3>


                  <p className="mt-1 truncate text-xs text-slate-500">
                    {document.fichier_nom}
                  </p>

                </div>

              </button>


              <MoreVertical className="h-5 w-5 text-slate-400" />

            </div>


            {/* INFOS */}

            <div className="mt-4 space-y-2 text-sm">

              <p className="text-slate-600 dark:text-slate-300">

                <span className="font-medium">
                  Dossier :
                </span>{" "}

                {document.dossier ||
                  "Sans dossier"}

              </p>


              {document.sous_dossier && (
                <p className="text-slate-600 dark:text-slate-300">

                  <span className="font-medium">
                    Sous-dossier :
                  </span>{" "}

                  {document.sous_dossier}

                </p>
              )}


              <p className="text-slate-600 dark:text-slate-300">

                <span className="font-medium">
                  Catégorie :
                </span>{" "}

                {document.categorie}

              </p>


              <p className="text-slate-600 dark:text-slate-300">

                <span className="font-medium">
                  Auteur :
                </span>{" "}

                {document.auteur ||
                  "—"}

              </p>


              <p className="text-slate-600 dark:text-slate-300">

                <span className="font-medium">
                  Dernière modification :
                </span>{" "}

                {(
                  document as DocumentItem & {
                    modifie_par?:
                      | string
                      | null;
                  }
                ).modifie_par ||
                  "—"}

              </p>


              {document.date_modification && (
                <p className="text-xs text-slate-500">

                  Modifié le{" "}

                  {formatDate(
                    document.date_modification
                  )}

                </p>
              )}


              <p className="text-slate-500">

                {formatTaille(
                  document.taille
                )}{" "}
                · v
                {document.version ??
                  1}

              </p>

            </div>


            {/* ACTIONS */}

            <div className="mt-4 flex flex-wrap gap-2">


              {/* FAVORIS */}

              {canEdit &&
                !document.archive && (
                  <button
                    type="button"

                    disabled={
                      busyId ===
                      document.id
                    }

                    onClick={() =>
                      void onFavorite(
                        document
                      )
                    }

                    className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950/30"
                  >

                    <Star
                      className={`h-5 w-5 ${
                        document.favori
                          ? "fill-current"
                          : ""
                      }`}
                    />

                  </button>
                )}


              {/* OUVRIR */}

              <button
                type="button"

                onClick={() =>
                  onOpen(
                    document
                  )
                }

                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Ouvrir
              </button>


              {document.archive ? (
                <>

                  {/* RESTAURER */}

                  {canEdit && (
                    <button
                      type="button"

                      disabled={
                        busyId ===
                        document.id
                      }

                      onClick={() =>
                        void onRestore(
                          document
                        )
                      }

                      className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Restaurer
                    </button>
                  )}


                  {/* SUPPRIMER DEFINITIVEMENT */}

                  {canDelete && (
                    <button
                      type="button"

                      disabled={
                        busyId ===
                        document.id
                      }

                      onClick={() =>
                        void onPermanentDelete(
                          document
                        )
                      }

                      className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      Supprimer définitivement
                    </button>
                  )}

                </>
              ) : (

                /* ARCHIVER */

                canDelete && (
                  <button
                    type="button"

                    disabled={
                      busyId ===
                      document.id
                    }

                    onClick={() =>
                      void onArchive(
                        document
                      )
                    }

                    className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    Archiver
                  </button>
                )

              )}

            </div>

          </article>
        )
      )}

    </div>
  );
}


/* =========================================================
   SIDEBAR BUTTON
========================================================= */


function SidebarButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active:
    boolean;

  icon:
    React.ReactNode;

  label:
    string;

  count:
    number;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >

      {icon}


      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>


      <span className="text-xs text-slate-400">
        {count}
      </span>

    </button>
  );
}


/* =========================================================
   STAT CARD
========================================================= */


function StatCard({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    number;

  icon:
    React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {label}
          </p>


          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

        </div>


        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {icon}
        </div>

      </div>

    </article>
  );
}


/* =========================================================
   CLASSE CHAMP
========================================================= */


function classeChamp(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
}