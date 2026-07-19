"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ajouterJournal } from "@/services/journal";
import {
  AppButton,
  AppCard,
  AppInput,
  AppPage,
  AppSelect,
  AppTextarea,
} from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

type RefItem = {
  id: string;
  nom: string;
};

export default function ModifierEquipementPage() {
  
  const params = useParams();
const id = params.id as string;

const { role } = useAuth();
const canEdit = role === "ADMIN" || role === "DM";

  const [types, setTypes] = useState<RefItem[]>([]);
  const [secteurs, setSecteurs] = useState<RefItem[]>([]);
  const [prestataires, setPrestataires] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");
  const [typeId, setTypeId] = useState("");
  const [secteurId, setSecteurId] = useState("");
  const [prestataireId, setPrestataireId] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [fabricant, setFabricant] = useState("");
  const [modele, setModele] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [dateInstallation, setDateInstallation] = useState("");
  const [dateMiseService, setDateMiseService] = useState("");
  const [prochaineVerification, setProchaineVerification] = useState("");
  const [etat, setEtat] = useState("En service");
  const [observations, setObservations] = useState("");
  

  async function chargerDonnees() {
    const { data: equipement } = await supabase
      .from("equipements")
      .select("*")
      .eq("id", id)
      .single();

    const { data: typesData } = await supabase
      .from("types_equipements")
      .select("id, nom")
      .order("nom");

    const { data: secteursData } = await supabase
      .from("secteurs")
      .select("id, nom")
      .order("nom");

    const { data: prestatairesData } = await supabase
      .from("prestataires")
      .select("id, nom")
      .order("nom");

    setTypes(typesData || []);
    setSecteurs(secteursData || []);
    setPrestataires(prestatairesData || []);

    if (equipement) {
      setNumero(equipement.numero || "");
      setNom(equipement.nom || "");
      setTypeId(equipement.type_id || "");
      setSecteurId(equipement.secteur_id || "");
      setPrestataireId(equipement.prestataire_id || "");
      setEmplacement(equipement.emplacement || "");
      setFabricant(equipement.fabricant || "");
      setModele(equipement.modele || "");
      setNumeroSerie(equipement.numero_serie || "");
      setDateInstallation(equipement.date_installation || "");
      setDateMiseService(equipement.date_mise_service || "");
      setProchaineVerification(equipement.prochaine_verification || "");
      setEtat(equipement.etat || "En service");
      setObservations(equipement.observations || "");
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function enregistrer() {
    if (!numero.trim() || !nom.trim() || !typeId) {
      alert("Merci de renseigner le numéro, le nom et le type.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("equipements")
      .update({
        numero: numero.trim(),
        nom: nom.trim(),
        type_id: typeId || null,
        secteur_id: secteurId || null,
        prestataire_id: prestataireId || null,
        emplacement: emplacement.trim() || null,
        fabricant: fabricant.trim() || null,
        modele: modele.trim() || null,
        numero_serie: numeroSerie.trim() || null,
        date_installation: dateInstallation || null,
        date_mise_service: dateMiseService || null,
        prochaine_verification: prochaineVerification || null,
        etat,
        observations: observations.trim() || null,
        updated_at: new Date(),
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      alert("Erreur modification équipement : " + error.message);
      return;
    }

    await ajouterJournal(
      "Modification",
      "Équipements",
      `Équipement modifié : ${numero} - ${nom}`
    );

    alert("Équipement modifié avec succès.");
    window.location.href = `/equipements/${id}`;
  }

  return (
    <AppShell>
      <AppPage
        title="Modifier l’équipement"
        subtitle="Mise à jour de la fiche équipement."
        actions={
          <AppButton
            variant="secondary"
            onClick={() => (window.location.href = `/equipements/${id}`)}
          >
            Retour
          </AppButton>
        }
      >
        <AppCard title="Informations générales">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppInput label="N° équipement *" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <AppInput label="Désignation *" value={nom} onChange={(e) => setNom(e.target.value)} />

            <AppSelect
              label="Type *"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...types.map((t) => ({ value: t.id, label: t.nom })),
              ]}
            />

            <AppSelect
              label="Secteur"
              value={secteurId}
              onChange={(e) => setSecteurId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...secteurs.map((s) => ({ value: s.id, label: s.nom })),
              ]}
            />

            <AppInput label="Emplacement" value={emplacement} onChange={(e) => setEmplacement(e.target.value)} />

            <AppSelect
              label="Prestataire"
              value={prestataireId}
              onChange={(e) => setPrestataireId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...prestataires.map((p) => ({ value: p.id, label: p.nom })),
              ]}
            />
          </div>
        </AppCard>

        <AppCard title="Informations techniques">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppInput label="Fabricant" value={fabricant} onChange={(e) => setFabricant(e.target.value)} />
            <AppInput label="Modèle" value={modele} onChange={(e) => setModele(e.target.value)} />
            <AppInput label="N° de série" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
          </div>
        </AppCard>

        <AppCard title="Dates et suivi">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AppInput label="Date installation" type="date" value={dateInstallation} onChange={(e) => setDateInstallation(e.target.value)} />
            <AppInput label="Mise en service" type="date" value={dateMiseService} onChange={(e) => setDateMiseService(e.target.value)} />
            <AppInput label="Prochaine vérification" type="date" value={prochaineVerification} onChange={(e) => setProchaineVerification(e.target.value)} />

            <AppSelect
              label="État"
              value={etat}
              onChange={(e) => setEtat(e.target.value)}
              options={[
                { value: "En service", label: "En service" },
                { value: "Hors service", label: "Hors service" },
                { value: "En maintenance", label: "En maintenance" },
                { value: "À remplacer", label: "À remplacer" },
                { value: "Déposé", label: "Déposé" },
              ]}
            />
          </div>
        </AppCard>

        <AppCard title="Observations">
          <AppTextarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-3">
            <AppButton variant="secondary" onClick={() => (window.location.href = `/equipements/${id}`)}>
              Annuler
            </AppButton>

            <AppButton loading={loading} onClick={enregistrer}>
              Enregistrer les modifications
            </AppButton>
          </div>
        </AppCard>
      </AppPage>
    </AppShell>
  );
}