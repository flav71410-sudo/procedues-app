"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  MapPinned,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";

import type {
  DashboardSupervision,
  DashboardSupervisionEquipment,
} from "@/services/dashboard/dashboardService";

type Props = {
  supervision: DashboardSupervision | null;
  loading?: boolean;
};

type EquipmentStatus =
  | "service"
  | "controler"
  | "maintenance"
  | "hors-service"
  | "inconnu";

function normaliserEtat(
  etat: string | null | undefined
): string {
  return etat
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? "";
}

function getEquipmentStatus(
  etat: string | null
): EquipmentStatus {
  const valeur = normaliserEtat(etat);

  if (
    valeur === "hors service" ||
    valeur === "hs" ||
    valeur === "defectueux"
  ) {
    return "hors-service";
  }

  if (
    valeur === "maintenance" ||
    valeur === "en maintenance"
  ) {
    return "maintenance";
  }

  if (
    valeur === "a controler" ||
    valeur === "a verifier" ||
    valeur === "controle a effectuer"
  ) {
    return "controler";
  }

  if (
    valeur === "en service" ||
    valeur === "fonctionnel" ||
    valeur === "conforme"
  ) {
    return "service";
  }

  return "inconnu";
}

function getStatusConfig(status: EquipmentStatus) {
  switch (status) {
    case "service":
      return {
        label: "En service",
        marker:
          "bg-emerald-500 ring-emerald-300/70",
        badge:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        text: "text-emerald-600 dark:text-emerald-400",
        icon: CheckCircle2,
      };

    case "controler":
      return {
        label: "À contrôler",
        marker:
          "bg-orange-500 ring-orange-300/70",
        badge:
          "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
        text: "text-orange-600 dark:text-orange-400",
        icon: AlertTriangle,
      };

    case "maintenance":
      return {
        label: "En maintenance",
        marker:
          "bg-blue-500 ring-blue-300/70",
        badge:
          "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
        text: "text-blue-600 dark:text-blue-400",
        icon: Wrench,
      };

    case "hors-service":
      return {
        label: "Hors service",
        marker:
          "bg-red-600 ring-red-300/70",
        badge:
          "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        text: "text-red-600 dark:text-red-400",
        icon: XCircle,
      };

    default:
      return {
        label: "État non défini",
        marker:
          "bg-slate-500 ring-slate-300/70",
        badge:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        text: "text-slate-600 dark:text-slate-400",
        icon: CircleHelp,
      };
  }
}

function SupervisionSkeleton() {
  return (
    <section className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="h-24 border-b border-gray-200 p-6 dark:border-slate-800">
        <div className="h-7 w-56 rounded bg-gray-200 dark:bg-slate-800" />
      </div>

      <div className="grid min-h-[480px] grid-cols-1 xl:grid-cols-[1fr_380px]">
        <div className="bg-gray-100 dark:bg-slate-900" />

        <div className="space-y-4 border-t border-gray-200 p-6 dark:border-slate-800 xl:border-l xl:border-t-0">
          <div className="h-7 w-48 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-gray-200 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-gray-200 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-gray-200 dark:bg-slate-800" />
        </div>
      </div>
    </section>
  );
}

