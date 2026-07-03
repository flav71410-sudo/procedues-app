"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Profil = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  fonction: string | null;
  role: string | null;
  role_id: string | null;
  secteur: string | null;
  secteur_id: string | null;
  actif: boolean;
};

type Role = { id: string; nom: string };
type Secteur = { id: string; nom: string };

export default function UtilisateursPage() {
  const [profils, setProfils] = useState<Profil[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [recherche, setRecherche] = useState("");

  async function chargerDonnees() {
    const { data: profilsData } = await supabase
      .from("profils")
      .select("*")
      .order("nom");

    const { data: rolesData } = await supabase
      .from("roles")
      .select("*")
      .order("nom");

    const { data: secteursData } = await supabase
      .from("secteurs")
      .select("*")
      .eq("actif", true)
      .order("nom");

    setProfils(profilsData || []);
    setRoles(rolesData || []);
    setSecteurs(secteursData || []);
  }

  async function modifierProfil(
    id: string,
    champ: "role_id" | "secteur_id" | "actif",
    valeur: string | boolean | null
  ) {
    const { error } = await supabase
      .from("profils")
      .update({ [champ]: valeur })
      .eq("id", id);

    if (error) {
      alert("Erreur lors de la modification.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Utilisateurs",
      `Modification du champ ${champ}`
    );

    chargerDonnees();
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  const profilsFiltres = profils.filter((p) => {
    const texte = `${p.nom} ${p.prenom} ${p.email || ""} ${p.fonction || ""}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="mt-2 text-gray-600">
          Gestion des comptes, rôles et secteurs.
        </p>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          placeholder="🔍 Rechercher un utilisateur..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Utilisateur</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Fonction</th>
              <th className="text-left p-4">Rôle</th>
              <th className="text-left p-4">Secteur</th>
              <th className="text-left p-4">État</th>
            </tr>
          </thead>

          <tbody>
            {profilsFiltres.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4 font-semibold text-gray-900">
                  {p.prenom} {p.nom}
                </td>

                <td className="p-4 text-gray-600">{p.email || "—"}</td>
                <td className="p-4 text-gray-600">{p.fonction || "—"}</td>

                <td className="p-4">
                  <select
                    className="border rounded-lg p-2 text-gray-900 w-full"
                    value={p.role_id || ""}
                    onChange={(e) =>
                      modifierProfil(p.id, "role_id", e.target.value || null)
                    }
                  >
                    <option value="">Sélectionner...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nom}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-4">
                  <select
                    className="border rounded-lg p-2 text-gray-900 w-full"
                    value={p.secteur_id || ""}
                    onChange={(e) =>
                      modifierProfil(p.id, "secteur_id", e.target.value || null)
                    }
                  >
                    <option value="">Sélectionner...</option>
                    {secteurs.map((secteur) => (
                      <option key={secteur.id} value={secteur.id}>
                        {secteur.nom}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-4">
                  <button
                    onClick={() =>
                      modifierProfil(p.id, "actif", !p.actif)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.actif
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {p.actif ? "Actif" : "Inactif"}
                  </button>
                </td>
              </tr>
            ))}

            {profilsFiltres.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
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