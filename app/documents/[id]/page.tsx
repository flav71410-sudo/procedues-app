"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Euro,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  RefreshCw,
  Save,
  Star,
  TrendingUp,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";

import {
  getDocument,
  toggleDocumentFavorite,
  updateDevisSignature,
  updateDevisStatus,
  updateDocument,
  type DocumentScope,
} from "@/services/documentsService";

import type {
  DocumentItem,
  StatutDevis,
} from "@/types/documents";

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
      (
        error as {
          message: unknown;
        }
      ).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function formatDate(
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
      dateStyle: "long",
    }
  ).format(date);
}

function formatDateTime(
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
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatTaille(
  value: number | null
): string {
  if (
    !value ||
    value <= 0
  ) {
    return "—";
  }

  if (value < 1024) {
    return `${value} o`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
}

function formatMontant(
  value:
    | number
    | null
    | undefined
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

function montantTtc(
  document: DocumentItem
): number {
  if (
    document.montant_ttc !==
      null &&
    document.montant_ttc !==
      undefined
  ) {
    return Number(
      document.montant_ttc
    );
  }

  const ht =
    Number(
      document.montant_ht ??
        0
    );

  const tva =
    Number(
      document.taux_tva ??
        0
    );

  return (
    ht *
    (1 + tva / 100)
  );
}

function statutLabel(
  statut:
    | StatutDevis
    | null
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
  statut:
    | StatutDevis
    | null
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

function extension(
  document: DocumentItem
): string {
  return (
    document.extension ||
    document.fichier_nom
      .split(".")
      .pop() ||
    ""
  )
    .replace(".", "")
    .trim()
    .toLowerCase();
}

function typeApercu(
  document: DocumentItem
) {
  const ext =
    extension(document);

  if (ext === "pdf") {
    return "pdf" as const;
  }

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "svg",
    ].includes(ext)
  ) {
    return "image" as const;
  }

  if (
    [
      "doc",
      "docx",
      "xls",
      "xlsx",
      "csv",
      "ppt",
      "pptx",
    ].includes(ext)
  ) {
    return "office" as const;
  }

  return "autre" as const;
}

function iconeDocument(
  document: DocumentItem,
  className = "h-6 w-6"
) {
  const ext =
    extension(document);

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "svg",
    ].includes(ext)
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
    ].includes(ext)
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
      "ppt",
      "pptx",
    ].includes(ext)
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
   PAGE
========================================================= */

