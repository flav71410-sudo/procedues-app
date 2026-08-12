"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Eye,
  List,
  X,
} from "lucide-react";

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
  const [lotsExistants, setLotsExistants] = useState<string[]>([]);

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
  const [lotSelectionne, setLotSelectionne] = useState("");
  const [nouveauLot, setNouveauLot] = useState("");
  const [fabricant, setFabricant] = useState("");
  const [modele, setModele] = useState("");
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

  const [equipementCree, setEquipementCree] = useState<{
    id: string;
    numero: string;
    nom: string;
    magasinNom: string;
  } | null>(null);

  const chargerReferentiels = useCallback(async () => {
    if (chargementAuth) {
      return;
    }

    if (vueTousMagasins || !magasinActif) {
      setTypes([]);
      setSecteurs([]);
      setPrestataires([]);
      setLotsExistants([]);
      setChargementReferentiels(false);
      return;
    }

    try {
      setChargementReferentiels(true);

      const [
        typesResult,
        secteursResult,
        prestatairesResult,
        lotsResult,
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

        supabase
          .from("equipements")
          .select("lot")
          .eq("magasin_id", magasinActif.id)
          .not("lot", "is", null),
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

      if (lotsResult.error) {
        throw lotsResult.error;
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

      setLotsExistants(
        Array.from(
          new Set(
            (lotsResult.data ?? [])
              .map((item) =>
                typeof item.lot === "string"
                  ? item.lot.trim()
                  : ""
              )
              .filter(Boolean)
          )
        ).sort((a, b) =>
          a.localeCompare(b, "fr")
        )
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
    setLotSelectionne("");
    setNouveauLot("");

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
          lot:
            (lotSelectionne === "__NOUVEAU__"
              ? nouveauLot.trim()
              : lotSelectionne.trim()) || null,
          emplacement: emplacement.trim() || null,
          fabricant: fabricant.trim() || null,
          modele: modele.trim() || null,
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

      setEquipementCree({
        id: data.id,
        numero: data.numero,
        nom: data.nom,
        magasinNom: magasinActif.nom,
      });
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
              label="Lot"
              value={lotSelectionne}
              onChange={(event) => {
                setLotSelectionne(event.target.value);
                if (event.target.value !== "__NOUVEAU__") {
                  setNouveauLot("");
                }
              }}
              options={[
                {
                  value: "",
                  label: "Aucun lot",
                },
                ...lotsExistants.map((lot) => ({
                  value: lot,
                  label: lot,
                })),
                {
                  value: "__NOUVEAU__",
                  label: "+ Créer un nouveau lot",
                },
              ]}
            />

            {lotSelectionne === "__NOUVEAU__" && (
              <AppInput
                label="Nom du nouveau lot"
                placeholder="Ex. Extincteurs extérieur"
                value={nouveauLot}
                onChange={(event) =>
                  setNouveauLot(event.target.value)
                }
              />
            )}

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

        {equipementCree && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipement-cree-title"
          >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl dark:border-emerald-900 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Création réussie
                    </p>

                    <h2
                      id="equipement-cree-title"
                      className="mt-1 text-2xl font-black text-slate-900 dark:text-white"
                    >
                      Équipement créé
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/equipements";
                  }}
                  aria-label="Fermer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    L’équipement a été créé avec succès.
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                    {equipementCree.numero} - {equipementCree.nom}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Magasin de rattachement
                  </p>

                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {equipementCree.magasinNom}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:justify-end">
                <AppButton
                  variant="secondary"
                  onClick={() => {
                    window.location.href = "/equipements";
                  }}
                >
                  <List className="h-4 w-4" />
                  Retour à la liste
                </AppButton>

                <AppButton
                  onClick={() => {
                    window.location.href = `/equipements/${equipementCree.id}`;
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Voir la fiche
                </AppButton>
              </div>
            </div>
          </div>
        )}
      </AppPage>
    </AppShell>
  );
}