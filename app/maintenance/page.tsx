"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Intervention = {
  id: string;
  titre: string;
  description: string;
  type_intervention: string;
  equipement: string | null;
  localisation: string | null;
  prestataire: string | null;
  priorite: string;
  statut: string;
  date_prevue: string | null;
  auteur: string | null;
  created_at: string;
};

export default function MaintenancePage() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [typeIntervention, setTypeIntervention] = useState("Corrective");
  const [equipement, setEquipement] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [prestataire, setPrestataire] = useState("");
  const [priorite, setPriorite] = useState("normale");
  const [statut, setStatut] = useState("ouverte");
  const [datePrevue, setDatePrevue] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);

  async function chargerInterventions() {
    const { data, error } = await supabase
      .from("maintenance_interventions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur chargement maintenance.");
      return;
    }

    setInterventions(data || []);
  }

  function resetForm() {
    setTitre("");
    setDescription("");
    setTypeIntervention("Corrective");
    setEquipement("");
    setLocalisation("");
    setPrestataire("");
    setPriorite("normale");
    setStatut("ouverte");
    setDatePrevue("");
  }

  async function ajouterIntervention() {
    if (!titre.trim() || !description.trim()) {
      alert("Merci de renseigner le titre et la description.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("maintenance_interventions").insert({
      titre: titre.trim(),
      description: description.trim(),
      type_intervention: typeIntervention,
      equipement: equipement.trim() || null,
      localisation: localisation.trim() || null,
      prestataire: prestataire.trim() || null,
      priorite,
      statut,
      date_prevue: datePrevue || null,
      auteur: "Flavien",
    });

    setLoading(false);

    if (error) {
      alert("Erreur ajout intervention maintenance.");
      return;
    }

    await ajouterJournal(
      "Création",
      "Maintenance",
      `Intervention créée : ${titre}`
    );

    resetForm();
    chargerInterventions();
  }

  async function modifierStatut(id: string, nouveauStatut: string) {
    const { error } = await supabase
      .from("maintenance_interventions")
      .update({ statut: nouveauStatut })
      .eq("id", id);

    if (error) {
      alert("Erreur modification statut.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Maintenance",
      `Statut intervention modifié : ${nouveauStatut}`
    );

    chargerInterventions();
  }

  async function supprimerIntervention(intervention: Intervention) {
    if (!confirm(`Supprimer "${intervention.titre}" ?`)) return;

    const { error } = await supabase
      .from("maintenance_interventions")
      .delete()
      .eq("id", intervention.id);

    if (error) {
      alert("Erreur suppression intervention.");
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Maintenance",
      `Intervention supprimée : ${intervention.titre}`
    );

    chargerInterventions();
  }

  useEffect(() => {
    chargerInterventions();
  }, []);

  const interventionsFiltrees = interventions.filter((i) => {
    const texte = `${i.titre} ${i.description} ${i.type_intervention} ${
      i.equipement || ""
    } ${i.localisation || ""} ${i.prestataire || ""} ${i.priorite} ${
      i.statut
    }`.toLowerCase();

    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>

      <p className="mt-2 text-gray-600">
        Suivi des demandes et interventions de maintenance.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Interventions</p>
          <p className="text-4xl font-bold mt-3 text-gray-900">
            {interventions.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Ouvertes</p>
          <p className="text-4xl font-bold mt-3 text-orange-500">
            {interventions.filter((i) => i.statut === "ouverte").length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Critiques</p>
          <p className="text-4xl font-bold mt-3 text-red-600">
            {interventions.filter((i) => i.priorite === "critique").length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Terminées</p>
          <p className="text-4xl font-bold mt-3 text-green-600">
            {interventions.filter((i) => i.statut === "terminee").length}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ajouter une intervention
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="border rounded-xl p-3 text-gray-900"
            value={typeIntervention}
            onChange={(e) => setTypeIntervention(e.target.value)}
          >
            <option>Corrective</option>
            <option>Préventive</option>
            <option>Contrôle</option>
            <option>Dépannage</option>
            <option>Travaux</option>
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
            placeholder="Équipement"
            value={equipement}
            onChange={(e) => setEquipement(e.target.value)}
          />

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Localisation"
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
          />

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Prestataire"
            value={prestataire}
            onChange={(e) => setPrestataire(e.target.value)}
          />

          <input
  type="file"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
  onChange={(e) => setFichier(e.target.files?.[0] || null)}
/>

          <input
            className="border rounded-xl p-3 text-gray-900"
            type="date"
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
          />

          <select
            className="border rounded-xl p-3 text-gray-900"
            value={priorite}
            onChange={(e) => setPriorite(e.target.value)}
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
            <option value="ouverte">Ouverte</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>

        <textarea
          className="mt-4 w-full border rounded-xl p-3 text-gray-900"
          placeholder="Description détaillée *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={ajouterIntervention}
          disabled={loading}
          className="mt-4 bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Ajout..." : "Ajouter l’intervention"}
        </button>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900"
          placeholder="🔍 Rechercher dans la maintenance..."
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
              <th className="text-left p-4">Intervention</th>
              <th className="text-left p-4">Équipement</th>
              <th className="text-left p-4">Localisation</th>
              <th className="text-left p-4">Priorité</th>
              <th className="text-left p-4">Statut</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {interventionsFiltrees.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-4 text-gray-600">
                  {new Date(i.created_at).toLocaleString("fr-FR")}
                </td>

                <td className="p-4 font-semibold text-gray-900">
                  {i.type_intervention}
                </td>

                <td className="p-4 text-gray-900">
                  <p className="font-semibold">{i.titre}</p>
                  <p className="text-xs text-gray-500">{i.description}</p>
                </td>

                <td className="p-4 text-gray-600">{i.equipement || "—"}</td>
                <td className="p-4 text-gray-600">{i.localisation || "—"}</td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      i.priorite === "critique"
                        ? "bg-red-100 text-red-700"
                        : i.priorite === "haute"
                        ? "bg-orange-100 text-orange-700"
                        : i.priorite === "normale"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {i.priorite}
                  </span>
                </td>

                <td className="p-4">
                  <select
                    className="border rounded-lg p-2 text-gray-900"
                    value={i.statut}
                    onChange={(event) =>
                      modifierStatut(i.id, event.target.value)
                    }
                  >
                    <option value="ouverte">Ouverte</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </td>

                <td className="p-4">
                  <button
                    onClick={() => supprimerIntervention(i)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}

            {interventionsFiltrees.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  Aucune intervention trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
