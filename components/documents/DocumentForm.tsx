"use client";

type Props = {
  titre: string;
  description: string;
  categorie: string;
  secteur: string;
  prestataire: string;
  dateDocument: string;
  fichier: File | null;
  loading: boolean;
  setTitre: (value: string) => void;
  setDescription: (value: string) => void;
  setCategorie: (value: string) => void;
  setSecteur: (value: string) => void;
  setPrestataire: (value: string) => void;
  setDateDocument: (value: string) => void;
  setFichier: (value: File | null) => void;
  onSubmit: () => void;
};

export default function DocumentForm(props: Props) {
  return (
    <div className="mt-8 bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Ajouter un document
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          className="border rounded-xl p-3 text-gray-900"
          placeholder="Titre du document *"
          value={props.titre}
          onChange={(e) => props.setTitre(e.target.value)}
        />

        <select
          className="border rounded-xl p-3 text-gray-900"
          value={props.categorie}
          onChange={(e) => props.setCategorie(e.target.value)}
        >
          <option>Sécurité incendie</option>
          <option>Maintenance</option>
          <option>Prestataires</option>
          <option>RH</option>
          <option>CSSCT</option>
          <option>Plans</option>
          <option>Photos</option>
          <option>Archives</option>
          <option>Autre</option>
        </select>

        <input
          className="border rounded-xl p-3 text-gray-900"
          placeholder="Secteur"
          value={props.secteur}
          onChange={(e) => props.setSecteur(e.target.value)}
        />

        <input
          className="border rounded-xl p-3 text-gray-900"
          placeholder="Prestataire"
          value={props.prestataire}
          onChange={(e) => props.setPrestataire(e.target.value)}
        />

        <input
          className="border rounded-xl p-3 text-gray-900"
          type="date"
          value={props.dateDocument}
          onChange={(e) => props.setDateDocument(e.target.value)}
        />

        <input
          className="border rounded-xl p-3 text-gray-900"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => props.setFichier(e.target.files?.[0] || null)}
        />
      </div>

      <textarea
        className="mt-4 w-full border rounded-xl p-3 text-gray-900"
        placeholder="Description"
        value={props.description}
        onChange={(e) => props.setDescription(e.target.value)}
      />

      {props.fichier && (
        <p className="mt-3 text-sm text-gray-500">
          Fichier sélectionné : {props.fichier.name}
        </p>
      )}

      <button
        onClick={props.onSubmit}
        disabled={props.loading}
        className="mt-4 bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-60"
      >
        {props.loading ? "Ajout..." : "Ajouter le document"}
      </button>
    </div>
  );
}