"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppButton, AppCard } from "@/components/ui";
import AppGallery, { GalleryPhoto } from "@/components/media/AppGallery";

type Props = {
  equipementId: string;
  photos: GalleryPhoto[];
  onRefresh: () => void;
};

export default function EquipmentPhotos({
  equipementId,
  photos,
  onRefresh,
}: Props) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function ajouterPhoto() {
    if (!photoFile) return;

    setLoading(true);

    const extension = photoFile.name.split(".").pop();
    const filePath = `${equipementId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("equipements-photos")
      .upload(filePath, photoFile);

    if (uploadError) {
      alert(uploadError.message);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage
      .from("equipements-photos")
      .getPublicUrl(filePath);

    const { error } = await supabase
      .from("equipements_photos")
      .insert({
        equipement_id: equipementId,
        url: data.publicUrl,
        path: filePath,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setPhotoFile(null);
    onRefresh();
  }

  async function supprimerPhoto(photo: GalleryPhoto) {
    setDeletingId(photo.id);

    if (photo.path) {
      await supabase.storage
        .from("equipements-photos")
        .remove([photo.path]);
    }

    await supabase
      .from("equipements_photos")
      .delete()
      .eq("id", photo.id);

    setDeletingId(null);

    onRefresh();
  }

  return (
    <>
      <AppCard title="Ajouter une photo">
        <div className="flex flex-col gap-4 md:flex-row">
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setPhotoFile(e.target.files?.[0] ?? null)
            }
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />

          <AppButton
            loading={loading}
            onClick={ajouterPhoto}
          >
            Ajouter
          </AppButton>
        </div>
      </AppCard>

      <AppGallery
        title="Galerie"
        photos={photos}
        loadingId={deletingId}
        emptyTitle="Aucune photo"
        emptyDescription="Ajoutez une photo de l'équipement."
        onDelete={supprimerPhoto}
      />
    </>
  );
}