function EquipmentMarker({
  equipement,
}: {
  equipement: DashboardSupervisionEquipment;
}) {
  if (
    equipement.position_x === null ||
    equipement.position_y === null
  ) {
    return null;
  }

  const status = getEquipmentStatus(equipement.etat);
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const positionX = equipement.position_x / 100;
  const positionY = equipement.position_y / 100;

  /*
   * Position horizontale de la fiche
   */
  const tooltipHorizontalClass =
    positionX <= 20
      ? "left-0 translate-x-0"
      : positionX >= 80
        ? "right-0 translate-x-0"
        : "left-1/2 -translate-x-1/2";

  /*
   * Position verticale de la fiche
   * En haut du plan : fiche sous le marqueur
   * Sinon : fiche au-dessus
   */
  const afficherEnDessous = positionY <= 35;

  const tooltipVerticalClass = afficherEnDessous
    ? "top-full mt-4"
    : "bottom-full mb-4";

  /*
   * Position de la petite flèche
   */
  const arrowHorizontalClass =
    positionX <= 20
      ? "left-3"
      : positionX >= 80
        ? "right-3"
        : "left-1/2 -translate-x-1/2";

  const arrowVerticalClass = afficherEnDessous
    ? "-top-1.5 border-l border-t"
    : "-bottom-1.5 border-b border-r";

  return (
    <div
      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 hover:z-50 focus-within:z-50"
      style={{
        left: `${positionX}%`,
        top: `${positionY}%`,
      }}
    >
      <Link
        href={`/equipements/${equipement.id}`}
        aria-label={`Ouvrir la fiche de ${equipement.numero}`}
        className={`
          relative flex h-6 w-6 items-center justify-center
          rounded-full border-2 border-white shadow-lg ring-4
          transition duration-200
          hover:scale-125
          focus:scale-125 focus:outline-none
          ${config.marker}
        `}
      >
        <span className="h-2 w-2 rounded-full bg-white" />
      </Link>

      <div
        className={`
          pointer-events-none absolute z-50 hidden w-64
          group-hover:block group-focus-within:block
          ${tooltipHorizontalClass}
          ${tooltipVerticalClass}
        `}
      >
        <div className="relative overflow-visible rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <div className="border-b border-gray-100 p-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div
                className={`
                  flex h-10 w-10 shrink-0 items-center
                  justify-center rounded-xl
                  ${config.badge}
                `}
              >
                <Icon size={19} />
              </div>

              <div className="min-w-0">
                <p className="truncate font-black text-gray-900 dark:text-white">
                  {equipement.numero}
                </p>

                <p className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-slate-300">
                  {equipement.nom}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 dark:text-slate-400">
                Type
              </span>

              <span className="max-w-36 truncate text-right font-semibold text-gray-900 dark:text-white">
                {equipement.type}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 dark:text-slate-400">
                État
              </span>

              <span
                className={`
                  rounded-full px-2.5 py-1 text-xs font-bold
                  ${config.badge}
                `}
              >
                {equipement.etat || config.label}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-3 font-bold text-blue-600 dark:border-slate-800 dark:text-blue-400">
              Voir la fiche
              <ArrowRight size={15} />
            </div>
          </div>

          <div
            className={`
              absolute h-3 w-3 rotate-45
              border-gray-200 bg-white
              dark:border-slate-700 dark:bg-slate-950
              ${arrowHorizontalClass}
              ${arrowVerticalClass}
            `}
          />
        </div>
      </div>
    </div>
  );
}
function LegendItem({
  status,
}: {
  status: EquipmentStatus;
}) {
  const config = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-3 w-3 rounded-full ring-2 ${config.marker}`}
      />

      <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
        {config.label}
      </span>
    </div>
  );
}

export default function SupervisionCenter({
  supervision,
  loading = false,
}: Props) {
  if (loading) {
    return <SupervisionSkeleton />;
  }

  if (!supervision?.plan) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <MapPinned size={28} />
          </div>

          <h2 className="mt-4 text-xl font-black text-gray-900 dark:text-white">
            Aucun plan disponible
          </h2>

          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-slate-400">
            Ajoute un plan contenant des équipements positionnés
            pour activer le centre de supervision.
          </p>

          <Link
            href="/plans"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <MapPinned size={17} />
            Ouvrir les plans
          </Link>
        </div>
      </section>
    );
  }

  const plan = supervision.plan;
  const equipements = supervision.equipements ?? [];
  const equipementsCritiques =
    supervision.equipementsCritiques ?? [];

  const equipementsPositionnes = equipements.filter(
    (equipement) =>
      equipement.position_x !== null &&
      equipement.position_y !== null
  );

  const nombreEnService = equipements.filter(
    (equipement) =>
      getEquipmentStatus(equipement.etat) === "service"
  ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-gray-200 p-5 dark:border-slate-800 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <ShieldCheck size={23} />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Centre de supervision
              </h2>

              <p className="text-sm text-gray-500 dark:text-slate-400">
                Visualisation en direct de l’état des équipements
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-gray-100 px-3 py-2 text-sm dark:bg-slate-900">
              <span className="text-gray-500 dark:text-slate-400">
                Équipements :
              </span>{" "}
              <strong className="text-gray-900 dark:text-white">
                {equipements.length}
              </strong>
            </div>

            <div className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span>En service :</span>{" "}
              <strong>{nombreEnService}</strong>
            </div>

            <Link
              href={`/plans/${plan.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Ouvrir la cartographie
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative min-h-[520px] overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img
            src={plan.image_url}
            alt={plan.nom}
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-contain"
          />

          <div className="absolute left-4 top-4 z-30 rounded-xl border border-white/30 bg-black/70 px-4 py-3 text-white shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Plan affiché
            </p>

            <p className="mt-1 font-black">
              {plan.nom}
            </p>

            <p className="mt-1 text-xs text-white/70">
              {equipementsPositionnes.length} équipement
              {equipementsPositionnes.length > 1 ? "s" : ""} positionné
              {equipementsPositionnes.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-30 flex flex-wrap gap-x-4 gap-y-3 rounded-xl border border-white/30 bg-white/90 p-3 shadow-xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-950/90">
            <LegendItem status="service" />
            <LegendItem status="controler" />
            <LegendItem status="maintenance" />
            <LegendItem status="hors-service" />
            <LegendItem status="inconnu" />
          </div>

          {equipements.map((equipement) => (
            <EquipmentMarker
              key={equipement.id}
              equipement={equipement}
            />
          ))}
        </div>

        <div className="border-t border-gray-200 p-5 dark:border-slate-800 xl:border-l xl:border-t-0 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white">
                Équipements critiques
              </h3>

              <p className="text-sm text-gray-500 dark:text-slate-400">
                Hors service, à contrôler ou en maintenance
              </p>
            </div>

            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {equipementsCritiques.length}
            </span>
          </div>

          {equipementsCritiques.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-950/20">
              <ShieldCheck
                size={42}
                className="text-emerald-600 dark:text-emerald-400"
              />

              <p className="mt-3 font-black text-emerald-800 dark:text-emerald-300">
                Aucun équipement critique
              </p>

              <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                Aucun équipement hors service ou nécessitant une
                intervention sur ce plan.
              </p>
            </div>
          ) : (
            <div className="max-h-[435px] space-y-3 overflow-y-auto pr-1">
              {equipementsCritiques.map((equipement) => {
                const status = getEquipmentStatus(
                  equipement.etat
                );

                const config = getStatusConfig(status);
                const Icon = config.icon;

                return (
                  <Link
                    key={equipement.id}
                    href={`/equipements/${equipement.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-blue-500/40"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.badge}`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-gray-900 dark:text-white">
                          {equipement.numero}
                        </p>

                        <p className="truncate text-sm text-gray-600 dark:text-slate-300">
                          {equipement.nom}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${config.badge}`}
                          >
                            {equipement.etat || config.label}
                          </span>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                            {equipement.type}
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        size={17}
                        className="mt-1 shrink-0 text-gray-400"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}