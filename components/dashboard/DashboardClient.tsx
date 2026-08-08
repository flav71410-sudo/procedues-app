"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  Building2,
  RefreshCw,
  Settings,
  ShieldAlert,
} from "lucide-react";

import AlertsPanel from "@/components/dashboard/AlertsPanel";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EquipmentCharts from "@/components/dashboard/EquipmentCharts";
import HealthScoreCard from "@/components/dashboard/HealthScoreCard";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/dashboard/StatsCards";
import { AppButton } from "@/components/ui";
import SupervisionCenter from "@/components/dashboard/SupervisionCenter";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

import {
  type DashboardData,
  getDashboardData,
} from "@/services/dashboard/dashboardService";

export default function DashboardClient() {
  const {
    role,
    profil,
    can,
    magasinActif,
    magasinsDisponibles,
    vueTousMagasins,
    peutChangerMagasin,
    changerMagasinActif,
    loading: chargementAuth,
  } = useAuth();

  const estCollaborateur = role === "COLLABORATEUR";
  const compteBloque = profil?.actif === false;
  const accesRestreint = estCollaborateur || compteBloque;

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [parametresACompleter, setParametresACompleter] =
    useState(false);

  const [verificationParametres, setVerificationParametres] =
    useState(false);

  const verifierParametresMagasin = useCallback(
    async () => {
      if (
        chargementAuth ||
        accesRestreint ||
        !can("settings.view") ||
        vueTousMagasins ||
        !magasinActif
      ) {
        setParametresACompleter(false);
        setVerificationParametres(false);
        return;
      }

      try {
        setVerificationParametres(true);

        const { data, error: parametresError } =
          await supabase
            .from("parametres")
            .select("cle, valeur")
            .eq("magasin_id", magasinActif.id)
            .in("cle", [
              "directeur magasin",
              "email_contact",
              "responsable_securite",
              "telephone_magasin",
            ]);

        if (parametresError) {
          throw parametresError;
        }

        const valeurs = new Map(
          (data ?? []).map((parametre) => [
            parametre.cle,
            parametre.valeur?.trim() ?? "",
          ])
        );

        const clesObligatoires = [
          "directeur magasin",
          "email_contact",
          "responsable_securite",
          "telephone_magasin",
        ];

        const configurationIncomplete =
          clesObligatoires.some(
            (cle) => !valeurs.get(cle)
          );

        setParametresACompleter(
          configurationIncomplete
        );
      } catch (currentError) {
        console.error(
          "Erreur vérification paramètres magasin :",
          currentError
        );

        // En cas d'erreur de contrôle, on ne bloque pas le tableau de bord
        // et on évite d'afficher une alerte potentiellement erronée.
        setParametresACompleter(false);
      } finally {
        setVerificationParametres(false);
      }
    },
    [
      can,
      chargementAuth,
      accesRestreint,
      magasinActif,
      vueTousMagasins,
    ]
  );

  const chargerDashboard = useCallback(
    async (manualRefresh = false) => {
      if (chargementAuth) {
        return;
      }

      if (accesRestreint) {
        setDashboardData(null);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      if (!vueTousMagasins && !magasinActif) {
        setDashboardData(null);
        setLoading(false);
        setError(
          "Aucun magasin actif. Sélectionne un magasin."
        );
        return;
      }

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await getDashboardData({
          magasinId: magasinActif?.id ?? null,
          tousMagasins: vueTousMagasins,
        });

        setDashboardData(data);
      } catch (dashboardError) {
        console.error(
          "Erreur lors du chargement du dashboard :",
          dashboardError
        );

        setDashboardData(null);

        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : "Impossible de charger les données du dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      chargementAuth,
      accesRestreint,
      magasinActif?.id,
      vueTousMagasins,
    ]
  );

  useEffect(() => {
    void chargerDashboard();
  }, [chargerDashboard]);

  useEffect(() => {
    void verifierParametresMagasin();
  }, [verifierParametresMagasin]);

  const libelleVue = vueTousMagasins
    ? "Tous les magasins"
    : magasinActif?.nom ?? "Aucun magasin";

  return (
    <main className="space-y-6">
      <DashboardHeader />

      {compteBloque ? (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              Compte bloqué
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              Accès suspendu
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300">
              Votre compte a été bloqué. Merci de contacter votre responsable
              ou le Super administrateur.
            </p>

            <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Tant que votre compte reste désactivé, les modules de CastoManager
              restent inaccessibles.
            </p>
          </div>
        </section>
      ) : estCollaborateur ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Compte en attente d’attribution
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              Bienvenue {profil?.prenom?.trim() || "dans CastoManager"}
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300">
              Merci de contacter votre responsable sécurité maintenance ou, à défaut,
              le Super administrateur pour obtenir le rôle correspondant à votre magasin.
            </p>

            <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Tant qu’un rôle métier ne vous a pas été attribué, les modules de
              CastoManager restent inaccessibles.
            </p>
          </div>
        </section>
      ) : (
        <>
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Données consultées
            </p>

            <p className="truncate font-bold text-slate-900 dark:text-white">
              {libelleVue}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {peutChangerMagasin && (
            <select
              value={
                vueTousMagasins
                  ? "__TOUS__"
                  : magasinActif?.id ?? ""
              }
              onChange={(event) => {
                const value = event.target.value;

                changerMagasinActif(
                  value === "__TOUS__" ? null : value
                );
              }}
              className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="__TOUS__">
                Tous les magasins
              </option>

              {magasinsDisponibles.map((magasin) => (
                <option
                  key={magasin.id}
                  value={magasin.id}
                >
                  {magasin.nom}
                </option>
              ))}
            </select>
          )}

          <AppButton
            variant="secondary"
            loading={refreshing}
            disabled={
              loading ||
              refreshing ||
              chargementAuth
            }
            onClick={() =>
              void chargerDashboard(true)
            }
          >
            <RefreshCw size={17} />
            Actualiser
          </AppButton>
        </div>
      </section>

      {parametresACompleter &&
        !verificationParametres &&
        !vueTousMagasins &&
        magasinActif && (
          <section className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Settings className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold text-amber-950 dark:text-amber-100">
                  Paramètres du magasin à compléter
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                  Pensez à renseigner les paramètres de {magasinActif.nom}.
                  Cette notification disparaîtra automatiquement lorsque les informations obligatoires seront complétées.
                </p>
              </div>
            </div>

            <Link
              href="/admin/parametres"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700"
            >
              Compléter les paramètres
            </Link>
          </section>
        )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-bold">
            Impossible de charger certaines données
          </p>

          <p className="mt-1">{error}</p>
        </div>
      )}

      <HealthScoreCard
        healthScore={
          dashboardData?.healthScore ?? null
        }
        loading={loading || chargementAuth}
      />

      <SupervisionCenter
        supervision={
          dashboardData?.supervision ?? null
        }
        loading={loading || chargementAuth}
      />

      <StatsCards
        stats={dashboardData?.stats ?? null}
        loading={loading || chargementAuth}
      />

      <AlertsPanel
        alertes={dashboardData?.alertes ?? []}
        loading={loading || chargementAuth}
      />

      <EquipmentCharts
        equipementsParType={
          dashboardData?.equipementsParType ?? []
        }
        equipementsParEtat={
          dashboardData?.equipementsParEtat ?? []
        }
        loading={loading || chargementAuth}
      />

      {/*
       * ActivityTimeline et TodayPanel ont été retirés temporairement :
       * leurs requêtes historiques ne sont pas encore filtrées par magasin.
       * Ils seront réintégrés après leur adaptation multi-magasins.
       */}

      <QuickActions />
        </>
      )}
    </main>
  );
}