export default function DocumentDetailPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const documentId =
    params?.id;

  const {
    user,
    can,
    magasinActif,
    vueTousMagasins,
    loading: authLoading,
  } = useAuth();

  const canEdit =
    can("documents.edit");

  const [
    document,
    setDocument,
  ] =
    useState<DocumentItem | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    favoriteBusy,
    setFavoriteBusy,
  ] =
    useState(false);

  const [
    devisBusy,
    setDevisBusy,
  ] =
    useState(false);

  const [
    commentaireBusy,
    setCommentaireBusy,
  ] =
    useState(false);

  const [
    commentaire,
    setCommentaire,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  const [
    viewerLoaded,
    setViewerLoaded,
  ] =
    useState(false);

  const [
    imageFullscreen,
    setImageFullscreen,
  ] =
    useState(false);

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

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  const chargerDocument =
    useCallback(
      async (
        silent = false
      ) => {
        if (
          authLoading ||
          !documentId
        ) {
          return;
        }

        if (
          !vueTousMagasins &&
          !magasinActif
        ) {
          setDocument(null);

          setLoading(false);

          setError(
            "Aucun magasin actif. Sélectionne un magasin."
          );

          return;
        }

        try {
          silent
            ? setRefreshing(
                true
              )
            : setLoading(
                true
              );

          setError(null);
          setViewerLoaded(false);

          const data =
            await getDocument(
              documentId,
              scope
            );

          setDocument(data);

          setCommentaire(
            data.commentaire_devis ??
              ""
          );
        } catch (
          currentError
        ) {
          console.error(
            "Erreur chargement document :",
            currentError
          );

          setDocument(null);

          setError(
            messageErreur(
              currentError
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        authLoading,
        documentId,
        magasinActif,
        scope,
        vueTousMagasins,
      ]
    );

  useEffect(() => {
    void chargerDocument();
  }, [chargerDocument]);

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

  useEffect(() => {
    if (!imageFullscreen) {
      window.document.body.style.overflow =
        "";

      return;
    }

    window.document.body.style.overflow =
      "hidden";

    return () => {
      window.document.body.style.overflow =
        "";
    };
  }, [imageFullscreen]);

  /* =======================================================
     FAVORI
  ======================================================= */

  async function changerFavori() {
    if (
      !document ||
      !canEdit
    ) {
      return;
    }

    try {
      setFavoriteBusy(true);
      setError(null);

      await toggleDocumentFavorite(
        document.id,
        !document.favori,
        scope
      );

      setDocument({
        ...document,
        favori:
          !document.favori,
      });
    } catch (
      currentError
    ) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setFavoriteBusy(false);
    }
  }

  /* =======================================================
     STATUT DEVIS
  ======================================================= */

  async function changerStatut(
    statut: StatutDevis
  ) {
    if (
      !document ||
      !canEdit ||
      !document.est_devis
    ) {
      return;
    }

    try {
      setDevisBusy(true);
      setError(null);
      setSuccess(null);

      const updated =
        await updateDevisStatus(
          document.id,
          statut,
          commentaire.trim() ||
            null,
          scope
        );

      setDocument(
        updated
      );

      setCommentaire(
        updated.commentaire_devis ??
          ""
      );

      setSuccess(
        `Le devis est maintenant ${statutLabel(
          statut
        ).toLowerCase()}.`
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
      setDevisBusy(false);
    }
  }

  /* =======================================================
     SIGNATURE
  ======================================================= */

  async function changerSignature() {
    if (
      !document ||
      !canEdit ||
      !document.est_devis
    ) {
      return;
    }

    if (
      document.statut_devis !==
      "VALIDE"
    ) {
      setError(
        "Le devis doit être validé avant de pouvoir être marqué comme signé."
      );

      return;
    }

    try {
      setDevisBusy(true);
      setError(null);
      setSuccess(null);

      const signe =
        !document.devis_signe;

      const updated =
        await updateDevisSignature(
          document.id,
          signe,
          user?.id ?? null,
          scope
        );

      setDocument(
        updated
      );

      setSuccess(
        signe
          ? "Le devis est maintenant marqué comme signé."
          : "La signature du devis a été retirée."
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
      setDevisBusy(false);
    }
  }

  /* =======================================================
     COMMENTAIRE
  ======================================================= */

  async function enregistrerCommentaire() {
    if (
      !document ||
      !canEdit ||
      !document.est_devis
    ) {
      return;
    }

    try {
      setCommentaireBusy(
        true
      );

      setError(null);
      setSuccess(null);

      const updated =
        await updateDocument(
          document.id,
          {
            commentaire_devis:
              commentaire.trim() ||
              null,
          },
          scope
        );

      setDocument(
        updated
      );

      setCommentaire(
        updated.commentaire_devis ??
          ""
      );

      setSuccess(
        "Commentaire enregistré."
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
      setCommentaireBusy(
        false
      );
    }
  }

  /* =======================================================
     DOCUMENT
  ======================================================= */

  function ouvrirNouvelOnglet() {
    if (
      !document?.fichier_url
    ) {
      return;
    }

    window.open(
      document.fichier_url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function telecharger() {
    if (
      !document?.fichier_url
    ) {
      return;
    }

    const link =
      window.document.createElement(
        "a"
      );

    link.href =
      document.fichier_url;

    link.download =
      document.fichier_nom;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    window.document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  }

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  if (
    loading ||
    authLoading
  ) {
    return (
      <AppShell>
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />

            Chargement du document...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!document) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl space-y-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/documents"
              )
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux documents
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />

              <div>
                <h1 className="text-xl font-bold">
                  Document introuvable
                </h1>

                <p className="mt-2 text-sm">
                  {error ??
                    "Impossible de charger ce document."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const previewType =
    typeApercu(
      document
    );

  const retour =
    document.est_devis
      ? "/investissements"
      : "/documents";

  /* =======================================================
     AFFICHAGE
  ======================================================= */

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() =>
                router.push(
                  retour
                )
              }
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />

              {document.est_devis
                ? "Retour aux investissements"
                : "Retour aux documents"}
            </button>

            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                {iconeDocument(
                  document,
                  "h-8 w-8"
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  {document.est_devis
                    ? "Devis / investissement"
                    : "Document"}
                </p>

                <h1 className="mt-1 break-words text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  {document.titre}
                </h1>

                <p className="mt-2 break-all text-sm text-slate-500">
                  {
                    document.fichier_nom
                  }
                </p>

                {document.est_devis && (
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statutClasses(
                      document.statut_devis
                    )}`}
                  >
                    {statutLabel(
                      document.statut_devis
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  void changerFavori()
                }
                disabled={
                  favoriteBusy
                }
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-700 disabled:opacity-60"
              >
                {favoriteBusy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Star
                    className={`h-5 w-5 ${
                      document.favori
                        ? "fill-current"
                        : ""
                    }`}
                  />
                )}

                {document.favori
                  ? "Retirer des favoris"
                  : "Ajouter aux favoris"}
              </button>
            )}

            <button
              type="button"
              onClick={
                telecharger
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
            >
              <Download className="h-5 w-5" />
              Télécharger
            </button>

            <button
              type="button"
              onClick={
                ouvrirNouvelOnglet
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ExternalLink className="h-5 w-5" />
              Nouvel onglet
            </button>

            <button
              type="button"
              onClick={() =>
                void chargerDocument(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            {success}
          </div>
        )}

        {/* ===============================================
            PANNEAU DEVIS
        =============================================== */}

        {document.est_devis && (
          <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-900 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <TrendingUp className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Gestion du devis
                </h2>

                <p className="text-sm text-slate-500">
                  Validation, signature et suivi financier.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <DevisMetric
                label="Montant HT"
                value={formatMontant(
                  document.montant_ht
                )}
              />

              <DevisMetric
                label={`TVA ${Number(
                  document.taux_tva ??
                    0
                )} %`}
                value={formatMontant(
                  Number(
                    document.montant_ht ??
                      0
                  ) *
                    (Number(
                      document.taux_tva ??
                        0
                    ) /
                      100)
                )}
              />

              <DevisMetric
                label="Montant TTC"
                value={formatMontant(
                  montantTtc(
                    document
                  )
                )}
                important
              />

              <DevisMetric
                label="Année budgétaire"
                value={
                  document.annee_budget
                    ? String(
                        document.annee_budget
                      )
                    : "—"
                }
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* STATUT */}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Statut du devis
                  </span>

                  <select
                    value={
                      document.statut_devis ??
                      "EN_ATTENTE"
                    }
                    disabled={
                      !canEdit ||
                      devisBusy
                    }
                    onChange={(
                      event
                    ) =>
                      void changerStatut(
                        event.target
                          .value as StatutDevis
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="EN_ATTENTE">
                      En attente
                    </option>

                    <option value="VALIDE">
                      Validé
                    </option>

                    <option value="REJETE">
                      Refusé
                    </option>

                    <option value="INVESTISSEMENT_N_PLUS_1">
                      Investissement N+1
                    </option>
                  </select>
                </label>
              </div>

              {/* SIGNATURE */}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Signature du devis
                </p>

                <label
                  className={`flex items-center gap-4 rounded-xl border p-4 ${
                    document.statut_devis ===
                    "VALIDE"
                      ? "cursor-pointer border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      document.devis_signe
                    }
                    disabled={
                      !canEdit ||
                      devisBusy ||
                      document.statut_devis !==
                        "VALIDE"
                    }
                    onChange={() =>
                      void changerSignature()
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {document.devis_signe
                        ? "Devis signé"
                        : "Devis non signé"}
                    </p>

                    {document.statut_devis !==
                    "VALIDE" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Le devis doit d'abord être validé.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        Coche la case lorsque le devis est signé.
                      </p>
                    )}
                  </div>
                </label>

                {document.devis_signe && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
                    <InfoLine
                      label="Date de signature"
                      value={formatDateTime(
                        document.date_signature
                      )}
                    />

                    <InfoLine
                      label="Signé par"
                      value={
                        document.signe_par ??
                        "—"
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* COMMENTAIRE */}

            <div className="mt-6">
              <label>
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Commentaire du devis
                </span>

                <textarea
                  value={
                    commentaire
                  }
                  onChange={(
                    event
                  ) =>
                    setCommentaire(
                      event.target.value
                    )
                  }
                  disabled={
                    !canEdit
                  }
                  rows={4}
                  placeholder="Décision, observations, motif du refus, conditions..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              {canEdit && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void enregistrerCommentaire()
                    }
                    disabled={
                      commentaireBusy
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                  >
                    {commentaireBusy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}

                    Enregistrer le commentaire
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===============================================
            DOCUMENT + APERÇU
        =============================================== */}

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Informations
              </h2>

              <div className="mt-5 space-y-4">
                <InfoItem
                  label="Catégorie"
                  value={
                    document.categorie
                  }
                />

                <InfoItem
                  label="Dossier"
                  value={
                    document.dossier ||
                    "Sans dossier"
                  }
                  icon={
                    <Folder className="h-4 w-4" />
                  }
                />

                <InfoItem
                  label="Sous-dossier"
                  value={
                    document.sous_dossier ||
                    "—"
                  }
                />

                <InfoItem
                  label="Auteur"
                  value={
                    document.auteur ||
                    "—"
                  }
                />

                <InfoItem
                  label="Prestataire"
                  value={
                    document.prestataire ||
                    "—"
                  }
                />

                <InfoItem
                  label="Secteur"
                  value={
                    document.secteur ||
                    "—"
                  }
                />

                <InfoItem
                  label="Date du document"
                  value={formatDate(
                    document.date_document
                  )}
                />

                <InfoItem
                  label="Version"
                  value={`v${
                    document.version ??
                    1
                  }`}
                />

                <InfoItem
                  label="Taille"
                  value={formatTaille(
                    document.taille
                  )}
                />

                <InfoItem
                  label="Extension"
                  value={
                    extension(
                      document
                    ).toUpperCase() ||
                    "—"
                  }
                />

                <InfoItem
                  label="Ajouté le"
                  value={formatDateTime(
                    document.created_at
                  )}
                />

                <InfoItem
                  label="Dernière modification"
                  value={formatDateTime(
                    document.date_modification
                  )}
                />
              </div>
            </section>

            {document.tags?.length >
              0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tags
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {document.tags.map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

            {document.description && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Description
                </h2>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {
                    document.description
                  }
                </p>
              </section>
            )}
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Aperçu du document
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {previewType ===
                  "pdf"
                    ? "Lecteur PDF intégré"
                    : previewType ===
                        "image"
                      ? "Aperçu de l’image"
                      : "Aperçu non disponible pour ce format"}
                </p>
              </div>

              {previewType ===
                "image" && (
                <button
                  type="button"
                  onClick={() =>
                    setImageFullscreen(
                      true
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <Maximize2 className="h-4 w-4" />
                  Plein écran
                </button>
              )}
            </div>

            <div className="relative min-h-[680px] bg-slate-100 dark:bg-slate-950">
              {!viewerLoaded &&
                (previewType ===
                  "pdf" ||
                  previewType ===
                    "image") && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Chargement de l’aperçu...
                    </div>
                  </div>
                )}

              {previewType ===
                "pdf" && (
                <iframe
                  src={`${document.fichier_url}#toolbar=1&navpanes=1&scrollbar=1`}
                  title={`Aperçu PDF de ${document.titre}`}
                  className="h-[78vh] min-h-[680px] w-full border-0 bg-white"
                  onLoad={() =>
                    setViewerLoaded(
                      true
                    )
                  }
                />
              )}

              {previewType ===
                "image" && (
                <div className="flex min-h-[680px] items-center justify-center p-5">
                  <img
                    src={
                      document.fichier_url
                    }
                    alt={
                      document.titre
                    }
                    onLoad={() =>
                      setViewerLoaded(
                        true
                      )
                    }
                    className="max-h-[78vh] max-w-full rounded-xl object-contain"
                  />
                </div>
              )}

              {(previewType ===
                "office" ||
                previewType ===
                  "autre") && (
                <FallbackPreview
                  document={
                    document
                  }
                  onOpen={
                    ouvrirNouvelOnglet
                  }
                  onDownload={
                    telecharger
                  }
                />
              )}
            </div>
          </section>
        </section>
      </div>

      {imageFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() =>
              setImageFullscreen(
                false
              )
            }
            className="absolute right-4 top-4 rounded-xl bg-white/10 px-4 py-2 font-semibold text-white"
          >
            Fermer
          </button>

          <img
            src={
              document.fichier_url
            }
            alt={
              document.titre
            }
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </AppShell>
  );
}

/* =========================================================
   COMPOSANTS
========================================================= */

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800">
      {icon && (
        <div className="mt-0.5 text-slate-400">
          {icon}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function DevisMetric({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 font-black ${
          important
            ? "text-2xl text-blue-700 dark:text-blue-300"
            : "text-xl text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FallbackPreview({
  document,
  onOpen,
  onDownload,
}: {
  document: DocumentItem;
  onOpen: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex min-h-[680px] items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm dark:bg-slate-900">
          {iconeDocument(
            document,
            "h-10 w-10"
          )}
        </div>

        <h3 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
          Aperçu indisponible
        </h3>

        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Ce format doit être ouvert dans un nouvel onglet ou téléchargé.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ExternalLink className="h-5 w-5" />
            Ouvrir
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            <Download className="h-5 w-5" />
            Télécharger
          </button>
        </div>
      </div>
    </div>
  );
}