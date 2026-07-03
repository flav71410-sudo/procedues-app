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

function formatTaille(taille: number | null) {
  if (!taille) return "Taille inconnue";

  if (taille < 1024 * 1024) {
    return `${(taille / 1024).toFixed(1)} Ko`;
  }

  return `${(taille / 1024 / 1024).toFixed(2)} Mo`;
}

function iconeFichier(extension: string | null) {
  const ext = extension?.toLowerCase();

  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext || "")) return "📘";
  if (["xls", "xlsx"].includes(ext || "")) return "📗";
  if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "🖼️";

  return "📄";
}

export default function DocumentCard({
  document,
  onDelete,
  onToggleFavori,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="text-4xl">
            {iconeFichier(document.extension)}
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {document.titre}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {document.categorie} • {document.extension || "fichier"} • v
              {document.version || 1} • {formatTaille(document.taille)}
            </p>

            {document.description && (
              <p className="text-gray-600 mt-3">
                {document.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
              {document.secteur && (
                <span className="bg-gray-100 rounded-full px-3 py-1">
                  📍 {document.secteur}
                </span>
              )}

              {document.prestataire && (
                <span className="bg-gray-100 rounded-full px-3 py-1">
                  🏢 {document.prestataire}
                </span>
              )}

              {document.date_document && (
                <span className="bg-gray-100 rounded-full px-3 py-1">
                  📅 {new Date(document.date_document).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Ajouté par {document.auteur || "Inconnu"} le{" "}
              {new Date(document.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggleFavori(document)}
          className="text-2xl hover:scale-110 transition"
          title="Favori"
        >
          {document.favori ? "⭐" : "☆"}
        </button>
      </div>

      {document.extension?.toLowerCase() === "pdf" && (
        <div className="mt-6 rounded-xl overflow-hidden border">
          <iframe
            src={document.fichier_url}
            className="w-full h-64"
            title={document.titre}
          />
        </div>
      )}

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