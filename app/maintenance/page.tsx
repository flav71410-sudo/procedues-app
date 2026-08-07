"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import {
  deleteMaintenance,
  formatMaintenanceError,
  getMaintenances,
  type MaintenanceListItem,
} from "@/services/maintenanceService";

/* =========================================================
   OUTILS
========================================================= */

function normaliser(
  value: string | null | undefined
): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formaterDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function formaterMontant(
  value:
    | number
    | null
    | undefined
): string {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(value);
}

function classeStatut(
  label: string
): string {
  const statut =
    normaliser(label);

  if (
    statut.includes("termine") ||
    statut.includes("cloture")
  ) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }

  if (
    statut.includes("cours")
  ) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  }

  if (
    statut.includes("annule")
  ) {
    return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

function classePriorite(
  label: string
): string {
  const priorite =
    normaliser(label);

  if (
    priorite.includes(
      "critique"
    )
  ) {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }

  if (
    priorite.includes("haute") ||
    priorite.includes("urgent")
  ) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  }

  if (
    priorite.includes("basse")
  ) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
}

function echapperHtml(
  value:
    | string
    | null
    | undefined
): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   PAGE
========================================================= */

export default function MaintenancePage() {
  const {
    can,
    magasinActif,
    vueTousMagasins,
    magasinsDisponibles,
    peutChangerMagasin,
    changerMagasinActif,
    loading: chargementAuth,
  } = useAuth();

  const canCreate =
    can("maintenance.create");

  const canDelete =
    can("maintenance.delete");

  const [
    maintenances,
    setMaintenances,
  ] =
    useState<
      MaintenanceListItem[]
    >([]);

  const [
    maintenancesSelectionnees,
    setMaintenancesSelectionnees,
  ] =
    useState<string[]>([]);

  const [
    recherche,
    setRecherche,
  ] =
    useState("");

  const [
    filtreStatut,
    setFiltreStatut,
  ] =
    useState("");

  const [
    chargement,
    setChargement,
  ] =
    useState(true);

  const [
    actualisation,
    setActualisation,
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
    erreur,
    setErreur,
  ] =
    useState<string | null>(
      null
    );

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  const chargerMaintenances =
    useCallback(
      async (
        silencieux = false
      ) => {
        if (chargementAuth) {
          return;
        }

        if (
          !vueTousMagasins &&
          !magasinActif
        ) {
          setMaintenances([]);
          setMaintenancesSelectionnees(
            []
          );

          setChargement(false);

          setErreur(
            "Aucun magasin actif. Sélectionne un magasin."
          );

          return;
        }

        try {
          if (silencieux) {
            setActualisation(true);
          } else {
            setChargement(true);
          }

          setErreur(null);

          const data =
            await getMaintenances({
              magasinId:
                magasinActif?.id ??
                null,

              tousMagasins:
                vueTousMagasins,
            });

          setMaintenances(
            data
          );

          /*
           * Retire de la sélection les maintenances
           * qui n'existent plus après actualisation.
           */
          setMaintenancesSelectionnees(
            (current) => {
              const ids =
                new Set(
                  data.map(
                    (item) =>
                      item.id
                  )
                );

              return current.filter(
                (id) =>
                  ids.has(id)
              );
            }
          );
        } catch (
          currentError
        ) {
          setErreur(
            formatMaintenanceError(
              currentError
            )
          );
        } finally {
          setChargement(false);
          setActualisation(false);
        }
      },
      [
        chargementAuth,
        magasinActif?.id,
        vueTousMagasins,
      ]
    );

  useEffect(() => {
    void chargerMaintenances();
  }, [chargerMaintenances]);

  /*
   * Quand on change de site, on repart
   * sur une sélection vide.
   */
  useEffect(() => {
    setMaintenancesSelectionnees(
      []
    );
  }, [
    magasinActif?.id,
    vueTousMagasins,
  ]);

  /* =======================================================
     FILTRES
  ======================================================= */

  const statuts =
    useMemo(() => {
      return Array.from(
        new Set(
          maintenances
            .map(
              (
                maintenance
              ) =>
                maintenance.statut_label
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "fr"
        )
      );
    }, [maintenances]);

  const maintenancesFiltrees =
    useMemo(() => {
      const terme =
        normaliser(
          recherche
        );

      return maintenances.filter(
        (
          maintenance
        ) => {
          const correspondStatut =
            !filtreStatut ||
            maintenance.statut_label ===
              filtreStatut;

          if (
            !correspondStatut
          ) {
            return false;
          }

          if (!terme) {
            return true;
          }

          const texte =
            normaliser(
              [
                maintenance.numero,
                maintenance.titre,
                maintenance.description,
                maintenance.equipement_label,
                maintenance.equipement_numero,
                maintenance.prestataire_label,
                maintenance.type_label,
                maintenance.priorite_label,
                maintenance.criticite_label,
                maintenance.statut_label,
                maintenance.technicien,
              ].join(" ")
            );

          return texte.includes(
            terme
          );
        }
      );
    }, [
      filtreStatut,
      maintenances,
      recherche,
    ]);

  /* =======================================================
     INDICATEURS
  ======================================================= */

  const indicateurs =
    useMemo(() => {
      const ouvertes =
        maintenances.filter(
          (
            maintenance
          ) => {
            const statut =
              normaliser(
                maintenance.statut_label
              );

            return (
              !statut.includes(
                "termine"
              ) &&
              !statut.includes(
                "cloture"
              ) &&
              !statut.includes(
                "annule"
              )
            );
          }
        ).length;

      const critiques =
        maintenances.filter(
          (
            maintenance
          ) =>
            normaliser(
              maintenance.priorite_label
            ).includes(
              "critique"
            )
        ).length;

      const terminees =
        maintenances.filter(
          (
            maintenance
          ) => {
            const statut =
              normaliser(
                maintenance.statut_label
              );

            return (
              statut.includes(
                "termine"
              ) ||
              statut.includes(
                "cloture"
              )
            );
          }
        ).length;

      return {
        total:
          maintenances.length,
        ouvertes,
        critiques,
        terminees,
      };
    }, [maintenances]);

  /* =======================================================
     SÉLECTION
  ======================================================= */

  function selectionnerMaintenance(
    id: string,
    checked: boolean
  ) {
    setMaintenancesSelectionnees(
      (current) => {
        if (checked) {
          return current.includes(
            id
          )
            ? current
            : [
                ...current,
                id,
              ];
        }

        return current.filter(
          (currentId) =>
            currentId !== id
        );
      }
    );
  }

  function selectionnerToutesMaintenances(
    checked: boolean
  ) {
    const idsFiltres =
      maintenancesFiltrees.map(
        (
          maintenance
        ) =>
          maintenance.id
      );

    if (!checked) {
      /*
       * On retire uniquement celles qui sont
       * actuellement visibles après filtrage.
       */
      setMaintenancesSelectionnees(
        (current) =>
          current.filter(
            (id) =>
              !idsFiltres.includes(
                id
              )
          )
      );

      return;
    }

    setMaintenancesSelectionnees(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...idsFiltres,
          ])
        )
    );
  }

  const toutesFiltreesSelectionnees =
    maintenancesFiltrees.length >
      0 &&
    maintenancesFiltrees.every(
      (
        maintenance
      ) =>
        maintenancesSelectionnees.includes(
          maintenance.id
        )
    );

  /* =======================================================
     IMPRESSION
  ======================================================= */

  function imprimerMaintenancesSelectionnees() {
    /*
     * On utilise la liste complète et non uniquement
     * la liste filtrée afin qu'une sélection reste
     * imprimable même si le filtre change ensuite.
     */
    const selection =
      maintenances.filter(
        (
          maintenance
        ) =>
          maintenancesSelectionnees.includes(
            maintenance.id
          )
      );

    if (
      selection.length ===
      0
    ) {
      setErreur(
        "Sélectionne au moins une maintenance à imprimer."
      );

      return;
    }

    setErreur(null);

    const lignes =
      selection
        .map(
          (
            maintenance
          ) => {
            const description =
              maintenance.description
                ? `<div class="description">${echapperHtml(
                    maintenance.description
                  )}</div>`
                : "";

            const numeroEquipement =
              maintenance.equipement_numero
                ? `<div class="secondary">${echapperHtml(
                    maintenance.equipement_numero
                  )}</div>`
                : "";

            const immobilise =
              maintenance.equipement_immobilise
                ? `<div class="danger">Équipement immobilisé</div>`
                : "";

            return `
              <tr>
                <td class="numero">
                  ${echapperHtml(
                    maintenance.numero
                  )}
                </td>

                <td>
                  <strong>
                    ${echapperHtml(
                      maintenance.titre
                    )}
                  </strong>

                  ${description}
                </td>

                <td>
                  ${echapperHtml(
                    maintenance.equipement_label ||
                      "—"
                  )}

                  ${numeroEquipement}

                  ${immobilise}
                </td>

                <td>
                  ${echapperHtml(
                    maintenance.prestataire_label ||
                      "—"
                  )}
                </td>

                <td>
                  ${echapperHtml(
                    maintenance.type_label ||
                      "—"
                  )}
                </td>

                <td>
                  ${echapperHtml(
                    maintenance.priorite_label ||
                      "—"
                  )}
                </td>

                <td>
                  ${echapperHtml(
                    maintenance.statut_label ||
                      "—"
                  )}
                </td>

                <td>
                  ${echapperHtml(
                    formaterDate(
                      maintenance.date_debut
                    )
                  )}
                </td>

                <td class="montant">
                  ${echapperHtml(
                    formaterMontant(
                      maintenance.cout
                    )
                  )}
                </td>
              </tr>
            `;
          }
        )
        .join("");

    const coutTotal =
      selection.reduce(
        (
          total,
          maintenance
        ) =>
          total +
          Number(
            maintenance.cout ??
              0
          ),
        0
      );

    const magasin =
      vueTousMagasins
        ? "Tous les magasins"
        : magasinActif?.nom ??
          "Magasin non défini";

    const dateImpression =
      new Intl.DateTimeFormat(
        "fr-FR",
        {
          dateStyle:
            "long",
          timeStyle:
            "short",
        }
      ).format(
        new Date()
      );

    const fenetre =
      window.open(
        "",
        "_blank",
        "width=1300,height=850"
      );

    if (!fenetre) {
      setErreur(
        "Le navigateur a bloqué la fenêtre d’impression."
      );

      return;
    }

    fenetre.document.write(`
      <!DOCTYPE html>

      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <title>
            Liste des maintenances
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              margin: 32px;
              color: #111827;
              background: white;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;
              padding-bottom: 18px;
              border-bottom: 2px solid #1d4ed8;
            }

            h1 {
              margin: 0;
              font-size: 26px;
            }

            .subtitle {
              margin-top: 7px;
              color: #64748b;
              font-size: 14px;
            }

            .header-right {
              text-align: right;
              font-size: 12px;
              color: #64748b;
            }

            .summary {
              display: grid;
              grid-template-columns:
                repeat(3, 1fr);

              gap: 12px;
              margin: 22px 0;
            }

            .summary-box {
              border:
                1px solid #cbd5e1;

              border-radius:
                8px;

              padding: 12px;
            }

            .summary-label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
            }

            .summary-value {
              margin-top: 5px;
              font-weight: bold;
              font-size: 17px;
            }

            table {
              width: 100%;
              border-collapse:
                collapse;

              font-size: 10px;
            }

            thead {
              display:
                table-header-group;
            }

            tr {
              page-break-inside:
                avoid;
            }

            th {
              background:
                #f1f5f9;

              text-align: left;
              padding: 8px 6px;
              border:
                1px solid #cbd5e1;

              font-size: 10px;
            }

            td {
              padding: 8px 6px;
              border:
                1px solid #cbd5e1;

              vertical-align: top;
            }

            .numero {
              white-space: nowrap;
              font-weight: bold;
              color: #1d4ed8;
            }

            .description,
            .secondary {
              margin-top: 4px;
              color: #64748b;
              font-size: 9px;
            }

            .danger {
              margin-top: 5px;
              color: #b91c1c;
              font-weight: bold;
              font-size: 9px;
            }

            .montant {
              text-align: right;
              white-space: nowrap;
            }

            .total {
              margin-top: 20px;
              margin-left: auto;

              width: 300px;

              border:
                1px solid #cbd5e1;

              border-radius:
                8px;

              padding: 12px 14px;

              display: flex;
              justify-content:
                space-between;

              font-weight: bold;
              font-size: 14px;
            }

            .footer {
              margin-top: 35px;
              padding-top: 10px;

              border-top:
                1px solid #cbd5e1;

              color: #64748b;
              font-size: 10px;

              display: flex;
              justify-content:
                space-between;
            }

            @media print {
              body {
                margin: 0;
              }

              @page {
                size: A4 landscape;
                margin: 8mm;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              <h1>
                Liste des maintenances
              </h1>

              <div class="subtitle">
                ${echapperHtml(
                  magasin
                )}
              </div>
            </div>

            <div class="header-right">
              Casto Manager<br />
              ${echapperHtml(
                dateImpression
              )}
            </div>
          </div>

          <div class="summary">
            <div class="summary-box">
              <div class="summary-label">
                Maintenances sélectionnées
              </div>

              <div class="summary-value">
                ${selection.length}
              </div>
            </div>

            <div class="summary-box">
              <div class="summary-label">
                Équipements immobilisés
              </div>

              <div class="summary-value">
                ${
                  selection.filter(
                    (
                      maintenance
                    ) =>
                      maintenance.equipement_immobilise
                  ).length
                }
              </div>
            </div>

            <div class="summary-box">
              <div class="summary-label">
                Coût total
              </div>

              <div class="summary-value">
                ${echapperHtml(
                  formaterMontant(
                    coutTotal
                  )
                )}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Maintenance</th>
                <th>Équipement</th>
                <th>Prestataire</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Début</th>
                <th>Coût</th>
              </tr>
            </thead>

            <tbody>
              ${lignes}
            </tbody>
          </table>

          <div class="total">
            <span>
              Coût total
            </span>

            <span>
              ${echapperHtml(
                formaterMontant(
                  coutTotal
                )
              )}
            </span>
          </div>

          <div class="footer">
            <span>
              Casto Manager — Maintenance
            </span>

            <span>
              ${selection.length}
              maintenance(s)
            </span>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    fenetre.document.close();
  }

  /* =======================================================
     SUPPRESSION
  ======================================================= */

  async function supprimer(
    maintenance: MaintenanceListItem
  ) {
    if (!canDelete) {
      return;
    }

    const confirmation =
      window.confirm(
        `Supprimer définitivement la maintenance ${maintenance.numero} — ${maintenance.titre} ?\n\nLes documents associés seront également supprimés.`
      );

    if (!confirmation) {
      return;
    }

    try {
      setSuppressionId(
        maintenance.id
      );

      setErreur(null);

      await deleteMaintenance(
        maintenance.id
      );

      setMaintenances(
        (liste) =>
          liste.filter(
            (item) =>
              item.id !==
              maintenance.id
          )
      );

      setMaintenancesSelectionnees(
        (current) =>
          current.filter(
            (id) =>
              id !==
              maintenance.id
          )
      );
    } catch (
      currentError
    ) {
      setErreur(
        formatMaintenanceError(
          currentError
        )
      );
    } finally {
      setSuppressionId(
        null
      );
    }
  }

  /* =======================================================
     AFFICHAGE
  ======================================================= */

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* HEADER */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Wrench className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Maintenance
              </h1>

              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Suivi des demandes et interventions de maintenance.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void chargerMaintenances(
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

            {canCreate && (
              <Link
                href={
                  vueTousMagasins ||
                  !magasinActif
                    ? "#"
                    : "/maintenance/nouveau"
                }
                onClick={(
                  event
                ) => {
                  if (
                    vueTousMagasins ||
                    !magasinActif
                  ) {
                    event.preventDefault();

                    setErreur(
                      "Sélectionne un magasin précis avant de créer une maintenance."
                    );
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />

                Nouvelle maintenance
              </Link>
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

            {erreur}
          </div>
        )}

        {/* MULTI-SITE */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Magasin consulté
              </p>

              <p className="mt-1 font-bold text-slate-900 dark:text-white">
                {vueTousMagasins
                  ? "Tous les magasins"
                  : magasinActif?.nom ??
                    "Aucun magasin"}
              </p>
            </div>

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
                ) => {
                  const value =
                    event.target
                      .value;

                  changerMagasinActif(
                    value ===
                      "__TOUS__"
                      ? null
                      : value
                  );
                }}
                className="min-w-[280px] rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="__TOUS__">
                  Tous les magasins
                </option>

                {magasinsDisponibles.map(
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
                      {
                        magasin.nom
                      }
                    </option>
                  )
                )}
              </select>
            )}
          </div>
        </section>

        {/* INDICATEURS */}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Maintenances
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
              {indicateurs.total}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Ouvertes
            </p>

            <p className="mt-3 text-4xl font-bold text-amber-600">
              {indicateurs.ouvertes}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Critiques
            </p>

            <p className="mt-3 text-4xl font-bold text-red-600">
              {indicateurs.critiques}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Terminées
            </p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {indicateurs.terminees}
            </p>
          </article>
        </section>

        {/* FILTRES */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px_auto]">
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
                    event.target
                      .value
                  )
                }
                placeholder="Rechercher par numéro, titre, équipement, prestataire..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <select
              value={
                filtreStatut
              }
              onChange={(
                event
              ) =>
                setFiltreStatut(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">
                Tous les statuts
              </option>

              {statuts.map(
                (statut) => (
                  <option
                    key={
                      statut
                    }
                    value={
                      statut
                    }
                  >
                    {statut}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                imprimerMaintenancesSelectionnees
              }
              disabled={
                maintenancesSelectionnees.length ===
                0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Printer className="h-5 w-5" />

              Imprimer

              {maintenancesSelectionnees.length >
                0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs dark:bg-slate-900/10">
                  {
                    maintenancesSelectionnees.length
                  }
                </span>
              )}
            </button>
          </div>

          {maintenancesSelectionnees.length >
            0 && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4" />

              {
                maintenancesSelectionnees.length
              }{" "}
              maintenance
              {maintenancesSelectionnees.length >
              1
                ? "s"
                : ""}{" "}
              sélectionnée
              {maintenancesSelectionnees.length >
              1
                ? "s"
                : ""}
            </div>
          )}
        </section>

        {/* LISTE */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {chargement ||
          chargementAuth ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Loader2 className="h-6 w-6 animate-spin" />

                Chargement des maintenances...
              </div>
            </div>
          ) : maintenancesFiltrees.length ===
            0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <AlertTriangle className="h-10 w-10 text-slate-400" />

              <p className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Aucune maintenance trouvée
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Modifie les filtres ou crée une nouvelle maintenance.
              </p>
            </div>
          ) : (
            <>
              {/* TABLEAU DESKTOP */}

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1320px] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Sélectionner toutes les maintenances affichées"
                          checked={
                            toutesFiltreesSelectionnees
                          }
                          onChange={(
                            event
                          ) =>
                            selectionnerToutesMaintenances(
                              event
                                .target
                                .checked
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Numéro
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Maintenance
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Équipement
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Prestataire
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Type
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Priorité
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Statut
                      </th>

                      <th className="px-4 py-4 font-semibold">
                        Début
                      </th>

                      <th className="px-4 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {maintenancesFiltrees.map(
                      (
                        maintenance
                      ) => (
                        <tr
                          key={
                            maintenance.id
                          }
                          className="border-t border-slate-200 align-top dark:border-slate-800"
                        >
                          <td className="w-12 px-4 py-4">
                            <input
                              type="checkbox"
                              aria-label={`Sélectionner ${maintenance.numero}`}
                              checked={
                                maintenancesSelectionnees.includes(
                                  maintenance.id
                                )
                              }
                              onChange={(
                                event
                              ) =>
                                selectionnerMaintenance(
                                  maintenance.id,
                                  event
                                    .target
                                    .checked
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-mono font-semibold text-blue-700 dark:text-blue-300">
                            {
                              maintenance.numero
                            }
                          </td>

                          <td className="max-w-[320px] px-4 py-4">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {
                                maintenance.titre
                              }
                            </p>

                            {maintenance.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                {
                                  maintenance.description
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                            <p className="font-medium">
                              {
                                maintenance.equipement_label
                              }
                            </p>

                            {maintenance.equipement_numero && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  maintenance.equipement_numero
                                }
                              </p>
                            )}

                            {maintenance.equipement_immobilise && (
                              <p className="mt-2 inline-flex rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                                Immobilisé
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                            {maintenance.prestataire_label ??
                              "—"}
                          </td>

                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                            {
                              maintenance.type_label
                            }
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classePriorite(
                                maintenance.priorite_label
                              )}`}
                            >
                              {
                                maintenance.priorite_label
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classeStatut(
                                maintenance.statut_label
                              )}`}
                            >
                              {
                                maintenance.statut_label
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300">
                            {formaterDate(
                              maintenance.date_debut
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/maintenance/${maintenance.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-medium text-white transition hover:bg-blue-700"
                              >
                                <Eye className="h-4 w-4" />

                                Consulter
                              </Link>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void supprimer(
                                      maintenance
                                    )
                                  }
                                  disabled={
                                    suppressionId ===
                                    maintenance.id
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {suppressionId ===
                                  maintenance.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}

                                  Supprimer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* VERSION MOBILE */}

              <div className="grid gap-4 p-4 xl:hidden">
                {maintenancesFiltrees.map(
                  (
                    maintenance
                  ) => (
                    <article
                      key={
                        maintenance.id
                      }
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${maintenance.numero}`}
                          checked={
                            maintenancesSelectionnees.includes(
                              maintenance.id
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            selectionnerMaintenance(
                              maintenance.id,
                              event.target
                                .checked
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {
                                  maintenance.numero
                                }
                              </p>

                              <h2 className="mt-1 font-semibold text-slate-900 dark:text-white">
                                {
                                  maintenance.titre
                                }
                              </h2>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classeStatut(
                                maintenance.statut_label
                              )}`}
                            >
                              {
                                maintenance.statut_label
                              }
                            </span>
                          </div>

                          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-slate-500 dark:text-slate-400">
                                Équipement
                              </dt>

                              <dd className="font-medium text-slate-800 dark:text-slate-100">
                                {
                                  maintenance.equipement_label
                                }
                              </dd>
                            </div>

                            <div>
                              <dt className="text-slate-500 dark:text-slate-400">
                                Prestataire
                              </dt>

                              <dd className="font-medium text-slate-800 dark:text-slate-100">
                                {maintenance.prestataire_label ??
                                  "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-slate-500 dark:text-slate-400">
                                Type
                              </dt>

                              <dd className="font-medium text-slate-800 dark:text-slate-100">
                                {
                                  maintenance.type_label
                                }
                              </dd>
                            </div>

                            <div>
                              <dt className="text-slate-500 dark:text-slate-400">
                                Coût
                              </dt>

                              <dd className="font-medium text-slate-800 dark:text-slate-100">
                                {formaterMontant(
                                  maintenance.cout
                                )}
                              </dd>
                            </div>
                          </dl>

                          {maintenance.equipement_immobilise && (
                            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                              <AlertTriangle className="h-4 w-4" />

                              Équipement immobilisé
                            </div>
                          )}

                          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            <Link
                              href={`/maintenance/${maintenance.id}`}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-medium text-white transition hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4" />

                              Consulter
                            </Link>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void supprimer(
                                    maintenance
                                  )
                                }
                                disabled={
                                  suppressionId ===
                                  maintenance.id
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {suppressionId ===
                                maintenance.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}

                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>

              {/* FOOTER */}

              <footer className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />

                  {
                    maintenancesFiltrees.length
                  }{" "}
                  maintenance
                  {maintenancesFiltrees.length >
                  1
                    ? "s"
                    : ""}{" "}
                  affichée
                  {maintenancesFiltrees.length >
                  1
                    ? "s"
                    : ""}
                  .
                </div>

                {maintenancesSelectionnees.length >
                  0 && (
                  <div className="font-semibold text-blue-700 dark:text-blue-300">
                    {
                      maintenancesSelectionnees.length
                    }{" "}
                    sélectionnée
                    {maintenancesSelectionnees.length >
                    1
                      ? "s"
                      : ""}
                  </div>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}