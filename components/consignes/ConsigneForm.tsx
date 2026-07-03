import { X } from "lucide-react";

type Props = {
  titre: string;
  contenu: string;
  categorie: string;
  priorite: string;
  secteur: string;
  fichier: File | null;
  loading: boolean;
  editingId: string | null;
  setTitre: (value: string) => void;
  setContenu: (value: string) => void;
  setCategorie: (value: string) => void;
  setPriorite: (value: string) => void;
  setSecteur: (value: string) => void;
  setFichier: (value: File | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function ConsigneForm(props: Props) {
  return (
    <div className="mt-6 bg-white rounded-2xl shadow p-6 space-y-4">
      {props.editingId && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 p-4">
          <p className="text-orange-800 font-semibold">Mode modification activé</p>
          <button onClick={props.onCancel} className="flex items-center gap-2 text-orange-700">
            <X size={18} />
            Annuler
          </button>
        </div>
      )}

      <input className="w-full border rounded-xl p-3 text-gray-900" placeholder="Titre de la consigne" value={props.titre} onChange={(e) => props.setTitre(e.target.value)} />

      <textarea className="w-full border rounded-xl p-3 text-gray-900 min-h-32" placeholder="Contenu de la consigne" value={props.contenu} onChange={(e) => props.setContenu(e.target.value)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select className="w-full border rounded-xl p-3 text-gray-900" value={props.categorie} onChange={(e) => props.setCategorie(e.target.value)}>
          <option>Sécurité</option>
          <option>Maintenance</option>
          <option>Logistique</option>
          <option>Caisse</option>
          <option>Jardin</option>
          <option>Bâti</option>
          <option>Administratif</option>
          <option>Autre</option>
        </select>

        <select className="w-full border rounded-xl p-3 text-gray-900" value={props.priorite} onChange={(e) => props.setPriorite(e.target.value)}>
          <option value="basse">Basse</option>
          <option value="normale">Normale</option>
          <option value="haute">Haute</option>
          <option value="critique">Critique</option>
        </select>

        <input className="w-full border rounded-xl p-3 text-gray-900" placeholder="Secteur" value={props.secteur} onChange={(e) => props.setSecteur(e.target.value)} />
      </div>

      {!props.editingId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ajouter un fichier</label>
          <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => props.setFichier(e.target.files?.[0] || null)} className="w-full border rounded-xl p-3 text-gray-900" />
          {props.fichier && <p className="text-sm text-gray-500 mt-2">Fichier sélectionné : {props.fichier.name}</p>}
        </div>
      )}

      <button onClick={props.onSubmit} disabled={props.loading} className="bg-[#0078b8] hover:bg-[#00649a] text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-60">
        {props.editingId
          ? props.loading
            ? "Modification en cours..."
            : "Enregistrer les modifications"
          : props.loading
          ? "Ajout en cours..."
          : "Ajouter la consigne"}
      </button>
    </div>
  );
}