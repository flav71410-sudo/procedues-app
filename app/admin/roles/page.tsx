"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Role = {
  id: string;
  nom: string;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [nouveauRole, setNouveauRole] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNom, setEditingNom] = useState("");

  async function chargerRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("nom", { ascending: true });

    if (error) {
      alert("Erreur chargement des rôles.");
      return;
    }

    setRoles(data || []);
  }

  async function ajouterRole() {
    if (!nouveauRole.trim()) return;

    const { error } = await supabase.from("roles").insert({
      nom: nouveauRole.trim(),
    });

    if (error) {
      alert("Erreur ajout rôle.");
      return;
    }

    await ajouterJournal("Création", "Administration", `Rôle créé : ${nouveauRole}`);
    setNouveauRole("");
    chargerRoles();
  }

  function ouvrirModification(role: Role) {
    setEditingId(role.id);
    setEditingNom(role.nom);
  }

  async function enregistrerModification() {
    if (!editingId || !editingNom.trim()) return;

    const { error } = await supabase
      .from("roles")
      .update({ nom: editingNom.trim() })
      .eq("id", editingId);

    if (error) {
      alert("Erreur modification rôle.");
      return;
    }

    await ajouterJournal("Modification", "Administration", `Rôle modifié : ${editingNom}`);
    setEditingId(null);
    setEditingNom("");
    chargerRoles();
  }

  async function supprimerRole(role: Role) {
    if (!confirm(`Supprimer le rôle "${role.nom}" ?`)) return;

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", role.id);

    if (error) {
      alert("Impossible de supprimer ce rôle. Il est peut-être utilisé par un utilisateur.");
      return;
    }

    await ajouterJournal("Suppression", "Administration", `Rôle supprimé : ${role.nom}`);
    chargerRoles();
  }

  useEffect(() => {
    chargerRoles();
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Rôles</h1>
      <p className="mt-2 text-gray-600">
        Gestion des rôles utilisateurs.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ajouter un rôle
        </h2>

        <div className="flex gap-3">
          <input
            className="flex-1 border rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Nom du rôle"
            value={nouveauRole}
            onChange={(e) => setNouveauRole(e.target.value)}
          />

          <button
            onClick={ajouterRole}
            className="bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Nom du rôle</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t">
                <td className="p-4 text-gray-900 font-semibold">
                  {editingId === role.id ? (
                    <input
                      className="border rounded-lg p-2 text-gray-900 w-full"
                      value={editingNom}
                      onChange={(e) => setEditingNom(e.target.value)}
                    />
                  ) : (
                    role.nom
                  )}
                </td>

                <td className="p-4">
                  {editingId === role.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={enregistrerModification}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2"
                      >
                        Enregistrer
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingNom("");
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-3 py-2"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => ouvrirModification(role)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => supprimerRole(role)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {roles.length === 0 && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-gray-500">
                  Aucun rôle créé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}