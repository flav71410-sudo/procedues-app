"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppButton, AppCard } from "@/components/ui";
import AppGallery, { GalleryPhoto } from "@/components/media/AppGallery";
import { useAuth } from "@/providers/AuthProvider";

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
  const { can } = useAuth();
  const canEdit = can("equipements.edit");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let actif = true;

    async function chargerUrlsSignees() {
      const nouvellesUrls: Record<string, string> = {};

      await Promise.all(
        photos.map(async (photo) => {
          if (!photo.path) return;

          const { data, error } = await supabase.storage
            .from("equipements-photos")
            .createSignedUrl(photo.path, 3600);

          if (!error && data?.signedUrl) {
            nouvellesUrls[photo.id] = data.signedUrl;
          }
        })
      );

      if (actif) {
        setSignedUrls(nouvellesUrls);
      }
    }

    void chargerUrlsSignees();

    return () => {
      actif = false;
    };
  }, [photos]);

  const photosSecurisees = useMemo(
    () =>
      photos
        .map((photo) => {
          const signedUrl = signedUrls[photo.id];

          if (!signedUrl) {
            return null;
          }

          return {
            ...photo,
            url: signedUrl,
          };
        })
        .filter(
          (photo): photo is GalleryPhoto =>
            photo !== null
        ),
    [photos, signedUrls]
  );

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

    const { error } = await supabase
      .from("equipements_photos")
      .insert({
        equipement_id: equipementId,
        // Bucket privé : on conserve le chemin en base.
        // L'URL d'affichage est générée temporairement avec createSignedUrl().
        url: filePath,
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
      {canEdit && (
        <AppCard title="Ajouter une photo">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              📷 Prendre une photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) =>
                  setPhotoFile(e.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </label>

            <label className="cursor-pointer rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              🖼️ Choisir une photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPhotoFile(e.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </label>

            {photoFile && (
              <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Photo sélectionnée :{" "}
                <span className="font-semibold">
                  {photoFile.name}
                </span>
              </div>
            )}
          </div>

          <AppButton
            loading={loading}
            onClick={ajouterPhoto}
          >
            Ajouter
          </AppButton>
        </div>
        </AppCard>
      )}

      <AppGallery
        title="Galerie"
        photos={photosSecurisees}
        loadingId={deletingId}
        emptyTitle="Aucune photo"
        emptyDescription="Ajoutez une photo de l'équipement."
        onDelete={canEdit ? supprimerPhoto : undefined}
      />
    </>
  );
}