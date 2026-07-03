"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Journal = {
  id: string;
  utilisateur_nom: string | null;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

export default function JournalSystemePage() {
  const [lignes, setLignes] = useState<Journal[]>([]);
  const [recherche, setRecherche] = useState("");

  async function chargerJournal() {
    const { data, error } = await supabase
      .from("journal_activite")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      alert("Erreur chargement journal système.");
      return;
    }

    setLignes(data || []);
  }

  useEffect(() => {
    chargerJournal();
  }, []);

  const lignesFiltrees = lignes.filter((l) => {
    const texte = `${l.utilisateur_nom || ""} ${l.action} ${l.module} ${
      l.details || ""
    }`.toLowerCase();

    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Journal système</h1>
      <p className="mt-2 text-gray-600">
        Historique des actions réalisées dans l'application.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          placeholder="🔍 Rechercher dans le journal..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Utilisateur</th>
              <th className="text-left p-4">Module</th>
              <th className="text-left p-4">Action</th>
              <th className="text-left p-4">Détails</th>
            </tr>
          </thead>

          <tbody>
            {lignesFiltrees.map((ligne) => (
              <tr key={ligne.id} className="border-t">
                <td className="p-4 text-gray-600">
                  {new Date(ligne.created_at).toLocaleString("fr-FR")}
                </td>

                <td className="p-4 font-semibold text-gray-900">
                  {ligne.utilisateur_nom || "Utilisateur inconnu"}
                </td>

                <td className="p-4 text-gray-600">{ligne.module}</td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ligne.action === "Création"
                        ? "bg-green-100 text-green-700"
                        : ligne.action === "Modification"
                        ? "bg-orange-100 text-orange-700"
                        : ligne.action === "Suppression"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ligne.action}
                  </span>
                </td>

                <td className="p-4 text-gray-600">
                  {ligne.details || "—"}
                </td>
              </tr>
            ))}

            {lignesFiltrees.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  Aucune activité trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}