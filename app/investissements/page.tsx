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
  CheckCircle2,
  Clock3,
  Download,
  Euro,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
  XCircle,
  Printer,
  Trash2,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import {
  deleteDocumentPermanently,
  getDevis,
  getDevisStats,
  updateDevisSignature,
  updateDevisStatus,
  type DevisStats,
  type DocumentScope,
} from "@/services/documentsService";
import type {
  DocumentItem,
  StatutDevis,
} from "@/types/documents";

type FiltreStatut =
  | "TOUS"
  | StatutDevis;

const STATS_VIDES: DevisStats = {
  total: 0,
  enAttente: 0,
  valides: 0,
  rejetes: 0,
  investissementNPlus1: 0,
  signes: 0,
  nonSignes: 0,
  montantEnAttenteHt: 0,
  montantValideHt: 0,
  montantRejeteHt: 0,
  montantNPlus1Ht: 0,
};

function messageErreur(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as {
        message: unknown;
      }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function formatMontant(
  value: number | null | undefined
): string {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value ?? 0)
  );
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

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
      dateStyle: "medium",
    }
  ).format(date);
}

function montantTtc(
  devis: DocumentItem
): number {
  if (
    devis.montant_ttc !== null &&
    devis.montant_ttc !== undefined
  ) {
    return Number(
      devis.montant_ttc
    );
  }

  const ht = Number(
    devis.montant_ht ?? 0
  );

  const tva = Number(
    devis.taux_tva ?? 0
  );

  return (
    ht *
    (1 + tva / 100)
  );
}

function statutLabel(
  statut: StatutDevis | null
): string {
  switch (statut) {
    case "VALIDE":
      return "Validé";
    case "REJETE":
      return "Refusé";
    case "INVESTISSEMENT_N_PLUS_1":
      return "Investissement N+1";
    case "EN_ATTENTE":
    default:
      return "En attente";
  }
}

