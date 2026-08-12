"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AppBadge, AppButton, AppCard, AppEmptyState, AppInput, AppSelect, AppTextarea } from "@/components/ui";
import { useDialog } from "@/providers/DialogProvider";
import { ajouterHistorique } from "@/app/services/historique";
import { useAuth } from "@/providers/AuthProvider";

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
  onRefresh?: () => void | Promise<void>;
};

function normaliserTexte(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function EquipmentVerifications({
  equipementId,
  equipementNom,
  onRefresh,
}: Props) {
  const dialog = useDialog();
  const { can } = useAuth();
  const canEdit = can("equipements.edit");

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

    const unite = normaliserTexte(type.unite);

    if (unite === "jour" || unite === "jours") {
      d.setDate(d.getDate() + type.periodicite);
    }

    if (unite === "semaine" || unite === "semaines") {
      d.setDate(d.getDate() + type.periodicite * 7);
    }

    if (unite === "mois") {
      d.setMonth(d.getMonth() + type.periodicite);
    }

    if (
      unite === "an" ||
      unite === "ans" ||
      unite === "annee" ||
      unite === "annees"
    ) {
      d.setFullYear(d.getFullYear() + type.periodicite);
    }

    return d.toISOString().split("T")[0];
  }

  async function mettreAJourProchaineVerification(
    dateProchaine: string | null
  ) {
    const { error } = await supabase
      .from("equipements")
      .update({
        prochaine_verification: dateProchaine,
      })
      .eq("id", equipementId);

    if (error) {
      throw new Error(
        `La vérification a été enregistrée, mais la prochaine échéance de l’équipement n’a pas pu être mise à jour : ${error.message}`
      );
    }
  }

  async function terminerEvenementPlanningLie(
    typeNom: string,
    dateRealisee: string
  ) {
    const { data: evenements, error } = await supabase
      .from("planning_evenements")
      .select(
        "id, titre, categorie, date_evenement, statut, maintenance_id"
      )
      .eq("equipement_id", equipementId)
      .eq("actif", true)
      .is("maintenance_id", null)
      .lte("date_evenement", dateRealisee)
      .neq("statut", "termine")
      .neq("statut", "annule")
      .order("date_evenement", { ascending: false });

    if (error) {
      throw new Error(
        `La vérification a été enregistrée, mais impossible de rechercher l'événement Planning associé : ${error.message}`
      );
    }

    const typeNormalise = normaliserTexte(typeNom);

    const evenementLie = (evenements ?? []).find((evenement) => {
      const titre = normaliserTexte(evenement.titre);
      const categorie = normaliserTexte(evenement.categorie);

      const categorieVerification =
        categorie.includes("verif") ||
        categorie.includes("controle") ||
        categorie.includes("inspection");

      const titreCorrespond =
        typeNormalise.length > 0 &&
        (titre.includes(typeNormalise) ||
          typeNormalise.includes(titre));

      return categorieVerification || titreCorrespond;
    });

    if (!evenementLie) {
      return;
    }

    const { error: updateError } = await supabase
      .from("planning_evenements")
      .update({
        statut: "termine",
        updated_at: new Date().toISOString(),
      })
      .eq("id", evenementLie.id);

    if (updateError) {
      throw new Error(
        `La vérification a été enregistrée, mais impossible de clôturer l'événement Planning associé : ${updateError.message}`
      );
    }
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

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    try {
      await mettreAJourProchaineVerification(
        dateProchaine
      );

      // Une vérification enregistrée correspond à une échéance réalisée :
      // on clôture automatiquement l'événement Planning associé pour
      // éviter qu'il reste en alerte "en retard" sur le tableau de bord.
      await terminerEvenementPlanningLie(
        type.nom,
        dateRealisation
      );
    } catch (syncError) {
      setLoading(false);
      alert(
        syncError instanceof Error
          ? syncError.message
          : "La vérification a été enregistrée mais la synchronisation du planning a échoué."
      );
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

    setLoading(false);

    setTypeId("");
    setDateRealisation("");
    setResultat("Conforme");
    setPrestataire("");
    setObservations("");

    await chargerDonnees();

    if (onRefresh) {
      await onRefresh();
    }
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

    const { data: restantes, error: restantesError } =
      await supabase
        .from("verifications")
        .select("date_prochaine")
        .eq("equipement_id", equipementId)
        .order("date_realisation", {
          ascending: false,
        })
        .limit(1);

    if (restantesError) {
      alert(restantesError.message);
      return;
    }

    const prochaine =
      restantes?.[0]?.date_prochaine ?? null;

    try {
      await mettreAJourProchaineVerification(
        prochaine
      );
    } catch (syncError) {
      alert(
        syncError instanceof Error
          ? syncError.message
          : "Impossible de mettre à jour la prochaine vérification de l’équipement."
      );
      return;
    }

    await chargerDonnees();

    if (onRefresh) {
      await onRefresh();
    }
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
      {canEdit && (
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Prochaine vérification calculée
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {typeId && dateRealisation
                ? (() => {
                    const type = types.find(
                      (item) => item.id === typeId
                    );

                    return type
                      ? new Date(
                          `${calculerProchaineDate(
                            dateRealisation,
                            type
                          )}T12:00:00`
                        ).toLocaleDateString("fr-FR")
                      : "—";
                  })()
                : "Renseigne le type et la date de réalisation."}
            </p>
          </div>

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
      )}

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

                  {canEdit && (
                    <AppButton
                      variant="danger"
                      className="px-3 py-2 text-xs"
                      onClick={() => supprimerVerification(verification)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </AppButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}