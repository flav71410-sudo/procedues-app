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
  ArchiveRestore,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import {
  deleteConsigne,
  deleteConsigneDefinitivement,
  getConsignes,
  getConsigneStats,
  restoreConsigne,
} from "@/services/consignesService";
import type {
  Consigne,
  ConsigneFilters,
  ConsigneStats,
} from "@/types/consignes";

type MagasinOption = {
  readonly id: string;
  readonly nom: string;
};

const STATS_VIDES: ConsigneStats = {
  total: 0,
  actives: 0,
  urgentes: 0,
  avecFichier: 0,
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

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function classePriorite(priorite: string): string {
  const value = priorite.toLowerCase();

  if (
    value.includes("urgent") ||
    value.includes("critique")
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
  }

  if (
    value.includes("haut") ||
    value.includes("élev")
  ) {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300";
  }

  if (
    value.includes("bas") ||
    value.includes("faible")
  ) {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
}


function extensionFichier(nom: string | null | undefined): string {
  if (!nom) return "";
  const index = nom.lastIndexOf(".");
  return index >= 0 ? nom.slice(index).toLowerCase() : "";
}

function typeApercuFichier(
  nom: string | null | undefined
): "pdf" | "image" | "autre" {
  const extension = extensionFichier(nom);

  if (extension === ".pdf") {
    return "pdf";
  }

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return "image";
  }

  return "autre";
}


const CONSIGNES_BUCKET = "consignes-files";

function cheminStorageConsigne(value: string | null | undefined): string | null {
  if (!value) return null;

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value.replace(/^\/+/, "");
  }

  const marqueur = `/storage/v1/object/public/${CONSIGNES_BUCKET}/`;
  const index = value.indexOf(marqueur);

  if (index >= 0) {
    return decodeURIComponent(value.slice(index + marqueur.length));
  }

  return null;
}

async function urlSigneeConsigne(
  value: string | null | undefined
): Promise<string | null> {
  const path = cheminStorageConsigne(value);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(CONSIGNES_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("Erreur URL signée consigne :", error);
    return null;
  }

  return data.signedUrl;
}

