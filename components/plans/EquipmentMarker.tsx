"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Camera,
  DoorOpen,
  Droplets,
  Flame,
  Lightbulb,
  Package,
  Shield,
  Wind,
  Zap,
} from "lucide-react";

type Props = {
  id: string;
  numero: string;
  nom: string;
  etat: string;
  type?: string;
  x: number;
  y: number;
  onClick: () => void;
  disabled?: boolean;
};

export default function EquipmentMarker({
  id,
  numero,
  nom,
  etat,
  type,
  x,
  y,
  onClick,
  disabled = false,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled,
    });

  function getIcon() {
    const currentType = (type || "").toLowerCase();

    if (currentType.includes("extincteur")) return <Flame size={18} />;
    if (currentType.includes("baes")) return <Lightbulb size={18} />;
    if (currentType.includes("porte")) return <DoorOpen size={18} />;

    if (
      currentType.includes("caméra") ||
      currentType.includes("camera")
    ) {
      return <Camera size={18} />;
    }

    if (currentType.includes("tgbt")) return <Zap size={18} />;

    if (
      currentType.includes("ria") ||
      currentType.includes("sprinkler")
    ) {
      return <Droplets size={18} />;
    }

    if (
      currentType.includes("désenfumage") ||
      currentType.includes("desenfumage")
    ) {
      return <Wind size={18} />;
    }

    if (currentType.includes("ssi")) return <Shield size={18} />;

    return <Package size={18} />;
  }

  function markerColor() {
    if (etat === "Hors service") return "bg-red-600";
    if (etat === "En maintenance") return "bg-orange-500";
    if (etat === "À remplacer") return "bg-red-500";

    return "bg-emerald-600";
  }

  const translateX = disabled ? 0 : transform?.x || 0;
  const translateY = disabled ? 0 : transform?.y || 0;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      onClick={(event) => {
        event.stopPropagation();

        if (!isDragging) {
          onClick();
        }
      }}
      aria-label={`${numero} - ${nom}`}
      aria-disabled={disabled}
      title={
        disabled
          ? `${numero} - ${nom} (consultation uniquement)`
          : `${numero} - ${nom}`
      }
      className={`absolute z-20 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white/40 transition ${
        disabled
          ? "cursor-default"
          : isDragging
            ? "cursor-grabbing touch-none opacity-80"
            : "cursor-grab touch-none hover:scale-110"
      } ${markerColor()}`}
      style={{
        left: `${x / 100}%`,
        top: `${y / 100}%`,
        transform: `translate(-50%, -50%) translate3d(${translateX}px, ${translateY}px, 0)`,
      }}
    >
      {getIcon()}
    </button>
  );
}