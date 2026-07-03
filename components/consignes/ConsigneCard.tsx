"use client";

import { Pencil, Trash2, Calendar, User, MapPin, Paperclip } from "lucide-react";

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

type Props = {
  consigne: Consigne;
  onEdit: (consigne: Consigne) => void;
  onDelete: (id: string, fichierUrl?: string | null) => void;
};

export default function ConsigneCard({
  consigne,
  onEdit,
  onDelete,
}: Props) {
  const date = consigne.date_creation
    ? new Date(consigne.date_creation).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden">

      {/* Entête */}
      <div className="flex justify-between items-start p-6">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {consigne.titre}
          </h2>

          <p className="text-gray-600 mt-3 whitespace-pre-line">
            {consigne.contenu}
          </p>
        </div>

        <span
          className={`text-sm rounded-full px-4 py-2 font-semibold ${
            consigne.priorite === "critique"
              ? "bg-red-100 text-red-700"
              : consigne.priorite === "haute"
              ? "bg-orange-100 text-orange-700"
              : consigne.priorite === "normale"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {consigne.priorite.toUpperCase()}
        </span>

      </div>

      {/* Informations */}
      <div className="px-6 flex flex-wrap gap-5 text-sm text-gray-500">

        <div className="flex items-center gap-2">
          <MapPin size={16} />
          {consigne.secteur || "Non renseigné"}
        </div>

        <div className="flex items-center gap-2">
          <User size={16} />
          {consigne.auteur || "Inconnu"}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={16} />
          {date}
        </div>

      </div>

      {/* Image */}
      {consigne.fichier_url && (
        <div className="p-6">

          {consigne.fichier_nom?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <a
              href={consigne.fichier_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={consigne.fichier_url}
                alt={consigne.fichier_nom}
                className="rounded-xl border hover:scale-[1.02] transition max-h-80"
              />
            </a>
          ) : (
            <a
              href={consigne.fichier_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <Paperclip size={18} />
              {consigne.fichier_nom}
            </a>
          )}

        </div>
      )}

      {/* Pied */}
      <div className="border-t mt-2 px-6 py-4 flex justify-end gap-3">

        <button
          onClick={() => onEdit(consigne)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Pencil size={18} />
          Modifier
        </button>

        <button
          onClick={() => onDelete(consigne.id, consigne.fichier_url)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Trash2 size={18} />
          Supprimer
        </button>

      </div>

    </div>
  );
}