export default function ConsignesPage() {
  const router = useRouter();
  const dialog = useDialog();

  const {
    can,
    magasinActif,
    vueTousMagasins,
    magasinsDisponibles,
    peutChangerMagasin,
    changerMagasinActif,
    loading: authLoading,
  } = useAuth();

  const canCreate = can("consignes.create");
const canEdit = can("consignes.edit");
const canDelete = can("consignes.delete");

  const [consignes, setConsignes] =
    useState<Consigne[]>([]);

  const [stats, setStats] =
    useState<ConsigneStats>(STATS_VIDES);

  const [filters, setFilters] =
    useState<ConsigneFilters>({
      magasinId: null,
      tousMagasins: false,
      recherche: "",
      categorie: "",
      priorite: "",
      secteur: "",
      uniquementActives: true,
    });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [busyId, setBusyId] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const [previewId, setPreviewId] =
    useState<string | null>(null);

  const [signedUrls, setSignedUrls] =
    useState<Record<string, string>>({});

  const charger = useCallback(
    async (silent = false) => {
      if (authLoading) {
        return;
      }

      if (!vueTousMagasins && !magasinActif) {
        setConsignes([]);
        setStats(STATS_VIDES);
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

        const scope = {
          magasinId: magasinActif?.id ?? null,
          tousMagasins: vueTousMagasins,
        };

        const [consignesData, statsData] =
          await Promise.all([
            getConsignes({
              ...filters,
              ...scope,
            }),
            getConsigneStats(scope),
          ]);

        setConsignes(consignesData);
        setStats(statsData);

        const fichiers = consignesData.filter(
          (item) => Boolean(item.fichier_url)
        );

        const entries = await Promise.all(
          fichiers.map(async (item) => {
            const url = await urlSigneeConsigne(item.fichier_url);
            return [item.id, url] as const;
          })
        );

        setSignedUrls(
          Object.fromEntries(
            entries.filter(([, url]) => Boolean(url))
          ) as Record<string, string>
        );
      } catch (currentError) {
        console.error(
          "Erreur chargement consignes :",
          currentError
        );


        setError(messageErreur(currentError));
        setConsignes([]);
        setStats(STATS_VIDES);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authLoading,
      filters,
      magasinActif,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      magasinId: magasinActif?.id ?? null,
      tousMagasins: vueTousMagasins,
    }));
  }, [
    magasinActif?.id,
    vueTousMagasins,
  ]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          consignes
            .map((item) =>
              item.categorie.trim()
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [consignes]
  );

  const priorites = useMemo(
    () =>
      Array.from(
        new Set(
          consignes
            .map((item) =>
              item.priorite.trim()
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [consignes]
  );

  const secteurs = useMemo(
    () =>
      Array.from(
        new Set(
          consignes
            .map((item) =>
              item.secteur?.trim()
            )
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [consignes]
  );

  async function supprimer(
    consigne: Consigne
  ) {
    if (!canDelete) {
      setError(
        "Tu n’as pas l’autorisation de supprimer une consigne."
      );
      return;
    }

    const confirmed = await dialog.delete({
      title: "Archiver cette consigne ?",
      itemName: consigne.titre,
      description:
        "La consigne sera déplacée dans les archives et pourra être restaurée ultérieurement.",
    });

    if (!confirmed) return;

    try {
      setBusyId(consigne.id);
      setError(null);

      await deleteConsigne(consigne.id, {
        magasinId: magasinActif?.id ?? null,
        tousMagasins: vueTousMagasins,
      });

      await charger(true);
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setBusyId(null);
    }
  }
  async function supprimerDefinitivement(
  consigne: Consigne
) {
  if (!canDelete) {
    setError(
      "Tu n’as pas l’autorisation de supprimer définitivement une consigne."
    );
    return;
  }

  const confirmed = await dialog.delete({
    title: "Supprimer définitivement cette archive ?",
    itemName: consigne.titre,
    description:
      "Cette action est définitive. La consigne archivée sera supprimée et ne pourra plus être restaurée.",
  });

  if (!confirmed) {
    return;
  }

  try {
    setBusyId(consigne.id);
    setError(null);

    await deleteConsigneDefinitivement(
      consigne.id,
      {
        magasinId:
          magasinActif?.id ?? null,
        tousMagasins:
          vueTousMagasins,
      }
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

  async function restaurer(
    consigne: Consigne
  ) {
    if (!canEdit) {
      setError(
        "Tu n’as pas l’autorisation de restaurer une consigne."
      );
      return;
    }

    try {
      setBusyId(consigne.id);
      setError(null);

      await restoreConsigne(consigne.id, {
        magasinId: magasinActif?.id ?? null,
        tousMagasins: vueTousMagasins,
      });

      await charger(true);
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setBusyId(null);
    }
  }

  function changerMagasin(
    value: string
  ) {
    changerMagasinActif(
      value === "__TOUS__"
        ? null
        : value
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <BookOpenCheck className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Consignes
                </h1>

                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Consignes opérationnelles et de sécurité du magasin.
                </p>
              </div>
            </div>
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
                    "Sélectionne un magasin précis avant de créer une consigne."
                  );
                  return;
                }

                router.push(
                  "/consignes/nouveau"
                );
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Nouvelle consigne
            </button>
          )}
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

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={
              <BookOpenCheck className="h-6 w-6" />
            }
          />

          <StatCard
            label="Actives"
            value={stats.actives}
            icon={
              <FileText className="h-6 w-6" />
            }
          />

          <StatCard
            label="Urgentes"
            value={stats.urgentes}
            icon={
              <ShieldAlert className="h-6 w-6" />
            }
          />

          <StatCard
            label="Avec fichier"
            value={stats.avecFichier}
            icon={
              <Paperclip className="h-6 w-6" />
            }
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_190px_190px_190px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

              <input
                value={
                  filters.recherche ?? ""
                }
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    recherche:
                      event.target.value,
                  }))
                }
                placeholder="Rechercher une consigne..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            {peutChangerMagasin && (
              <select
                value={
                  vueTousMagasins
                    ? "__TOUS__"
                    : magasinActif?.id ?? ""
                }
                onChange={(event) =>
                  changerMagasin(
                    event.target.value
                  )
                }
                className={classeChamp()}
              >
                <option value="__TOUS__">
                  Tous les magasins
                </option>

                {(
                  magasinsDisponibles as readonly MagasinOption[]
                ).map((magasin) => (
                  <option
                    key={magasin.id}
                    value={magasin.id}
                  >
                    {magasin.nom}
                  </option>
                ))}
              </select>
            )}

            <select
              value={
                filters.categorie ?? ""
              }
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  categorie:
                    event.target.value,
                }))
              }
              className={classeChamp()}
            >
              <option value="">
                Toutes catégories
              </option>

              {categories.map((categorie) => (
                <option
                  key={categorie}
                  value={categorie}
                >
                  {categorie}
                </option>
              ))}
            </select>

            <select
              value={
                filters.priorite ?? ""
              }
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priorite:
                    event.target.value,
                }))
              }
              className={classeChamp()}
            >
              <option value="">
                Toutes priorités
              </option>

              {priorites.map((priorite) => (
                <option
                  key={priorite}
                  value={priorite}
                >
                  {priorite}
                </option>
              ))}
            </select>

            <select
              value={
                filters.secteur ?? ""
              }
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  secteur:
                    event.target.value,
                }))
              }
              className={classeChamp()}
            >
              <option value="">
                Tous secteurs
              </option>

              {secteurs.map((secteur) => (
                <option
                  key={secteur}
                  value={secteur}
                >
                  {secteur}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                void charger(true)
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
          </div>

          <label className="mt-4 inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={
                filters.uniquementActives ??
                true
              }
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  uniquementActives:
                    event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />

            Afficher uniquement les consignes actives
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading || authLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                Chargement des consignes...
              </div>
            </div>
          ) : consignes.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpenCheck className="mx-auto h-12 w-12 text-slate-300" />

              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                Aucune consigne
              </h2>

              <p className="mt-2 text-slate-500">
                Aucune consigne ne correspond au magasin ou aux filtres sélectionnés.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {consignes.map((consigne) => (
                <article
                  key={consigne.id}
                  className={`p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    consigne.actif === false
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/consignes/${consigne.id}`
                        )
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${classePriorite(
                            consigne.priorite
                          )}`}
                        >
                          {consigne.priorite}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {consigne.categorie}
                        </span>

                        {consigne.secteur && (
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                            {consigne.secteur}
                          </span>
                        )}

                        {consigne.actif === false && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            Archivée
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                        {consigne.titre}
                      </h2>

                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                        {consigne.contenu}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>
                          Auteur :{" "}
                          {consigne.auteur ||
                            "Non renseigné"}
                        </span>

                        <span>
                          Créée le :{" "}
                          {formatDate(
                            consigne.created_at ??
                              consigne.date_creation
                          )}
                        </span>

                        {consigne.fichier_nom && (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            {consigne.fichier_nom}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {consigne.fichier_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewId((current) =>
                              current === consigne.id ? null : consigne.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                        >
                          {previewId === consigne.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          Aperçu
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/consignes/${consigne.id}`
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Ouvrir
                      </button>

                      {/* ACTIVE : ARCHIVER */}
                      {consigne.actif !== false && canDelete && (
                        <button
                          type="button"
                          disabled={busyId === consigne.id}
                          onClick={() => void supprimer(consigne)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                        >
                          {busyId === consigne.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Archiver
                        </button>
                      )}

                      {/* ARCHIVÉE : RESTAURER */}
                      {consigne.actif === false && canEdit && (
                        <button
                          type="button"
                          disabled={busyId === consigne.id}
                          onClick={() => void restaurer(consigne)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busyId === consigne.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                          Restaurer
                        </button>
                      )}

                      {/* ARCHIVÉE : SUPPRIMER DÉFINITIVEMENT */}
                      {consigne.actif === false && canDelete && (
                        <button
                          type="button"
                          disabled={busyId === consigne.id}
                          onClick={() => void supprimerDefinitivement(consigne)}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {busyId === consigne.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Supprimer définitivement
                        </button>
                      )}

                                        </div>
                  </div>

                  {previewId === consigne.id && signedUrls[consigne.id] && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Aperçu du document
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {consigne.fichier_nom ?? "Fichier joint"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewId(null)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Fermer
                        </button>
                      </div>

                      {typeApercuFichier(consigne.fichier_nom) === "pdf" ? (
                        <iframe
                          src={`${signedUrls[consigne.id]}#toolbar=1&navpanes=0&scrollbar=1`}
                          title={`Aperçu de ${consigne.titre}`}
                          className="h-[65vh] min-h-[520px] w-full border-0 bg-white"
                        />
                      ) : typeApercuFichier(consigne.fichier_nom) === "image" ? (
                        <div className="flex min-h-[420px] items-center justify-center p-4">
                          <img
                            src={signedUrls[consigne.id]}
                            alt={consigne.fichier_nom ?? consigne.titre}
                            className="max-h-[70vh] max-w-full rounded-xl object-contain"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <FileText className="mx-auto h-10 w-10 text-slate-400" />
                          <p className="mt-3 font-semibold text-slate-900 dark:text-white">
                            Aperçu non disponible pour ce format
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Ouvre la consigne pour consulter ou télécharger le fichier.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
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

function classeChamp(): string {
  return "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
}