"use client";

import {
  Calendar,
  MapPin,
  Paperclip,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

import AccessControl from "@/components/auth/AccessControl";
import { useAuth } from "@/providers/AuthProvider";

export type Consigne = {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur: string | null;
  fichier_url: string | null;
  fichier_nom: string | null;
  auteur: string | null;
  date_creation: string | null;
};

type ConsigneCardProps = {
  consigne: Consigne;
  onEdit: (consigne: Consigne) => void;
  onDelete: (
    id: string,
    fichierUrl?: string | null
  ) => void;
};

export default function ConsigneCard({
  consigne,
  onEdit,
  onDelete,
}: ConsigneCardProps) {
  const { role } = useAuth();

  const date = consigne.date_creation
    ? new Date(consigne.date_creation).toLocaleDateString(
        "fr-FR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      )
    : "Date inconnue";

  const estUneImage = Boolean(
    consigne.fichier_nom?.match(
      /\.(jpg|jpeg|png|gif|webp)$/i
    )
  );

  const prioriteClasses =
    consigne.priorite === "critique"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : consigne.priorite === "haute"
        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
        : consigne.priorite === "normale"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300";

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {consigne.titre}
          </h2>

          <p className="mt-3 whitespace-pre-line text-gray-600 dark:text-gray-300">
            {consigne.contenu}
          </p>
        </div>

        <span
          className={`w-fit shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${prioriteClasses}`}
        >
          {consigne.priorite.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-wrap gap-5 px-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>{consigne.secteur || "Non renseigné"}</span>
        </div>

        <div className="flex items-center gap-2">
          <User size={16} />
          <span>{consigne.auteur || "Inconnu"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{date}</span>
        </div>
      </div>

      {consigne.fichier_url && (
        <div className="p-6">
          {estUneImage ? (
            <a
              href={consigne.fichier_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img
                src={consigne.fichier_url}
                alt={
                  consigne.fichier_nom ||
                  "Fichier joint à la consigne"
                }
                className="max-h-80 rounded-xl border border-gray-200 object-contain transition hover:scale-[1.02] dark:border-slate-700"
              />
            </a>
          ) : (
            <a
              href={consigne.fichier_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Paperclip size={18} />

              <span>
                {consigne.fichier_nom ||
                  "Ouvrir le fichier joint"}
              </span>
            </a>
          )}
        </div>
      )}

      <AccessControl
        role={role}
        roles={["ADMIN", "DM"]}
      >
        <div className="mt-2 flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onEdit(consigne)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            <Pencil size={18} />
            Modifier
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(
                consigne.id,
                consigne.fichier_url
              )
            }
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
          >
            <Trash2 size={18} />
            Supprimer
          </button>
        </div>
      </AccessControl>
    </article>
  );
}