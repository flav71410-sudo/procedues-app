"use client";

import { useDraggable } from "@dnd-kit/core";
import {
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
    const currentType = (type || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase();

    if (currentType.includes("extincteur")) {
      return <Flame size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("ria") ||
      currentType.includes("sprinkler")
    ) {
      return <Droplets size={14} strokeWidth={2.5} />;
    }

    if (currentType.includes("baes")) {
      return <Lightbulb size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("issue de secours") ||
      currentType.includes("porte")
    ) {
      return <DoorOpen size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("desenfumage") ||
      currentType.includes("exutoire") ||
      currentType.includes("lanterneau")
    ) {
      return <Wind size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("ssi") ||
      currentType.includes("alarme") ||
      currentType.includes("detecteur")
    ) {
      return <Shield size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("tgbt") ||
      currentType.includes("electrique")
    ) {
      return <Zap size={14} strokeWidth={2.5} />;
    }

    if (currentType.includes("gondole anti-feu")) {
      return <Flame size={14} strokeWidth={2.5} />;
    }

    if (
      currentType.includes("rideau souple") ||
      currentType.includes("rideau")
    ) {
      return <Shield size={14} strokeWidth={2.5} />;
    }

    return <Package size={14} strokeWidth={2.5} />;
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
          ? `${numero} - ${nom}${type ? ` • ${type}` : ""} (consultation uniquement)`
          : `${numero} - ${nom}${type ? ` • ${type}` : ""}`
      }
      className={`absolute z-20 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white/50 transition ${
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