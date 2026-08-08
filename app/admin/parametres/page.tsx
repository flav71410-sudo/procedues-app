"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { ajouterJournal } from "@/services/journal";

type Parametre = {
  id: string;
  cle: string;
  valeur: string | null;
  description: string | null;
  magasin_id: string;
};

const PARAMETRES_MASQUES = [
  "domaine_email_autorise",
  "role_defaut",
  "nom_logiciel",
];

const PARAMETRES_PAR_DEFAUT = [
  {
    cle: "directeur magasin",
    description: "Nom du directeur ou de la directrice du magasin",
  },
  {
    cle: "email_contact",
    description: "Adresse e-mail de contact principale du magasin",
  },
  {
    cle: "nom_magasin",
    description: "Nom du magasin",
  },
  {
    cle: "responsable_securite",
    description: "Nom du responsable sécurité / maintenance",
  },
  {
    cle: "telephone_magasin",
    description: "Numéro de téléphone principal du magasin",
  },
];

export default function ParametresPage() {
  const {
    role,
    can,
    magasinActif,
    magasinsDisponibles,
    vueTousMagasins,
    peutChangerMagasin,
    changerMagasinActif,
    loading: chargementAuth,
  } = useAuth();

  const peutVoirParametres =
    role !== "COLLABORATEUR" &&
    can("settings.view");

  const [parametres, setParametres] = useState<
    Parametre[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );
  const [success, setSuccess] = useState<
    string | null
  >(null);

  const chargerParametres = useCallback(
    async () => {
      if (chargementAuth) {
        return;
      }

      if (!peutVoirParametres) {
        setParametres([]);
        setLoading(false);
        return;
      }

      if (vueTousMagasins || !magasinActif) {
        setParametres([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: loadError } =
          await supabase
            .from("parametres")
            .select(
              "id, cle, valeur, description, magasin_id"
            )
            .eq("magasin_id", magasinActif.id)
            .not(
              "cle",
              "in",
              `(${PARAMETRES_MASQUES.join(",")})`
            )
            .order("cle", {
              ascending: true,
            });

        if (loadError) {
          throw loadError;
        }

        setParametres(
          (data ?? []) as Parametre[]
        );
      } catch (currentError) {
        console.error(
          "Erreur chargement paramètres :",
          currentError
        );

        setError(
          currentError instanceof Error
            ? currentError.message
            : "Erreur lors du chargement des paramètres."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      chargementAuth,
      peutVoirParametres,
      magasinActif,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    void chargerParametres();
  }, [chargerParametres]);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      setSuccess(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [success]);

  function modifierValeur(
    id: string,
    valeur: string
  ) {
    setParametres((liste) =>
      liste.map((parametre) =>
        parametre.id === id
          ? {
              ...parametre,
              valeur,
            }
          : parametre
      )
    );
  }

  async function initialiserParametres() {
    if (
      chargementAuth ||
      vueTousMagasins ||
      !magasinActif
    ) {
      setError(
        "Sélectionne un magasin précis avant d’initialiser ses paramètres."
      );
      return;
    }

    try {
      setInitializing(true);
      setError(null);
      setSuccess(null);

      const lignes = PARAMETRES_PAR_DEFAUT.map(
        (parametre) => ({
          magasin_id: magasinActif.id,
          cle: parametre.cle,
          valeur:
            parametre.cle === "nom_magasin"
              ? magasinActif.nom
              : "",
          description: parametre.description,
          updated_at: new Date().toISOString(),
        })
      );

      const { error: insertError } = await supabase
        .from("parametres")
        .insert(lignes);

      if (insertError) {
        throw insertError;
      }

      await ajouterJournal(
        "Création",
        "Paramètres",
        `Paramètres initialisés pour ${magasinActif.nom}`
      );

      setSuccess(
        `Paramètres créés pour ${magasinActif.nom}.`
      );

      await chargerParametres();
    } catch (currentError) {
      console.error(
        "Erreur initialisation paramètres :",
        currentError
      );

      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erreur lors de l’initialisation des paramètres."
      );
    } finally {
      setInitializing(false);
    }
  }

  async function enregistrerParametres() {
    if (
      chargementAuth ||
      vueTousMagasins ||
      !magasinActif
    ) {
      setError(
        "Sélectionne un magasin précis avant d’enregistrer les paramètres."
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      for (const parametre of parametres) {
        if (parametre.cle === "nom_magasin") {
          continue;
        }

        const { error: updateError } =
          await supabase
            .from("parametres")
            .update({
              valeur: parametre.valeur,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", parametre.id)
            .eq(
              "magasin_id",
              magasinActif.id
            );

        if (updateError) {
          throw new Error(
            `Erreur sauvegarde : ${parametre.cle} — ${updateError.message}`
          );
        }
      }

      await ajouterJournal(
        "Modification",
        "Paramètres",
        `Paramètres modifiés pour ${magasinActif.nom}`
      );

      setSuccess(
        `Paramètres enregistrés pour ${magasinActif.nom}.`
      );

      await chargerParametres();
    } catch (currentError) {
      console.error(
        "Erreur sauvegarde paramètres :",
        currentError
      );

      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erreur lors de l’enregistrement des paramètres."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!chargementAuth && !peutVoirParametres) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <h1 className="text-xl font-bold">
            Accès refusé
          </h1>

          <p className="mt-2">
            Cette page n’est pas accessible avec votre rôle.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Paramètres
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configuration propre au magasin sélectionné.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold">
                Votre magasin
              </p>

              <p className="mt-1 text-lg font-bold">
                {vueTousMagasins
                  ? "Sélectionne un magasin précis"
                  : magasinActif?.nom ??
                    "Aucun magasin sélectionné"}
              </p>
            </div>

            {peutChangerMagasin && (
              <div className="w-full lg:w-80">
                <label
                  htmlFor="magasin-parametres"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide"
                >
                  Changer de magasin
                </label>

                <select
                  id="magasin-parametres"
                  value={
                    vueTousMagasins
                      ? "__TOUS__"
                      : magasinActif?.id ?? ""
                  }
                  onChange={(event) => {
                    const value = event.target.value;

                    changerMagasinActif(
                      value === "__TOUS__"
                        ? null
                        : value
                    );
                  }}
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="__TOUS__">
                    Tous les magasins
                  </option>

                  {magasinsDisponibles.map(
                    (magasin) => (
                      <option
                        key={magasin.id}
                        value={magasin.id}
                      >
                        {magasin.nom}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {loading || chargementAuth ? (
            <div className="p-8 text-center text-gray-500">
              Chargement des paramètres...
            </div>
          ) : vueTousMagasins ||
            !magasinActif ? (
            <div className="p-8 text-center text-gray-500">
              Sélectionne un magasin précis pour
              afficher ses paramètres.
            </div>
          ) : parametres.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                Aucun paramètre configuré
              </p>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Ce magasin ne possède encore aucun
                paramètre. La configuration est donc
                vierge.
              </p>

              <button
                type="button"
                onClick={() => void initialiserParametres()}
                disabled={initializing}
                className="mt-6 rounded-xl bg-[#0078b8] px-6 py-3 font-semibold text-white transition hover:bg-[#00649a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {initializing
                  ? "Initialisation..."
                  : "Initialiser les paramètres du magasin"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="p-4 text-left">
                      Clé
                    </th>
                    <th className="p-4 text-left">
                      Valeur
                    </th>
                    <th className="p-4 text-left">
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {parametres.map(
                    (parametre) => (
                      <tr
                        key={parametre.id}
                        className="border-t border-gray-200 dark:border-gray-800"
                      >
                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                          {parametre.cle}
                        </td>

                        <td className="p-4">
                          <input
                            className={
                              parametre.cle === "nom_magasin"
                                ? "w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 p-3 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                : "w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            }
                            value={
                              parametre.cle === "nom_magasin"
                                ? magasinActif.nom
                                : parametre.valeur ?? ""
                            }
                            disabled={
                              parametre.cle === "nom_magasin"
                            }
                            onChange={(event) =>
                              modifierValeur(
                                parametre.id,
                                event.target.value
                              )
                            }
                          />

                          {parametre.cle ===
                            "nom_magasin" && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Le nom du magasin est défini
                              depuis la fiche Magasin et ne
                              peut pas être modifié ici.
                            </p>
                          )}
                        </td>

                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {parametre.description ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {parametres.length > 0 &&
          !vueTousMagasins &&
          magasinActif && (
            <button
              type="button"
              onClick={() =>
                void enregistrerParametres()
              }
              disabled={saving}
              className="rounded-xl bg-[#0078b8] px-6 py-3 font-semibold text-white transition hover:bg-[#00649a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Enregistrement..."
                : "Enregistrer les paramètres"}
            </button>
          )}
      </div>
    </AppShell>
  );
}