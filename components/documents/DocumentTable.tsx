"use client";

import { AppBadge, AppButton, AppTable } from "@/components/ui";

type DocumentItem = {
  id: string;
  titre: string;
  categorie: string;
  fichier_url: string;
  fichier_nom: string;
  extension: string | null;
  taille: number | null;
  version: number | null;
  favori: boolean;
  auteur: string | null;
  created_at: string;
};

type Props = {
  documents: DocumentItem[];
  onDelete: (document: DocumentItem) => Promise<void>;
  onToggleFavori: (document: DocumentItem) => Promise<void>;
};

function formatTaille(taille: number | null) {
  if (!taille) return "—";
  if (taille < 1024 * 1024) return `${(taille / 1024).toFixed(1)} Ko`;
  return `${(taille / 1024 / 1024).toFixed(2)} Mo`;
}

export default function DocumentTable({
  documents,
  onDelete,
  onToggleFavori,
}: Props) {
  return (
    <AppTable
      headers={[
        "Document",
        "Catégorie",
        "Type",
        "Taille",
        "Version",
        "Favori",
        "Actions",
      ]}
    >
      {documents.map((document) => (
        <tr key={document.id}>
          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
            {document.titre}
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {document.fichier_nom}
            </p>
          </td>

          <td className="px-6 py-4">
            <AppBadge variant="info">{document.categorie}</AppBadge>
          </td>

          <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
            {document.extension || "—"}
          </td>

          <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
            {formatTaille(document.taille)}
          </td>

          <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
            v{document.version || 1}
          </td>

          <td className="px-6 py-4">
            <button
              onClick={() => onToggleFavori(document)}
              className="text-2xl"
            >
              {document.favori ? "⭐" : "☆"}
            </button>
          </td>

          <td className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <a
                href={document.fichier_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#0078B8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#00649a]"
              >
                Ouvrir
              </a>

              <AppButton
                variant="danger"
                onClick={() => onDelete(document)}
                className="px-3 py-2 text-xs"
              >
                Supprimer
              </AppButton>
            </div>
          </td>
        </tr>
      ))}
    </AppTable>
  );
}