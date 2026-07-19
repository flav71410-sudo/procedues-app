"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { ExternalLink, MapPin } from "lucide-react";

import EquipmentMarker from "@/components/plans/EquipmentMarker";
import {
  AppBadge,
  AppButton,
  AppCard,
  AppEmptyState,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/providers/AuthProvider";

export type Plan = {
  id: string;
  nom: string;
  image_url: string;
};

export type EquipementMap = {
  id: string;
  numero: string;
  nom: string;
  etat: string;
  position_x: number | null;
  position_y: number | null;
  types_equipements: {
    nom: string;
  } | null;
};

type Props = {
  plan: Plan;
  equipements: EquipementMap[];
  allEquipements: EquipementMap[];
  onRefresh: () => void | Promise<void>;
};

export default function InteractivePlan({
  plan,
  equipements,
  allEquipements,
  onRefresh,
}: Props) {
  const toast = useToast();
  const planRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<EquipementMap | null>(null);
  const [equipementToPlaceId, setEquipementToPlaceId] = useState("");
  const [placementMode, setPlacementMode] = useState(false);
  const [filtre, setFiltre] = useState("Tous");
  const [draggingMarker, setDraggingMarker] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);

  const { role } = useAuth();
  const canEdit = role === "ADMIN" || role === "DM";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const equipementsDisponibles = allEquipements.filter(
    (equipement) =>
      !equipements.some(
        (equipementPositionne) =>
          equipementPositionne.id === equipement.id
      )
  );

  const categories: string[] = [
    "Tous",
    ...Array.from(
      new Set(
        equipements
          .map(
            (equipement) =>
              equipement.types_equipements?.nom
          )
          .filter((nom): nom is string => Boolean(nom))
      )
    ),
  ];

  const equipementsFiltres =
    filtre === "Tous"
      ? equipements
      : equipements.filter(
          (equipement) =>
            equipement.types_equipements?.nom === filtre
        );

  function nombreParCategorie(categorie: string) {
    if (categorie === "Tous") {
      return equipements.length;
    }

    return equipements.filter(
      (equipement) =>
        equipement.types_equipements?.nom === categorie
    ).length;
  }

  async function placerEquipementSurPlan(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (
      !canEdit ||
      !placementMode ||
      !equipementToPlaceId ||
      savingPosition
    ) {
      return;
    }

    
  

    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      toast.error(
        "Erreur de positionnement",
        "Les dimensions du plan sont invalides."
      );
      return;
    }

    const positionX = Math.max(
      0,
      Math.min(
        10000,
        Math.round(
          ((event.clientX - rect.left) / rect.width) * 10000
        )
      )
    );

    const positionY = Math.max(
      0,
      Math.min(
        10000,
        Math.round(
          ((event.clientY - rect.top) / rect.height) * 10000
        )
      )
    );

    setSavingPosition(true);

    const { error } = await supabase
      .from("equipements")
      .update({
        plan_id: plan.id,
        position_x: positionX,
        position_y: positionY,
      })
      .eq("id", equipementToPlaceId);

    setSavingPosition(false);

    if (error) {
      toast.error("Erreur de positionnement", error.message);
      return;
    }

    const equipementPlace = allEquipements.find(
      (equipement) =>
        equipement.id === equipementToPlaceId
    );

    setPlacementMode(false);
    setEquipementToPlaceId("");

    toast.success(
      "Équipement positionné",
      equipementPlace
        ? `${equipementPlace.numero} a été ajouté au plan.`
        : "La position a été enregistrée."
    );

    await onRefresh();
  }

  function handleDragStart(_event: DragStartEvent) {
    if (!canEdit) {
      return;
    }

    setDraggingMarker(true);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingMarker(false);

    
  

    const equipementId = String(event.active.id);

    const equipement = equipements.find(
      (item) => item.id === equipementId
    );

    if (
      !equipement ||
      equipement.position_x === null ||
      equipement.position_y === null ||
      !planRef.current
    ) {
      return;
    }

    const rect = planRef.current.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      toast.error(
        "Erreur de déplacement",
        "Les dimensions du plan sont invalides."
      );
      return;
    }

    const deltaX =
      (event.delta.x / rect.width) * 10000;

    const deltaY =
      (event.delta.y / rect.height) * 10000;

    const nouvellePositionX = Math.max(
      0,
      Math.min(
        10000,
        Math.round(equipement.position_x + deltaX)
      )
    );

    const nouvellePositionY = Math.max(
      0,
      Math.min(
        10000,
        Math.round(equipement.position_y + deltaY)
      )
    );

    setSavingPosition(true);

    const { error } = await supabase
      .from("equipements")
      .update({
        plan_id: plan.id,
        position_x: nouvellePositionX,
        position_y: nouvellePositionY,
      })
      .eq("id", equipement.id);

    setSavingPosition(false);

    if (error) {
      toast.error("Erreur de déplacement", error.message);
      await onRefresh();
      return;
    }

    toast.success(
      "Position enregistrée",
      `${equipement.numero} a été déplacé.`
    );

    await onRefresh();
  }

  function handleDragCancel() {
    setDraggingMarker(false);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <AppCard title="Plan interactif">
        {canEdit && (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <select
            value={equipementToPlaceId}
            onChange={(event) =>
              setEquipementToPlaceId(event.target.value)
            }
            disabled={placementMode || savingPosition}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">
              Sélectionner un équipement à placer...
            </option>

            {equipementsDisponibles.map((equipement) => (
              <option
                key={equipement.id}
                value={equipement.id}
              >
                {equipement.numero} — {equipement.nom}
              </option>
            ))}
          </select>

          <AppButton
            loading={savingPosition}
            disabled={
              !equipementToPlaceId ||
              placementMode ||
              savingPosition
            }
            onClick={() => setPlacementMode(true)}
          >
            Placer
          </AppButton>

          {placementMode && (
            <AppButton
              variant="danger"
              disabled={savingPosition}
              onClick={() => {
                setPlacementMode(false);
                setEquipementToPlaceId("");
              }}
            >
              Annuler
            </AppButton>
            )}
          </div>
        )}

        {canEdit && placementMode && (
          <div className="mb-4 rounded-xl border border-orange-400 bg-orange-50 p-4 text-sm font-medium text-orange-800 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-300">
            Clique sur le plan pour positionner
            l’équipement sélectionné.
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((categorie) => (
            <button
              key={categorie}
              type="button"
              onClick={() => setFiltre(categorie)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filtre === categorie
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {categorie} ({nombreParCategorie(categorie)})
            </button>
          ))}
        </div>

        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          wheel={{
            step: 0.1,
            disabled: placementMode || draggingMarker,
          }}
          panning={{
            disabled: placementMode || draggingMarker,
          }}
          doubleClick={{
            disabled: true,
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <AppButton
                  variant="secondary"
                  disabled={
                    placementMode || draggingMarker
                  }
                  onClick={() => zoomIn()}
                >
                  Zoom +
                </AppButton>

                <AppButton
                  variant="secondary"
                  disabled={
                    placementMode || draggingMarker
                  }
                  onClick={() => zoomOut()}
                >
                  Zoom -
                </AppButton>

                <AppButton
                  variant="secondary"
                  disabled={
                    placementMode || draggingMarker
                  }
                  onClick={() => resetTransform()}
                >
                  Réinitialiser
                </AppButton>
              </div>

              <div className="h-[70vh] min-h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <TransformComponent
                  wrapperClass="!h-full !w-full"
                  contentClass="!h-full !w-full"
                >
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <div
                      ref={planRef}
                      onClick={canEdit ? placerEquipementSurPlan : undefined}
                      className={`relative h-full w-full ${
                        canEdit && placementMode
                          ? "cursor-crosshair"
                          : canEdit && draggingMarker
                            ? "cursor-grabbing"
                            : canEdit
                              ? "cursor-grab"
                              : "cursor-default"
                      }`}
                    >
                      <img
                        src={plan.image_url}
                        alt={plan.nom}
                        draggable={false}
                        className="pointer-events-none h-full w-full select-none object-contain"
                      />

                      {equipementsFiltres.map(
                        (equipement) => (
                          <EquipmentMarker
                            key={equipement.id}
                            id={equipement.id}
                            numero={equipement.numero}
                            nom={equipement.nom}
                            etat={equipement.etat}
                            type={
                              equipement
                                .types_equipements?.nom
                            }
                            x={
                              equipement.position_x ?? 0
                            }
                            y={
                              equipement.position_y ?? 0
                            }
                            onClick={() =>
                              setSelected(equipement)
                            }
                            disabled={!canEdit}
                          />
                        )
                      )}

                      {savingPosition && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-xl dark:bg-slate-900 dark:text-white">
                            Enregistrement de la
                            position...
                          </div>
                        </div>
                      )}
                    </div>
                  </DndContext>
                </TransformComponent>
              </div>
            </div>
          )}
        </TransformWrapper>
      </AppCard>

      <AppCard title="Équipement sélectionné">
        {!selected ? (
          <AppEmptyState
            icon={<MapPin size={42} />}
            title="Aucun équipement sélectionné"
            description="Clique sur une icône du plan pour afficher sa fiche rapide."
          />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Équipement
              </p>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selected.numero}
              </h2>

              <p className="text-gray-600 dark:text-slate-300">
                {selected.nom}
              </p>
            </div>

            <AppBadge
              variant={
                selected.etat === "En service"
                  ? "success"
                  : selected.etat === "Hors service"
                    ? "danger"
                    : "warning"
              }
            >
              {selected.etat}
            </AppBadge>

            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Type
              </p>

              <p className="font-semibold text-gray-900 dark:text-white">
                {selected.types_equipements?.nom ||
                  "Non défini"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Position
              </p>

              <p className="font-semibold text-gray-900 dark:text-white">
                X : {selected.position_x ?? "—"} · Y :{" "}
                {selected.position_y ?? "—"}
              </p>
            </div>

            <AppButton
              onClick={() => {
                window.location.href = `/equipements/${selected.id}`;
              }}
            >
              <ExternalLink size={16} />
              Voir la fiche
            </AppButton>
          </div>
        )}
      </AppCard>

      <div className="xl:col-span-2">
        <AppCard title="Équipements sur ce plan">
          {equipementsFiltres.length === 0 ? (
            <AppEmptyState
              icon={<MapPin size={42} />}
              title={
                equipements.length === 0
                  ? "Aucun équipement positionné"
                  : "Aucun équipement pour ce filtre"
              }
              description={
                equipements.length === 0
                  ? canEdit
                    ? "Sélectionne un équipement, clique sur Placer, puis choisis sa position sur le plan."
                    : "Aucun équipement n’est actuellement positionné sur ce plan."
                  : "Choisis une autre catégorie pour afficher les équipements correspondants."
              }
            />
          ) : (
            <div className="space-y-3">
              {equipementsFiltres.map(
                (equipement) => (
                  <button
                    key={equipement.id}
                    type="button"
                    onClick={() =>
                      setSelected(equipement)
                    }
                    className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {equipement.numero} —{" "}
                        {equipement.nom}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {equipement
                          .types_equipements?.nom ||
                          "Type non défini"}
                      </p>
                    </div>

                    <AppBadge
                      variant={
                        equipement.etat ===
                        "En service"
                          ? "success"
                          : equipement.etat ===
                              "Hors service"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {equipement.etat}
                    </AppBadge>
                  </button>
                )
              )}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}