"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Secteur = {
  id: string;
  nom: string;
  actif: boolean;
};

export default function SecteursPage() {
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [nouveauSecteur, setNouveauSecteur] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNom, setEditingNom] = useState("");

  async function chargerSecteurs() {
    const { data, error } = await supabase
      .from("secteurs")
      .select("*")
      .order("nom", { ascending: true });

    if (error) {
      alert("Erreur chargement des secteurs.");
      return;
    }

    setSecteurs(data || []);
  }

  async function ajouterSecteur() {
    if (!nouveauSecteur.trim()) return;

    const { error } = await supabase.from("secteurs").insert({
      nom: nouveauSecteur.trim(),
      actif: true,
    });

    if (error) {
      alert("Erreur ajout secteur.");
      return;
    }

    await ajouterJournal("Création", "Administration", `Secteur créé : ${nouveauSecteur}`);
    setNouveauSecteur("");
    chargerSecteurs();
  }

  function ouvrirModification(secteur: Secteur) {
    setEditingId(secteur.id);
    setEditingNom(secteur.nom);
  }

  async function enregistrerModification() {
    if (!editingId || !editingNom.trim()) return;

    const { error } = await supabase
      .from("secteurs")
      .update({ nom: editingNom.trim() })
      .eq("id", editingId);

    if (error) {
      alert("Erreur modification secteur.");
      return;
    }

    await ajouterJournal("Modification", "Administration", `Secteur modifié : ${editingNom}`);
    setEditingId(null);
    setEditingNom("");
    chargerSecteurs();
  }

  async function basculerActif(secteur: Secteur) {
    const { error } = await supabase
      .from("secteurs")
      .update({ actif: !secteur.actif })
      .eq("id", secteur.id);

    if (error) {
      alert("Erreur modification statut.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Administration",
      secteur.actif
        ? `Secteur désactivé : ${secteur.nom}`
        : `Secteur activé : ${secteur.nom}`
    );

    chargerSecteurs();
  }

  async function supprimerSecteur(secteur: Secteur) {
    if (!confirm(`Supprimer le secteur "${secteur.nom}" ?`)) return;

    const { error } = await supabase
      .from("secteurs")
      .delete()
      .eq("id", secteur.id);

    if (error) {
      alert("Impossible de supprimer ce secteur. Il est peut-être utilisé par un utilisateur.");
      return;
    }

    await ajouterJournal("Suppression", "Administration", `Secteur supprimé : ${secteur.nom}`);
    chargerSecteurs();
  }

  useEffect(() => {
    chargerSecteurs();
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Secteurs</h1>
      <p className="mt-2 text-gray-600">
        Gestion des secteurs du magasin.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ajouter un secteur
        </h2>

        <div className="flex gap-3">
          <input
            className="flex-1 border rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
            placeholder="Nom du secteur"
            value={nouveauSecteur}
            onChange={(e) => setNouveauSecteur(e.target.value)}
          />

          <button
            onClick={ajouterSecteur}
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
              <th className="text-left p-4">Nom du secteur</th>
              <th className="text-left p-4">État</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {secteurs.map((secteur) => (
              <tr key={secteur.id} className="border-t">
                <td className="p-4 text-gray-900 font-semibold">
                  {editingId === secteur.id ? (
                    <input
                      className="border rounded-lg p-2 text-gray-900 w-full"
                      value={editingNom}
                      onChange={(e) => setEditingNom(e.target.value)}
                    />
                  ) : (
                    secteur.nom
                  )}
                </td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      secteur.actif
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {secteur.actif ? "Actif" : "Inactif"}
                  </span>
                </td>

                <td className="p-4">
                  {editingId === secteur.id ? (
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
                        onClick={() => ouvrirModification(secteur)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => basculerActif(secteur)}
                        className={
                          secteur.actif
                            ? "bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-2"
                            : "bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2"
                        }
                      >
                        {secteur.actif ? "Désactiver" : "Activer"}
                      </button>

                      <button
                        onClick={() => supprimerSecteur(secteur)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {secteurs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  Aucun secteur créé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}