"use client";

import {
  ChangeEvent,
  FormEvent,
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
  Pencil,
  RefreshCw,
  Save,
  Star,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { supabase } from "@/lib/supabase";

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


function nettoyerNomFichier(
  nom: string
): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

type DocumentPiece = {
  id: string;
  document_id: string;
  magasin_id: string | null;
  type_piece: "COMPLEMENT" | "LEVEE_RESERVE";
  fichier_path: string;
  fichier_nom: string;
  commentaire: string | null;
  created_at: string;
};

type EditionDocumentForm = {
  titre: string;
  description: string;
  categorie: string;
  dossier: string;
  sous_dossier: string;
  secteur: string;
  prestataire: string;
  date_document: string;
  tags: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function DocumentDetailPage() {
  const router =
    useRouter();

  const dialog =
    useDialog();

  const params =
    useParams<{
      id: string;
    }>();

  const documentId =
    params?.id;

  const {
    user,
    profil,
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
    signedUrl,
    setSignedUrl,
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

  const [
    editionOuverte,
    setEditionOuverte,
  ] =
    useState(false);

  const [
    editionBusy,
    setEditionBusy,
  ] =
    useState(false);

  const [
    fichierRemplacement,
    setFichierRemplacement,
  ] =
    useState<File | null>(
      null
    );

  const [pieces, setPieces] = useState<DocumentPiece[]>([]);
  const [pieceFile, setPieceFile] = useState<File | null>(null);
  const [pieceType, setPieceType] = useState<"COMPLEMENT" | "LEVEE_RESERVE">("COMPLEMENT");
  const [pieceCommentaire, setPieceCommentaire] = useState("");
  const [pieceBusy, setPieceBusy] = useState(false);
  const [reserveBusy, setReserveBusy] = useState(false);
  const [reserveDescription, setReserveDescription] = useState("");

  const [
    formEdition,
    setFormEdition,
  ] =
    useState<EditionDocumentForm>({
      titre: "",
      description: "",
      categorie: "",
      dossier: "",
      sous_dossier: "",
      secteur: "",
      prestataire: "",
      date_document: "",
      tags: "",
    });

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
          !magasinActif?.id
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
          setSignedUrl(null);

          const data =
            await getDocument(
              documentId,
              scope
            );

          /*
 * Compatibilité documents anciens / nouveaux.
 *
 * Nouveau système :
 * fichier_path contient directement
 * le chemin Storage.
 *
 * Ancien système :
 * fichier_url contient une URL Supabase complète.
 */

let fichierPath =
  (
    data as DocumentItem & {
      fichier_path?: string | null;
    }
  ).fichier_path?.trim() || "";

const fichierUrl =
  data.fichier_url?.trim() || "";


/*
 * Si fichier_path n'existe pas,
 * on essaie de récupérer le chemin
 * depuis l'ancienne URL Supabase.
 */
if (
  !fichierPath &&
  fichierUrl
) {
  const marqueurPublic =
    "/storage/v1/object/public/documents/";

  const marqueurSigned =
    "/storage/v1/object/sign/documents/";

  if (
    fichierUrl.includes(
      marqueurPublic
    )
  ) {
    fichierPath =
      decodeURIComponent(
        fichierUrl
          .split(
            marqueurPublic
          )[1]
          ?.split("?")[0] ||
          ""
      );
  } else if (
    fichierUrl.includes(
      marqueurSigned
    )
  ) {
    fichierPath =
      decodeURIComponent(
        fichierUrl
          .split(
            marqueurSigned
          )[1]
          ?.split("?")[0] ||
          ""
      );
  } else if (
    !fichierUrl.startsWith(
      "http://"
    ) &&
    !fichierUrl.startsWith(
      "https://"
    )
  ) {
    /*
     * Certains documents stockent
     * déjà directement le chemin
     * dans fichier_url.
     */
    fichierPath =
      fichierUrl;
  }
}


/*
 * Aucun chemin exploitable trouvé.
 */
if (!fichierPath) {
  throw new Error(
    "Le fichier associé à ce document est introuvable."
  );
}


/*
 * Génération d'une URL temporaire sécurisée.
 */
const {
  data: signedData,
  error: signedError,
} =
  await supabase.storage
    .from("documents")
    .createSignedUrl(
      fichierPath,
      3600
    );

if (
  signedError ||
  !signedData?.signedUrl
) {
  throw new Error(
    signedError?.message ||
      "Impossible de générer l’accès temporaire au fichier."
  );
}

setSignedUrl(
  signedData.signedUrl
);

          setDocument(data);

          const reserveData =
            data as DocumentItem & {
              reserve_description?:
                string | null;
            };

          setReserveDescription(
            reserveData.reserve_description ??
              ""
          );

          setCommentaire(
            data.commentaire_devis ??
              ""
          );

          /*
           * IMPORTANT :
           * la fiche principale est maintenant prête.
           * On ne bloque plus l'affichage sur le
           * chargement des pièces complémentaires.
           */
          if (!silent) {
            setLoading(false);
          }

          /*
           * Chargement secondaire des justificatifs.
           * Une erreur ici ne doit jamais empêcher
           * l'ouverture du document.
           */
          void (async () => {
            try {
              const {
                data: piecesData,
                error: piecesError,
              } =
                await supabase
                  .from(
                    "document_pieces"
                  )
                  .select(
                    "id, document_id, magasin_id, type_piece, fichier_path, fichier_nom, commentaire, created_at"
                  )
                  .eq(
                    "document_id",
                    data.id
                  )
                  .order(
                    "created_at",
                    {
                      ascending: false,
                    }
                  );

              if (piecesError) {
                console.error(
                  "Erreur chargement pièces complémentaires :",
                  piecesError
                );

                setPieces([]);
                return;
              }

              setPieces(
                (piecesData ?? []) as DocumentPiece[]
              );
            } catch (
              piecesCurrentError
            ) {
              console.error(
                "Erreur chargement pièces complémentaires :",
                piecesCurrentError
              );

              setPieces([]);
            }
          })();
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
        magasinActif?.id,
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


  function ouvrirEdition() {
    if (
      !document ||
      !canEdit
    ) {
      return;
    }

    setFormEdition({
      titre: document.titre ?? "",
      description:
        document.description ?? "",
      categorie:
        document.categorie ?? "",
      dossier:
        document.dossier ?? "",
      sous_dossier:
        document.sous_dossier ?? "",
      secteur:
        document.secteur ?? "",
      prestataire:
        document.prestataire ?? "",
      date_document:
        document.date_document
          ? document.date_document.slice(
              0,
              10
            )
          : "",
      tags:
        (document.tags ?? []).join(
          ", "
        ),
    });

    setFichierRemplacement(null);
    setError(null);
    setSuccess(null);
    setEditionOuverte(true);
  }

  function modifierChampEdition<
    K extends keyof EditionDocumentForm
  >(
    champ: K,
    valeur: EditionDocumentForm[K]
  ) {
    setFormEdition(
      (current) => ({
        ...current,
        [champ]: valeur,
      })
    );
  }

  function selectionnerFichierRemplacement(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0] ??
      null;

    setFichierRemplacement(
      selected
    );
  }

  async function enregistrerModification(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !document ||
      !canEdit
    ) {
      return;
    }

    if (
      !formEdition.titre.trim()
    ) {
      setError(
        "Le titre est obligatoire."
      );
      return;
    }

    if (
      !formEdition.categorie.trim()
    ) {
      setError(
        "La catégorie est obligatoire."
      );
      return;
    }

    let nouveauPath:
      | string
      | null = null;

    try {
      setEditionBusy(true);
      setError(null);
      setSuccess(null);

      const payload: Record<
        string,
        unknown
      > = {
        titre:
          formEdition.titre.trim(),
        description:
          formEdition.description.trim() ||
          null,
        categorie:
          formEdition.categorie.trim(),
        dossier:
          formEdition.dossier.trim() ||
          null,
        sous_dossier:
          formEdition.sous_dossier.trim() ||
          null,
        secteur:
          formEdition.secteur.trim() ||
          null,

        modifie_par:
          [
            profil?.prenom,
            profil?.nom,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          profil?.email ||
          user?.email ||
          "Utilisateur",

        date_modification:
          new Date().toISOString(),
        prestataire:
          formEdition.prestataire.trim() ||
          null,
        date_document:
          formEdition.date_document ||
          null,
        tags:
          formEdition.tags
            .split(/[;,]+/)
            .map((tag) =>
              tag.trim()
            )
            .filter(Boolean),
      };

      if (
        fichierRemplacement
      ) {
        if (!document.magasin_id) {
          throw new Error(
            "Le magasin du document est introuvable."
          );
        }

        const nomNettoye =
          nettoyerNomFichier(
            fichierRemplacement.name
          );

        nouveauPath = [
          document.magasin_id,
          document.dossier ||
            "sans-dossier",
          document.sous_dossier ||
            "racine",
          String(
            new Date().getFullYear()
          ),
          `${crypto.randomUUID()}-${nomNettoye}`,
        ].join("/");

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("documents")
            .upload(
              nouveauPath,
              fichierRemplacement,
              {
                cacheControl:
                  "3600",
                upsert: false,
              }
            );

        if (uploadError) {
          throw new Error(
            `Erreur d’envoi du nouveau fichier : ${uploadError.message}`
          );
        }

        payload.fichier_path =
          nouveauPath;

        // On garde fichier_url pour compatibilité,
        // mais il contient maintenant le chemin privé.
        payload.fichier_url =
          nouveauPath;

        payload.fichier_nom =
          fichierRemplacement.name;

        payload.extension =
          fichierRemplacement.name
            .split(".")
            .pop()
            ?.toLowerCase() ??
          null;

        payload.taille =
          fichierRemplacement.size;
      }

      const updated =
        await updateDocument(
          document.id,
          payload as Parameters<
            typeof updateDocument
          >[1],
          scope
        );

      if (
        fichierRemplacement
      ) {
        const ancienPath =
          (
            document as DocumentItem & {
              fichier_path?: string | null;
            }
          ).fichier_path;

        if (
          ancienPath &&
          ancienPath !== nouveauPath
        ) {
          await supabase.storage
            .from("documents")
            .remove([
              ancienPath,
            ]);
        }
      }

      setDocument(updated);
      setEditionOuverte(false);
      setFichierRemplacement(
        null
      );
      setSuccess(
        `Document modifié par ${
          [
            profil?.prenom,
            profil?.nom,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          profil?.email ||
          user?.email ||
          "Utilisateur"
        }.`
      );

      await chargerDocument(
        true
      );
    } catch (
      currentError
    ) {
      if (nouveauPath) {
        try {
          await supabase.storage
            .from("documents")
            .remove([
              nouveauPath,
            ]);
        } catch {
          // Rien à faire.
        }
      }

      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setEditionBusy(false);
    }
  }

  /* =======================================================
     RÉSERVES + PIÈCES COMPLÉMENTAIRES
  ======================================================= */

  async function enregistrerReserve(presente: boolean) {
    if (!document || !canEdit) return;

    try {
      setReserveBusy(true);
      setError(null);
      setSuccess(null);

      const payload = presente
        ? {
            reserve_presente: true,
            reserve_description: reserveDescription.trim() || null,
            reserve_levee: false,
            reserve_levee_at: null,
          }
        : {
            reserve_presente: false,
            reserve_description: null,
            reserve_levee: false,
            reserve_levee_at: null,
          };

      const updated = await updateDocument(
        document.id,
        payload as Parameters<typeof updateDocument>[1],
        scope
      );

      setDocument(updated);
      if (!presente) setReserveDescription("");
      setSuccess(presente ? "Réserve enregistrée." : "Réserve retirée.");
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setReserveBusy(false);
    }
  }

  async function enregistrerDescriptionReserve() {
    if (!document || !canEdit) return;

    try {
      setReserveBusy(true);
      setError(null);
      const updated = await updateDocument(
        document.id,
        { reserve_description: reserveDescription.trim() || null } as Parameters<typeof updateDocument>[1],
        scope
      );
      setDocument(updated);
      setSuccess("Description de la réserve enregistrée.");
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setReserveBusy(false);
    }
  }

  async function definirReserveLevee(
    checked: boolean
  ) {
    if (!document || !canEdit) {
      return;
    }

    const justificatifPresent =
      pieces.some(
        (piece) =>
          piece.type_piece ===
          "LEVEE_RESERVE"
      );

    if (
      checked &&
      !justificatifPresent
    ) {
      setError(
        "Ajoute d’abord un justificatif de type « Levée de réserve »."
      );
      return;
    }

    try {
      setReserveBusy(true);
      setError(null);
      setSuccess(null);

      const updated =
        await updateDocument(
          document.id,
          {
            reserve_presente:
              true,
            reserve_levee:
              checked,
            reserve_levee_at:
              checked
                ? new Date().toISOString()
                : null,
          } as Parameters<
            typeof updateDocument
          >[1],
          scope
        );

      setDocument(updated);

      setSuccess(
        checked
          ? "Réserve levée avec justificatif."
          : "Réserve repassée en non levée."
      );
    } catch (currentError) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setReserveBusy(false);
    }
  }

  async function ajouterPiece() {
    if (!document || !canEdit || !pieceFile) {
      setError("Sélectionne un fichier à ajouter.");
      return;
    }

    if (!document.magasin_id) {
      setError("Le magasin du document est introuvable.");
      return;
    }

    let uploadedPath: string | null = null;

    try {
      setPieceBusy(true);
      setError(null);
      setSuccess(null);

      const nomNettoye = nettoyerNomFichier(pieceFile.name);
      uploadedPath = [
        document.magasin_id,
        "pieces",
        document.id,
        `${crypto.randomUUID()}-${nomNettoye}`,
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(uploadedPath, pieceFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(`Erreur d’envoi : ${uploadError.message}`);

      const { data: inserted, error: insertError } = await supabase
        .from("document_pieces")
        .insert({
          document_id: document.id,
          magasin_id: document.magasin_id,
          type_piece: pieceType,
          fichier_path: uploadedPath,
          fichier_nom: pieceFile.name,
          commentaire: pieceCommentaire.trim() || null,
          created_by: user?.id ?? null,
        })
        .select("id, document_id, magasin_id, type_piece, fichier_path, fichier_nom, commentaire, created_at")
        .single();

      if (insertError) throw new Error(`Impossible d'enregistrer la pièce : ${insertError.message}`);

      if (pieceType === "LEVEE_RESERVE") {
        const updated = await updateDocument(
          document.id,
          {
            reserve_presente: true,
            reserve_levee: true,
            reserve_levee_at: new Date().toISOString(),
          } as Parameters<typeof updateDocument>[1],
          scope
        );
        setDocument(updated);
      }

      setPieces((current) => [inserted as DocumentPiece, ...current]);
      setPieceFile(null);
      setPieceCommentaire("");
      setPieceType("COMPLEMENT");
      setSuccess(pieceType === "LEVEE_RESERVE" ? "Pièce de levée ajoutée et réserve marquée comme levée." : "Pièce complémentaire ajoutée.");
    } catch (currentError) {
      if (uploadedPath) {
        await supabase.storage.from("documents").remove([uploadedPath]);
      }
      setError(messageErreur(currentError));
    } finally {
      setPieceBusy(false);
    }
  }

  async function telechargerPiece(piece: DocumentPiece) {
  try {
    setError(null);

    const { data, error: signedError } =
      await supabase.storage
        .from("documents")
        .createSignedUrl(
          piece.fichier_path,
          120
        );

    if (
      signedError ||
      !data?.signedUrl
    ) {
      throw new Error(
        signedError?.message ||
          "Impossible d'accéder au fichier."
      );
    }

    const extensionPiece =
      piece.fichier_nom
        .split(".")
        .pop()
        ?.toLowerCase() ?? "";

    const prefixe =
      piece.type_piece === "LEVEE_RESERVE"
        ? "Levee-reserve"
        : "Complement";

    const titreDocument =
      document?.titre
        ? nettoyerNomFichier(
            document.titre
          )
        : "Document";

    const nomPiece =
      nettoyerNomFichier(
        piece.fichier_nom
          .replace(
            /\.[^/.]+$/,
            ""
          )
      );

    const nomTelechargement =
      `${prefixe}_${titreDocument}_${nomPiece}${
        extensionPiece
          ? `.${extensionPiece}`
          : ""
      }`;

    const link =
      window.document.createElement(
        "a"
      );

    link.href =
      data.signedUrl;

    link.download =
      nomTelechargement;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    window.document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  } catch (
    currentError
  ) {
    setError(
      messageErreur(
        currentError
      )
    );
  }
}
  async function supprimerPiece(
    piece: DocumentPiece
  ) {
    if (!canEdit) {
      return;
    }

    const confirmation =
      await dialog.delete({
        title:
          "Supprimer cette pièce ?",

        itemName:
          piece.fichier_nom,

        description:
          "La pièce jointe sera définitivement supprimée du document et du stockage. Cette action est irréversible.",
      });

    if (!confirmation) {
      return;
    }

    try {
      setPieceBusy(true);
      setError(null);
      setSuccess(null);

      const {
        error: dbError,
      } =
        await supabase
          .from("document_pieces")
          .delete()
          .eq(
            "id",
            piece.id
          );

      if (dbError) {
        throw new Error(
          dbError.message
        );
      }

      const {
        error: storageError,
      } =
        await supabase.storage
          .from("documents")
          .remove([
            piece.fichier_path,
          ]);

      if (storageError) {
        console.error(
          "La ligne a été supprimée mais le fichier Storage n'a pas pu être supprimé :",
          storageError
        );
      }

      setPieces(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              piece.id
          )
      );

      setSuccess(
        "Pièce supprimée."
      );
    } catch (currentError) {
      setError(
        messageErreur(
          currentError
        )
      );
    } finally {
      setPieceBusy(false);
    }
  }

  /* =======================================================
     DOCUMENT
  ======================================================= */

  function ouvrirNouvelOnglet() {
    if (!signedUrl) {
      setError(
        "Le fichier sécurisé n’est pas encore disponible."
      );
      return;
    }

    window.open(
      signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function telecharger() {
    if (!signedUrl) {
      setError(
        "Le fichier sécurisé n’est pas encore disponible."
      );
      return;
    }

    const link =
      window.document.createElement(
        "a"
      );

    link.href = signedUrl;

    const ext = document ? extension(document) : "";
    const nomTelechargement = document?.titre
      ? `${nettoyerNomFichier(document.titre)}${ext ? `.${ext}` : ""}`
      : document?.fichier_nom || "document";

    link.download = nomTelechargement;

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
                onClick={
                  ouvrirEdition
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Pencil className="h-5 w-5" />
                Modifier
              </button>
            )}

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
              disabled={!signedUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Télécharger
            </button>

            <button
              type="button"
              onClick={
                ouvrirNouvelOnglet
              }
              disabled={!signedUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
            RÉSERVES + PIÈCES COMPLÉMENTAIRES
        =============================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Réserves et pièces complémentaires</h2>
              <p className="mt-1 text-sm text-slate-500">Ajoute une réserve, un justificatif ou une pièce de levée sans remplacer le document d'origine.</p>
            </div>

            {(() => {
              const reserve = document as DocumentItem & {
                reserve_presente?: boolean;
                reserve_levee?: boolean;
                reserve_levee_at?: string | null;
              };

              if (reserve.reserve_levee) {
                return <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Réserve levée avec justificatif</span>;
              }
              if (reserve.reserve_presente) {
                return <span className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">⚠ Réserve présente</span>;
              }
              return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Aucune réserve</span>;
            })()}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean((document as DocumentItem & { reserve_presente?: boolean }).reserve_presente)}
                  disabled={!canEdit || reserveBusy}
                  onChange={(event) => void enregistrerReserve(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300"
                />
                <span className="font-bold text-slate-900 dark:text-white">Présence de réserve</span>
              </label>

              {Boolean((document as DocumentItem & { reserve_presente?: boolean }).reserve_presente) && (
                <div className="mt-4">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Description de la réserve</span>
                    <textarea
                      value={reserveDescription}
                      onChange={(event) => setReserveDescription(event.target.value)}
                      disabled={!canEdit}
                      rows={4}
                      placeholder="Décris la réserve constatée..."
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void enregistrerDescriptionReserve()}
                      disabled={reserveBusy}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                      {reserveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer la réserve
                    </button>
                  )}

                  <label
                    className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
                      Boolean(
                        (
                          document as DocumentItem & {
                            reserve_levee?: boolean;
                          }
                        ).reserve_levee
                      )
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(
                        (
                          document as DocumentItem & {
                            reserve_levee?: boolean;
                          }
                        ).reserve_levee
                      )}
                      disabled={
                        !canEdit ||
                        reserveBusy
                      }
                      onChange={(event) =>
                        void definirReserveLevee(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600"
                    />

                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Réserve levée
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        La validation nécessite au moins un justificatif ajouté comme « Levée de réserve ».
                      </p>

                      {Boolean(
                        (
                          document as DocumentItem & {
                            reserve_levee?: boolean;
                          }
                        ).reserve_levee
                      ) &&
                        pieces.some(
                          (piece) =>
                            piece.type_piece ===
                            "LEVEE_RESERVE"
                        ) && (
                          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                              ✓
                            </span>
                            Réserve levée avec justificatif
                          </span>
                        )}
                    </div>
                  </label>
                </div>
              )}
            </div>

            {canEdit && (
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Ajouter une pièce</h3>
                <div className="mt-4 space-y-3">
                  <select
                    value={pieceType}
                    onChange={(event) => setPieceType(event.target.value as "COMPLEMENT" | "LEVEE_RESERVE")}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="COMPLEMENT">Pièce complémentaire</option>
                    <option value="LEVEE_RESERVE">Levée de réserve</option>
                  </select>

                  <input
                    type="file"
                    onChange={(event) => setPieceFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:file:bg-slate-800"
                  />

                  <input
                    value={pieceCommentaire}
                    onChange={(event) => setPieceCommentaire(event.target.value)}
                    placeholder="Commentaire (facultatif)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() => void ajouterPiece()}
                    disabled={pieceBusy || !pieceFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pieceBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    Ajouter la pièce
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Pièces rattachées ({pieces.length})</h3>
            {pieces.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">Aucune pièce complémentaire pour ce document.</div>
            ) : (
              <div className="space-y-3">
                {pieces.map((piece) => (
                  <div key={piece.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all font-semibold text-slate-900 dark:text-white">{piece.fichier_nom}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${piece.type_piece === "LEVEE_RESERVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                          {piece.type_piece === "LEVEE_RESERVE" ? "Levée de réserve" : "Complément"}
                        </span>
                      </div>
                      {piece.commentaire && <p className="mt-1 text-sm text-slate-500">{piece.commentaire}</p>}
                      <p className="mt-1 text-xs text-slate-400">Ajouté le {formatDateTime(piece.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => void telechargerPiece(piece)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        <Download className="h-4 w-4" /> Télécharger
                      </button>
                      {canEdit && (
                        <button type="button" onClick={() => void supprimerPiece(piece)} disabled={pieceBusy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-300">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

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
                  label="Dernière modification par"
                  value={
                    (
                      document as DocumentItem & {
                        modifie_par?: string | null;
                      }
                    ).modifie_par ||
                    "—"
                  }
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
                  src={`${signedUrl ?? ""}#toolbar=1&navpanes=1&scrollbar=1`}
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
                      signedUrl ?? ""
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

      {editionOuverte &&
        document && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modifier-document-title"
          >
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2
                    id="modifier-document-title"
                    className="text-2xl font-black text-slate-900 dark:text-white"
                  >
                    Modifier le document
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Modifie les informations du document et remplace le fichier si nécessaire.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditionOuverte(
                      false
                    )
                  }
                  disabled={
                    editionBusy
                  }
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Fermer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={
                  enregistrerModification
                }
                className="space-y-6 p-6"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Titre *
                    </span>
                    <input
                      value={
                        formEdition.titre
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "titre",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Catégorie *
                    </span>
                    <input
                      value={
                        formEdition.categorie
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "categorie",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Date du document
                    </span>
                    <input
                      type="date"
                      value={
                        formEdition.date_document
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "date_document",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Dossier
                    </span>
                    <input
                      value={
                        formEdition.dossier
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "dossier",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Sous-dossier
                    </span>
                    <input
                      value={
                        formEdition.sous_dossier
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "sous_dossier",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Auteur d’origine
                    </span>

                    <input
                      value={
                        document.auteur ||
                        "—"
                      }
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      L’auteur d’origine ne peut pas être modifié.
                    </p>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Secteur
                    </span>
                    <input
                      value={
                        formEdition.secteur
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "secteur",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Prestataire
                    </span>
                    <input
                      value={
                        formEdition.prestataire
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "prestataire",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Tags
                    </span>
                    <input
                      value={
                        formEdition.tags
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "tags",
                          event.target.value
                        )
                      }
                      placeholder="sécurité, maintenance, contrôle..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Description
                    </span>
                    <textarea
                      rows={5}
                      value={
                        formEdition.description
                      }
                      onChange={(event) =>
                        modifierChampEdition(
                          "description",
                          event.target.value
                        )
                      }
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Remplacer le fichier
                      </p>

                      <p className="text-sm text-slate-500">
                        Facultatif. L’ancien fichier sera supprimé après le remplacement.
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    onChange={
                      selectionnerFichierRemplacement
                    }
                    className="mt-4 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />

                  {fichierRemplacement && (
                    <p className="mt-3 text-sm font-medium text-blue-600">
                      Nouveau fichier : {fichierRemplacement.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setEditionOuverte(
                        false
                      )
                    }
                    disabled={
                      editionBusy
                    }
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={
                      editionBusy
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editionBusy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}

                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
              signedUrl ?? ""
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