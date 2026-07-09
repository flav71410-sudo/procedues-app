"use client";

import { useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { AppButton, AppCard, AppEmptyState } from "@/components/ui";
import { useDialog } from "@/providers/DialogProvider";
import ImagePreviewDialog from "./ImagePreviewDialog";

export type GalleryPhoto = {
  id: string;
  url: string;
  path?: string | null;
  commentaire?: string | null;
  created_at?: string;
};

type Props = {
  title?: string;
  photos: GalleryPhoto[];
  loadingId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onDelete?: (photo: GalleryPhoto) => Promise<void>;
};

export default function AppGallery({
  title = "Galerie photos",
  photos,
  loadingId = null,
  emptyTitle = "Aucune photo",
  emptyDescription = "Aucune photo n’a encore été ajoutée.",
  onDelete,
}: Props) {
  const dialog = useDialog();
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  async function handleDelete(photo: GalleryPhoto) {
    const ok = await dialog.delete({
      title: "Supprimer cette photo ?",
      itemName: "Photo",
      description: "Cette action est définitive.",
    });

    if (!ok || !onDelete) return;

    await onDelete(photo);
  }

  return (
    <>
      <AppCard title={title}>
        {photos.length === 0 ? (
          <AppEmptyState
            icon="📷"
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <button
                  onClick={() => setPreview(photo)}
                  className="block w-full overflow-hidden"
                >
                  <img
                    src={photo.url}
                    alt="Photo"
                    className="h-56 w-full object-cover transition hover:scale-105"
                  />
                </button>

                <div className="space-y-3 p-4">
                  {photo.created_at && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Ajoutée le{" "}
                      {new Date(photo.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}

                  <div className="flex justify-between gap-2">
                    <AppButton
                      variant="secondary"
                      className="px-3 py-2 text-xs"
                      onClick={() => setPreview(photo)}
                    >
                      <Eye size={14} />
                      Voir
                    </AppButton>

                    {onDelete && (
                      <AppButton
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        loading={loadingId === photo.id}
                        onClick={() => handleDelete(photo)}
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </AppButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <ImagePreviewDialog
        photo={preview}
        onClose={() => setPreview(null)}
        onDelete={onDelete ? handleDelete : undefined}
      />
    </>
  );
}