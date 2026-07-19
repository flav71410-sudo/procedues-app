"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";
import DocumentStats from "@/components/documents/DocumentStats";
import DocumentForm from "@/components/documents/DocumentForm";
import DocumentCard from "@/components/documents/DocumentCard";
import { useAuth } from "@/providers/AuthProvider";

type DocumentItem = {
  id: string;
  titre: string;
  description: string | null;
  categorie: string;
  fichier_url: string;
  fichier_nom: string;
  extension: string | null;
  taille: number | null;
  version: number | null;
  secteur: string | null;
  prestataire: string | null;
  date_document: string | null;
  favori: boolean;
  auteur: string | null;
  created_at: string;
};

export default function DocumentsPage() {
  const { role } = useAuth();

const canEdit = role === "ADMIN" || role === "DM";
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("Toutes");

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("Sécurité incendie");
  const [secteur, setSecteur] = useState("");
  const [prestataire, setPrestataire] = useState("");
  const [dateDocument, setDateDocument] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function chargerDocuments() {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur chargement documents.");
      return;
    }

    setDocuments(data || []);
  }

  function resetForm() {
    setTitre("");
    setDescription("");
    setCategorie("Sécurité incendie");
    setSecteur("");
    setPrestataire("");
    setDateDocument("");
    setFichier(null);
  }

  async function ajouterDocument() {
    if (!canEdit) {
  alert("Vous n'êtes pas autorisé à ajouter un document.");
  return;
}
    if (!titre.trim() || !fichier) {
      alert("Merci de renseigner le titre et de sélectionner un fichier.");
      return;
    }

    setLoading(true);

    const extension = fichier.name.split(".").pop()?.toLowerCase() || "fichier";
    const filePath = `${Date.now()}-${fichier.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents-files")
      .upload(filePath, fichier);

    if (uploadError) {
  console.error("UPLOAD ERROR:", uploadError);
  alert(uploadError.message);
  setLoading(false);
  return;
}

    const { data: publicUrlData } = supabase.storage
      .from("documents-files")
      .getPublicUrl(filePath);

    const { error } = await supabase.from("documents").insert({
      titre: titre.trim(),
      description: description.trim() || null,
      categorie,
      secteur: secteur.trim() || null,
      prestataire: prestataire.trim() || null,
      date_document: dateDocument || null,
      fichier_url: publicUrlData.publicUrl,
      fichier_nom: fichier.name,
      extension,
      taille: fichier.size,
      version: 1,
      favori: false,
      auteur: "Flavien",
    });

    setLoading(false);

    if (error) {
      alert("Erreur ajout document.");
      return;
    }

    await ajouterJournal("Création", "Documents", `Document ajouté : ${titre}`);

    resetForm();
    chargerDocuments();
  }

  async function supprimerDocument(document: DocumentItem) {
    if (!canEdit) {
  return;
}
    if (!confirm(`Supprimer "${document.titre}" ?`)) return;

    const chemin = document.fichier_url.split("/").pop();

    if (chemin) {
      await supabase.storage.from("documents-files").remove([chemin]);
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", document.id);

    if (error) {
      alert("Erreur suppression document.");
      return;
    }

    await ajouterJournal(
      "Suppression",
      "Documents",
      `Document supprimé : ${document.titre}`
    );

    chargerDocuments();
  }

  async function basculerFavori(document: DocumentItem) {
    if (!canEdit) {
  return;
}
    const { error } = await supabase
      .from("documents")
      .update({ favori: !document.favori })
      .eq("id", document.id);

    if (error) {
      alert("Erreur favori document.");
      return;
    }

    await ajouterJournal(
      "Modification",
      "Documents",
      document.favori
        ? `Document retiré des favoris : ${document.titre}`
        : `Document ajouté aux favoris : ${document.titre}`
    );

    chargerDocuments();
  }

  useEffect(() => {
    chargerDocuments();
  }, []);

  const categories = Array.from(new Set(documents.map((d) => d.categorie)));

  const documentsFiltres = documents.filter((d) => {
    const texte = `${d.titre} ${d.description || ""} ${d.categorie} ${
      d.secteur || ""
    } ${d.prestataire || ""} ${d.fichier_nom}`.toLowerCase();

    const okRecherche = texte.includes(recherche.toLowerCase());
    const okCategorie =
      filtreCategorie === "Toutes" || d.categorie === filtreCategorie;

    return okRecherche && okCategorie;
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
      <p className="mt-2 text-gray-600">
        Gestion documentaire : rapports, plans, procédures, contrats et photos.
      </p>

      <DocumentStats
        total={documents.length}
        favoris={documents.filter((d) => d.favori).length}
        pdf={documents.filter((d) => d.extension === "pdf").length}
        categories={categories.length}
      />
{canEdit &&(
      <DocumentForm
        titre={titre}
        description={description}
        categorie={categorie}
        secteur={secteur}
        prestataire={prestataire}
        dateDocument={dateDocument}
        fichier={fichier}
        loading={loading}
        setTitre={setTitre}
        setDescription={setDescription}
        setCategorie={setCategorie}
        setSecteur={setSecteur}
        setPrestataire={setPrestataire}
        setDateDocument={setDateDocument}
        setFichier={setFichier}
        onSubmit={ajouterDocument}
      />
      )}

      <div className="mt-8 bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="border rounded-xl p-3 text-gray-900"
          placeholder="🔍 Rechercher un document..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <select
          className="border rounded-xl p-3 text-gray-900"
          value={filtreCategorie}
          onChange={(e) => setFiltreCategorie(e.target.value)}
        >
          <option>Toutes</option>
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        {documentsFiltres.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onDelete={supprimerDocument}
            onToggleFavori={basculerFavori}
          />
        ))}

        {documentsFiltres.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6 text-gray-500">
            Aucun document trouvé.
          </div>
        )}
      </div>
    </AppShell>
  );
}