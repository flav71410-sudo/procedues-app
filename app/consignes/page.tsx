"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import ConsigneCard, { Consigne } from "@/components/consignes/ConsigneCard";
import ConsigneForm from "@/components/consignes/ConsigneForm";
import { ajouterJournal } from "@/services/journal";

export default function ConsignesPage() {
  const [consignes, setConsignes] = useState<Consigne[]>([]);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [categorie, setCategorie] = useState("Sécurité");
  const [priorite, setPriorite] = useState("normale");
  const [secteur, setSecteur] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("Toutes");
  const [filtrePriorite, setFiltrePriorite] = useState("Toutes");

  async function chargerConsignes() {
    const { data, error } = await supabase
      .from("consignes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur lors du chargement des consignes.");
      return;
    }

    setConsignes(data || []);
  }

  function resetForm() {
    setTitre("");
    setContenu("");
    setCategorie("Sécurité");
    setPriorite("normale");
    setSecteur("");
    setFichier(null);
    setEditingId(null);
  }

  async function ajouterConsigne() {
    if (!titre.trim() || !contenu.trim()) {
      alert("Merci de renseigner le titre et le contenu.");
      return;
    }

    setLoading(true);

    let fichierUrl: string | null = null;
    let fichierNom: string | null = null;

    if (fichier) {
      const filePath = `${Date.now()}-${fichier.name}`;

      const { error: uploadError } = await supabase.storage
        .from("consignes-files")
        .upload(filePath, fichier);

      if (uploadError) {
        alert("Erreur lors de l'ajout du fichier.");
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("consignes-files")
        .getPublicUrl(filePath);

      fichierUrl = data.publicUrl;
      fichierNom = fichier.name;
    }

    const { error } = await supabase.from("consignes").insert({
      titre,
      contenu,
      categorie,
      priorite,
      secteur,
      fichier_url: fichierUrl,
      fichier_nom: fichierNom,
      auteur: "Flavien",
      date_creation: new Date(),
    });

    setLoading(false);

    if (error) {
      alert("Erreur lors de l'ajout de la consigne.");
      return;
    }

    await ajouterJournal("Création", "Consignes", `Nouvelle consigne : ${titre}`);

    resetForm();
    chargerConsignes();
  }

  function ouvrirModification(consigne: Consigne) {
    setEditingId(consigne.id);
    setTitre(consigne.titre);
    setContenu(consigne.contenu);
    setCategorie(consigne.categorie);
    setPriorite(consigne.priorite);
    setSecteur(consigne.secteur || "");
    setFichier(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function modifierConsigne() {
    if (!editingId) return;

    if (!titre.trim() || !contenu.trim()) {
      alert("Merci de renseigner le titre et le contenu.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("consignes")
      .update({
        titre,
        contenu,
        categorie,
        priorite,
        secteur,
      })
      .eq("id", editingId);

    setLoading(false);

    if (error) {
      alert("Erreur lors de la modification.");
      return;
    }

    await ajouterJournal("Modification", "Consignes", `Consigne modifiée : ${titre}`);

    resetForm();
    chargerConsignes();
  }

  async function supprimerConsigne(id: string, fichierUrl?: string | null) {
    if (!confirm("Voulez-vous vraiment supprimer cette consigne ?")) return;

    const consigneSupprimee = consignes.find((c) => c.id === id);

    if (fichierUrl) {
      const chemin = fichierUrl.split("/").pop();

      if (chemin) {
        await supabase.storage.from("consignes-files").remove([chemin]);
      }
    }

    const { error } = await supabase.from("consignes").delete().eq("id", id);

    if (error) {
      alert("Erreur lors de la suppression.");
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Consignes",
      `Consigne supprimée : ${consigneSupprimee?.titre || id}`
    );

    chargerConsignes();
  }

  useEffect(() => {
    chargerConsignes();
  }, []);

  const consignesFiltrees = consignes.filter((c) => {
    const texte = `${c.titre} ${c.contenu} ${c.categorie} ${
      c.secteur || ""
    }`.toLowerCase();

    return (
      texte.includes(recherche.toLowerCase()) &&
      (filtreCategorie === "Toutes" || c.categorie === filtreCategorie) &&
      (filtrePriorite === "Toutes" || c.priorite === filtrePriorite)
    );
  });

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consignes</h1>
        <p className="mt-2 text-gray-600">
          Ajout et consultation des consignes permanentes.
        </p>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          className="border rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          placeholder="🔍 Rechercher une consigne..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <select
          className="border rounded-xl p-3 text-gray-900"
          value={filtreCategorie}
          onChange={(e) => setFiltreCategorie(e.target.value)}
        >
          <option>Toutes</option>
          <option>Sécurité</option>
          <option>Maintenance</option>
          <option>Logistique</option>
          <option>Caisse</option>
          <option>Jardin</option>
          <option>Bâti</option>
          <option>Administratif</option>
          <option>Autre</option>
        </select>

        <select
          className="border rounded-xl p-3 text-gray-900"
          value={filtrePriorite}
          onChange={(e) => setFiltrePriorite(e.target.value)}
        >
          <option>Toutes</option>
          <option value="basse">Basse</option>
          <option value="normale">Normale</option>
          <option value="haute">Haute</option>
          <option value="critique">Critique</option>
        </select>
      </div>

      <ConsigneForm
        titre={titre}
        contenu={contenu}
        categorie={categorie}
        priorite={priorite}
        secteur={secteur}
        fichier={fichier}
        loading={loading}
        editingId={editingId}
        setTitre={setTitre}
        setContenu={setContenu}
        setCategorie={setCategorie}
        setPriorite={setPriorite}
        setSecteur={setSecteur}
        setFichier={setFichier}
        onSubmit={editingId ? modifierConsigne : ajouterConsigne}
        onCancel={resetForm}
      />

      <div className="mt-8 space-y-4">
        {consignesFiltrees.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6 text-gray-500">
            Aucune consigne trouvée.
          </div>
        )}

        {consignesFiltrees.map((consigne) => (
          <ConsigneCard
            key={consigne.id}
            consigne={consigne}
            onEdit={ouvrirModification}
            onDelete={supprimerConsigne}
          />
        ))}
      </div>
    </AppShell>
  );
}