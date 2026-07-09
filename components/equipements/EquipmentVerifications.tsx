"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AppBadge, AppButton, AppCard, AppEmptyState, AppInput, AppSelect, AppTextarea } from "@/components/ui";
import { useDialog } from "@/providers/DialogProvider";
import { ajouterHistorique } from "@/app/services/historique";

type TypeVerification = {
  id: string;
  nom: string;
  periodicite: number;
  unite: string;
};

type Verification = {
  id: string;
  type_verification: string;
  date_realisation: string;
  date_prochaine: string | null;
  resultat: string;
  prestataire: string | null;
  observations: string | null;
  created_at: string;
};

type Props = {
  equipementId: string;
  equipementNom: string;
};

export default function EquipmentVerifications({
  equipementId,
  equipementNom,
}: Props) {
  const dialog = useDialog();

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [types, setTypes] = useState<TypeVerification[]>([]);
  const [loading, setLoading] = useState(false);

  const [typeId, setTypeId] = useState("");
  const [dateRealisation, setDateRealisation] = useState("");
  const [resultat, setResultat] = useState("Conforme");
  const [prestataire, setPrestataire] = useState("");
  const [observations, setObservations] = useState("");

  async function chargerDonnees() {
    const { data: verifsData } = await supabase
      .from("verifications")
      .select("*")
      .eq("equipement_id", equipementId)
      .order("date_realisation", { ascending: false });

    const { data: typesData } = await supabase
      .from("types_verifications")
      .select("id, nom, periodicite, unite")
      .eq("actif", true)
      .order("nom");

    setVerifications(verifsData || []);
    setTypes(typesData || []);
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function calculerProchaineDate(date: string, type: TypeVerification) {
    const d = new Date(date);

    if (type.unite === "jour" || type.unite === "jours") {
      d.setDate(d.getDate() + type.periodicite);
    }

    if (type.unite === "semaine") {
      d.setDate(d.getDate() + type.periodicite * 7);
    }

    if (type.unite === "mois") {
      d.setMonth(d.getMonth() + type.periodicite);
    }

    if (type.unite === "an" || type.unite === "ans") {
      d.setFullYear(d.getFullYear() + type.periodicite);
    }

    return d.toISOString().split("T")[0];
  }

  async function ajouterVerification() {
    const type = types.find((t) => t.id === typeId);

    if (!type || !dateRealisation) {
      alert("Merci de renseigner le type et la date de réalisation.");
      return;
    }

    const dateProchaine = calculerProchaineDate(dateRealisation, type);

    setLoading(true);

    const { error } = await supabase.from("verifications").insert({
      equipement_id: equipementId,
      type_verification: type.nom,
      date_realisation: dateRealisation,
      date_prochaine: dateProchaine,
      resultat,
      prestataire: prestataire.trim() || null,
      observations: observations.trim() || null,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    await ajouterHistorique({
      module: "Équipements",
      objet: equipementNom,
      objetId: equipementId,
      action: "Vérification",
      description: `${type.nom} réalisée le ${new Date(
        dateRealisation
      ).toLocaleDateString("fr-FR")}. Prochaine échéance : ${new Date(
        dateProchaine
      ).toLocaleDateString("fr-FR")}.`,
    });

    setTypeId("");
    setDateRealisation("");
    setResultat("Conforme");
    setPrestataire("");
    setObservations("");

    chargerDonnees();
  }

  async function supprimerVerification(verification: Verification) {
    const ok = await dialog.delete({
      title: "Supprimer cette vérification ?",
      itemName: verification.type_verification,
      description:
        "Cette action supprimera la vérification de la fiche équipement.",
    });

    if (!ok) return;

    const { error } = await supabase
      .from("verifications")
      .delete()
      .eq("id", verification.id);

    if (error) {
      alert(error.message);
      return;
    }

    chargerDonnees();
  }

  function badgeResultat(resultat: string) {
    if (resultat === "Conforme") return "success";
    if (resultat === "Conforme avec réserve") return "warning";
    if (resultat === "Non conforme") return "danger";
    return "gray";
  }

  function statutEcheance(date: string | null) {
    if (!date) return null;

    const today = new Date();
    const echeance = new Date(date);
    const dans30Jours = new Date();
    dans30Jours.setDate(today.getDate() + 30);

    if (echeance < today) {
      return <AppBadge variant="danger">En retard</AppBadge>;
    }

    if (echeance <= dans30Jours) {
      return <AppBadge variant="warning">À venir</AppBadge>;
    }

    return <AppBadge variant="success">OK</AppBadge>;
  }

  return (
    <div className="space-y-6">
      <AppCard title="Nouvelle vérification">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AppSelect
            label="Type de vérification"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            options={[
              { value: "", label: "Sélectionner..." },
              ...types.map((type) => ({
                value: type.id,
                label: `${type.nom} (+${type.periodicite} ${type.unite})`,
              })),
            ]}
          />

          <AppInput
            label="Date de réalisation"
            type="date"
            value={dateRealisation}
            onChange={(e) => setDateRealisation(e.target.value)}
          />

          <AppSelect
            label="Résultat"
            value={resultat}
            onChange={(e) => setResultat(e.target.value)}
            options={[
              { value: "Conforme", label: "Conforme" },
              { value: "Conforme avec réserve", label: "Conforme avec réserve" },
              { value: "Non conforme", label: "Non conforme" },
              { value: "Hors service", label: "Hors service" },
            ]}
          />

          <AppInput
            label="Prestataire"
            value={prestataire}
            onChange={(e) => setPrestataire(e.target.value)}
            placeholder="Eurofeu, DEF, interne..."
          />

          <div className="md:col-span-2">
            <AppTextarea
              label="Observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observations, réserves, remarques..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <AppButton loading={loading} onClick={ajouterVerification}>
            <Plus size={16} />
            Ajouter la vérification
          </AppButton>
        </div>
      </AppCard>

      <AppCard title="Historique des vérifications">
        {verifications.length === 0 ? (
          <AppEmptyState
            icon={<CheckCircle size={42} />}
            title="Aucune vérification"
            description="Ajoute la première vérification de cet équipement."
          />
        ) : (
          <div className="space-y-3">
            {verifications.map((verification) => (
              <div
                key={verification.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {verification.type_verification}
                      </h3>

                      <AppBadge variant={badgeResultat(verification.resultat) as any}>
                        {verification.resultat}
                      </AppBadge>

                      {statutEcheance(verification.date_prochaine)}
                    </div>

                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                      Réalisée le{" "}
                      {new Date(verification.date_realisation).toLocaleDateString(
                        "fr-FR"
                      )}
                      {" "}• Prochaine :{" "}
                      {verification.date_prochaine
                        ? new Date(
                            verification.date_prochaine
                          ).toLocaleDateString("fr-FR")
                        : "—"}
                    </p>

                    {verification.prestataire && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Prestataire : {verification.prestataire}
                      </p>
                    )}

                    {verification.observations && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">
                        {verification.observations}
                      </p>
                    )}
                  </div>

                  <AppButton
                    variant="danger"
                    className="px-3 py-2 text-xs"
                    onClick={() => supprimerVerification(verification)}
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </AppButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}