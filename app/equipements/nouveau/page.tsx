"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AppShell from "@/components/AppShell";
import {
  AppButton,
  AppCard,
  AppInput,
  AppPage,
  AppSelect,
  AppTextarea,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { ajouterJournal } from "@/services/journal";

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

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "Une erreur inconnue est survenue.";
}

export default function NouvelEquipementPage() {
  const {
    can,
    magasinActif,
    vueTousMagasins,
    loading: chargementAuth,
  } = useAuth();

  const canCreate = can("equipements.edit");

  const [types, setTypes] = useState<
    TypeEquipement[]
  >([]);
  const [secteurs, setSecteurs] = useState<
    Secteur[]
  >([]);
  const [prestataires, setPrestataires] =
    useState<Prestataire[]>([]);

  const [chargementReferentiels, setChargementReferentiels] =
    useState(true);
  const [loading, setLoading] = useState(false);

  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");
  const [typeId, setTypeId] = useState("");
  const [secteurId, setSecteurId] = useState("");
  const [prestataireId, setPrestataireId] =
    useState("");
  const [emplacement, setEmplacement] =
    useState("");
  const [fabricant, setFabricant] = useState("");
  const [modele, setModele] = useState("");
  const [numeroSerie, setNumeroSerie] =
    useState("");
  const [dateInstallation, setDateInstallation] =
    useState("");
  const [dateMiseService, setDateMiseService] =
    useState("");
  const [
    prochaineVerification,
    setProchaineVerification,
  ] = useState("");
  const [etat, setEtat] = useState("En service");
  const [observations, setObservations] =
    useState("");

  const chargerReferentiels = useCallback(async () => {
    if (chargementAuth) {
      return;
    }

    if (vueTousMagasins || !magasinActif) {
      setTypes([]);
      setSecteurs([]);
      setPrestataires([]);
      setChargementReferentiels(false);
      return;
    }

    try {
      setChargementReferentiels(true);

      const [
        typesResult,
        secteursResult,
        prestatairesResult,
      ] = await Promise.all([
        supabase
          .from("types_equipements")
          .select("id, nom")
          .order("nom", { ascending: true }),

        supabase
          .from("secteurs")
          .select("id, nom")
          .eq("magasin_id", magasinActif.id)
          .order("nom", { ascending: true }),

        supabase
          .from("prestataires")
          .select("id, nom")
          .eq("magasin_id", magasinActif.id)
          .order("nom", { ascending: true }),
      ]);

      if (typesResult.error) {
        throw typesResult.error;
      }

      if (secteursResult.error) {
        throw secteursResult.error;
      }

      if (prestatairesResult.error) {
        throw prestatairesResult.error;
      }

      setTypes(
        (typesResult.data ?? []) as TypeEquipement[]
      );
      setSecteurs(
        (secteursResult.data ?? []) as Secteur[]
      );
      setPrestataires(
        (prestatairesResult.data ??
          []) as Prestataire[]
      );
    } catch (error) {
      console.error(
        "Erreur chargement référentiels :",
        error
      );

      alert(
        `Erreur chargement des référentiels : ${getErrorMessage(
          error
        )}`
      );
    } finally {
      setChargementReferentiels(false);
    }
  }, [
    chargementAuth,
    magasinActif,
    vueTousMagasins,
  ]);

  useEffect(() => {
    setSecteurId("");
    setPrestataireId("");

    void chargerReferentiels();
  }, [chargerReferentiels]);

  async function enregistrerEquipement() {
    if (!canCreate) {
      alert(
        "Vous n’êtes pas autorisé à créer un équipement."
      );
      return;
    }

    if (chargementAuth) {
      alert(
        "Le profil utilisateur est encore en cours de chargement."
      );
      return;
    }

    if (vueTousMagasins || !magasinActif) {
      alert(
        "Sélectionnez un magasin précis avant de créer un équipement."
      );
      return;
    }

    if (!numero.trim() || !nom.trim() || !typeId) {
      alert(
        "Merci de renseigner le numéro, le nom et le type."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipements")
        .insert({
          magasin_id: magasinActif.id,
          numero: numero.trim(),
          nom: nom.trim(),
          type_id: typeId,
          secteur_id: secteurId || null,
          prestataire_id: prestataireId || null,
          emplacement: emplacement.trim() || null,
          fabricant: fabricant.trim() || null,
          modele: modele.trim() || null,
          numero_serie:
            numeroSerie.trim() || null,
          date_installation:
            dateInstallation || null,
          date_mise_service:
            dateMiseService || null,
          prochaine_verification:
            prochaineVerification || null,
          etat,
          observations:
            observations.trim() || null,
        })
        .select(
          "id, numero, nom, magasin_id"
        )
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Aucun équipement n’a été retourné après la création."
        );
      }

      if (data.magasin_id !== magasinActif.id) {
        throw new Error(
          "Le magasin enregistré ne correspond pas au magasin actif."
        );
      }

      await ajouterJournal(
        "Création",
        "Équipements",
        `Équipement créé : ${data.numero} - ${data.nom} (${magasinActif.nom})`
      );

      alert(
        `Équipement créé avec succès dans ${magasinActif.nom}.`
      );

      window.location.href = "/equipements";
    } catch (error) {
      console.error(
        "Erreur création équipement :",
        error
      );

      const message = getErrorMessage(error);

      if (
        message.includes(
          "equipements_magasin_numero_key"
        ) ||
        message.includes("duplicate key value")
      ) {
        alert(
          `Le numéro « ${numero.trim()} » existe déjà dans ${magasinActif.nom}.`
        );
      } else {
        alert(
          `Erreur création équipement : ${message}`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const creationDesactivee =
    loading ||
    chargementAuth ||
    chargementReferentiels ||
    vueTousMagasins ||
    !magasinActif ||
    !canCreate;

  return (
    <AppShell>
      <AppPage
        title="Nouvel équipement"
        subtitle="Création d’un équipement du patrimoine technique."
        actions={
          <AppButton
            variant="secondary"
            onClick={() => {
              window.location.href = "/equipements";
            }}
          >
            Retour
          </AppButton>
        }
      >
        <AppCard title="Magasin">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <p className="text-sm font-semibold">
              Magasin de rattachement
            </p>

            <p className="mt-1 text-lg font-bold">
              {vueTousMagasins
                ? "Sélectionnez un magasin précis"
                : magasinActif?.nom ??
                  "Aucun magasin sélectionné"}
            </p>

            <p className="mt-1 text-sm">
              L’équipement sera visible uniquement dans ce
              magasin.
            </p>
          </div>
        </AppCard>

        <AppCard title="Informations générales">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AppInput
              label="N° équipement *"
              placeholder="EA-001, BAES-015..."
              value={numero}
              onChange={(event) =>
                setNumero(event.target.value)
              }
            />

            <AppInput
              label="Désignation *"
              placeholder="Extincteur eau 9L"
              value={nom}
              onChange={(event) =>
                setNom(event.target.value)
              }
            />

            <AppSelect
              label="Type *"
              value={typeId}
              onChange={(event) =>
                setTypeId(event.target.value)
              }
              options={[
                {
                  value: "",
                  label: chargementReferentiels
                    ? "Chargement..."
                    : "Sélectionner...",
                },
                ...types.map((type) => ({
                  value: type.id,
                  label: type.nom,
                })),
              ]}
            />

            <AppSelect
              label="Secteur"
              value={secteurId}
              onChange={(event) =>
                setSecteurId(event.target.value)
              }
              options={[
                {
                  value: "",
                  label:
                    secteurs.length > 0
                      ? "Sélectionner..."
                      : "Aucun secteur disponible",
                },
                ...secteurs.map((secteur) => ({
                  value: secteur.id,
                  label: secteur.nom,
                })),
              ]}
            />

            <AppInput
              label="Emplacement"
              placeholder="Allée 12, local sprinkler..."
              value={emplacement}
              onChange={(event) =>
                setEmplacement(event.target.value)
              }
            />

            <AppSelect
              label="Prestataire"
              value={prestataireId}
              onChange={(event) =>
                setPrestataireId(event.target.value)
              }
              options={[
                {
                  value: "",
                  label:
                    prestataires.length > 0
                      ? "Sélectionner..."
                      : "Aucun prestataire disponible",
                },
                ...prestataires.map(
                  (prestataire) => ({
                    value: prestataire.id,
                    label: prestataire.nom,
                  })
                ),
              ]}
            />
          </div>
        </AppCard>

        <AppCard title="Informations techniques">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AppInput
              label="Fabricant"
              value={fabricant}
              onChange={(event) =>
                setFabricant(event.target.value)
              }
            />

            <AppInput
              label="Modèle"
              value={modele}
              onChange={(event) =>
                setModele(event.target.value)
              }
            />

            <AppInput
              label="N° de série"
              value={numeroSerie}
              onChange={(event) =>
                setNumeroSerie(event.target.value)
              }
            />
          </div>
        </AppCard>

        <AppCard title="Dates et suivi">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <AppInput
              label="Date installation"
              type="date"
              value={dateInstallation}
              onChange={(event) =>
                setDateInstallation(
                  event.target.value
                )
              }
            />

            <AppInput
              label="Mise en service"
              type="date"
              value={dateMiseService}
              onChange={(event) =>
                setDateMiseService(
                  event.target.value
                )
              }
            />

            <AppInput
              label="Prochaine vérification"
              type="date"
              value={prochaineVerification}
              onChange={(event) =>
                setProchaineVerification(
                  event.target.value
                )
              }
            />

            <AppSelect
              label="État"
              value={etat}
              onChange={(event) =>
                setEtat(event.target.value)
              }
              options={[
                {
                  value: "En service",
                  label: "En service",
                },
                {
                  value: "Hors service",
                  label: "Hors service",
                },
                {
                  value: "En maintenance",
                  label: "En maintenance",
                },
                {
                  value: "À remplacer",
                  label: "À remplacer",
                },
                {
                  value: "Déposé",
                  label: "Déposé",
                },
              ]}
            />
          </div>
        </AppCard>

        <AppCard title="Observations">
          <AppTextarea
            placeholder="Observations, remarques, détails techniques..."
            value={observations}
            onChange={(event) =>
              setObservations(event.target.value)
            }
          />

          <div className="mt-6 flex justify-end gap-3">
            <AppButton
              variant="secondary"
              disabled={loading}
              onClick={() => {
                window.location.href = "/equipements";
              }}
            >
              Annuler
            </AppButton>

            <AppButton
              loading={loading}
              disabled={creationDesactivee}
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