"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Evenement = {
  id: string;
  type_evenement: string;
  titre: string;
  description: string;
  lieu: string | null;
  gravite: string;
  statut: string;
  auteur: string | null;
  created_at: string;
};

export default function SecuritePage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);

  const [typeEvenement, setTypeEvenement] = useState("Incident");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [lieu, setLieu] = useState("");
  const [gravite, setGravite] = useState("normale");
  const [statut, setStatut] = useState("ouvert");

  async function chargerEvenements() {
    const { data, error } = await supabase
      .from("securite_main_courante")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur chargement sécurité.");
      return;
    }

    setEvenements(data || []);
  }

  function resetForm() {
    setTypeEvenement("Incident");
    setTitre("");
    setDescription("");
    setLieu("");
    setGravite("normale");
    setStatut("ouvert");
  }

  async function ajouterEvenement() {
    if (!titre.trim() || !description.trim()) {
      alert("Merci de renseigner le titre et la description.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("securite_main_courante").insert({
      type_evenement: typeEvenement,
      titre: titre.trim(),
      description: description.trim(),
      lieu: lieu.trim() || null,
      gravite,
      statut,
      auteur: "Flavien",
    });

    setLoading(false);

    if (error) {
      alert("Erreur ajout événement sécurité.");
      return;
    }

    await ajouterJournal(
      "Création",
      "Sécurité",
      `Événement sécurité créé : ${titre}`
    );

    resetForm();
    chargerEvenements();
  }

  async function modifierStatut(id: string, nouveauStatut: string) {
    const { error } = await supabase
      .from("securite_main_courante")
      .update({ statut: nouveauStatut })
      .eq("id", id);

    if (error) {
      alert("Erreur modification statut.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Sécurité",
      `Statut sécurité modifié : ${nouveauStatut}`
    );

    chargerEvenements();
  }

  async function supprimerEvenement(evenement: Evenement) {
    if (!confirm(`Supprimer "${evenement.titre}" ?`)) return;

    const { error } = await supabase
      .from("securite_main_courante")
      .delete()
      .eq("id", evenement.id);

    if (error) {
      alert("Erreur suppression événement.");
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Sécurité",
      `Événement sécurité supprimé : ${evenement.titre}`
    );

    chargerEvenements();
  }

  useEffect(() => {
    chargerEvenements();
  }, []);

  const evenementsFiltres = evenements.filter((e) => {
    const texte = `${e.type_evenement} ${e.titre} ${e.description} ${
      e.lieu || ""
    } ${e.gravite} ${e.statut}`.toLowerCase();

    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Sécurité</h1>

      <p className="mt-2 text-gray-600">
        Main courante sécurité, incidents, levées de doute et événements.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Événements</p>
          <p className="text-4xl font-bold mt-3 text-gray-900">
            {evenements.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Ouverts</p>
          <p className="text-4xl font-bold mt-3 text-orange-500">
            {evenements.filter((e) => e.statut === "ouvert").length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Critiques</p>
          <p className="text-4xl font-bold mt-3 text-red-600">
            {evenements.filter((e) => e.gravite === "critique").length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Clôturés</p>
          <p className="text-4xl font-bold mt-3 text-green-600">
            {evenements.filter((e) => e.statut === "clos").length}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ajouter un événement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="border rounded-xl p-3 text-gray-900"
            value={typeEvenement}
            onChange={(e) => setTypeEvenement(e.target.value)}
          >
            <option>Incident</option>
            <option>Levée de doute</option>
            <option>Intrusion</option>
            <option>Alarme SSI</option>
            <option>Sprinkler</option>
            <option>Désenfumage</option>
            <option>Ronde</option>
            <option>Contrôle</option>
            <option>Autre</option>
          </select>

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Titre *"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Lieu"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
          />

          <select
            className="border rounded-xl p-3 text-gray-900"
            value={gravite}
            onChange={(e) => setGravite(e.target.value)}
          >
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="critique">Critique</option>
          </select>

          <select
            className="border rounded-xl p-3 text-gray-900"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="clos">Clos</option>
          </select>
        </div>

        <textarea
          className="mt-4 w-full border rounded-xl p-3 text-gray-900"
          placeholder="Description détaillée *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={ajouterEvenement}
          disabled={loading}
          className="mt-4 bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Ajout..." : "Ajouter l’événement"}
        </button>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900"
          placeholder="🔍 Rechercher dans la sécurité..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Titre</th>
              <th className="text-left p-4">Lieu</th>
              <th className="text-left p-4">Gravité</th>
              <th className="text-left p-4">Statut</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {evenementsFiltres.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-4 text-gray-600">
                  {new Date(e.created_at).toLocaleString("fr-FR")}
                </td>

                <td className="p-4 font-semibold text-gray-900">
                  {e.type_evenement}
                </td>

                <td className="p-4 text-gray-900">
                  <p className="font-semibold">{e.titre}</p>
                  <p className="text-xs text-gray-500">{e.description}</p>
                </td>

                <td className="p-4 text-gray-600">{e.lieu || "—"}</td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      e.gravite === "critique"
                        ? "bg-red-100 text-red-700"
                        : e.gravite === "haute"
                        ? "bg-orange-100 text-orange-700"
                        : e.gravite === "normale"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {e.gravite}
                  </span>
                </td>

                <td className="p-4">
                  <select
                    className="border rounded-lg p-2 text-gray-900"
                    value={e.statut}
                    onChange={(event) =>
                      modifierStatut(e.id, event.target.value)
                    }
                  >
                    <option value="ouvert">Ouvert</option>
                    <option value="en_cours">En cours</option>
                    <option value="clos">Clos</option>
                  </select>
                </td>

                <td className="p-4">
                  <button
                    onClick={() => supprimerEvenement(e)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}

            {evenementsFiltres.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Aucun événement sécurité trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}