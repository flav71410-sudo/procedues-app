"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

type DialogVariant = "danger" | "warning";

type DeleteOptions = {
  title: string;
  itemName: string;
  description?: string;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning";
};

type DialogOptions = {
  title: string;
  itemName?: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: DialogVariant;
};

type DialogContextType = {
  delete: (options: DeleteOptions) => Promise<boolean>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext =
  createContext<DialogContextType | null>(null);

export function DialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    options: DialogOptions | null;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    options: null,
  });

  function ouvrir(
    options: DialogOptions
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      setDialog({
        open: true,
        options,
        resolve,
      });
    });
  }

  function supprimer(
    options: DeleteOptions
  ): Promise<boolean> {
    return ouvrir({
      title: options.title,
      itemName: options.itemName,
      description: options.description,
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      variant: "danger",
    });
  }

  function confirmer(
    options: ConfirmOptions
  ): Promise<boolean> {
    return ouvrir({
      title: options.title,
      description: options.description,
      confirmLabel:
        options.confirmLabel ?? "Confirmer",
      cancelLabel:
        options.cancelLabel ?? "Annuler",
      variant: "warning",
    });
  }

  function fermer(result: boolean) {
    dialog.resolve?.(result);

    setDialog({
      open: false,
      options: null,
    });
  }

  const estDanger =
    dialog.options?.variant === "danger";

  return (
    <DialogContext.Provider
      value={{
        delete: supprimer,
        confirm: confirmer,
      }}
    >
      {children}

      {dialog.open && dialog.options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">
              {dialog.options.title}
            </h2>

            {dialog.options.description && (
              <p className="mt-4 text-slate-300">
                {dialog.options.description}
              </p>
            )}

            {dialog.options.itemName && (
              <p
                className={[
                  "mt-2 font-semibold",
                  estDanger
                    ? "text-red-400"
                    : "text-amber-400",
                ].join(" ")}
              >
                {dialog.options.itemName}
              </p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => fermer(false)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-600"
              >
                {dialog.options.cancelLabel}
              </button>

              <button
                type="button"
                onClick={() => fermer(true)}
                className={[
                  "rounded-xl px-4 py-2 font-semibold text-white transition",
                  estDanger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700",
                ].join(" ")}
              >
                {dialog.options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(
      "useDialog doit être utilisé dans DialogProvider"
    );
  }

  return context;
}