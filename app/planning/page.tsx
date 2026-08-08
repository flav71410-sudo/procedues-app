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
  ExternalLink,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import PlanningCalendar from "@/components/planning/PlanningCalendar";
import PlanningStats from "@/components/planning/PlanningStats";
import PlanningToolbar from "@/components/planning/PlanningToolbar";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import {
  changePlanningStatus,
  deletePlanningEvent,
  getPlanning,
  movePlanningEvent,
} from "@/services/planningService";
import {
  expandRecurringEvents,
  getSourceEventId,
  type PlanningOccurrence,
} from "@/services/planningRecurrence";
import type {
  PlanningEvent,
  PlanningFilters,
} from "@/types/planning";

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

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function formatHeure(value: string | null): string {
  return value ? value.slice(0, 5) : "—";
}

export default function PlanningPage() {
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

  const canEdit =
    can("planning.edit") ||
    can("planning.create");

  const canDelete = can("planning.delete");

  const [sourceEvents, setSourceEvents] =
    useState<PlanningEvent[]>([]);

  const [events, setEvents] =
    useState<PlanningOccurrence[]>([]);

  const [selectedEvent, setSelectedEvent] =
    useState<PlanningOccurrence | null>(null);

  const [filters, setFilters] =
    useState<PlanningFilters>({
      recherche: "",
      categorie: "",
      statut: "tous",
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const rebuildOccurrences = useCallback(
    (items: PlanningEvent[]) => {
      setEvents(
        expandRecurringEvents(items, {
          startDate: "2025-01-01",
          endDate: "2032-12-31",
        })
      );
    },
    []
  );

  const loadPlanning = useCallback(
    async (silent = false) => {
      if (authLoading) {
        return;
      }

      if (!vueTousMagasins && !magasinActif) {
        setSourceEvents([]);
        setEvents([]);
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

        const data = await getPlanning({
          magasinId: magasinActif?.id ?? null,
          tousMagasins: vueTousMagasins,
          recherche:
            filters.recherche?.trim() || "",
          categorie:
            filters.categorie?.trim() || "",
          statut: filters.statut ?? "tous",
        });

        setSourceEvents(data);
        rebuildOccurrences(data);
      } catch (currentError) {
        console.error(
          "Erreur chargement planning :",
          currentError
        );

        setSourceEvents([]);
        setEvents([]);
        setError(messageErreur(currentError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authLoading,
      filters.categorie,
      filters.recherche,
      filters.statut,
      magasinActif,
      rebuildOccurrences,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    void loadPlanning();
  }, [loadPlanning]);

  const stats = useMemo(() => {
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    return {
      total: events.length,
      today: events.filter(
        (event) =>
          event.date_evenement === today &&
          event.statut !== "annule"
      ).length,
      late: events.filter(
        (event) =>
          event.date_evenement < today &&
          event.statut !== "termine" &&
          event.statut !== "annule"
      ).length,
      finished: events.filter(
        (event) =>
          event.statut === "termine"
      ).length,
      recurring: sourceEvents.filter(
        (event) => event.recurrent
      ).length,
    };
  }, [events, sourceEvents]);

  async function handleMove(
    occurrenceId: string,
    date: string
  ) {
    if (!canEdit) {
      setError(
        "Tu n’as pas l’autorisation de déplacer un événement."
      );
      return;
    }

    const sourceId =
      getSourceEventId(occurrenceId);

    try {
      await movePlanningEvent(
        sourceId,
        date,
        magasinActif?.id ?? null,
        vueTousMagasins
      );

      await loadPlanning(true);
    } catch (currentError) {
      setError(messageErreur(currentError));
    }
  }

  async function handleStatus(
    statut: PlanningEvent["statut"]
  ) {
    if (!selectedEvent || !canEdit) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError(null);

      await changePlanningStatus(
        selectedEvent.source_event_id,
        statut,
        magasinActif?.id ?? null,
        vueTousMagasins
      );

      await loadPlanning(true);
      setSelectedEvent(null);
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!selectedEvent || !canDelete) {
      return;
    }

    const confirmed = await dialog.delete({
      title: "Supprimer cet événement ?",
      itemName: selectedEvent.titre,
      description: selectedEvent.recurrent
        ? "Toute la série récurrente sera définitivement supprimée du planning."
        : "Cet événement sera définitivement supprimé du planning.",
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      await deletePlanningEvent(
        selectedEvent.source_event_id,
        magasinActif?.id ?? null,
        vueTousMagasins
      );

      await loadPlanning(true);
      setSelectedEvent(null);
    } catch (currentError) {
      setError(messageErreur(currentError));
    } finally {
      setDeleting(false);
    }
  }

  function openEvent(
    event: PlanningEvent
  ) {
    const occurrence =
      event as PlanningOccurrence;

    if (occurrence.maintenance_id) {
      router.push(
        `/maintenance/${occurrence.maintenance_id}`
      );
      return;
    }

    setSelectedEvent(occurrence);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Planning
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Calendrier des maintenances,
            vérifications et interventions.
          </p>
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

        <PlanningToolbar
          magasinActif={magasinActif}
          vueTousMagasins={vueTousMagasins}
          magasins={magasinsDisponibles}
          peutChangerMagasin={
            peutChangerMagasin
          }
          changerMagasin={
            changerMagasinActif
          }
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() =>
            void loadPlanning(true)
          }
        />

        {refreshing && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Actualisation du planning...
          </div>
        )}

        <PlanningStats stats={stats} />

        <PlanningCalendar
          loading={loading || authLoading}
          events={events}
          onMove={handleMove}
          onOpen={openEvent}
        />
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedEvent(null);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {selectedEvent.categorie}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {selectedEvent.titre}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(null)
                }
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info
                  label="Occurrence"
                  value={formatDate(
                    selectedEvent.date_evenement
                  )}
                />

                <Info
                  label="Horaire"
                  value={`${formatHeure(
                    selectedEvent.heure_debut
                  )}${
                    selectedEvent.heure_fin
                      ? ` – ${formatHeure(
                          selectedEvent.heure_fin
                        )}`
                      : ""
                  }`}
                />

                <Info
                  label="Priorité"
                  value={selectedEvent.priorite}
                />

                <Info
                  label="Récurrence"
                  value={
                    selectedEvent.recurrent
                      ? "Oui"
                      : "Non"
                  }
                />

                <Info
                  label="Rappel email"
                  value={
                    selectedEvent.rappel_email_active
                      ? `${selectedEvent.rappel_email_delai ?? 0} ${selectedEvent.rappel_email_unite ?? ""} avant`
                      : "Désactivé"
                  }
                />
              </div>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Statut
                </span>

                <select
                  value={selectedEvent.statut}
                  disabled={
                    !canEdit ||
                    updatingStatus
                  }
                  onChange={(event) =>
                    void handleStatus(
                      event.target
                        .value as PlanningEvent["statut"]
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="planifie">
                    Planifié
                  </option>
                  <option value="en_cours">
                    En cours
                  </option>
                  <option value="termine">
                    Terminé
                  </option>
                  <option value="annule">
                    Annulé
                  </option>
                </select>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:justify-between">
              <div>
                {canDelete && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      void handleDelete()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
                  >
                    {deleting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                    Supprimer
                  </button>
                )}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/planning/${selectedEvent.source_event_id}`
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  <ExternalLink className="h-5 w-5" />
                  Modifier la série
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
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
      <p className="text-sm text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold capitalize">
        {value}
      </p>
    </div>
  );
}