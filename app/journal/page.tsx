"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type LigneJournal = {
  id: string;
  utilisateur_nom: string | null;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

export default function JournalPage() {
  const [lignes, setLignes] = useState<LigneJournal[]>([]);

  useEffect(() => {
    async function chargerJournal() {
      const { data, error } = await supabase
        .from("journal_activite")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        alert("Erreur chargement journal.");
        return;
      }

      setLignes(data || []);
    }

    chargerJournal();
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Journal d’activité</h1>
      <p className="mt-2 text-gray-600">
        Suivi des dernières actions réalisées dans l’application.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow overflow-hidden">
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
            {lignes.map((ligne) => (
              <tr key={ligne.id} className="border-t">
                <td className="p-4 text-gray-600">
                  {new Date(ligne.created_at).toLocaleString("fr-FR")}
                </td>
                <td className="p-4 font-medium text-gray-900">
                  {ligne.utilisateur_nom || "Inconnu"}
                </td>
                <td className="p-4 text-gray-700">{ligne.module}</td>
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
                <td className="p-4 text-gray-600">{ligne.details}</td>
              </tr>
            ))}

            {lignes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-gray-500 text-center">
                  Aucune activité pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}