"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Controle = {
  id: string;
  titre: string;
  description: string | null;
  type_controle: string;
  secteur: string | null;
  prestataire: string | null;
  frequence: string | null;
  date_prevue: string;
  statut: string;
  priorite: string;
  document_url: string | null;
  document_nom: string | null;
  auteur: string | null;
  created_at: string;
};

export default function PlanningPage() {
  const [controles, setControles] = useState<Controle[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [typeControle, setTypeControle] = useState("SSI");
  const [secteur, setSecteur] = useState("");
  const [prestataire, setPrestataire] = useState("");
  const [frequence, setFrequence] = useState("Annuelle");
  const [datePrevue, setDatePrevue] = useState("");
  const [priorite, setPriorite] = useState("normale");
  const [statut, setStatut] = useState("a_faire");

  async function chargerControles() {
    const { data, error } = await supabase
      .from("planning_reglementaire")
      .select("*")
      .order("date_prevue", { ascending: true });

    if (error) {
      alert("Erreur chargement planning.");
      return;
    }

    setControles(data || []);
  }

  function resetForm() {
    setTitre("");
    setDescription("");
    setTypeControle("SSI");
    setSecteur("");
    setPrestataire("");
    setFrequence("Annuelle");
    setDatePrevue("");
    setPriorite("normale");
    setStatut("a_faire");
  }

  async function ajouterControle() {
    if (!titre.trim() || !datePrevue) {
      alert("Merci de renseigner le titre et la date prévue.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("planning_reglementaire").insert({
      titre: titre.trim(),
      description: description.trim() || null,
      type_controle: typeControle,
      secteur: secteur.trim() || null,
      prestataire: prestataire.trim() || null,
      frequence: frequence || null,
      date_prevue: datePrevue,
      statut,
      priorite,
      auteur: "Flavien",
    });

    setLoading(false);

    if (error) {
      alert("Erreur ajout contrôle.");
      return;
    }

    await ajouterJournal(
      "Création",
      "Planning",
      `Contrôle ajouté : ${titre}`
    );

    resetForm();
    chargerControles();
  }

  async function modifierStatut(id: string, nouveauStatut: string) {
    const { error } = await supabase
      .from("planning_reglementaire")
      .update({ statut: nouveauStatut })
      .eq("id", id);

    if (error) {
      alert("Erreur modification statut.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Planning",
      `Statut contrôle modifié : ${nouveauStatut}`
    );

    chargerControles();
  }

  async function supprimerControle(controle: Controle) {
    if (!confirm(`Supprimer "${controle.titre}" ?`)) return;

    const { error } = await supabase
      .from("planning_reglementaire")
      .delete()
      .eq("id", controle.id);

    if (error) {
      alert("Erreur suppression contrôle.");
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Planning",
      `Contrôle supprimé : ${controle.titre}`
    );

    chargerControles();
  }

  useEffect(() => {
    chargerControles();
  }, []);

  const aujourdHui = new Date();
  const dans30Jours = new Date();
  dans30Jours.setDate(aujourdHui.getDate() + 30);

  const controlesFiltres = controles.filter((c) => {
    const texte = `${c.titre} ${c.description || ""} ${c.type_controle} ${
      c.secteur || ""
    } ${c.prestataire || ""} ${c.statut}`.toLowerCase();

    return texte.includes(recherche.toLowerCase());
  });

  const aFaire = controles.filter((c) => c.statut === "a_faire").length;
  const enCours = controles.filter((c) => c.statut === "en_cours").length;
  const termines = controles.filter((c) => c.statut === "termine").length;
  const echeancesProches = controles.filter((c) => {
    const date = new Date(c.date_prevue);
    return date >= aujourdHui && date <= dans30Jours && c.statut !== "termine";
  }).length;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">
        Planning réglementaire
      </h1>

      <p className="mt-2 text-gray-600">
        Suivi des vérifications, contrôles et échéances réglementaires.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Contrôles</p>
          <p className="text-4xl font-bold mt-3 text-gray-900">
            {controles.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">À faire</p>
          <p className="text-4xl font-bold mt-3 text-orange-500">{aFaire}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Échéances 30 jours</p>
          <p className="text-4xl font-bold mt-3 text-red-600">
            {echeancesProches}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Terminés</p>
          <p className="text-4xl font-bold mt-3 text-green-600">
            {termines}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ajouter un contrôle
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Titre *"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <select
            className="border rounded-xl p-3 text-gray-900"
            value={typeControle}
            onChange={(e) => setTypeControle(e.target.value)}
          >
            <option>SSI</option>
            <option>BAES</option>
            <option>Extincteurs</option>
            <option>RIA</option>
            <option>Sprinkler</option>
            <option>Désenfumage</option>
            <option>Portes coupe-feu</option>
            <option>Portes automatiques</option>
            <option>Électricité</option>
            <option>Ascenseur</option>
            <option>CTS</option>
            <option>ICPE</option>
            <option>Formation</option>
            <option>Commission sécurité</option>
            <option>Autre</option>
          </select>

          <input
            className="border rounded-xl p-3 text-gray-900"
            type="date"
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
          />

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Secteur"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
          />

          <input
            className="border rounded-xl p-3 text-gray-900"
            placeholder="Prestataire"
            value={prestataire}
            onChange={(e) => setPrestataire(e.target.value)}
          />

          <select
            className="border rounded-xl p-3 text-gray-900"
            value={frequence}
            onChange={(e) => setFrequence(e.target.value)}
          >
            <option>Ponctuelle</option>
            <option>Hebdomadaire</option>
            <option>Mensuelle</option>
            <option>Trimestrielle</option>
            <option>Semestrielle</option>
            <option>Annuelle</option>
          </select>

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
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        <textarea
          className="mt-4 w-full border rounded-xl p-3 text-gray-900"
          placeholder="Description / observations"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={ajouterControle}
          disabled={loading}
          className="mt-4 bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Ajout..." : "Ajouter le contrôle"}
        </button>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900"
          placeholder="🔍 Rechercher dans le planning..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Date prévue</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Contrôle</th>
              <th className="text-left p-4">Secteur</th>
              <th className="text-left p-4">Prestataire</th>
              <th className="text-left p-4">Priorité</th>
              <th className="text-left p-4">Statut</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {controlesFiltres.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-4 font-semibold text-gray-900">
                  {new Date(c.date_prevue).toLocaleDateString("fr-FR")}
                </td>

                <td className="p-4 text-gray-600">{c.type_controle}</td>

                <td className="p-4 text-gray-900">
                  <p className="font-semibold">{c.titre}</p>
                  <p className="text-xs text-gray-500">
                    {c.description || "—"}
                  </p>
                </td>

                <td className="p-4 text-gray-600">{c.secteur || "—"}</td>
                <td className="p-4 text-gray-600">{c.prestataire || "—"}</td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      c.priorite === "critique"
                        ? "bg-red-100 text-red-700"
                        : c.priorite === "haute"
                        ? "bg-orange-100 text-orange-700"
                        : c.priorite === "normale"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {c.priorite}
                  </span>
                </td>

                <td className="p-4">
                  <select
                    className="border rounded-lg p-2 text-gray-900"
                    value={c.statut}
                    onChange={(e) => modifierStatut(c.id, e.target.value)}
                  >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </td>

                <td className="p-4">
                  <button
                    onClick={() => supprimerControle(c)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}

            {controlesFiltres.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  Aucun contrôle trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}