"use client";

type DocumentItem = {
  id: string;
  titre: string;
  description: string | null;
  categorie: string;
  fichier_url: string;
  fichier_nom: string;
  extension: string | null;
  taille: number | null;
  version: number | null;
  secteur: string | null;
  prestataire: string | null;
  date_document: string | null;
  favori: boolean;
  auteur: string | null;
  created_at: string;
};

type Props = {
  document: DocumentItem;
  onDelete: (document: DocumentItem) => Promise<void>;
  onToggleFavori: (document: DocumentItem) => Promise<void>;
};

export default function DocumentCard({
  document,
  onDelete,
  onToggleFavori,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {document.titre}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {document.categorie} • {document.extension || "fichier"}
          </p>

          {document.description && (
            <p className="text-gray-600 mt-3">
              {document.description}
            </p>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Ajouté par {document.auteur || "Inconnu"} le{" "}
            {new Date(document.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>

        <button
          onClick={() => onToggleFavori(document)}
          className="text-2xl"
        >
          {document.favori ? "⭐" : "☆"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <a
          href={document.fichier_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0078b8] hover:bg-[#00649a] text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Ouvrir
        </a>

        <a
          href={document.fichier_url}
          download
          className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Télécharger
        </a>

        <button
          onClick={() => onDelete(document)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}