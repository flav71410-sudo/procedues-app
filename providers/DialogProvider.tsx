"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

type DeleteOptions = {
  title: string;
  itemName: string;
  description?: string;
};

type DialogContextType = {
  delete: (options: DeleteOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    options: DeleteOptions | null;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    options: null,
  });

  function supprimer(options: DeleteOptions) {
    return new Promise<boolean>((resolve) => {
      setDialog({
        open: true,
        options,
        resolve,
      });
    });
  }

  function fermer(result: boolean) {
    dialog.resolve?.(result);

    setDialog({
      open: false,
      options: null,
    });
  }

  return (
    <DialogContext.Provider
      value={{
        delete: supprimer,
      }}
    >
      {children}

      {dialog.open && dialog.options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">
              {dialog.options.title}
            </h2>

            <p className="mt-4 text-slate-300">
              {dialog.options.description}
            </p>

            <p className="mt-2 font-semibold text-red-400">
              {dialog.options.itemName}
            </p>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => fermer(false)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-white"
              >
                Annuler
              </button>

              <button
                onClick={() => fermer(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
              >
                Supprimer
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
    throw new Error("useDialog doit être utilisé dans DialogProvider");
  }

  return context;
}