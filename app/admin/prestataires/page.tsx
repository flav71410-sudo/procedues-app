"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";

type Prestataire = {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  domaine: string | null;
  contrat: string | null;
  actif: boolean;
  observations: string | null;
};

export default function PrestatairesPage() {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [recherche, setRecherche] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    contact: "",
    telephone: "",
    email: "",
    domaine: "",
    contrat: "",
    observations: "",
  });

  async function chargerPrestataires() {
    const { data, error } = await supabase
      .from("prestataires")
      .select("*")
      .order("nom", { ascending: true });

    if (error) {
      alert("Erreur chargement prestataires.");
      return;
    }

    setPrestataires(data || []);
  }

  function resetForm() {
    setForm({
      nom: "",
      contact: "",
      telephone: "",
      email: "",
      domaine: "",
      contrat: "",
      observations: "",
    });
    setEditingId(null);
  }

  async function enregistrerPrestataire() {
    if (!form.nom.trim()) {
      alert("Le nom du prestataire est obligatoire.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("prestataires")
        .update({
          nom: form.nom.trim(),
          contact: form.contact.trim() || null,
          telephone: form.telephone.trim() || null,
          email: form.email.trim() || null,
          domaine: form.domaine.trim() || null,
          contrat: form.contrat.trim() || null,
          observations: form.observations.trim() || null,
        })
        .eq("id", editingId);

      if (error) {
        alert("Erreur modification prestataire.");
        return;
      }

      await ajouterJournal("Modification", "Prestataires", `Prestataire modifié : ${form.nom}`);
    } else {
      const { error } = await supabase.from("prestataires").insert({
        nom: form.nom.trim(),
        contact: form.contact.trim() || null,
        telephone: form.telephone.trim() || null,
        email: form.email.trim() || null,
        domaine: form.domaine.trim() || null,
        contrat: form.contrat.trim() || null,
        observations: form.observations.trim() || null,
        actif: true,
      });

      if (error) {
        alert("Erreur ajout prestataire.");
        return;
      }

      await ajouterJournal("Création", "Prestataires", `Prestataire créé : ${form.nom}`);
    }

    resetForm();
    chargerPrestataires();
  }

  function modifierPrestataire(p: Prestataire) {
    setEditingId(p.id);
    setForm({
      nom: p.nom || "",
      contact: p.contact || "",
      telephone: p.telephone || "",
      email: p.email || "",
      domaine: p.domaine || "",
      contrat: p.contrat || "",
      observations: p.observations || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function basculerActif(p: Prestataire) {
    const { error } = await supabase
      .from("prestataires")
      .update({ actif: !p.actif })
      .eq("id", p.id);

    if (error) {
      alert("Erreur modification statut.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Prestataires",
      p.actif ? `Prestataire désactivé : ${p.nom}` : `Prestataire activé : ${p.nom}`
    );

    chargerPrestataires();
  }

  async function supprimerPrestataire(p: Prestataire) {
    if (!confirm(`Supprimer le prestataire "${p.nom}" ?`)) return;

    const { error } = await supabase
      .from("prestataires")
      .delete()
      .eq("id", p.id);

    if (error) {
      alert("Erreur suppression prestataire.");
      return;
    }

    await ajouterJournal("Suppression", "Prestataires", `Prestataire supprimé : ${p.nom}`);
    chargerPrestataires();
  }

  useEffect(() => {
    chargerPrestataires();
  }, []);

  const filtres = prestataires.filter((p) => {
    const texte = `${p.nom} ${p.contact || ""} ${p.email || ""} ${p.domaine || ""}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Prestataires</h1>
      <p className="mt-2 text-gray-600">
        Gestion des entreprises extérieures et contrats.
      </p>

      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {editingId ? "Modifier un prestataire" : "Ajouter un prestataire"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Nom *" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Domaine ex: SSI, Sprinkler..." value={form.domaine} onChange={(e) => setForm({ ...form, domaine: e.target.value })} />
          <input className="border rounded-xl p-3 text-gray-900" placeholder="Contrat" value={form.contrat} onChange={(e) => setForm({ ...form, contrat: e.target.value })} />
        </div>

        <textarea
          className="mt-4 w-full border rounded-xl p-3 text-gray-900"
          placeholder="Observations"
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
        />

        <div className="mt-4 flex gap-3">
          <button onClick={enregistrerPrestataire} className="bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold">
            {editingId ? "Enregistrer" : "Ajouter"}
          </button>

          {editingId && (
            <button onClick={resetForm} className="bg-gray-500 hover:bg-gray-600 text-white rounded-xl px-6 py-3 font-semibold">
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow p-4">
        <input
          className="w-full border rounded-xl p-3 text-gray-900"
          placeholder="🔍 Rechercher un prestataire..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Nom</th>
              <th className="text-left p-4">Contact</th>
              <th className="text-left p-4">Téléphone</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Domaine</th>
              <th className="text-left p-4">État</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtres.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4 font-semibold text-gray-900">{p.nom}</td>
                <td className="p-4 text-gray-600">{p.contact || "—"}</td>
                <td className="p-4 text-gray-600">{p.telephone || "—"}</td>
                <td className="p-4 text-gray-600">{p.email || "—"}</td>
                <td className="p-4 text-gray-600">{p.domaine || "—"}</td>

                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {p.actif ? "Actif" : "Inactif"}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => modifierPrestataire(p)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2">Modifier</button>
                    <button onClick={() => basculerActif(p)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-2">
                      {p.actif ? "Désactiver" : "Activer"}
                    </button>
                    <button onClick={() => supprimerPrestataire(p)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}

            {filtres.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Aucun prestataire trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}