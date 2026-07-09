"use client";

import { useEffect, useState } from "react";
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

type TypeEquipement = {
  id: string;
  nom: string;
};

type Secteur = {
  id: string;
  nom: string;
};

type Prestataire = {
  id: string;
  nom: string;
};

export default function NouvelEquipementPage() {
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
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

  async function chargerReferentiels() {
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
  }

  useEffect(() => {
    chargerReferentiels();
  }, []);

  async function enregistrerEquipement() {
    if (!numero.trim() || !nom.trim() || !typeId) {
      alert("Merci de renseigner le numéro, le nom et le type.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("equipements").insert({
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
    });

    setLoading(false);

    if (error) {
      alert("Erreur création équipement : " + error.message);
      return;
    }

    await ajouterJournal(
      "Création",
      "Équipements",
      `Équipement créé : ${numero} - ${nom}`
    );

    alert("Équipement créé avec succès.");
    window.location.href = "/equipements/liste";
  }

  return (
    <AppShell>
      <AppPage
        title="Nouvel équipement"
        subtitle="Création d’un équipement du patrimoine technique."
        actions={
          <AppButton
            variant="secondary"
            onClick={() => (window.location.href = "/equipements/liste")}
          >
            Retour
          </AppButton>
        }
      >
        <AppCard title="Informations générales">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppInput
              label="N° équipement *"
              placeholder="EA-001, BAES-015..."
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />

            <AppInput
              label="Désignation *"
              placeholder="Extincteur eau 9L"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />

            <AppSelect
              label="Type *"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...types.map((t) => ({
                  value: t.id,
                  label: t.nom,
                })),
              ]}
            />

            <AppSelect
              label="Secteur"
              value={secteurId}
              onChange={(e) => setSecteurId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...secteurs.map((s) => ({
                  value: s.id,
                  label: s.nom,
                })),
              ]}
            />

            <AppInput
              label="Emplacement"
              placeholder="Allée 12, local sprinkler..."
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value)}
            />

            <AppSelect
              label="Prestataire"
              value={prestataireId}
              onChange={(e) => setPrestataireId(e.target.value)}
              options={[
                { value: "", label: "Sélectionner..." },
                ...prestataires.map((p) => ({
                  value: p.id,
                  label: p.nom,
                })),
              ]}
            />
          </div>
        </AppCard>

        <AppCard title="Informations techniques">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppInput
              label="Fabricant"
              value={fabricant}
              onChange={(e) => setFabricant(e.target.value)}
            />

            <AppInput
              label="Modèle"
              value={modele}
              onChange={(e) => setModele(e.target.value)}
            />

            <AppInput
              label="N° de série"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
            />
          </div>
        </AppCard>

        <AppCard title="Dates et suivi">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AppInput
              label="Date installation"
              type="date"
              value={dateInstallation}
              onChange={(e) => setDateInstallation(e.target.value)}
            />

            <AppInput
              label="Mise en service"
              type="date"
              value={dateMiseService}
              onChange={(e) => setDateMiseService(e.target.value)}
            />

            <AppInput
              label="Prochaine vérification"
              type="date"
              value={prochaineVerification}
              onChange={(e) => setProchaineVerification(e.target.value)}
            />

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
            placeholder="Observations, remarques, détails techniques..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-3">
            <AppButton
              variant="secondary"
              onClick={() => (window.location.href = "/equipements/liste")}
            >
              Annuler
            </AppButton>

            <AppButton
              loading={loading}
              onClick={enregistrerEquipement}
            >
              Créer l’équipement
            </AppButton>
          </div>
        </AppCard>
      </AppPage>
    </AppShell>
  );
}