"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Printer,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type Equipement = {
  id: string;
  numero: string;
  nom: string;
  emplacement: string | null;
  etat: string | null;
  fabricant: string | null;
  modele: string | null;
  numero_serie: string | null;
  date_installation: string | null;
  date_mise_service: string | null;
  prochaine_verification: string | null;
  observations: string | null;
  type_id: string | null;
  secteur_id: string | null;
  prestataire_id: string | null;
  magasin_id: string | null;
};

type RefItem = {
  id: string;
  nom: string;
};

type MaintenanceRow = {
  id: string;
  numero: string | null;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  technicien: string | null;
  travaux_realises: string | null;
  observations: string | null;
};

type VerificationRow = Record<string, unknown> & {
  id: string;
};

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateHeure(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function texte(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }

  return String(value);
}

function firstValue(
  row: VerificationRow,
  keys: string[]
): unknown {
  for (const key of keys) {
    if (
      key in row &&
      row[key] !== null &&
      row[key] !== undefined &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }

  return null;
}

export default function EquipementPrintPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id ?? "");

  const {
    profil,
    user,
    magasinActif,
    loading: authLoading,
  } = useAuth();

  const [equipement, setEquipement] =
    useState<Equipement | null>(null);
  const [types, setTypes] = useState<RefItem[]>([]);
  const [secteurs, setSecteurs] = useState<RefItem[]>([]);
  const [prestataires, setPrestataires] =
    useState<RefItem[]>([]);
  const [magasinNom, setMagasinNom] = useState("");
  const [maintenances, setMaintenances] =
    useState<MaintenanceRow[]>([]);
  const [verifications, setVerifications] =
    useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateImpression = useMemo(() => new Date(), []);

  const nomUtilisateur = useMemo(() => {
    const nom = profil?.nom?.trim() ?? "";
    const prenom = profil?.prenom?.trim() ?? "";
    const complet = `${prenom} ${nom}`.trim();

    return complet || user?.email || "Utilisateur connecté";
  }, [profil?.nom, profil?.prenom, user?.email]);

  const roleUtilisateur =
    profil?.roleNom ??
    profil?.role ??
    "Utilisateur";

  const charger = useCallback(async () => {
    if (!id || authLoading) return;

    try {
      setLoading(true);
      setError(null);

      const equipementResult = await supabase
        .from("equipements")
        .select("*")
        .eq("id", id)
        .single();

      if (equipementResult.error) {
        throw equipementResult.error;
      }

      const equipementData =
        equipementResult.data as Equipement;

      const [
        typesResult,
        secteursResult,
        prestatairesResult,
        maintenancesResult,
        verificationsResult,
        magasinResult,
      ] = await Promise.all([
        supabase
          .from("types_equipements")
          .select("id, nom"),
        supabase
          .from("secteurs")
          .select("id, nom"),
        supabase
          .from("prestataires")
          .select("id, nom"),
        supabase
          .from("maintenances")
          .select(
            "id, numero, titre, date_debut, date_fin, technicien, travaux_realises, observations"
          )
          .eq("equipement_id", id)
          .order("date_debut", { ascending: false }),
        supabase
          .from("equipements_verifications")
          .select("*")
          .eq("equipement_id", id)
          .order("created_at", { ascending: false }),
        equipementData.magasin_id
          ? supabase
              .from("magasins")
              .select("nom")
              .eq("id", equipementData.magasin_id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),
      ]);

      if (typesResult.error) throw typesResult.error;
      if (secteursResult.error) throw secteursResult.error;
      if (prestatairesResult.error) throw prestatairesResult.error;
      if (maintenancesResult.error) {
        throw maintenancesResult.error;
      }

      // Les vérifications sont secondaires pour l'impression :
      // si la table évolue, la fiche reste imprimable.
      if (verificationsResult.error) {
        console.warn(
          "Impossible de charger les vérifications pour l'impression :",
          verificationsResult.error
        );
      }

      if (magasinResult.error) {
        console.warn(
          "Impossible de charger le nom du magasin :",
          magasinResult.error
        );
      }

      setEquipement(equipementData);
      setTypes((typesResult.data ?? []) as RefItem[]);
      setSecteurs(
        (secteursResult.data ?? []) as RefItem[]
      );
      setPrestataires(
        (prestatairesResult.data ?? []) as RefItem[]
      );
      setMaintenances(
        (maintenancesResult.data ?? []) as MaintenanceRow[]
      );
      setVerifications(
        (verificationsResult.data ?? []) as VerificationRow[]
      );
      setMagasinNom(
        magasinResult.data?.nom ??
          magasinActif?.nom ??
          "Magasin non défini"
      );
    } catch (currentError) {
      console.error(
        "Erreur chargement fiche équipement imprimable :",
        currentError
      );

      setError(
        currentError instanceof Error
          ? currentError.message
          : "Impossible de charger la fiche équipement."
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, id, magasinActif?.nom]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const typeMap = useMemo(
    () =>
      new Map(
        types.map((item) => [item.id, item.nom])
      ),
    [types]
  );

  const secteurMap = useMemo(
    () =>
      new Map(
        secteurs.map((item) => [
          item.id,
          item.nom,
        ])
      ),
    [secteurs]
  );

  const prestataireMap = useMemo(
    () =>
      new Map(
        prestataires.map((item) => [
          item.id,
          item.nom,
        ])
      ),
    [prestataires]
  );

  if (loading || authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-700">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          Préparation de la fiche...
        </div>
      </main>
    );
  }

  if (error || !equipement) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          {error ?? "Équipement introuvable."}
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 font-semibold"
        >
          Retour
        </button>
      </main>
    );
  }

  const typeNom = equipement.type_id
    ? typeMap.get(equipement.type_id) ?? "—"
    : "—";

  const secteurNom = equipement.secteur_id
    ? secteurMap.get(equipement.secteur_id) ?? "—"
    : "—";

  const prestataireNom = equipement.prestataire_id
    ? prestataireMap.get(
        equipement.prestataire_id
      ) ?? "—"
    : "—";

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }

          .avoid-break {
            break-inside: avoid;
          }

          table {
            break-inside: auto;
          }

          tr {
            break-inside: avoid;
            break-after: auto;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      <article className="print-card mx-auto max-w-[210mm] bg-white p-8 shadow-xl">
        <header className="border-b-4 border-blue-600 pb-5">
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="text-2xl font-black tracking-tight text-blue-700">
                CASTORAMA
              </p>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                CastoManager
              </p>
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900">
                Fiche équipement
              </h1>
              <p className="mt-1 font-mono text-sm font-bold text-blue-700">
                {equipement.numero}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-600">
            <p>
              <strong>Magasin :</strong>{" "}
              {magasinNom}
            </p>
            <p className="text-right">
              <strong>Imprimé le :</strong>{" "}
              {formatDateHeure(dateImpression)}
            </p>
            <p>
              <strong>Imprimé par :</strong>{" "}
              {nomUtilisateur}
            </p>
            <p className="text-right">
              <strong>Rôle :</strong>{" "}
              {roleUtilisateur}
            </p>
          </div>
        </header>

        <section className="avoid-break mt-6">
          <h2 className="mb-3 border-b border-slate-300 pb-2 text-base font-black uppercase tracking-wide text-slate-800">
            Informations générales
          </h2>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="N° équipement" value={equipement.numero} />
            <Info label="Désignation" value={equipement.nom} />
            <Info label="Type" value={typeNom} />
            <Info label="Secteur" value={secteurNom} />
            <Info
              label="Emplacement"
              value={equipement.emplacement ?? "—"}
            />
            <Info
              label="État"
              value={equipement.etat ?? "—"}
            />
            <Info
              label="Prestataire"
              value={prestataireNom}
            />
            <Info
              label="Fabricant"
              value={equipement.fabricant ?? "—"}
            />
            <Info
              label="Modèle"
              value={equipement.modele ?? "—"}
            />
            <Info
              label="N° de série"
              value={equipement.numero_serie ?? "—"}
            />
            <Info
              label="Date installation"
              value={formatDate(
                equipement.date_installation
              )}
            />
            <Info
              label="Mise en service"
              value={formatDate(
                equipement.date_mise_service
              )}
            />
            <Info
              label="Prochaine vérification"
              value={formatDate(
                equipement.prochaine_verification
              )}
            />
          </div>
        </section>

        <section className="avoid-break mt-6">
          <h2 className="mb-3 border-b border-slate-300 pb-2 text-base font-black uppercase tracking-wide text-slate-800">
            Observations
          </h2>

          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {equipement.observations ||
              "Aucune observation."}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 border-b border-slate-300 pb-2 text-base font-black uppercase tracking-wide text-slate-800">
            Vérifications
          </h2>

          {verifications.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune vérification enregistrée.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Date
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Vérification
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Résultat / statut
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Observations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {formatDate(
                          firstValue(item, [
                            "date_verification",
                            "date_realisation",
                            "date",
                            "created_at",
                          ])
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2 font-semibold">
                        {texte(
                          firstValue(item, [
                            "titre",
                            "type",
                            "libelle",
                            "nom",
                          ])
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {texte(
                          firstValue(item, [
                            "resultat",
                            "statut",
                            "conformite",
                          ])
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {texte(
                          firstValue(item, [
                            "observations",
                            "commentaire",
                            "anomalies",
                          ])
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-3 border-b border-slate-300 pb-2 text-base font-black uppercase tracking-wide text-slate-800">
            Historique des maintenances
          </h2>

          {maintenances.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune maintenance liée à cet équipement.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Date
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      N°
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Intervention
                    </th>
                    <th className="border-b border-slate-300 px-3 py-2">
                      Intervenant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {maintenances.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {formatDate(item.date_debut)}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2 font-mono">
                        {item.numero ?? "—"}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2">
                        <p className="font-semibold">
                          {item.titre}
                        </p>
                        {(item.travaux_realises ||
                          item.observations) && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {item.travaux_realises ??
                              item.observations}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2">
                        {item.technicien ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-4 text-center text-[10px] text-slate-500">
          Document généré automatiquement par CastoManager · {magasinNom} ·{" "}
          {formatDateHeure(dateImpression)}
        </footer>
      </article>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}