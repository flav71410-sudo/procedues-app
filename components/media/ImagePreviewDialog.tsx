"use client";

import { Download, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { AppButton } from "@/components/ui";
import { GalleryPhoto } from "./AppGallery";

type Props = {
  photo: GalleryPhoto | null;
  onClose: () => void;
  onDelete?: (photo: GalleryPhoto) => Promise<void>;
};

export default function ImagePreviewDialog({
  photo,
  onClose,
  onDelete,
}: Props) {
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Aperçu photo
            </h2>

            {photo.created_at && (
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Ajoutée le{" "}
                {new Date(photo.created_at).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a href={photo.url} download target="_blank" rel="noopener noreferrer">
              <AppButton variant="secondary" className="px-3 py-2">
                <Download size={16} />
              </AppButton>
            </a>

            {onDelete && (
              <AppButton
                variant="danger"
                className="px-3 py-2"
                onClick={async () => {
                  await onDelete(photo);
                  onClose();
                }}
              >
                <Trash2 size={16} />
              </AppButton>
            )}

            <AppButton variant="secondary" className="px-3 py-2" onClick={onClose}>
              <X size={16} />
            </AppButton>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-black p-4">
          <img
            src={photo.url}
            alt="Aperçu"
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
          />
        </div>

        {photo.commentaire && (
          <div className="border-t border-gray-200 px-5 py-4 text-sm text-gray-700 dark:border-slate-800 dark:text-slate-300">
            {photo.commentaire}
          </div>
        )}
      </div>
    </div>
  );
}