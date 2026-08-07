"use client";

import type {
  PlanningEvent,
  PlanningPeriodicite,
} from "@/types/planning";

export type PlanningOccurrence = PlanningEvent & {
  occurrence_id: string;
  source_event_id: string;
  occurrence_date: string;
  is_virtual_occurrence: boolean;
};

type ExpandOptions = {
  startDate?: string;
  endDate?: string;
  maxOccurrencesPerEvent?: number;
};

function toLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addPeriod(
  date: Date,
  value: number,
  unit: PlanningPeriodicite
): Date {
  const next = new Date(date);

  if (unit === "jour") {
    next.setDate(next.getDate() + value);
  }

  if (unit === "semaine") {
    next.setDate(next.getDate() + value * 7);
  }

  if (unit === "mois") {
    const originalDay = next.getDate();

    next.setDate(1);
    next.setMonth(next.getMonth() + value);

    const lastDayOfTargetMonth = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
      12
    ).getDate();

    next.setDate(
      Math.min(originalDay, lastDayOfTargetMonth)
    );
  }

  if (unit === "annee") {
    const originalMonth = next.getMonth();
    const originalDay = next.getDate();

    next.setDate(1);
    next.setFullYear(next.getFullYear() + value);
    next.setMonth(originalMonth);

    const lastDayOfTargetMonth = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
      12
    ).getDate();

    next.setDate(
      Math.min(originalDay, lastDayOfTargetMonth)
    );
  }

  return next;
}

function defaultStartDate(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return toISODate(now);
}

function defaultEndDate(): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 3);
  return toISODate(now);
}

function createOccurrence(
  event: PlanningEvent,
  occurrenceDate: string,
  isVirtual: boolean
): PlanningOccurrence {
  return {
    ...event,
    id: `${event.id}__${occurrenceDate}`,
    occurrence_id: `${event.id}__${occurrenceDate}`,
    source_event_id: event.id,
    occurrence_date: occurrenceDate,
    date_evenement: occurrenceDate,
    is_virtual_occurrence: isVirtual,
  };
}

export function expandRecurringEvents(
  events: PlanningEvent[],
  options: ExpandOptions = {}
): PlanningOccurrence[] {
  const startDate =
    options.startDate ?? defaultStartDate();

  const endDate =
    options.endDate ?? defaultEndDate();

  const maxOccurrencesPerEvent =
    options.maxOccurrencesPerEvent ?? 500;

  const rangeStart = toLocalDate(startDate);
  const rangeEnd = toLocalDate(endDate);

  const occurrences: PlanningOccurrence[] = [];

  for (const event of events) {
    const originalDate = toLocalDate(
      event.date_evenement
    );

    if (
      Number.isNaN(originalDate.getTime()) ||
      originalDate > rangeEnd
    ) {
      continue;
    }

    const isRecurring =
      event.recurrent &&
      !!event.periodicite_valeur &&
      !!event.periodicite_unite &&
      event.periodicite_valeur > 0;

    if (!isRecurring) {
      if (
        originalDate >= rangeStart &&
        originalDate <= rangeEnd
      ) {
        occurrences.push(
          createOccurrence(
            event,
            event.date_evenement,
            false
          )
        );
      }

      continue;
    }

    let currentDate = new Date(originalDate);
    let count = 0;

    while (
      currentDate <= rangeEnd &&
      count < maxOccurrencesPerEvent
    ) {
      if (currentDate >= rangeStart) {
        occurrences.push(
          createOccurrence(
            event,
            toISODate(currentDate),
            count > 0
          )
        );
      }

      currentDate = addPeriod(
        currentDate,
        event.periodicite_valeur!,
        event.periodicite_unite!
      );

      count += 1;
    }
  }

  return occurrences.sort((a, b) => {
    const first = `${a.date_evenement} ${
      a.heure_debut ?? ""
    }`;

    const second = `${b.date_evenement} ${
      b.heure_debut ?? ""
    }`;

    return first.localeCompare(second);
  });
}

export function getSourceEventId(
  occurrenceId: string
): string {
  return occurrenceId.split("__")[0];
}