function statutClasses(
  statut: StatutDevis | null
): string {
  switch (statut) {
    case "VALIDE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "REJETE":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "INVESTISSEMENT_N_PLUS_1":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    case "EN_ATTENTE":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

function progressClass(
  percentage: number
): string {
  if (percentage >= 100) {
    return "from-red-700 via-red-600 to-red-900";
  }

  if (percentage >= 90) {
    return "from-orange-500 via-red-500 to-red-600";
  }

  if (percentage >= 75) {
    return "from-yellow-400 via-orange-400 to-orange-600";
  }

  if (percentage >= 50) {
    return "from-emerald-500 via-yellow-400 to-amber-500";
  }

  return "from-emerald-600 via-emerald-500 to-lime-400";
}

function budgetStorageKey(
  magasinId: string | null,
  year: number
): string {
  return `Sécumanager-budget-investissements:${
    magasinId ?? "tous"
  }:${year}`;
}

export default function InvestissementsPage() {
  const router = useRouter();
  const dialog = useDialog();

  const {
  user,
  role,
  magasinActif,
  vueTousMagasins,
  magasinsDisponibles,
  peutChangerMagasin,
  changerMagasinActif,
  loading: authLoading,
} = useAuth();

  const canView = [
    "SUPER_ADMIN",
    "ADMIN",
    "DM",
  ].includes(role);

  const canManage = canView;

  const currentYear =
    new Date().getFullYear();

  const [
    anneeBudget,
    setAnneeBudget,
  ] = useState(currentYear);

  const [
    budgetAnnuel,
    setBudgetAnnuel,
  ] = useState(0);

  const [
    budgetInput,
    setBudgetInput,
  ] = useState("");

  const [devis, setDevis] =
    useState<DocumentItem[]>([]);

    const [
  devisSelectionnes,
  setDevisSelectionnes,
] = useState<string[]>([]);

  const [stats, setStats] =
    useState<DevisStats>(
      STATS_VIDES
    );

  const [
    filtreStatut,
    setFiltreStatut,
  ] =
    useState<FiltreStatut>(
      "TOUS"
    );

  const [
    recherche,
    setRecherche,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [success, setSuccess] =
    useState<string | null>(
      null
    );

  const scope =
    useMemo<DocumentScope>(
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

  useEffect(() => {
    const key =
      budgetStorageKey(
        magasinActif?.id ??
          null,
        anneeBudget
      );

    const stored =
      window.localStorage.getItem(
        key
      );

    const parsed =
      stored
        ? Number(stored)
        : 0;

    const value =
      Number.isFinite(parsed)
        ? parsed
        : 0;

    setBudgetAnnuel(value);

    setBudgetInput(
      value > 0
        ? String(value)
        : ""
    );
  }, [
    magasinActif?.id,
    anneeBudget,
  ]);

  const charger =
    useCallback(
      async (
        silent = false
      ) => {
        if (
          authLoading ||
          !canView
        ) {
          return;
        }

        if (
          !vueTousMagasins &&
          !magasinActif
        ) {
          setDevis([]);
          setStats(
            STATS_VIDES
          );
          setLoading(false);
          setError(
            "Aucun magasin actif. Sélectionne un magasin."
          );
          return;
        }

        try {
          silent
            ? setRefreshing(true)
            : setLoading(true);

          setError(null);

          const [
            devisData,
            statsData,
          ] =
            await Promise.all([
              getDevis(
                scope,
                anneeBudget
              ),
              getDevisStats(
                scope,
                anneeBudget
              ),
            ]);

          setDevis(devisData);
          setStats(statsData);
        } catch (
          currentError
        ) {
          console.error(
            "Erreur chargement investissements :",
            currentError
          );

          setError(
            messageErreur(
              currentError
            )
          );

          setDevis([]);
          setStats(
            STATS_VIDES
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        anneeBudget,
        authLoading,
        canView,
        magasinActif,
        scope,
        vueTousMagasins,
      ]
    );

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccess(null);
        },
        3000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [success]);

  const budgetUtilise =
    stats.montantValideHt;

  const budgetRestant =
    budgetAnnuel -
    budgetUtilise;

  const pourcentageBudget =
    budgetAnnuel > 0
      ? Math.max(
          0,
          (budgetUtilise /
            budgetAnnuel) *
            100
        )
      : 0;

  const largeurBarre =
    Math.min(
      pourcentageBudget,
      100
    );

  const devisFiltres =
    useMemo(() => {
      const terme =
        recherche
          .trim()
          .toLowerCase();

      return devis.filter(
        (item) => {
          if (
            filtreStatut !==
              "TOUS" &&
            item.statut_devis !==
              filtreStatut
          ) {
            return false;
          }

          if (!terme) {
            return true;
          }

          return [
            item.titre,
            item.prestataire ??
              "",
            item.secteur ?? "",
            item.fichier_nom,
            statutLabel(
              item.statut_devis
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(terme);
        }
      );
    }, [
      devis,
      filtreStatut,
      recherche,
    ]);

    function changerMagasin(value: string) {
  if (value === "__TOUS__") {
    changerMagasinActif(null);
    return;
  }

  changerMagasinActif(value);
}
function selectionnerDevis(
  id: string,
  checked: boolean
) {
  setDevisSelectionnes((current) => {
    if (checked) {
      return current.includes(id)
        ? current
        : [...current, id];
    }

    return current.filter(
      (currentId) =>
        currentId !== id
    );
  });
}

function selectionnerTousDevis(
  checked: boolean
) {
  if (!checked) {
    setDevisSelectionnes([]);
    return;
  }

  setDevisSelectionnes(
    devisFiltres.map(
      (item) => item.id
    )
  );
}

function imprimerDevisSelectionnes() {
  const selection =
    devisFiltres.filter(
      (item) =>
        devisSelectionnes.includes(
          item.id
        )
    );

  if (selection.length === 0) {
    setError(
      "Sélectionne au moins un devis à imprimer."
    );
    return;
  }

  setError(null);

  const lignes = selection
    .map((item) => {
      const ttc =
        montantTtc(item);

      return `
        <tr>
          <td>${item.titre}</td>
          <td>${item.prestataire ?? "—"}</td>
          <td>${item.secteur ?? "—"}</td>
          <td>${statutLabel(item.statut_devis)}</td>
          <td class="montant">${formatMontant(item.montant_ht)}</td>
          <td class="montant">${formatMontant(ttc)}</td>
          <td>${item.devis_signe ? "Oui" : "Non"}</td>
          <td>${formatDate(item.date_document ?? item.created_at)}</td>
        </tr>
      `;
    })
    .join("");

  const totalHt =
    selection.reduce(
      (total, item) =>
        total +
        Number(
          item.montant_ht ?? 0
        ),
      0
    );

  const totalTtc =
    selection.reduce(
      (total, item) =>
        total +
        montantTtc(item),
      0
    );

  const magasin =
    vueTousMagasins
      ? "Tous les magasins"
      : magasinActif?.nom ??
        "Magasin";

  const fenetre =
    window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

  if (!fenetre) {
    setError(
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
          Liste des devis
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 32px;
            color: #111827;
          }

          h1 {
            margin: 0;
            font-size: 26px;
          }

          .subtitle {
            margin-top: 6px;
            color: #64748b;
          }

          .info {
            margin: 24px 0;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            background: #f1f5f9;
            text-align: left;
            padding: 10px 8px;
            border: 1px solid #cbd5e1;
          }

          td {
            padding: 9px 8px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
          }

          .montant {
            text-align: right;
            white-space: nowrap;
          }

          .totaux {
            margin-top: 24px;
            margin-left: auto;
            width: 330px;
            border: 1px solid #cbd5e1;
          }

          .total-line {
            display: flex;
            justify-content: space-between;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
          }

          .total-line:last-child {
            border-bottom: 0;
            font-weight: bold;
            font-size: 16px;
          }

          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 11px;
            color: #64748b;
          }

          @media print {
            body {
              margin: 15mm;
            }

            @page {
              size: landscape;
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>
        <h1>
          Liste des devis
        </h1>

        <p class="subtitle">
          ${magasin} — Exercice ${anneeBudget}
        </p>

        <div class="info">
          <span>
            ${selection.length} devis sélectionné(s)
          </span>

          <span>
            Impression du ${new Intl.DateTimeFormat(
              "fr-FR",
              {
                dateStyle: "long",
                timeStyle: "short",
              }
            ).format(new Date())}
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Devis</th>
              <th>Prestataire</th>
              <th>Secteur</th>
              <th>Statut</th>
              <th>HT</th>
              <th>TTC</th>
              <th>Signé</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            ${lignes}
          </tbody>
        </table>

        <div class="totaux">
          <div class="total-line">
            <span>Total HT</span>
            <strong>${formatMontant(totalHt)}</strong>
          </div>

          <div class="total-line">
            <span>Total TTC</span>
            <strong>${formatMontant(totalTtc)}</strong>
          </div>
        </div>

        <div class="footer">
          Casto Manager — Suivi des devis et investissements
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

  function enregistrerBudget() {
    const montant =
      Number(
        budgetInput
          .replace(/\s/g, "")
          .replace(",", ".")
      );

    if (
      !Number.isFinite(
        montant
      ) ||
      montant < 0
    ) {
      setError(
        "Le budget annuel est invalide."
      );
      return;
    }

    const key =
      budgetStorageKey(
        magasinActif?.id ??
          null,
        anneeBudget
      );

    window.localStorage.setItem(
      key,
      String(montant)
    );

    setBudgetAnnuel(
      montant
    );

    setSuccess(
      "Budget annuel enregistré."
    );

    setError(null);
  }

  async function changerStatut(
    item: DocumentItem,
    statut: StatutDevis
  ) {
    if (!canManage) {
      setError(
        "Tu n’as pas l’autorisation de modifier ce devis."
      );
      return;
    }

    try {
      setBusyId(item.id);
      setError(null);

      await updateDevisStatus(
        item.id,
        statut,
        item.commentaire_devis,
        scope
      );

      setSuccess(
        `Le devis « ${item.titre} » est maintenant ${statutLabel(
          statut
        ).toLowerCase()}.`
      );

      await charger(true);
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  async function changerSignature(
    item: DocumentItem
  ) {
    if (!canManage) {
      return;
    }

    if (
      item.statut_devis !==
      "VALIDE"
    ) {
      setError(
        "Un devis doit être validé avant de pouvoir être marqué comme signé."
      );
      return;
    }

    try {
      setBusyId(item.id);
      setError(null);

      await updateDevisSignature(
        item.id,
        !item.devis_signe,
        user?.id ?? null,
        scope
      );

      setSuccess(
        item.devis_signe
          ? "Le devis n’est plus marqué comme signé."
          : "Le devis est marqué comme signé."
      );

      await charger(true);
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  async function supprimerInvestissement(
    item: DocumentItem
  ) {
    if (!canManage) {
      setError(
        "Tu n’as pas l’autorisation de supprimer cet investissement."
      );
      return;
    }

    const confirmation = await dialog.delete({
      title: "Supprimer définitivement cet investissement ?",
      itemName: item.titre,
      description:
        "Le document et son fichier associé seront supprimés. Cette action est irréversible.",
    });

    if (!confirmation) {
      return;
    }

    try {
      setBusyId(item.id);
      setError(null);
      setSuccess(null);

      await deleteDocumentPermanently(
        item.id,
        scope
      );

      setDevisSelectionnes((current) =>
        current.filter((id) => id !== item.id)
      );

      setSuccess(
        `L’investissement « ${item.titre} » a été supprimé définitivement.`
      );

      await charger(true);
    } catch (currentError) {
      setError(
        messageErreur(currentError)
      );
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[520px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
        </div>
      </AppShell>
    );
  }

  if (!canView) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />

            <div>
              <h1 className="text-xl font-bold">
                Accès refusé
              </h1>

              <p className="mt-2">
                Cette page est réservée au Responsable sécurité, au Directeur de magasin et au Super Administrateur.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <TrendingUp className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Pilotage
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                Devis et investissements
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Suivi budgétaire, décisions et signature des devis.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
  

  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
  {peutChangerMagasin && (
    <div className="relative min-w-[240px]">
      <Store className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

      <select
        value={
          vueTousMagasins
            ? "__TOUS__"
            : magasinActif?.id ?? ""
        }
        onChange={(event) =>
          changerMagasin(event.target.value)
        }
        className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 font-semibold text-slate-700 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-blue-950"
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
    </div>
  )}

  <button
    type="button"
    onClick={() =>
      router.push("/investissements/nouveau")
    }
    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
  >
    Nouvel investissement
  </button>

  <button
    type="button"
    onClick={() =>
      void charger(true)
    }
    disabled={refreshing}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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

        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Budget investissements
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {formatMontant(
                    budgetAnnuel
                  )}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Exercice {anneeBudget}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[140px_180px_auto]">
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Année
                  </span>

                  <input
                    type="number"
                    value={
                      anneeBudget
                    }
                    onChange={(
                      event
                    ) =>
                      setAnneeBudget(
                        Number(
                          event.target
                            .value
                        ) ||
                          currentYear
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Budget HT
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      budgetInput
                    }
                    onChange={(
                      event
                    ) =>
                      setBudgetInput(
                        event.target
                          .value
                      )
                    }
                    placeholder="250000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <button
                  type="button"
                  onClick={
                    enregistrerBudget
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white"
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Budget consommé
                  </p>

                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {formatMontant(
                      budgetUtilise
                    )}
                  </p>
                </div>

                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {pourcentageBudget.toFixed(
                    1
                  )}
                  %
                </p>
              </div>

              <div className="h-5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${progressClass(
                    pourcentageBudget
                  )}`}
                  style={{
                    width: `${largeurBarre}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>0 %</span>
                <span>50 %</span>
                <span>75 %</span>
                <span>90 %</span>
                <span>100 %</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniMetric
                  label="Budget restant"
                  value={formatMontant(
                    budgetRestant
                  )}
                  danger={
                    budgetRestant < 0
                  }
                />

                <MiniMetric
                  label="Prévision N+1"
                  value={formatMontant(
                    stats.montantNPlus1Ht
                  )}
                />
              </div>

              {pourcentageBudget >
                100 && (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  Budget dépassé de{" "}
                  {formatMontant(
                    Math.abs(
                      budgetRestant
                    )
                  )}
                </div>
              )}
            </div>
          </article>

          <section className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Validés"
              count={
                stats.valides
              }
              amount={
                stats.montantValideHt
              }
              icon={
                <CheckCircle2 className="h-6 w-6" />
              }
            />

            <StatCard
              label="En attente"
              count={
                stats.enAttente
              }
              amount={
                stats.montantEnAttenteHt
              }
              icon={
                <Clock3 className="h-6 w-6" />
              }
            />

            <StatCard
              label="N+1"
              count={
                stats.investissementNPlus1
              }
              amount={
                stats.montantNPlus1Ht
              }
              icon={
                <TrendingUp className="h-6 w-6" />
              }
            />

            <StatCard
              label="Refusés"
              count={
                stats.rejetes
              }
              amount={
                stats.montantRejeteHt
              }
              icon={
                <XCircle className="h-6 w-6" />
              }
            />
          </section>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

              <input
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
                placeholder="Rechercher un devis..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <select
              value={
                filtreStatut
              }
              onChange={(
                event
              ) =>
                setFiltreStatut(
                  event.target
                    .value as FiltreStatut
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="TOUS">
                Tous les statuts
              </option>
              <option value="EN_ATTENTE">
                En attente
              </option>
              <option value="VALIDE">
                Validés
              </option>
              <option value="REJETE">
                Refusés
              </option>
              <option value="INVESTISSEMENT_N_PLUS_1">
                Investissement N+1
              </option>
            </select>

            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Store className="h-5 w-5" />
              {vueTousMagasins
                ? "Tous les magasins"
                : magasinActif?.nom ??
                  "Aucun magasin"}
            </div>
            <button
  type="button"
  onClick={
    imprimerDevisSelectionnes
  }
  disabled={
    devisSelectionnes.length === 0
  }
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
>
  <Printer className="h-5 w-5" />

  Imprimer

  {devisSelectionnes.length >
    0 && (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs dark:bg-slate-900/10">
      {
        devisSelectionnes.length
      }
    </span>
  )}
</button>
          </div>
        </section>

        

        <section>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
  <div>
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
      Liste des devis
    </h2>

    <p className="text-sm text-slate-500">
      {devisFiltres.length} devis affiché(s)
    </p>
  </div>

  <div className="max-w-xl rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

      <p>
        <span className="font-bold">
          Information :
        </span>{" "}
        le devis doit être au statut{" "}
        <span className="font-bold">
          Validé
        </span>{" "}
        avant de pouvoir cocher la case{" "}
        <span className="font-bold">
          Signé
        </span>.
      </p>
    </div>
  </div>
</div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : devisFiltres.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />

              <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                Aucun devis
              </h3>

              <p className="mt-2 text-slate-500">
                Aucun document marqué comme devis ne correspond aux filtres sélectionnés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <table className="w-full min-w-[1250px] text-sm">

               <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-400">
  <tr>
    <th className="w-12 px-4 py-3">
      <input
        type="checkbox"
        aria-label="Sélectionner tous les devis affichés"
        checked={
          devisFiltres.length > 0 &&
          devisFiltres.every(
            (item) =>
              devisSelectionnes.includes(
                item.id
              )
          )
        }
        onChange={(event) =>
          selectionnerTousDevis(
            event.target.checked
          )
        }
        className="h-4 w-4 rounded border-slate-300"
      />
    </th>

    <th className="px-4 py-3">
      Devis
    </th>

    <th className="px-4 py-3">
      Prestataire
    </th>

    <th className="px-4 py-3">
      Statut
    </th>

    <th className="px-4 py-3 text-right">
      HT
    </th>

    <th className="px-4 py-3 text-right">
      TTC
    </th>

    <th className="px-4 py-3">
      Signé
    </th>

    <th className="px-4 py-3">
      Date
    </th>

    <th className="px-4 py-3 text-right">
      Actions
    </th>
  </tr>
</thead>

                <tbody>
                  {devisFiltres.map(
                    (item) => {
                      const isBusy =
                        busyId ===
                        item.id;

                      return (
  <tr
    key={item.id}
    className="border-t border-slate-200 dark:border-slate-800"
  >
                          <td className="w-12 px-4 py-4">
  <input
    type="checkbox"
    aria-label={`Sélectionner ${item.titre}`}
    checked={
      devisSelectionnes.includes(
        item.id
      )
    }
    onChange={(event) =>
      selectionnerDevis(
        item.id,
        event.target.checked
      )
    }
    className="h-4 w-4 rounded border-slate-300"
  />
</td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/documents/${item.id}`
                                )
                              }
                              className="text-left"
                            >
                              <p className="font-bold text-slate-900 hover:underline dark:text-white">
                                {
                                  item.titre
                                }
                              </p>

                              <p className="mt-1 max-w-64 truncate text-xs text-slate-500">
                                {
                                  item.fichier_nom
                                }
                              </p>
                            </button>
                          </td>

                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {item.prestataire ??
                              "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statutClasses(
                                item.statut_devis
                              )}`}
                            >
                              {statutLabel(
                                item.statut_devis
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                            {formatMontant(
                              item.montant_ht
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">
                            {formatMontant(
                              montantTtc(
                                item
                              )
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={
                                  item.devis_signe
                                }
                                disabled={
                                  isBusy ||
                                  item.statut_devis !==
                                    "VALIDE"
                                }
                                onChange={() =>
                                  void changerSignature(
                                    item
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />

                              <span
                                className={
                                  item.devis_signe
                                    ? "font-semibold text-emerald-700"
                                    : "text-slate-500"
                                }
                              >
                                {item.devis_signe
                                  ? "Signé"
                                  : "Non signé"}
                              </span>
                            </label>

                            {item.devis_signe &&
                              item.date_signature && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(
                                    item.date_signature
                                  )}
                                </p>
                              )}
                          </td>

                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {formatDate(
                              item.date_document ??
                                item.created_at
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/documents/${item.id}`
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                              >
                                Ouvrir
                              </button>

                              <select
                                value={
                                  item.statut_devis ??
                                  "EN_ATTENTE"
                                }
                                disabled={
                                  isBusy
                                }
                                onChange={(
                                  event
                                ) =>
                                  void changerStatut(
                                    item,
                                    event
                                      .target
                                      .value as StatutDevis
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                <option value="EN_ATTENTE">
                                  En attente
                                </option>
                                <option value="VALIDE">
                                  Valider
                                </option>
                                <option value="REJETE">
                                  Refuser
                                </option>
                                <option value="INVESTISSEMENT_N_PLUS_1">
                                  Passer en N+1
                                </option>
                              </select>

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void supprimerInvestissement(
                                      item
                                    )
                                  }
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              )}

                              {isBusy && (
                                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function StatCard({
  label,
  count,
  amount,
  icon,
}: {
  label: string;
  count: number;
  amount: number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {formatMontant(
              amount
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {count} devis
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {icon}
        </div>
      </div>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          danger
            ? "text-red-600"
            : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}