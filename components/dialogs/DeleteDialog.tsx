"use client";

import { AlertTriangle } from "lucide-react";
import { AppButton, AppModal } from "@/components/ui";

type Props = {
  open: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteDialog({
  open,
  title = "Confirmer la suppression",
  itemName,
  description = "Cette action est irréversible.",
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <AppModal
      open={open}
      title={title}
      subtitle="Suppression définitive"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </AppButton>

          <AppButton variant="danger" onClick={onConfirm} loading={loading}>
            Supprimer
          </AppButton>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={26} />
        </div>

        <div>
          {itemName && (
            <p className="font-bold text-gray-900 dark:text-white">
              {itemName}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </AppModal>
  );
}