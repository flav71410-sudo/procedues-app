"use client";

import { useMemo, useState } from "react";
import type { PlanningEvent } from "@/types/planning";

type Vue = "jour" | "semaine" | "mois" | "liste";

type Props = {
  loading: boolean;
  events: PlanningEvent[];
  onMove: (id: string, date: string) => void | Promise<void>;
  onOpen: (event: PlanningEvent) => void;
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const VUES: Vue[] = ["jour", "semaine", "mois", "liste"];

function formatISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateDepuisISO(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function lundiDeLaSemaine(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + offset);
  result.setHours(12, 0, 0, 0);

  return result;
}

function joursDeLaSemaine(date: Date): Date[] {
  const monday = lundiDeLaSemaine(date);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return current;
  });
}

function grilleDuMois(date: Date): Date[] {
  const firstDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    12
  );

  const start = lundiDeLaSemaine(firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function formatDateLongue(value: string): string {
  const date = dateDepuisISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function formatHeure(value: string | null): string {
  return value ? value.slice(0, 5) : "—";
}

function libelleStatut(statut: PlanningEvent["statut"]): string {
  const labels: Record<PlanningEvent["statut"], string> = {
    planifie: "Planifié",
    en_cours: "En cours",
    termine: "Terminé",
    annule: "Annulé",
  };

  return labels[statut];
}

function classePriorite(event: PlanningEvent): string {
  switch (event.priorite) {
    case "critique":
      return "border-red-700 bg-red-600 text-white";
    case "haute":
      return "border-orange-600 bg-orange-500 text-white";
    case "basse":
      return "border-slate-500 bg-slate-400 text-white";
    default:
      return "border-blue-700 bg-blue-600 text-white";
  }
}

function trierEvenements(
  events: PlanningEvent[]
): PlanningEvent[] {
  return [...events].sort((a, b) => {
    const first = `${a.date_evenement} ${a.heure_debut ?? ""}`;
    const second = `${b.date_evenement} ${b.heure_debut ?? ""}`;

    return first.localeCompare(second);
  });
}

export default function PlanningCalendar({
  loading,
  events,
  onMove,
  onOpen,
}: Props) {
  const [vue, setVue] = useState<Vue>("mois");
  const [reference, setReference] = useState(new Date());

  const aujourdHui = formatISO(new Date());

  const semaine = useMemo(
    () => joursDeLaSemaine(reference),
    [reference]
  );

  const mois = useMemo(
    () => grilleDuMois(reference),
    [reference]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlanningEvent[]>();

    for (const event of trierEvenements(events)) {
      const current = map.get(event.date_evenement) ?? [];
      current.push(event);
      map.set(event.date_evenement, current);
    }

    return map;
  }, [events]);

  function changerPeriode(direction: -1 | 1) {
    const nextDate = new Date(reference);

    if (vue === "jour") {
      nextDate.setDate(nextDate.getDate() + direction);
    } else if (vue === "semaine") {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + direction);
    }

    setReference(nextDate);
  }

  function titrePeriode(): string {
    if (vue === "jour") {
      return reference.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (vue === "semaine") {
      return `Du ${semaine[0].toLocaleDateString(
        "fr-FR"
      )} au ${semaine[6].toLocaleDateString("fr-FR")}`;
    }

    return reference.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  function deposer(
    event: React.DragEvent<HTMLElement>,
    date: string
  ) {
    event.preventDefault();

    const id =
      event.dataTransfer.getData("planning-event-id") ||
      event.dataTransfer.getData("id") ||
      event.dataTransfer.getData("text/plain");

    if (id) {
      void onMove(id, date);
    }
  }

  function carteEvenement(
    planningEvent: PlanningEvent,
    compacte = false
  ) {
    return (
      <button
        key={planningEvent.id}
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "planning-event-id",
            planningEvent.id
          );
          event.dataTransfer.effectAllowed = "move";
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(planningEvent);
        }}
        className={`w-full rounded-lg border text-left transition hover:brightness-95 ${classePriorite(
          planningEvent
        )} ${
          compacte
            ? "px-2 py-1 text-xs"
            : "px-3 py-2 text-sm"
        } ${
          planningEvent.statut === "termine"
            ? "opacity-60"
            : ""
        }`}
      >
        <div className="truncate font-semibold">
          {planningEvent.heure_debut
            ? `${formatHeure(
                planningEvent.heure_debut
              )} · `
            : ""}
          {planningEvent.titre}
        </div>

        {!compacte && (
          <div className="mt-1 truncate text-xs opacity-90">
            {planningEvent.categorie} ·{" "}
            {libelleStatut(planningEvent.statut)}
          </div>
        )}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Chargement du planning...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changerPeriode(-1)}
            className="rounded-xl border border-slate-300 px-4 py-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => setReference(new Date())}
            className="rounded-xl border border-slate-300 px-4 py-2 font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Aujourd&apos;hui
          </button>

          <button
            type="button"
            onClick={() => changerPeriode(1)}
            className="rounded-xl border border-slate-300 px-4 py-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            →
          </button>
        </div>

        <h2 className="text-lg font-bold capitalize text-slate-900 dark:text-white">
          {titrePeriode()}
        </h2>

        <div className="flex flex-wrap overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
          {VUES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setVue(item)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                vue === item
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {events.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Aucun événement
          </h3>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Aucun événement ne correspond au magasin ou aux
            filtres sélectionnés.
          </p>
        </section>
      )}

      {events.length > 0 && vue === "mois" && (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
              {JOURS.map((jour) => (
                <div
                  key={jour}
                  className="border-r border-slate-200 p-3 text-center text-xs font-bold uppercase text-slate-500 last:border-r-0 dark:border-slate-800"
                >
                  {jour}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {mois.map((date) => {
                const iso = formatISO(date);
                const list = eventsByDate.get(iso) ?? [];
                const horsMois =
                  date.getMonth() !== reference.getMonth();

                return (
                  <div
                    key={iso}
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={(event) => deposer(event, iso)}
                    className={`min-h-40 border-b border-r border-slate-200 p-2 transition last:border-r-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                      horsMois
                        ? "bg-slate-50/70 dark:bg-slate-950/50"
                        : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          iso === aujourdHui
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {list.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {list.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {list
                        .slice(0, 4)
                        .map((event) =>
                          carteEvenement(event, true)
                        )}

                      {list.length > 4 && (
                        <p className="text-xs font-semibold text-slate-500">
                          +{list.length - 4} autre(s)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && vue === "semaine" && (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
              {semaine.map((date) => {
                const iso = formatISO(date);

                return (
                  <div
                    key={iso}
                    className="border-r border-slate-200 p-4 text-center last:border-r-0 dark:border-slate-800"
                  >
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {date.toLocaleDateString("fr-FR", {
                        weekday: "short",
                      })}
                    </p>

                    <p
                      className={`mx-auto mt-2 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                        iso === aujourdHui
                          ? "bg-blue-600 text-white"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7">
              {semaine.map((date) => {
                const iso = formatISO(date);
                const list = eventsByDate.get(iso) ?? [];

                return (
                  <div
                    key={iso}
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={(event) => deposer(event, iso)}
                    className="min-h-[520px] space-y-2 border-r border-slate-200 p-3 last:border-r-0 dark:border-slate-800"
                  >
                    {list.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Aucun événement
                      </p>
                    ) : (
                      list.map((event) =>
                        carteEvenement(event)
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && vue === "jour" && (
        <section
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) =>
            deposer(event, formatISO(reference))
          }
          className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-xl font-bold capitalize text-slate-900 dark:text-white">
              {reference.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
          </div>

          <div className="space-y-3 p-5">
            {(eventsByDate.get(formatISO(reference)) ?? [])
              .length === 0 ? (
              <p className="py-10 text-center text-slate-500">
                Aucun événement ce jour.
              </p>
            ) : (
              (
                eventsByDate.get(formatISO(reference)) ?? []
              ).map((event) => (
                <article
                  key={event.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {event.titre}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatHeure(event.heure_debut)}
                        {event.heure_fin
                          ? ` – ${formatHeure(
                              event.heure_fin
                            )}`
                          : ""}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {event.categorie} ·{" "}
                        {libelleStatut(event.statut)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpen(event)}
                      className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Ouvrir
                    </button>
                  </div>

                  {event.description && (
                    <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {event.description}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {events.length > 0 && vue === "liste" && (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Horaire</th>
                <th className="px-4 py-3">Événement</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {trierEvenements(events).map((event) => (
                <tr
                  key={event.id}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {formatDateLongue(
                      event.date_evenement
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatHeure(event.heure_debut)}
                    {event.heure_fin
                      ? ` – ${formatHeure(
                          event.heure_fin
                        )}`
                      : ""}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {event.titre}
                    </p>

                    <p className="max-w-80 truncate text-xs text-slate-500">
                      {event.description ||
                        "Aucune description"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {event.categorie}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classePriorite(
                        event
                      )}`}
                    >
                      {event.priorite}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {libelleStatut(event.statut)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(event)}
                      className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}