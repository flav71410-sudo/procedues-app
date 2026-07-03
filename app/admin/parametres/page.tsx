"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Parametre = {
  id: string;
  cle: string;
  valeur: string | null;
  description: string | null;
};

export default function ParametresPage() {
  const [parametres, setParametres] = useState<Parametre[]>([]);

  async function chargerParametres() {
    const { data, error } = await supabase
      .from("parametres")
      .select("*")
      .order("cle", { ascending: true });

    if (error) {
      alert("Erreur chargement paramètres.");
      return;
    }

    setParametres(data || []);
  }

  async function modifierValeur(id: string, valeur: string) {
    setParametres((liste) =>
      liste.map((p) => (p.id === id ? { ...p, valeur } : p))
    );
  }

  async function enregistrerParametres() {
    for (const p of parametres) {
      const { error } = await supabase
        .from("parametres")
        .update({
          valeur: p.valeur,
          updated_at: new Date(),
        })
        .eq("id", p.id);

      if (error) {
        alert(`Erreur sauvegarde : ${p.cle}`);
        return;
      }
    }

    await ajouterJournal(
      "Modification",
      "Paramètres",
      "Paramètres généraux modifiés"
    );

    alert("Paramètres enregistrés.");
    chargerParametres();
  }

  useEffect(() => {
    chargerParametres();
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
      <p className="mt-2 text-gray-600">
        Configuration générale du logiciel.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Clé</th>
              <th className="text-left p-4">Valeur</th>
              <th className="text-left p-4">Description</th>
            </tr>
          </thead>

          <tbody>
            {parametres.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4 font-semibold text-gray-900">
                  {p.cle}
                </td>

                <td className="p-4">
                  <input
                    className="w-full border rounded-xl p-3 text-gray-900"
                    value={p.valeur || ""}
                    onChange={(e) => modifierValeur(p.id, e.target.value)}
                  />
                </td>

                <td className="p-4 text-gray-600">
                  {p.description || "—"}
                </td>
              </tr>
            ))}

            {parametres.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  Aucun paramètre trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={enregistrerParametres}
        className="mt-6 bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold"
      >
        Enregistrer les paramètres
      </button>
    </AppShell>
  );
}