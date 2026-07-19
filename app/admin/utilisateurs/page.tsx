"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Role = "ADMIN" | "DM" | "PERMANENT";

type Profil = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  fonction: string | null;
  role: string | null;
  secteur: string | null;
  actif: boolean;
  created_at?: string | null;
};

const ROLES: Role[] = ["ADMIN", "DM", "PERMANENT"];

const SECTEURS = [
  "Direction",
  "Sécurité",
  "Maintenance",
  "Logistique",
  "Caisse",
  "Commerce",
  "Bâti",
  "Jardin",
  "Administratif",
  "Autre",
];

function normaliserRole(role: string | null): Role | "" {
  const valeur = role?.trim().toUpperCase();

  if (valeur === "ADMIN") {
    return "ADMIN";
  }

  if (valeur === "DM") {
    return "DM";
  }

  if (
    valeur === "PERMANENT" ||
    valeur === "COLLABORATEUR"
  ) {
    return "PERMANENT";
  }

  return "";
}

export default function UtilisateursPage() {
  const [profils, setProfils] = useState<Profil[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [modificationId, setModificationId] = useState<
    string | null
  >(null);

  async function chargerProfils() {
    setChargement(true);

    const { data, error } = await supabase
      .from("profils")
      .select(
        `
          id,
          nom,
          prenom,
          email,
          telephone,
          fonction,
          role,
          secteur,
          actif,
          created_at
        `
      )
      .order("nom", { ascending: true });

    if (error) {
      console.error(
        "Erreur lors du chargement des profils :",
        error
      );

      alert(
        `Impossible de charger les utilisateurs : ${error.message}`
      );

      setProfils([]);
      setChargement(false);
      return;
    }

    setProfils((data as Profil[]) || []);
    setChargement(false);
  }

  async function modifierRole(
    profil: Profil,
    nouveauRole: Role
  ) {
    const ancienRole = profil.role;

    setModificationId(profil.id);

    setProfils((anciensProfils) =>
      anciensProfils.map((item) =>
        item.id === profil.id
          ? {
              ...item,
              role: nouveauRole,
            }
          : item
      )
    );

    const { data, error } = await supabase
      .from("profils")
      .update({
        role: nouveauRole,
      })
      .eq("id", profil.id)
      .select("id, role")
      .single();

    if (error) {
      console.error(
        "Erreur lors de la modification du rôle :",
        error
      );

      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                role: ancienRole,
              }
            : item
        )
      );

      alert(
        `Impossible de modifier le rôle : ${error.message}`
      );

      setModificationId(null);
      return;
    }

    if (!data) {
      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                role: ancienRole,
              }
            : item
        )
      );

      alert(
        "La modification n’a pas été enregistrée. Vérifie les politiques RLS de la table profils."
      );

      setModificationId(null);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Utilisateurs",
      `Rôle de ${profil.prenom} ${profil.nom} modifié : ${
        ancienRole || "non défini"
      } → ${nouveauRole}`
    );

    setModificationId(null);
  }

  async function modifierSecteur(
    profil: Profil,
    nouveauSecteur: string | null
  ) {
    const ancienSecteur = profil.secteur;

    setModificationId(profil.id);

    setProfils((anciensProfils) =>
      anciensProfils.map((item) =>
        item.id === profil.id
          ? {
              ...item,
              secteur: nouveauSecteur,
            }
          : item
      )
    );

    const { data, error } = await supabase
      .from("profils")
      .update({
        secteur: nouveauSecteur,
      })
      .eq("id", profil.id)
      .select("id, secteur")
      .single();

    if (error) {
      console.error(
        "Erreur lors de la modification du secteur :",
        error
      );

      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                secteur: ancienSecteur,
              }
            : item
        )
      );

      alert(
        `Impossible de modifier le secteur : ${error.message}`
      );

      setModificationId(null);
      return;
    }

    if (!data) {
      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                secteur: ancienSecteur,
              }
            : item
        )
      );

      alert(
        "La modification du secteur n’a pas été enregistrée."
      );

      setModificationId(null);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Utilisateurs",
      `Secteur de ${profil.prenom} ${profil.nom} modifié : ${
        ancienSecteur || "aucun"
      } → ${nouveauSecteur || "aucun"}`
    );

    setModificationId(null);
  }

  async function modifierEtat(
    profil: Profil,
    nouvelEtat: boolean
  ) {
    const ancienEtat = profil.actif;

    setModificationId(profil.id);

    setProfils((anciensProfils) =>
      anciensProfils.map((item) =>
        item.id === profil.id
          ? {
              ...item,
              actif: nouvelEtat,
            }
          : item
      )
    );

    const { data, error } = await supabase
      .from("profils")
      .update({
        actif: nouvelEtat,
      })
      .eq("id", profil.id)
      .select("id, actif")
      .single();

    if (error) {
      console.error(
        "Erreur lors de la modification de l’état :",
        error
      );

      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                actif: ancienEtat,
              }
            : item
        )
      );

      alert(
        `Impossible de modifier l’état : ${error.message}`
      );

      setModificationId(null);
      return;
    }

    if (!data) {
      setProfils((anciensProfils) =>
        anciensProfils.map((item) =>
          item.id === profil.id
            ? {
                ...item,
                actif: ancienEtat,
              }
            : item
        )
      );

      alert(
        "La modification de l’état n’a pas été enregistrée."
      );

      setModificationId(null);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Utilisateurs",
      `${profil.prenom} ${profil.nom} ${
        nouvelEtat ? "activé" : "désactivé"
      }`
    );

    setModificationId(null);
  }

  useEffect(() => {
    void chargerProfils();
  }, []);

  const profilsFiltres = useMemo(() => {
    const rechercheNormalisee = recherche
      .trim()
      .toLowerCase();

    if (!rechercheNormalisee) {
      return profils;
    }

    return profils.filter((profil) => {
      const texte = [
        profil.nom,
        profil.prenom,
        profil.email || "",
        profil.telephone || "",
        profil.fonction || "",
        profil.role || "",
        profil.secteur || "",
      ]
        .join(" ")
        .toLowerCase();

      return texte.includes(rechercheNormalisee);
    });
  }, [profils, recherche]);

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Utilisateurs
        </h1>

        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gestion des comptes, des rôles, des secteurs et
          des accès.
        </p>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <input
          type="search"
          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400"
          placeholder="Rechercher un utilisateur..."
          value={recherche}
          onChange={(event) =>
            setRecherche(event.target.value)
          }
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow dark:bg-slate-900">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
            <tr>
              <th className="p-4 text-left">
                Utilisateur
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Fonction
              </th>

              <th className="p-4 text-left">
                Rôle
              </th>

              <th className="p-4 text-left">
                Secteur
              </th>

              <th className="p-4 text-left">
                État
              </th>
            </tr>
          </thead>

          <tbody>
            {chargement && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Chargement des utilisateurs...
                </td>
              </tr>
            )}

            {!chargement &&
              profilsFiltres.map((profil) => {
                const modificationEnCours =
                  modificationId === profil.id;

                const roleSelectionne =
                  normaliserRole(profil.role);

                return (
                  <tr
                    key={profil.id}
                    className="border-t border-gray-200 dark:border-slate-700"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {profil.prenom} {profil.nom}
                      </p>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ID : {profil.id}
                      </p>
                    </td>

                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {profil.email || "—"}
                    </td>

                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {profil.fonction || "—"}
                    </td>

                    <td className="p-4">
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        value={roleSelectionne}
                        disabled={modificationEnCours}
                        onChange={(event) => {
                          const nouveauRole =
                            event.target.value as Role;

                          if (
                            ROLES.includes(nouveauRole)
                          ) {
                            void modifierRole(
                              profil,
                              nouveauRole
                            );
                          }
                        }}
                      >
                        {!roleSelectionne && (
                          <option value="">
                            Sélectionner un rôle...
                          </option>
                        )}

                        {ROLES.map((role) => (
                          <option
                            key={role}
                            value={role}
                          >
                            {role}
                          </option>
                        ))}
                      </select>

                      {profil.role ===
                        "COLLABORATEUR" && (
                        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          Ancien rôle COLLABORATEUR
                          converti en PERMANENT à
                          l’affichage.
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        value={profil.secteur || ""}
                        disabled={modificationEnCours}
                        onChange={(event) =>
                          void modifierSecteur(
                            profil,
                            event.target.value || null
                          )
                        }
                      >
                        <option value="">
                          Aucun secteur
                        </option>

                        {SECTEURS.map((secteur) => (
                          <option
                            key={secteur}
                            value={secteur}
                          >
                            {secteur}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      <button
                        type="button"
                        disabled={modificationEnCours}
                        onClick={() =>
                          void modifierEtat(
                            profil,
                            !profil.actif
                          )
                        }
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          profil.actif
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-950"
                            : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950"
                        }`}
                      >
                        {modificationEnCours
                          ? "Mise à jour..."
                          : profil.actif
                            ? "Actif"
                            : "Inactif"}
                      </button>
                    </td>
                  </tr>
                );
              })}

            {!chargement &&
              profilsFiltres.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}